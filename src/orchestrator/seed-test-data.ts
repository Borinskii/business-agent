/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Seed 3 mock companies into Supabase for integration testing.
 * Sets status='content_generated', fills salesforce_contact_id,
 * and creates matching reports with status='ready'.
 *
 * Usage: npx ts-node src/orchestrator/seed-test-data.ts
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { supabase, log } from '../lib/supabase'
import companies from '../mocks/companies.json'

const APP_URL = process.env.APP_URL ?? 'https://phantom-pipeline.com'

// Valid UUIDs for test companies (deterministic, based on mock index)
const TEST_UUIDS = [
  '00000001-0000-4000-a000-000000000001',
  '00000002-0000-4000-a000-000000000002',
  '00000003-0000-4000-a000-000000000003',
]

async function main(): Promise<void> {
  log('[seed] Seeding 3 mock companies for integration test...')

  const seededIds: string[] = []

  for (const raw of companies) {
    const domain = raw.domain
    const slug = domain.replace(/\./g, '-')

    // Check if company already exists by domain
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('domain', domain)
      .maybeSingle()

    let companyId: string

    if (existing) {
      // Update existing company
      companyId = existing.id as string
      const { error: cErr } = await supabase
        .from('companies')
        .update({
          salesforce_contact_id: `cnt_test_${domain.replace(/\./g, '_')}`,
          status:                'content_generated',
        })
        .eq('id', companyId)

      if (cErr) {
        log(`[seed] Company ${raw.name} update failed: ${cErr.message}`)
        continue
      }
      log(`[✓] Company: ${raw.name} (${companyId}) → content_generated (updated existing)`)
    } else {
      // Insert new company
      const { data: inserted, error: cErr } = await supabase
        .from('companies')
        .insert({
          name:                  raw.name,
          domain,
          logo_url:              raw.logo_url,
          industry:              raw.industry,
          size:                  raw.size,
          location:              raw.location,
          icp:                   raw.icp,
          acv_estimate:          raw.acv_estimate,
          sdr_count:             raw.sdr_count,
          pain_score:            raw.pain_score,
          monthly_loss_estimate: raw.monthly_loss_estimate,
          decision_maker:        raw.decision_maker,
          tech_stack:            raw.tech_stack,
          competitor_using_ai:   raw.competitor_using_ai,
          salesforce_contact_id: `cnt_test_${domain.replace(/\./g, '_')}`,
          status:                'content_generated',
        })
        .select('id')
        .single()

      if (cErr || !inserted) {
        log(`[seed] Company ${raw.name} insert failed: ${cErr?.message ?? 'no data'}`)
        continue
      }
      companyId = inserted.id as string
      log(`[✓] Company: ${raw.name} (${companyId}) → content_generated (inserted)`)
    }

    seededIds.push(companyId)

    // Upsert report with status='ready'
    const { error: rErr } = await supabase
      .from('reports')
      .upsert({
        company_id:         companyId,
        pdf_url:            `${APP_URL}/reports/${slug}.pdf`,
        video_url:          `${APP_URL}/videos/${slug}.mp4`,
        personal_page_slug: slug,
        personal_page_url:  `${APP_URL}/p/${slug}`,
        status:             'ready',
        video_provider:     'sora',
        generated_at:       new Date().toISOString(),
      }, { onConflict: 'company_id' })

    if (rErr) {
      log(`[seed] Report for ${raw.name} upsert failed: ${rErr.message}`)
      continue
    }
    log(`[✓] Report: ${raw.name} → ready (pdf + video URLs set)`)
  }

  // Clean up any existing sequences for these companies so orchestrator can re-create
  const ids = seededIds
  const { error: delErr } = await supabase
    .from('sequences')
    .delete()
    .in('company_id', ids)

  if (delErr) {
    log(`[seed] Sequence cleanup warning: ${delErr.message}`)
  } else {
    log('[✓] Cleaned up existing sequences for test companies')
  }

  log('[seed] Done — ready for integration test')
}

main().catch(err => {
  console.error(`[seed] Fatal: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})