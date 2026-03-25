/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { createClient } from '@supabase/supabase-js'
import { sf } from '../lib/salesforge'
import type { Company } from '../types/company'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ReportContent {
  headline: string
  diagnosis: string
  monthly_loss_dollars: number
  annual_loss_dollars: number
  hours_wasted_monthly: number
  demos_missed_monthly: number
  competitor_insight: string
  solution_preview: string
  cta_text: string
}

interface GenerateResult {
  report_id: string
  video_url: string | null
  video_provider: 'shotstack' | 'skipped'
  status: 'ready'
}

interface CompanyWithSignals extends Company {
  signals?: Array<{ type: string; detail: string }>
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SHOTSTACK_KEY = () => process.env.SHOTSTACK_API_KEY ?? ''
const SHOTSTACK_ENV = () => process.env.SHOTSTACK_ENV ?? 'v1'
const SHOTSTACK_BASE = () => `https://api.shotstack.io`

// ─── STEP 1: BUILD NARRATION FROM PDF CONTENT ──────────────────────────────

function buildNarration(company: CompanyWithSignals, content: ReportContent): string {
  const name = company.name
  const monthly = content.monthly_loss_dollars.toLocaleString()
  const annual = content.annual_loss_dollars.toLocaleString()
  const hours = content.hours_wasted_monthly
  const demos = content.demos_missed_monthly

  return [
    `${name}. ${content.headline}.`,
    `Your team is wasting ${hours} hours every month on manual outreach. That's $${monthly} per month, or $${annual} per year, walking out the door. ${demos} qualified demos missed.`,
    content.competitor_insight,
    `${content.cta_text}. Reply YES to book a demo.`,
  ].join(' ')
}

// ─── STEP 2: GENERATE TTS VIA SHOTSTACK CREATE API ─────────────────────────

async function generateTTS(text: string): Promise<string> {
  const env = SHOTSTACK_ENV()
  const res = await fetch(`${SHOTSTACK_BASE()}/create/${env}/assets`, {
    method: 'POST',
    headers: { 'x-api-key': SHOTSTACK_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'shotstack',
      options: {
        type: 'text-to-speech',
        text,
        voice: 'Matthew',
        language: 'en-US',
        newscaster: true,
      },
    }),
  })

  if (!res.ok) throw new Error(`Shotstack TTS failed: ${res.status} ${await res.text()}`)
  const body = await res.json() as { data: { id: string } }
  const assetId = body.data.id

  console.log(`[Shotstack] TTS queued: ${assetId}`)

  // Poll for completion (max 60s)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`${SHOTSTACK_BASE()}/create/${env}/assets/${assetId}`, {
      headers: { 'x-api-key': SHOTSTACK_KEY() },
    })
    const pollBody = await poll.json() as { data: { attributes: { status: string; url?: string } } }
    const status = pollBody.data.attributes.status

    if (status === 'done' && pollBody.data.attributes.url) {
      console.log(`[✓] TTS ready: ${pollBody.data.attributes.url}`)
      return pollBody.data.attributes.url
    }
    if (status === 'failed') throw new Error('Shotstack TTS rendering failed')
  }

  throw new Error('Shotstack TTS timeout (60s)')
}

// ─── STEP 3: RENDER VIDEO VIA SHOTSTACK EDIT API ────────────────────────────

