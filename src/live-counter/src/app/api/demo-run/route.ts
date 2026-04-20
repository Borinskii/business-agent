import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function run(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout: 180_000, env: { ...process.env } }, (_err, stdout, stderr) => {
      resolve({ stdout: (stdout || '').toString(), stderr: (stderr || '').toString() })
    })
  })
}

function parseLines(out: string): string[] {
  return out.split('\n').map(l => l.trim()).filter(l =>
    l &&
    !l.includes('DeprecationWarning') &&
    !l.includes('ExperimentalWarning') &&
    !l.includes('dotenv@') &&
    !l.includes('injecting env')
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findNewCompanyViaLeadsforge(supabase: any, log: (m: string) => void): Promise<string | null> {
  const API_KEY = process.env.LEADSFORGE_API_KEY
  if (!API_KEY) { log('[signal] Missing LEADSFORGE_API_KEY'); return null }

  log('[signal] Searching Leadsforge for companies with active SDRs...')

  const res = await fetch('https://api.leadsforge.ai/public/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobTitle: 'Sales Development Representative', country: 'US', limit: 20 }),
  })

  if (!res.ok) {
    log(`[signal] Leadsforge API error: ${res.status} ${await res.text()}`)
    return null
  }

  const data = await res.json() as { leads: Array<{ company?: { domain?: string; name?: string } }> }
  const leads = data.leads ?? []

  log(`[signal] Found ${leads.length} leads from Leadsforge`)

  // Group by domain
  const byDomain = new Map<string, string>()
  for (const lead of leads) {
    const raw = lead.company?.domain
    if (!raw) continue
    const domain = raw.replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '')
    if (domain && !byDomain.has(domain)) {
      byDomain.set(domain, lead.company?.name ?? domain)
    }
  }

  // Find one not already in DB
  for (const [domain, name] of byDomain) {
    const { data: existing } = await supabase
      .from('companies').select('id').eq('domain', domain).maybeSingle()

    if (!existing) {
      log(`[signal] New company found: ${name} (${domain})`)
      const { data: created, error } = await (supabase as any)
        .from('companies')
        .insert({ name, domain, status: 'detected' })
        .select('id').single()

      if (error) { log(`[signal] Insert error: ${error.message}`); continue }
      return (created as { id: string }).id
    }
  }

  log('[signal] No new companies found via Leadsforge — using least-recently updated existing company')
  return null
}

export async function POST(req: Request) {
  const rootDir = path.resolve(process.cwd(), '../..')
  const logs: string[] = []
  const log = (msg: string) => logs.push(msg)

  try {
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any

    let targetId = companyId

    if (!targetId) {
      // Step 1: Try to find a brand-new company via Leadsforge
      targetId = await findNewCompanyViaLeadsforge(supabase, log) ?? undefined

      // Step 2: Fallback — pick an unprocessed company from DB
      if (!targetId) {
        const { data: unprocessed } = await supabase
          .from('companies')
          .select('id, name, domain')
          .eq('status', 'detected')
          .order('created_at', { ascending: true })
          .limit(1)

        if (unprocessed?.length) {
          targetId = unprocessed[0].id as string
          log(`[system] Using unprocessed company: ${(unprocessed[0] as { name: string }).name}`)
        }
      }

      // Step 3: Fallback — reprocess first company as demo
      if (!targetId) {
        const { data: any } = await supabase
          .from('companies').select('id, name, domain').order('created_at', { ascending: true }).limit(1)
        if (any?.length) {
          targetId = any[0].id as string
          log(`[system] Demo re-run on: ${(any[0] as { name: string }).name}`)
        }
      }

      if (!targetId) {
        return NextResponse.json({ success: false, error: 'No companies available', logs })
      }
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id, name, domain, status, decision_maker, monthly_loss_estimate, salesforce_contact_id')
      .eq('id', targetId).single()

    if (!company) {
      return NextResponse.json({ success: false, error: `Company not found: ${targetId}`, logs })
    }

    const c = company as { id: string; name: string; domain: string; status: string; decision_maker: unknown; monthly_loss_estimate: number | null; salesforce_contact_id: string | null }
    log(`[pipeline] Starting full pipeline for ${c.name} (${c.domain})`)

    // Step 1: Profile via Leadsforge
    log(`[profiler] Enriching ${c.domain} via Leadsforge...`)
    const r1 = await run(`npx ts-node src/profiler/cli.ts --company-id ${targetId}`, rootDir)
    parseLines(r1.stdout).forEach(l => log(l))
    if (r1.stderr) parseLines(r1.stderr).forEach(l => log(`[profiler] ${l}`))

    // Step 2: Upload to Salesforge
    log(`[bridge] Uploading contact to Salesforge...`)
    const r2 = await run(`npx ts-node src/salesforge-bridge/cli.ts --company-id ${targetId}`, rootDir)
    parseLines(r2.stdout).forEach(l => log(l))

    // Step 3: Generate PDF via Claude AI
    log(`[pdf] Generating Pipeline Autopsy PDF via Claude AI...`)
    const r3 = await run(`npx ts-node src/pdf-generator/cli.ts --company-id ${targetId}`, rootDir)
    parseLines(r3.stdout).forEach(l => log(l))
    if (r3.stderr) parseLines(r3.stderr).slice(0, 5).forEach(l => log(`[pdf] ${l}`))

    // Step 4: Generate Shotstack video
    log(`[video] Generating Shotstack video pitch...`)
    const r4 = await run(`npx ts-node src/video-generator/cli.ts --company-id ${targetId}`, rootDir)
    parseLines(r4.stdout).forEach(l => log(l))
    if (r4.stderr) parseLines(r4.stderr).slice(0, 5).forEach(l => log(`[video] ${l}`))

    // Step 5: Create Salesforge outreach sequence
    log(`[delivery] Creating personalized Salesforge sequence...`)
    const r5 = await run(`npx ts-node src/delivery-engine/cli.ts --company-id ${targetId}`, rootDir)
    parseLines(r5.stdout).forEach(l => log(l))

    log(`✓ Pipeline complete for ${c.name}`)

    const { data: finalCompany } = await supabase.from('companies').select('*').eq('id', targetId).single()
    const { data: finalReport } = await supabase.from('reports').select('*').eq('company_id', targetId).maybeSingle()

    return NextResponse.json({ success: true, companyId: targetId, company: finalCompany, report: finalReport, logs })
  } catch (error: unknown) {
    log(`[error] ${(error as Error).message}`)
    return NextResponse.json({ success: false, error: (error as Error).message, logs }, { status: 500 })
  }
}
