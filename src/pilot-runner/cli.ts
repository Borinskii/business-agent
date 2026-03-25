/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { startPilot } from './index'
import { log } from '../lib/supabase'

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse --company-id
  const cidIdx = args.indexOf('--company-id')
  const companyId = cidIdx !== -1
    ? args[cidIdx + 1]
    : args.find(a => a.startsWith('--company-id='))?.split('=')[1]

  // Parse --icp
  const icpIdx = args.indexOf('--icp')
  const icp = icpIdx !== -1
    ? args[icpIdx + 1]
    : args.find(a => a.startsWith('--icp='))?.split('=')[1]

  if (!companyId || !icp) {
    console.error('Usage: npx ts-node src/pilot-runner/cli.ts --company-id <uuid|mock-xxx> --icp "ICP description"')
    process.exit(1)
  }

  const isMock = companyId.startsWith('mock-')

  try {
    log(`[pilot-runner] Starting pilot for ${companyId}`)
    log(`[pilot-runner] ICP: "${icp}"`)

    const result = await startPilot(companyId, icp, {
      dryRun:      isMock,
      skipSupabase: isMock,
    })

    log(`[✓] Pilot started: ${result.pilotId}`)
    log(`[✓] Status: ${result.status}`)
    log(`[✓] Contacts: ${result.contactsCount}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: number }).code
    console.error(`[✗] Error${code ? ` (${code})` : ''}: ${msg}`)
    process.exit(1)
  }
}

main()