function buildVideoTimeline(
  company: CompanyWithSignals,
  content: ReportContent,
  ttsUrl: string,
): Record<string, unknown> {
  const logoUrl = company.logo_url ?? `https://logo.clearbit.com/${company.domain}`
  const monthly = `$${content.monthly_loss_dollars.toLocaleString()}`
  const annual = `$${content.annual_loss_dollars.toLocaleString()}`
  const hours = String(content.hours_wasted_monthly)
  const demos = String(content.demos_missed_monthly)

  // Native Shotstack text/image assets — no HTML, proper fonts, real animations
  // Color: white (#ffffff) + purple (#a855f7) on dark (#0c0118)

  // Shotstack: first track = foreground (top), last track = background (bottom)
  // We build content tracks first, then push background at the end
  const tracks: Array<{ clips: unknown[] }> = []

  // ── SCENE 1: COMPANY NAME (0-7s) ──
  tracks.push({
    clips: [{
      asset: { type: 'text', text: company.name, alignment: { horizontal: 'left', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 62, lineHeight: 1 }, width: 800, height: 120 },
      start: 0.3, length: 6.5, position: 'center', offset: { x: -0.1, y: 0.15 },
      transition: { in: 'carouselRight', out: 'slideLeft' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: `${company.industry ?? 'B2B SaaS'}  •  ${company.location ?? 'USA'}`,
        alignment: { horizontal: 'left', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat SemiBold', size: 22, lineHeight: 1 }, width: 600, height: 40 },
      start: 0.6, length: 6.2, position: 'center', offset: { x: -0.15, y: 0.06 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'PIPELINE AUTOPSY REPORT', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#7c3aed', family: 'Montserrat SemiBold', size: 18, lineHeight: 1 }, width: 500, height: 30 },
      start: 1, length: 5.8, position: 'center', offset: { x: 0, y: -0.12 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: content.headline, alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat SemiBold', size: 32, lineHeight: 1.2 }, width: 700, height: 100 },
      start: 1.3, length: 5.5, position: 'center', offset: { x: 0, y: -0.25 },
      transition: { in: 'fade' },
    }],
  })

  // Company logo
  tracks.push({
    clips: [{
      asset: { type: 'image', src: logoUrl },
      start: 0.2, length: 6.6, position: 'center', offset: { x: 0.32, y: 0.15 },
      scale: 0.12, transition: { in: 'fade' }, effect: 'zoomInSlow',
    }],
  })

  // ── SCENE 2: NUMBERS (7-15s) ──
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'REVENUE LEAK ANALYSIS', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#7c3aed', family: 'Montserrat SemiBold', size: 18, lineHeight: 1 }, width: 500, height: 30 },
      start: 7.2, length: 7.5, position: 'center', offset: { x: 0, y: 0.35 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: monthly, alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat ExtraBold', size: 96, lineHeight: 1 }, width: 600, height: 130 },
      start: 7.5, length: 7, position: 'center', offset: { x: 0, y: 0.18 },
      transition: { in: 'zoom' }, effect: 'zoomIn',
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: `per month  •  ${annual} per year`, alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat SemiBold', size: 22, lineHeight: 1 }, width: 600, height: 40 },
      start: 8, length: 6.5, position: 'center', offset: { x: 0, y: 0.04 },
      transition: { in: 'fade' },
    }],
  })

  // Stat: Hours
  tracks.push({
    clips: [{
      asset: { type: 'text', text: hours, alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 56, lineHeight: 1 }, width: 200, height: 80 },
      start: 8.5, length: 6, position: 'center', offset: { x: -0.25, y: -0.18 },
      transition: { in: 'carouselUp' },
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'HOURS WASTED', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat SemiBold', size: 14, lineHeight: 1 }, width: 200, height: 25 },
      start: 8.8, length: 5.7, position: 'center', offset: { x: -0.25, y: -0.26 },
      transition: { in: 'fade' },
    }],
  })

  // Stat: Demos
  tracks.push({
    clips: [{
      asset: { type: 'text', text: demos, alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 56, lineHeight: 1 }, width: 200, height: 80 },
      start: 9, length: 5.5, position: 'center', offset: { x: 0, y: -0.18 },
      transition: { in: 'carouselUp' },
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'DEMOS MISSED', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat SemiBold', size: 14, lineHeight: 1 }, width: 200, height: 25 },
      start: 9.3, length: 5.2, position: 'center', offset: { x: 0, y: -0.26 },
      transition: { in: 'fade' },
    }],
  })

  // Stat: SDRs
  tracks.push({
    clips: [{
      asset: { type: 'text', text: String(company.sdr_count), alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 56, lineHeight: 1 }, width: 200, height: 80 },
      start: 9.5, length: 5, position: 'center', offset: { x: 0.25, y: -0.18 },
      transition: { in: 'carouselUp' },
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'SDRs AT RISK', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat SemiBold', size: 14, lineHeight: 1 }, width: 200, height: 25 },
      start: 9.8, length: 4.7, position: 'center', offset: { x: 0.25, y: -0.26 },
      transition: { in: 'fade' },
    }],
  })

  // ── SCENE 3: COMPARISON (15-22s) ──
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'INDUSTRY BENCHMARK', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#7c3aed', family: 'Montserrat SemiBold', size: 18, lineHeight: 1 }, width: 500, height: 30 },
      start: 15.2, length: 6.5, position: 'center', offset: { x: 0, y: 0.35 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: content.competitor_insight.slice(0, 80), alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat SemiBold', size: 28, lineHeight: 1.3 }, width: 750, height: 100 },
      start: 15.5, length: 6, position: 'center', offset: { x: 0, y: 0.18 },
      transition: { in: 'carouselRight', out: 'slideLeft' },
    }],
  })

  // Manual bar (small)
  tracks.push({
    clips: [{
      asset: { type: 'text', text: ' ', font: { color: '#000', size: 1 }, width: 80, height: 30, background: { color: '#ef4444' } },
      start: 16.2, length: 5.3, position: 'center', offset: { x: -0.15, y: -0.1 },
      transition: { in: 'slideRight' },
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'Manual  1-2%', alignment: { horizontal: 'left', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat SemiBold', size: 18, lineHeight: 1 }, width: 300, height: 30 },
      start: 16.5, length: 5, position: 'center', offset: { x: 0.01, y: -0.1 },
      transition: { in: 'fade' },
    }],
  })

  // AI bar (big)
  tracks.push({
    clips: [{
      asset: { type: 'text', text: ' ', font: { color: '#000', size: 1 }, width: 450, height: 30, background: { color: '#a855f7' } },
      start: 16.8, length: 4.7, position: 'center', offset: { x: -0.04, y: -0.2 },
      transition: { in: 'slideRight' },
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'AI-Powered  8-16%', alignment: { horizontal: 'left', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 20, lineHeight: 1 }, width: 350, height: 30 },
      start: 17.2, length: 4.3, position: 'center', offset: { x: 0.17, y: -0.2 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: '8x higher reply rates with AI personalization', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#a855f7', family: 'Montserrat SemiBold', size: 20, lineHeight: 1 }, width: 600, height: 35 },
      start: 17.5, length: 4, position: 'center', offset: { x: 0, y: -0.32 },
      transition: { in: 'fade' },
    }],
  })

  // ── SCENE 4: CTA (22-28s) ──
  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'NEXT STEP', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#7c3aed', family: 'Montserrat SemiBold', size: 18, lineHeight: 1 }, width: 300, height: 30 },
      start: 22.2, length: 5.5, position: 'center', offset: { x: 0, y: 0.3 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'Reply YES', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 72, lineHeight: 1 }, width: 600, height: 100 },
      start: 22.5, length: 5, position: 'center', offset: { x: 0, y: 0.14 },
      transition: { in: 'zoom' }, effect: 'zoomIn',
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'See exactly how we calculated these numbers', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat SemiBold', size: 24, lineHeight: 1 }, width: 650, height: 40 },
      start: 23, length: 4.5, position: 'center', offset: { x: 0, y: 0 },
      transition: { in: 'fade' },
    }],
  })

  // CTA button background
  tracks.push({
    clips: [{
      asset: { type: 'text', text: '  Book a Demo  ', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#ffffff', family: 'Montserrat ExtraBold', size: 24, lineHeight: 1 }, width: 360, height: 55,
        background: { color: '#7c3aed' } },
      start: 23.5, length: 4, position: 'center', offset: { x: 0, y: -0.12 },
      transition: { in: 'fade' },
    }],
  })

  tracks.push({
    clips: [{
      asset: { type: 'text', text: 'Powered by Salesforge  •  Agent Frank', alignment: { horizontal: 'center', vertical: 'center' },
        font: { color: '#7c3aed', family: 'Montserrat SemiBold', size: 16, lineHeight: 1 }, width: 500, height: 30 },
      start: 24, length: 3.5, position: 'center', offset: { x: 0, y: -0.25 },
      transition: { in: 'fade' },
    }],
  })

  // ── BACKGROUND LAYERS (bottom of stack — rendered behind everything) ──
  tracks.push({
    clips: [{
      asset: { type: 'video', src: 'https://templates.shotstack.io/holiday-season-glam-template/lgeb9vwl1d8wtpnhn5wblgke/source_b749f9da.webm', volume: 0 },
      start: 0, length: 28, fit: 'contain', opacity: 0.35,
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'video', src: 'https://templates.shotstack.io/holiday-season-glam-template/lgeb9vwl1d8wtpnhn5wblgke/source_a30d9fc6.webm', volume: 0 },
      start: 0, length: 28, fit: 'contain', opacity: 0.2,
    }],
  })
  tracks.push({
    clips: [{
      asset: { type: 'text', text: ' ', font: { color: '#000', size: 1 }, width: 1920, height: 1080, background: { color: '#0c0118' } },
      start: 0, length: 28, position: 'center',
    }],
  })

  return {
    timeline: {
      background: '#0c0118',
      soundtrack: { src: ttsUrl, effect: 'fadeOut' },
      tracks,
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      aspectRatio: '16:9',
      fps: 30,
    },
  }
}

