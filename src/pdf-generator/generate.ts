import Anthropic from '@anthropic-ai/sdk'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { buildReportHTML } from './template'
import { sf } from '../lib/salesforge'
import type { Company } from '../types/company'
import type { ReportContent } from './template'

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface GenerateResult {
  report_id: string
  pdf_url: string
  personal_page_url: string
  status: 'ready'
}

interface CompanyWithSignals extends Company {
  signals?: Array<{ type: string; detail: string; source: string; pain_points: number }>
}

// ─── STEP 1: CLAUDE CONTENT ───────────────────────────────────────────────────

async function generateContent(company: CompanyWithSignals): Promise<ReportContent> {
  const anthropic = getAnthropic()
  const monthlyLoss = company.monthly_loss_estimate ?? 1903
  const primarySignal = company.signals?.[0]?.detail ?? 'Active SDR hiring signals detected'

  const prompt = `Company: ${company.name}
Industry: ${company.industry ?? 'B2B SaaS'}
Size: ${company.size ?? 'unknown'} employees
SDRs: ${company.sdr_count}
Monthly loss estimate: $${monthlyLoss}
Pain signal: ${primarySignal}
Tech stack: ${company.tech_stack?.join(', ') ?? 'unknown'}
Location: ${company.location ?? 'USA'}

Return exactly this JSON structure (no other text):
{
  "headline": "string (one shocking sentence about their specific situation, max 15 words)",
  "diagnosis": "string (2-3 sentences specific to their industry/size/stack situation)",
  "monthly_loss_dollars": ${monthlyLoss},
  "annual_loss_dollars": ${monthlyLoss * 12},
  "hours_wasted_monthly": ${company.sdr_count * 3 * 22},
  "demos_missed_monthly": ${Math.round((company.sdr_count * 3 * 22) / 2.5)},
  "competitor_insight": "string (what companies in their specific industry are doing with AI SDR, 2-3 sentences)",
  "solution_preview": "string (what automated pipeline looks like specifically for their company/industry, 2-3 sentences)",
  "cta_text": "string (personalized CTA mentioning their company name and loss amount, max 20 words)"
}`

  let attempts = 0
  while (attempts < 3) {
    attempts++
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are a senior B2B pipeline analyst. Output ONLY valid JSON. No markdown. No preamble. No explanation.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      // Strip any accidental markdown fences
      const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(clean) as ReportContent
      // Enforce calculated fields (never trust Claude for numbers)
      parsed.monthly_loss_dollars = monthlyLoss
      parsed.annual_loss_dollars = monthlyLoss * 12
      parsed.hours_wasted_monthly = company.sdr_count * 3 * 22
      parsed.demos_missed_monthly = Math.round((company.sdr_count * 3 * 22) / 2.5)
      return parsed
    } catch {
      console.error(`[!] Claude returned invalid JSON (attempt ${attempts}), retrying...`)
    }
  }

  throw new Error('Claude API failed to return valid JSON after 3 attempts')
}

// ─── STEP 2: PUPPETEER PDF ────────────────────────────────────────────────────

async function renderPDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 25000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// ─── STEP 3: UPLOAD TO SUPABASE STORAGE ──────────────────────────────────────

async function uploadPDF(slug: string, pdfBuffer: Buffer): Promise<string> {
  const supabase = getSupabase()
  const fileName = `${slug}.pdf`

  const { error } = await supabase.storage
    .from('reports')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from('reports').getPublicUrl(fileName)
  return data.publicUrl
}

// ─── MAIN ORCHESTRATOR ────────────────────────────────────────────────────────

export async function generatePDF(companyId: string): Promise<GenerateResult> {
  const supabase = getSupabase()
  const startTime = Date.now()

  // ── Fetch company ──────────────────────────────────────────────────────────
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('*, signals(*)')
    .eq('id', companyId)
    .single<CompanyWithSignals>()

  if (companyErr || !company) throw new Error('company_not_found')
  if (company.status === 'detected') {
    throw new Error('company_not_profiled')
  }

  const slug = company.domain.replace(/\./g, '-')
  const personalPageUrl = `${process.env.APP_URL ?? 'https://phantom-pipeline.com'}/${slug}`

  // ── Check for existing report (don't regenerate) ──────────────────────────
  const { data: existing } = await supabase
    .from('reports')
    .select('id, pdf_url, status')
    .eq('company_id', companyId)
    .single()

  if (existing?.status === 'ready' && existing.pdf_url) {
    console.log(`[→] Report already exists for ${company.name}, skipping`)
    return {
      report_id: existing.id,
      pdf_url: existing.pdf_url,
      personal_page_url: personalPageUrl,
      status: 'ready',
    }
  }

  // ── Upsert report as 'generating' ─────────────────────────────────────────
  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .upsert({
      company_id: companyId,
      personal_page_slug: slug,
      personal_page_url: personalPageUrl,
      status: 'generating',
    }, { onConflict: 'company_id' })
    .select('id')
    .single()

  if (reportErr || !report) throw new Error(`Failed to create report: ${reportErr?.message}`)
  const reportId = report.id

  const timeout = setTimeout(async () => {
    await supabase.from('reports').update({
      status: 'failed',
      failure_reason: 'PDF generation timeout (30s)',
    }).eq('id', reportId)
    process.exit(1)
  }, 30000)

  try {
    // ── Step 1: Claude content ───────────────────────────────────────────────
    console.log(`[1/3] Claude API: generating content for ${company.name}...`)
    const content = await generateContent(company)
    const t1 = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[✓] Claude API: done (${t1}s)`)

    // ── Step 2: Puppeteer render ─────────────────────────────────────────────
    console.log(`[2/3] Puppeteer: rendering PDF...`)
    const html = buildReportHTML(company, content)
    const pdfBuffer = await renderPDF(html)
    const t2 = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[✓] Puppeteer: PDF rendered, ${(pdfBuffer.length / 1024).toFixed(0)}KB (${t2}s)`)

    // ── Step 3: Upload ───────────────────────────────────────────────────────
    console.log(`[3/3] Supabase Storage: uploading...`)
    const pdfUrl = await uploadPDF(slug, pdfBuffer)
    const t3 = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[✓] Uploaded: ${pdfUrl} (${t3}s total)`)

    // ── Update report → ready ────────────────────────────────────────────────
    await supabase.from('reports').update({
      pdf_url: pdfUrl,
      status: 'ready',
      generated_at: new Date().toISOString(),
      failure_reason: null,
    }).eq('id', reportId)

    // ── Update Salesforge custom_vars with pdf_url ────────────────────────────
    if (company.salesforce_contact_id) {
      try {
        await sf.ws.put(`/contacts/${company.salesforce_contact_id}`, {
          customVars: { pdf_url: pdfUrl },
        })
        console.log(`[✓] Salesforge custom_vars updated: pdf_url`)
      } catch (err) {
        console.error(`[!] Failed to update Salesforge custom_vars: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ── Update company status → content_generated ────────────────────────────
    await supabase.from('companies')
      .update({ status: 'content_generated' })
      .eq('id', companyId)
      .eq('status', 'profiled')

    clearTimeout(timeout)

    return {
      report_id: reportId,
      pdf_url: pdfUrl,
      personal_page_url: personalPageUrl,
      status: 'ready',
    }
  } catch (err) {
    clearTimeout(timeout)
    const reason = err instanceof Error ? err.message : String(err)
    await supabase.from('reports').update({
      status: 'failed',
      failure_reason: reason,
    }).eq('id', reportId)
    throw err
  }
}
