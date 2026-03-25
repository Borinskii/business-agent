/**
 * PDF Generator CLI
 * Usage:
 *   npx ts-node src/pdf-generator/cli.ts --company-id <uuid>
 *   npx ts-node src/pdf-generator/cli.ts --domain talentflow.io
 *   npx ts-node src/pdf-generator/cli.ts --all   (generates for all profiled companies)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { generatePDF } from './generate'

// Load .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const args = process.argv.slice(2)

  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── --all flag ─────────────────────────────────────────────────────────────
  if (args.includes('--all')) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, domain')
      .eq('status', 'profiled')

    if (!companies?.length) {
      console.log('No profiled companies found.')
      return
    }

    console.log(`Found ${companies.length} profiled companies. Generating PDFs...\n`)

    for (const c of companies) {
      console.log(`\n═══ ${c.name} (${c.domain}) ═══`)
      try {
        const result = await generatePDF(c.id)
        console.log(`[✓] PDF URL: ${result.pdf_url}`)
        console.log(`[✓] Page:    ${result.personal_page_url}`)
      } catch (err) {
        console.error(`[✗] Failed: ${err instanceof Error ? err.message : err}`)
      }
    }
    return
  }

  // ── --company-id ───────────────────────────────────────────────────────────
  const idIdx = args.indexOf('--company-id')
  if (idIdx !== -1) {
    const companyId = args[idIdx + 1]
    if (!companyId) { console.error('Missing value for --company-id'); process.exit(1) }

    console.log(`\n═══ Generating PDF for company: ${companyId} ═══\n`)
    const result = await generatePDF(companyId)
    console.log(`\n[✓] Done!`)
    console.log(`    PDF URL:  ${result.pdf_url}`)
    console.log(`    Page URL: ${result.personal_page_url}`)
    return
  }

  // ── --domain ───────────────────────────────────────────────────────────────
  const domainIdx = args.indexOf('--domain')
  if (domainIdx !== -1) {
    const domain = args[domainIdx + 1]
    if (!domain) { console.error('Missing value for --domain'); process.exit(1) }

    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('domain', domain)
      .single()

    if (!company) { console.error(`Company not found for domain: ${domain}`); process.exit(1) }

    console.log(`\n═══ Generating PDF for ${company.name} (${domain}) ═══\n`)
    const result = await generatePDF(company.id)
    console.log(`\n[✓] Done!`)
    console.log(`    PDF URL:  ${result.pdf_url}`)
    console.log(`    Page URL: ${result.personal_page_url}`)
    return
  }

  console.log(`Usage:
  npx ts-node src/pdf-generator/cli.ts --company-id <uuid>
  npx ts-node src/pdf-generator/cli.ts --domain talentflow.io
  npx ts-node src/pdf-generator/cli.ts --all`)
}

main().catch((err) => {
  console.error('[✗] Fatal:', err.message ?? err)
  process.exit(1)
})
