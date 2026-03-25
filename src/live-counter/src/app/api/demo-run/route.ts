/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

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
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, timeout: 120_000, env: { ...process.env, DOTENV_CONFIG_PATH: path.join(cwd, '.env') } }, (err, stdout, stderr) => {
      if (err && !stdout) reject(err)
      else resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

export async function POST(req: Request) {
  const rootDir = path.resolve(process.cwd(), '../..')
  const logs: string[] = []
  const log = (msg: string) => logs.push(msg)

  try {
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId as string | undefined
    const supabase = getSupabase()

    // If no companyId provided, pick the next unprocessed company
    let targetId = companyId
    if (!targetId) {
      // Find a company that needs processing: profiled but no report yet
      const { data: candidates } = await supabase
        .from('companies')
        .select('id, name, domain, status')
        .in('status', ['profiled', 'content_generated'])
        .order('created_at', { ascending: true })
        .limit(10)

      if (!candidates?.length) {
        return NextResponse.json({ success: false, error: 'No companies available for demo run', logs })
      }

      // Find one without a ready report
      for (const c of candidates) {
        const { data: report } = await supabase
          .from('reports')
          .select('status')
          .eq('company_id', c.id)
          .maybeSingle()

        if (!report || report.status !== 'ready') {
          targetId = c.id
          log(`[system] Selected company: ${c.name} (${c.domain}) — status: ${c.status}`)
          break
        }

        // If report exists but no sequence
        const { data: seq } = await supabase
          .from('sequences')
          .select('id')
          .eq('company_id', c.id)
          .maybeSingle()

        if (!seq) {
          targetId = c.id
          log(`[system] Selected company: ${c.name} (${c.domain}) — has report, needs sequence`)
          break
        }
      }

      if (!targetId) {
        return NextResponse.json({ success: false, error: 'All companies already fully processed', logs })
      }
    }

    // Fetch company info
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, domain, status, decision_maker, monthly_loss_estimate, salesforce_contact_id')
      .eq('id', targetId)
      .single()

    if (!company) {
      return NextResponse.json({ success: false, error: `Company not found: ${targetId}`, logs })
    }

    log(`[pipeline] Starting full pipeline for ${company.name} (${company.domain})`)

    // Step 1: Profile if needed
    if (company.status === 'detected') {
      log(`[profiler] Enriching ${company.domain}...`)
      try {
        const { stdout } = await run(`npx ts-node src/profiler/cli.ts --company-id ${targetId}`, rootDir)
        stdout.split('\n').filter(Boolean).forEach(l => log(l.trim()))
      } catch (e: unknown) {
        log(`[profiler] Error: ${(e as Error).message}`)
      }
    }

    // Step 2: Bridge to Salesforge if needed
    if (!company.salesforce_contact_id) {
      log(`[bridge] Uploading contact to Salesforge...`)
      try {
        const { stdout } = await run(`npx ts-node src/salesforge-bridge/cli.ts --company-id ${targetId}`, rootDir)
        stdout.split('\n').filter(Boolean).forEach(l => log(l.trim()))
      } catch (e: unknown) {
        log(`[bridge] Error: ${(e as Error).message}`)
      }
    }

    // Step 3: Generate PDF
    log(`[content] Generating Pipeline Autopsy PDF...`)
    try {
      const { stdout } = await run(`npx ts-node src/pdf-generator/cli.ts --company-id ${targetId}`, rootDir)
      stdout.split('\n').filter(Boolean).forEach(l => log(l.trim()))
    } catch (e: unknown) {
      log(`[pdf] Error: ${(e as Error).message}`)
    }

    // Step 4: Generate Video
    log(`[content] Generating Shotstack video...`)
    try {
      const { stdout } = await run(`npx ts-node src/video-generator/cli.ts --company-id ${targetId}`, rootDir)
      stdout.split('\n').filter(Boolean).forEach(l => log(l.trim()))
    } catch (e: unknown) {
      log(`[video] Error: ${(e as Error).message}`)
    }

    // Step 5: Create sequence
    log(`[delivery] Creating Salesforge sequence...`)
    try {
      const { stdout } = await run(`npx ts-node src/delivery-engine/cli.ts --company-id ${targetId}`, rootDir)
      stdout.split('\n').filter(Boolean).forEach(l => log(l.trim()))
    } catch (e: unknown) {
      log(`[delivery] Error: ${(e as Error).message}`)
    }

    log(`[system] Pipeline complete for ${company.name}`)

    // Fetch final state
    const { data: finalCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', targetId)
      .single()

    const { data: finalReport } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', targetId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      companyId: targetId,
      company: finalCompany,
      report: finalReport,
      logs,
    })
  } catch (error: unknown) {
    log(`[error] ${(error as Error).message}`)
    return NextResponse.json({ success: false, error: (error as Error).message, logs }, { status: 500 })
  }
}