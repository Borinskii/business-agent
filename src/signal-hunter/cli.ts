/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

#!/usr/bin/env ts-node
/**
 * Signal Hunter CLI
 * Usage: npx ts-node src/signal-hunter/cli.ts --source linkedin --limit 100
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { runScan, ScanSource } from './scanner'
import { log } from '../lib/supabase'

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const sourceIdx = args.indexOf('--source')
  const limitIdx  = args.indexOf('--limit')

  const source = (sourceIdx !== -1 ? args[sourceIdx + 1] : 'linkedin') as ScanSource
  const limit  = limitIdx  !== -1 ? parseInt(args[limitIdx + 1], 10) : 100

  const validSources: ScanSource[] = ['linkedin', 'crunchbase', 'g2']
  if (!validSources.includes(source)) {
    console.error(`Invalid source: ${source}. Must be one of: ${validSources.join(', ')}`)
    process.exit(1)
  }

  if (isNaN(limit) || limit <= 0) {
    console.error('Invalid limit — must be a positive integer')
    process.exit(1)
  }

  log(`Starting ${source} scan (limit: ${limit})...`)

  try {
    const result = await runScan(source, limit)
    log(`Scanned: ${result.scanned} | Found: ${result.found} | New: ${result.queued} | Duplicate: ${result.duplicates}`)
  } catch (e: unknown) {
    log(`Scan failed: ${(e as Error).message}`)
    process.exit(1)
  }
}

main()