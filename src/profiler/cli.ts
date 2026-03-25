#!/usr/bin/env ts-node
/**
 * Company Profiler CLI
 * Usage: npx ts-node src/profiler/cli.ts --company-id <uuid>
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { profileCompany } from './profiler'
import { log } from '../lib/supabase'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const idIdx = args.indexOf('--company-id')

  if (idIdx === -1 || !args[idIdx + 1]) {
    console.error('Usage: npx ts-node src/profiler/cli.ts --company-id <uuid>')
    process.exit(1)
  }

  const companyId = args[idIdx + 1]
  log(`Profiling company: ${companyId}`)

  try {
    const result = await profileCompany(companyId)
    const c = result.company

    log(`[✓] Name: ${c.name}`)
    log(`[✓] Industry: ${c.industry ?? 'unknown'} | Size: ${c.size ?? '?'} | Location: ${c.location ?? 'unknown'}`)
    log(`[✓] Decision maker: ${c.decision_maker?.name ?? 'NOT FOUND'} <${c.decision_maker?.email ?? 'NO EMAIL'}> ${c.decision_maker?.title ?? ''}`)
    log(`[✓] Tech stack: ${JSON.stringify(c.tech_stack)}`)
    log(`[✓] monthly_loss_estimate: $${c.monthly_loss_estimate?.toLocaleString() ?? '?'}`)
    log(`[✓] enrichment_score: ${result.enrichmentScore}`)
    log(`[✓] Status: ${c.status}`)

    if (result.missingFields.length > 0) {
      log(`[!] Missing fields: ${result.missingFields.join(', ')}`)
    }
  } catch (e: unknown) {
    const msg = (e as Error).message
    if (msg.startsWith('company_not_found')) {
      log(`Error: company not found — ${companyId}`)
    } else if (msg === 'enrichment_failed') {
      log('Error: Leadsforge enrichment failed — check LEADSFORGE_API_KEY')
    } else {
      log(`Error: ${msg}`)
    }
    process.exit(1)
  }
}

main()
