/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Orchestrator — main loop for Phantom Pipeline Person 3
 *
 * Every 5 minutes:
 *   1. Find companies with status='content_generated' + reports.status='ready'
 *   2. Create Salesforge sequence for each
 *   3. Run checkOverduePilots (cron safety net)
 *
 * Usage:
 *   npm run orchestrate              # continuous loop (every 5 min)
 *   npm run orchestrate -- --once    # single pass then exit
 *   npm run orchestrate -- --dry-run # log only, no API calls
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { createSequence } from '../delivery-engine/index'
import { checkOverduePilots } from '../pilot-runner/index'
import { supabase, log } from '../lib/supabase'

const INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface ReadyCompany {
  id: string
  name: string
  domain: string
  status: string
}

// ─── SINGLE PASS ────────────────────────────────────────────────────────────

async function runOnce(dryRun: boolean): Promise<void> {
  log('[orchestrator] ─── Starting pass ───')

  // Step 1: Find companies ready for outreach
  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      id, name, domain, status,
      reports!inner ( status, pdf_url )
    `)
    .eq('status', 'content_generated')
    .eq('reports.status', 'ready')
    .not('reports.pdf_url', 'is', null)

  if (error) {
    log(`[orchestrator] Supabase query error: ${error.message}`)
    return
  }

  const ready = (companies ?? []) as unknown as ReadyCompany[]
  log(`[orchestrator] Found ${ready.length} companies ready for outreach`)

  // Step 2: Create sequence for each
  let succeeded = 0
  let failed = 0

  for (const company of ready) {
    try {
      if (dryRun) {
        log(`[orchestrator] DRY RUN — would create sequence for ${company.name} (${company.id})`)
        succeeded++
        continue
      }

      log(`[orchestrator] Creating sequence for ${company.name} (${company.id})...`)
      const result = await createSequence(company.id)
      log(`[✓] ${company.name}: sequence ${result.salesforge_sequence_id} in workspace ${result.workspace_id}`)
      succeeded++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const code = (err as { code?: number }).code

      // 409 = already exists, not a real failure
      if (code === 409) {
        log(`[~] ${company.name}: sequence already exists — skipping`)
        succeeded++
      } else {
        log(`[✗] ${company.name}: ${msg}`)
        failed++
      }
    }
  }

  log(`[orchestrator] Sequences: ${succeeded} ok, ${failed} failed`)

  // Step 3: Check overdue pilots
  if (!dryRun) {
    try {
      await checkOverduePilots()
    } catch (err: unknown) {
      log(`[orchestrator] checkOverduePilots error: ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    log('[orchestrator] DRY RUN — skipping checkOverduePilots')
  }

  log('[orchestrator] ─── Pass complete ───')
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const once   = args.includes('--once')
  const dryRun = args.includes('--dry-run')

  log(`[orchestrator] Mode: ${once ? 'single pass' : 'continuous'} ${dryRun ? '(dry-run)' : ''}`)

  // First pass immediately
  await runOnce(dryRun)

  if (once) {
    log('[orchestrator] Single pass complete — exiting')
    return
  }

  // Continuous loop
  log(`[orchestrator] Next pass in ${INTERVAL_MS / 1000}s`)
  setInterval(async () => {
    try {
      await runOnce(dryRun)
    } catch (err: unknown) {
      log(`[orchestrator] Unhandled error in pass: ${err instanceof Error ? err.message : String(err)}`)
    }
    log(`[orchestrator] Next pass in ${INTERVAL_MS / 1000}s`)
  }, INTERVAL_MS)
}

main().catch(err => {
  console.error(`[orchestrator] Fatal: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})