async function renderVideo(timeline: Record<string, unknown>): Promise<string> {
  const env = SHOTSTACK_ENV()
  const res = await fetch(`${SHOTSTACK_BASE()}/edit/${env}/render`, {
    method: 'POST',
    headers: { 'x-api-key': SHOTSTACK_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify(timeline),
  })

  if (!res.ok) throw new Error(`Shotstack render failed: ${res.status} ${await res.text()}`)
  const body = await res.json() as { response: { id: string } }
  const renderId = body.response.id

  console.log(`[Shotstack] Render queued: ${renderId}`)

  // Poll for completion (max 120s)
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const poll = await fetch(`${SHOTSTACK_BASE()}/edit/${env}/render/${renderId}`, {
      headers: { 'x-api-key': SHOTSTACK_KEY() },
    })
    const pollBody = await poll.json() as { response: { status: string; url?: string; error?: string } }
    const status = pollBody.response.status

    console.log(`[Shotstack] Render: ${status}`)

    if (status === 'done' && pollBody.response.url) {
      return pollBody.response.url
    }
    if (status === 'failed') {
      throw new Error(`Shotstack render failed: ${pollBody.response.error ?? 'unknown'}`)
    }
  }

  throw new Error('Shotstack render timeout (120s)')
}

// ─── STEP 4: UPLOAD TO SUPABASE STORAGE ─────────────────────────────────────

