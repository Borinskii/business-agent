/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Video Generator CLI
 * Usage:
 *   npx ts-node src/video-generator/cli.ts --company-id <uuid>
 *   npx ts-node src/video-generator/cli.ts --domain talentflow.io
 *   npx ts-node src/video-generator/cli.ts --all
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { generateVideo } from './generate'

async function main() {
  const args = process.argv.slice(2)

  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (args.includes('--all')) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, domain')
      .neq('status', 'detected')

    if (!companies?.length) { console.log('No companies found.'); return }

    console.log(`Found ${companies.length} companies. Generating videos...\n`)
    for (const c of companies) {
      console.log(`\n═══ ${c.name} (${c.domain}) ═══`)
      try {
        const result = await generateVideo(c.id)
        console.log(`[✓] Provider: ${result.video_provider}`)
        if (result.video_url) console.log(`[✓] URL: ${result.video_url}`)
      } catch (err) {
        console.error(`[✗] Failed: ${err instanceof Error ? err.message : err}`)
      }
    }
    return
  }

  const idIdx = args.indexOf('--company-id')
  if (idIdx !== -1) {
    const companyId = args[idIdx + 1]
    if (!companyId) { console.error('Missing --company-id value'); process.exit(1) }
    console.log(`\n═══ Generating video for: ${companyId} ═══\n`)
    const result = await generateVideo(companyId)
    console.log(`\n[✓] Done! Provider: ${result.video_provider}`)
    if (result.video_url) console.log(`    URL: ${result.video_url}`)
    return
  }

  const domainIdx = args.indexOf('--domain')
  if (domainIdx !== -1) {
    const domain = args[domainIdx + 1]
    if (!domain) { console.error('Missing --domain value'); process.exit(1) }

    const { data: company } = await supabase
      .from('companies').select('id, name').eq('domain', domain).single()

    if (!company) { console.error(`Company not found: ${domain}`); process.exit(1) }

    console.log(`\n═══ Generating video for ${company.name} (${domain}) ═══\n`)
    const result = await generateVideo(company.id)
    console.log(`\n[✓] Done! Provider: ${result.video_provider}`)
    if (result.video_url) console.log(`    URL: ${result.video_url}`)
    return
  }

  console.log(`Usage:
  npx ts-node src/video-generator/cli.ts --company-id <uuid>
  npx ts-node src/video-generator/cli.ts --domain talentflow.io
  npx ts-node src/video-generator/cli.ts --all`)
}

main().catch((err) => {
  console.error('[✗] Fatal:', err.message ?? err)
  process.exit(1)
})