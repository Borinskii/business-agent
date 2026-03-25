import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { sf } from '../lib/salesforge'
import type { Company } from '../types/company'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface VideoScene {
  duration_seconds: number
  visual: string
  narration: string
  on_screen_text: string
}

interface VideoScript {
  scenes: VideoScene[]
}

interface GenerateResult {
  report_id: string
  video_url: string | null
  video_provider: 'sora' | 'heygen' | 'skipped'
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

// ─── FIXED 5-SCENE STRUCTURE (per spec) ──────────────────────────────────────

const SCENE_STRUCTURE = [
  { duration_seconds: 15, label: 'SDR manual work, clock ticking (0–15s)' },
  { duration_seconds: 25, label: 'Money counter dropping, competitors growing (15–40s)' },
  { duration_seconds: 25, label: 'Automated pipeline, calendar filling (40–65s)' },
  { duration_seconds: 15, label: 'Team closing deals (65–80s)' },
  { duration_seconds: 10, label: 'Company logo + CTA (80–90s)' },
]

// ─── STEP 1: GENERATE SCRIPT VIA CLAUDE ──────────────────────────────────────

async function generateScript(company: CompanyWithSignals): Promise<VideoScript> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const monthlyLoss = company.monthly_loss_estimate ?? 1903

  const prompt = `Create a 90-second B2B video script for Sora AI.
Company: ${company.name} (${company.industry ?? 'B2B SaaS'})
SDR count: ${company.sdr_count}, Monthly loss: $${monthlyLoss}
Location: ${company.location ?? 'USA'}

The video must have exactly 5 scenes with these durations and themes:
1. Scene 1 (15s): SDR at desk doing manual outreach, clock ticking
2. Scene 2 (25s): Money counter dropping, competitor companies growing
3. Scene 3 (25s): Same team with automated pipeline, calendar filling with demos
4. Scene 4 (15s): Team closing deals, celebrating wins
5. Scene 5 (10s): ${company.name} logo + call to action

Return ONLY this JSON (no other text):
{
  "scenes": [
    {
      "duration_seconds": 15,
      "visual": "detailed visual description for Sora AI, max 50 words, photorealistic",
      "narration": "voiceover text for this scene",
      "on_screen_text": "text overlay shown on screen"
    }
  ]
}`

  let attempts = 0
  while (attempts < 3) {
    attempts++
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'Write a 90-second B2B video script for Sora AI. Output ONLY valid JSON. No markdown. No preamble.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(clean) as VideoScript
      if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== 5) {
        throw new Error('Expected exactly 5 scenes')
      }
      // Enforce fixed durations per spec
      parsed.scenes.forEach((scene, i) => {
        scene.duration_seconds = SCENE_STRUCTURE[i].duration_seconds
      })
      return parsed
    } catch {
      console.error(`[!] Claude script invalid (attempt ${attempts}), retrying...`)
    }
  }
  throw new Error('Failed to generate video script after 3 attempts')
}

// ─── STEP 2A: SORA VIDEO ─────────────────────────────────────────────────────

async function generateWithSora(script: VideoScript, slug: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const combinedPrompt = script.scenes
    .map((s, i) => `Scene ${i + 1} (${s.duration_seconds}s): ${s.visual}`)
    .join('\n')

  console.log('[Sora] Creating video job...')
  const job = await (openai.videos as unknown as {
    create: (params: Record<string, unknown>) => Promise<{ id: string; status: string }>
  }).create({
    model: 'sora-2',
    prompt: combinedPrompt,
  })

  console.log(`[Sora] Job created: ${job.id}, polling...`)

  // Poll up to 5 minutes
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10000))

    const status = await (openai.videos as unknown as {
      retrieve: (id: string) => Promise<{ id: string; status: string; data?: Array<{ url?: string }> }>
    }).retrieve(job.id)

    console.log(`[Sora] Status: ${status.status}`)

    if (status.status === 'completed' && status.data?.[0]?.url) {
      const videoUrl = status.data[0].url!
      return await downloadAndUpload(videoUrl, slug, 'sora')
    }

    if (status.status === 'failed') {
      throw new Error('Sora job failed')
    }
  }

  throw new Error('Sora timeout (5 minutes)')
}

// ─── STEP 2B: HEYGEN FALLBACK ─────────────────────────────────────────────────