async function uploadToSupabase(videoUrl: string, slug: string): Promise<string> {
  // Download from Shotstack
  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  console.log(`[Storage] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)}MB...`)

  const supabase = getSupabase()
  const fileName = `${slug}.mp4`

  const { error } = await supabase.storage
    .from('videos')
    .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from('videos').getPublicUrl(fileName)
  return data.publicUrl
}

// ─── MAIN ORCHESTRATOR ────────────────────────────────────────────────────────

export async function generateVideo(companyId: string): Promise<GenerateResult> {
  const supabase = getSupabase()
  const startTime = Date.now()

  // ── Fetch company ──────────────────────────────────────────────────────────
  const { data: company } = await supabase
    .from('companies')
    .select('*, signals(*)')
    .eq('id', companyId)
    .single<CompanyWithSignals>()

  if (!company) throw new Error('company_not_found')

  // ── Fetch report (must have PDF content) ─────────────────────────────────
  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!report) throw new Error('report_not_found — run PDF generator first')

  const slug = company.domain.replace(/\./g, '-')

  // ── Parse PDF content from report ────────────────────────────────────────
  // The PDF generator stores Claude's JSON content — we reuse it for video
  let pdfContent: ReportContent

  if (report.video_script && typeof report.video_script === 'object') {
    // If video_script already has our content, use it
    pdfContent = report.video_script as unknown as ReportContent
  } else {
    // Build from company data (same formula as PDF generator)
    const monthlyLoss = company.monthly_loss_estimate ?? 1903
    pdfContent = {
      headline: `is losing $${monthlyLoss.toLocaleString()} every month on manual outreach`,
      diagnosis: `With ${company.sdr_count} SDRs spending 3 hours daily on manual prospecting, pipeline capacity is capped.`,
      monthly_loss_dollars: monthlyLoss,
      annual_loss_dollars: monthlyLoss * 12,
      hours_wasted_monthly: company.sdr_count * 3 * 22,
      demos_missed_monthly: Math.round((company.sdr_count * 3 * 22) / 2.5),
      competitor_insight: `Companies in ${company.industry ?? 'your space'} are switching to AI-powered SDR outreach with 8 to 16 percent reply rates.`,
      solution_preview: `Automated pipeline for ${company.name} could recover ${company.sdr_count * 3} hours daily.`,
      cta_text: `See exactly how we calculated these numbers for ${company.name}`,
    }
  }

  console.log(`[1/3] Building narration from PDF content for ${company.name}...`)
  const narration = buildNarration(company, pdfContent)
  const t1 = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[✓] Narration: ${narration.length} chars (${t1}s)`)

  // ── Generate video via Shotstack ──────────────────────────────────────────
  let videoUrl: string | null = null
  let provider: 'shotstack' | 'skipped' = 'skipped'

  if (!SHOTSTACK_KEY()) {
    console.log('[!] SHOTSTACK_API_KEY not set — skipping video generation')
  } else {
    try {
      // Step 2: TTS
      console.log(`[2/3] Shotstack TTS: generating voiceover...`)
      const ttsUrl = await generateTTS(narration)

      // Step 3: Render video with HTML scenes + TTS soundtrack
      console.log(`[3/3] Shotstack Edit: rendering video...`)
      const timeline = buildVideoTimeline(company, pdfContent, ttsUrl)
      const shotstackUrl = await renderVideo(timeline)

      // Step 4: Upload to Supabase Storage
      videoUrl = await uploadToSupabase(shotstackUrl, slug)
      provider = 'shotstack'
      console.log(`[✓] Video uploaded: ${videoUrl}`)
    } catch (err) {
      console.error(`[!] Shotstack failed: ${err instanceof Error ? err.message : String(err)}`)
      console.log('[→] video_provider=skipped, pipeline continues without video')
      provider = 'skipped'
      videoUrl = null
    }
  }

  const t2 = ((Date.now() - startTime) / 1000).toFixed(1)

  // ── Update report ──────────────────────────────────────────────────────────
  await supabase.from('reports').update({
    video_url: videoUrl,
    video_provider: provider,
    video_script: pdfContent,
    ...(videoUrl ? { status: 'ready' } : {}),
  }).eq('id', report.id)

  // ── Update Salesforge custom_vars with video_url ──────────────────────────
  if (videoUrl && company.salesforce_contact_id && company.decision_maker?.email) {
    try {
      const dm = company.decision_maker
      await sf.ws.post('/contacts/bulk', {
        contacts: [{
          email:     dm.email,
          firstName: dm.name.split(' ')[0] || '',
          lastName:  dm.name.split(' ').slice(1).join(' ') || '',
          tags:      ['phantom-pipeline'],
          customVars: { video_url: videoUrl },
        }],
      })
      console.log(`[✓] Salesforge custom_vars updated: video_url`)
    } catch (err) {
      console.error(`[!] Failed to update Salesforge custom_vars: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Update companies.status → content_generated
  await supabase.from('companies')
    .update({ status: 'content_generated' })
    .eq('id', companyId)
    .in('status', ['profiled', 'responded', 'outreach_sent', 'page_opened'])

  console.log(`[✓] Done in ${t2}s — provider: ${provider}`)

  return {
    report_id: report.id,
    video_url: videoUrl,
    video_provider: provider,
    status: 'ready',
  }
}