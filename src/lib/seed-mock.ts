/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Seed mock companies + reports into Supabase for Live Counter demo.
 * Run AFTER migrations are applied:
 *   npx ts-node src/lib/seed-mock.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tcpapdgevdynhvoyfoxe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const companies = require('../mocks/companies.json') as Array<{
  id: string
  name: string
  domain: string
  logo_url: string
  industry: string
  size: number
  location: string
  icp: string
  acv_estimate: number
  sdr_count: number
  pain_score: number
  monthly_loss_estimate: number
  decision_maker: object
  tech_stack: string[]
  status: string
  signals: Array<{ type: string; detail: string; source: string; pain_points: number }>
}>

async function seed() {
  console.log('Seeding mock companies...')

  for (const c of companies) {
    // Upsert company by domain (unique key)
    const { error: companyErr } = await supabase
      .from('companies')
      .upsert({
        name: c.name,
        domain: c.domain,
        logo_url: c.logo_url,
        industry: c.industry,
        size: c.size,
        location: c.location,
        icp: c.icp,
        acv_estimate: c.acv_estimate,
        sdr_count: c.sdr_count,
        pain_score: c.pain_score,
        monthly_loss_estimate: c.monthly_loss_estimate,
        decision_maker: c.decision_maker,
        tech_stack: c.tech_stack,
        status: c.status,
      }, { onConflict: 'domain' })

    if (companyErr) {
      console.error(`[✗] Company ${c.name}:`, companyErr.message)
      continue
    }

    // Fetch the real ID assigned by Supabase
    const { data: inserted } = await supabase
      .from('companies')
      .select('id')
      .eq('domain', c.domain)
      .single()

    if (!inserted) { console.error(`[✗] Could not fetch ID for ${c.name}`); continue }
    const realId = inserted.id
    console.log(`[✓] Company: ${c.name} (id=${realId})`)

    // Upsert signals
    for (const s of c.signals) {
      await supabase.from('signals').insert({
        company_id: realId,
        type: s.type,
        detail: s.detail,
        source: s.source,
        pain_points: s.pain_points,
      })
    }

    // Create a mock report entry so the live counter page works
    const slug = c.domain.replace(/\./g, '-')
    const pageUrl = `https://phantom-pipeline.com/${slug}`

    const { error: reportErr } = await supabase
      .from('reports')
      .upsert({
        company_id: realId,
        personal_page_slug: slug,
        personal_page_url: pageUrl,
        status: 'ready',
        pdf_url: null,
        video_url: null,
      }, { onConflict: 'company_id' })

    if (reportErr) {
      console.error(`[✗] Report ${c.name}:`, reportErr.message)
    } else {
      console.log(`[✓] Report: ${c.name} → /${slug}`)
    }
  }

  console.log('\nDone! Pages available at:')
  for (const c of companies) {
    console.log(`  http://localhost:3000/${c.domain.replace(/\./g, '-')}`)
  }
}

seed().catch(console.error)