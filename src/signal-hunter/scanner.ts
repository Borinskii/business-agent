/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Signal Hunter — Main scanner
 * Orchestrates sources, handles dedup, rate limiting, DB writes
 */

import { supabase, log } from '../lib/supabase'
import { scanLinkedIn }  from './sources/linkedin'
import { scanCrunchbase } from './sources/crunchbase'
import { scanG2Reviews } from './sources/g2'
import type { RawSignal } from './sources/linkedin'

export type ScanSource = 'linkedin' | 'crunchbase' | 'g2'

export interface ScannerResult {
  scanned:    number
  found:      number
  queued:     number
  duplicates: number
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<ScanSource, string> = {
  linkedin:   'LinkedIn',
  crunchbase: 'Crunchbase',
  g2:         'G2',
}

async function isRateLimited(source: ScanSource): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('signals')
    .select('id')
    .eq('source', SOURCE_LABEL[source])
    .gte('detected_at', sixHoursAgo)
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ─── Deduplication ────────────────────────────────────────────────────────────

async function findCompanyByDomain(domain: string): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('domain', domain)
    .limit(1)
    .single()
  return data?.id ?? null
}

// ─── pain_score recalculation ─────────────────────────────────────────────────

async function recalculatePainScore(companyId: string): Promise<void> {
  const { data } = await supabase
    .from('signals')
    .select('pain_points')
    .eq('company_id', companyId)
    .eq('archived', false)

  const total = Math.min(
    (data ?? []).reduce((sum, s) => sum + (s.pain_points as number), 0),
    100
  )

  await supabase
    .from('companies')
    .update({ pain_score: total })
    .eq('id', companyId)
}

// ─── Process one raw signal ───────────────────────────────────────────────────

async function processSignal(raw: RawSignal): Promise<'queued' | 'duplicate'> {
  const existingId = await findCompanyByDomain(raw.companyDomain)

  let companyId: string

  if (existingId) {
    // Company already exists — add new signal only
    companyId = existingId
    log(`[scanner] duplicate domain ${raw.companyDomain} → adding signal to existing company`)
  } else {
    // New company — create record
    const { data: created, error } = await supabase
      .from('companies')
      .insert({
        name:   raw.companyName,
        domain: raw.companyDomain,
        status: 'detected',
      })
      .select('id')
      .single()

    if (error || !created) {
      log(`[scanner] failed to create company ${raw.companyDomain}: ${error?.message}`)
      return 'duplicate'
    }
    companyId = created.id as string
    log(`[scanner] created company ${raw.companyDomain} (${raw.companyName})`)
  }

  // Insert signal
  const { error: signalError } = await supabase
    .from('signals')
    .insert({
      company_id:  companyId,
      type:        raw.signalType,
      detail:      raw.detail,
      source:      raw.source,
      source_url:  raw.sourceUrl,
      raw_data:    raw.rawData,
      pain_points: raw.painPoints,
    })

  if (signalError) {
    log(`[scanner] failed to insert signal for ${raw.companyDomain}: ${signalError.message}`)
    return 'duplicate'
  }

  await recalculatePainScore(companyId)

  return existingId ? 'duplicate' : 'queued'
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runScan(source: ScanSource, limit: number): Promise<ScannerResult> {
  // Rate limit check
  if (await isRateLimited(source)) {
    log(`[scanner] ${SOURCE_LABEL[source]} scan skipped — already scanned within 6 hours`)
    return { scanned: 0, found: 0, queued: 0, duplicates: 0 }
  }

  log(`[scanner] Scanning ${SOURCE_LABEL[source]}...`)

  let rawSignals: RawSignal[] = []
  try {
    if (source === 'linkedin') {
      rawSignals = await scanLinkedIn(limit)
    } else if (source === 'crunchbase') {
      rawSignals = await scanCrunchbase(limit)
    } else if (source === 'g2') {
      // G2 inserts directly into the database to handle unique review deduplication safely
      await scanG2Reviews('instantly')
      await scanG2Reviews('apollo-io')
      return { scanned: limit, found: 0, queued: 0, duplicates: 0 } 
    }
  } catch (e: unknown) {
    log(`[scanner] ${SOURCE_LABEL[source]} scan error: ${(e as Error).message}`)
    throw e
  }

  log(`[scanner] Found ${rawSignals.length} signals from ${SOURCE_LABEL[source]}`)

  let queued = 0
  let duplicates = 0

  for (const raw of rawSignals) {
    const result = await processSignal(raw)
    if (result === 'queued') queued++
    else duplicates++
  }

  return {
    scanned:    limit,
    found:      rawSignals.length,
    queued,
    duplicates,
  }
}