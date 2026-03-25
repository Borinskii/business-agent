/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Day 1 check: verify Salesforge API access
 * Usage: npx ts-node src/lib/check-salesforge.ts
 */

import * as dotenv from 'dotenv'
dotenv.config()

const BASE_URL = 'https://api.salesforge.ai/public/v2'

async function main() {
  const key = process.env.SALESFORGE_API_KEY
  if (!key) {
    console.error('[✗] SALESFORGE_API_KEY not set in .env')
    process.exit(1)
  }

  console.log('[~] Checking Salesforge API access...')

  // GET /me
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: key }
  })

  if (!meRes.ok) {
    const text = await meRes.text()
    console.error(`[✗] GET /me failed: ${meRes.status} ${text}`)
    process.exit(1)
  }

  const me = await meRes.json() as Record<string, unknown>
  console.log('[✓] GET /me →', JSON.stringify(me, null, 2))

  // GET workspace
  const wsId = process.env.SALESFORGE_WORKSPACE_ID ?? 'wks_7cksiak4q2sqw6mawjut'
  const wsRes = await fetch(`${BASE_URL}/workspaces/${wsId}`, {
    headers: { Authorization: key }
  })

  if (!wsRes.ok) {
    const text = await wsRes.text()
    console.error(`[✗] GET /workspaces/${wsId} failed: ${wsRes.status} ${text}`)
    process.exit(1)
  }

  const ws = await wsRes.json() as Record<string, unknown>
  console.log(`[✓] Workspace ${wsId} →`, JSON.stringify(ws, null, 2))
  console.log('[✓] Salesforge API is accessible — ready for Day 2')
}

main().catch(err => {
  console.error('[✗] Unexpected error:', err)
  process.exit(1)
})