async function generateWithHeygen(script: VideoScript, slug: string): Promise<string> {
  const HEYGEN_KEY = process.env.HEYGEN_API_KEY
  if (!HEYGEN_KEY) throw new Error('HEYGEN_API_KEY not set')

  // Use first scene narration as the script
  const narration = script.scenes.map((s) => s.narration).join(' ')

  const body = JSON.stringify({
    video_inputs: [{
      character: { type: 'avatar', avatar_id: 'josh_lite3_20230714', avatar_style: 'normal' },
      voice: { type: 'text', input_text: narration, voice_id: 'en-US-JennyNeural' },
      background: { type: 'color', value: '#0f172a' },
    }],
    ratio: '16:9',
    test: false,
  })

  const videoId: string = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.heygen.com',
      path: '/v2/video/generate',
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Heygen ${res.statusCode}: ${d}`))
        const parsed = JSON.parse(d)
        resolve(parsed.data?.video_id ?? parsed.video_id)
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  console.log(`[Heygen] Job created: ${videoId}, polling...`)

  // Poll up to 5 minutes
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000))

    const videoUrl: string = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.heygen.com',
        path: `/v1/video_status.get?video_id=${videoId}`,
        headers: { 'X-Api-Key': HEYGEN_KEY! },
      }
      https.get(options, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          const parsed = JSON.parse(d)
          if (parsed.data?.status === 'completed') resolve(parsed.data.video_url)
          else if (parsed.data?.status === 'failed') reject(new Error('Heygen job failed'))
          else resolve('')
        })
      }).on('error', reject)
    })

    if (videoUrl) {
      console.log(`[Heygen] Video ready: ${videoUrl}`)
      return await downloadAndUpload(videoUrl, slug, 'heygen')
    }

    console.log(`[Heygen] Still rendering...`)
  }

  throw new Error('Heygen timeout (5 minutes)')
}

// ─── DOWNLOAD AND UPLOAD TO SUPABASE STORAGE ─────────────────────────────────

async function downloadAndUpload(
  sourceUrl: string,
  slug: string,
  provider: 'sora' | 'heygen'
): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `${slug}-${provider}.mp4`)

  // Download to temp file
  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(tmpFile)
    https.get(sourceUrl, (res) => {
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })

  const videoBuffer = fs.readFileSync(tmpFile)
  fs.unlinkSync(tmpFile)

  console.log(`[Storage] Uploading ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB...`)

  const supabase = getSupabase()
  const fileName = `${slug}.mp4`

  const { error } = await supabase.storage
    .from('videos')
    .upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true })

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

  // ── Fetch report ───────────────────────────────────────────────────────────
  const { data: report } = await supabase
    .from('reports')
    .select('id, video_url, video_provider')
    .eq('company_id', companyId)
    .single()

  if (!report) throw new Error('report_not_found — run PDF generator first')

  const slug = company.domain.replace(/\./g, '-')

  // ── Step 1: Generate script via Claude ────────────────────────────────────
  console.log(`[1/3] Claude API: generating video script for ${company.name}...`)
  const script = await generateScript(company)
  const t1 = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[✓] Script: ${script.scenes.length} scenes (${t1}s)`)

  // Save script to report
  await supabase.from('reports').update({ video_script: script }).eq('id', report.id)

  // ── Step 2: Try Sora → Heygen → skipped ───────────────────────────────────
  let videoUrl: string | null = null
  let provider: 'sora' | 'heygen' | 'skipped' = 'skipped'

  console.log(`[2/3] Sora: generating video...`)
  try {
    videoUrl = await generateWithSora(script, slug)
    provider = 'sora'
    console.log(`[✓] Sora video ready: ${videoUrl}`)
  } catch (soraErr) {
    console.log(`[!] Sora failed: ${soraErr instanceof Error ? soraErr.message : soraErr}`)
    console.log(`[2/3] Heygen: trying fallback...`)

    try {
      videoUrl = await generateWithHeygen(script, slug)
      provider = 'heygen'
      console.log(`[✓] Heygen video ready: ${videoUrl}`)
    } catch (heygenErr) {
      console.log(`[!] Heygen failed: ${heygenErr instanceof Error ? heygenErr.message : heygenErr}`)
      console.log(`[→] video_provider=skipped, pipeline continues without video`)
      provider = 'skipped'
      videoUrl = null
    }
  }

  const t2 = ((Date.now() - startTime) / 1000).toFixed(1)

  // ── Step 3: Update report ──────────────────────────────────────────────────
  await supabase.from('reports').update({
    video_url: videoUrl,
    video_provider: provider,
    ...(videoUrl ? { status: 'ready' } : {}),
  }).eq('id', report.id)

  // ── Update Salesforge custom_vars with video_url ────────────────────────
  if (videoUrl && company.salesforce_contact_id) {
    try {
      await sf.ws.put(`/contacts/${company.salesforce_contact_id}`, {
        customVars: { video_url: videoUrl },
      })
      console.log(`[✓] Salesforge custom_vars updated: video_url`)
    } catch (err) {
      console.error(`[!] Failed to update Salesforge custom_vars: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Update companies.status → content_generated (if pdf was also done)
  await supabase.from('companies')
    .update({ status: 'content_generated' })
    .eq('id', companyId)
    .in('status', ['profiled', 'responded', 'outreach_sent', 'page_opened'])

  const t3 = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[✓] Done in ${t3}s — provider: ${provider}`)

  return {
    report_id: report.id,
    video_url: videoUrl,
    video_provider: provider,
    status: 'ready',
  }
}
