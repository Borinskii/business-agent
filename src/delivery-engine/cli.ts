/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { createSequence, createSequenceCore } from './index'
import { log } from '../lib/supabase'
import type { Company, Report } from '../types/company'

// --- MOCK DATA ----------------------------------------------------------------

const MOCK_COMPANY: Company = {
  id:                    'mock-001-0000-0000-0000-000000000001',
  name:                  'Acme Corp',
  domain:                'acmecorp.com',
  logo_url:              null,
  industry:              'SaaS',
  size:                  150,
  location:              'San Francisco, CA',
  icp:                   'B2B SaaS companies 50-500 employees',
  acv_estimate:          25000,
  sdr_count:             6,
  pain_score:            75,
  decision_maker: {
    name:         'Alex Johnson',
    title:        'VP of Sales',
    email:        'alex@acmecorp.com',
    linkedin_url: 'https://linkedin.com/in/alexjohnson',
  },
  tech_stack:            ['Salesforce', 'Outreach', 'LinkedIn Sales Nav'],
  competitor_using_ai:   null,
  monthly_loss_estimate: 11418,
  salesforce_contact_id: 'cnt_mock_test_001',
  status:                'content_generated',
  created_at:            new Date().toISOString(),
  updated_at:            new Date().toISOString(),
}

const MOCK_REPORT: Report = {
  id:                 'mock-rep-0000-0000-0000-000000000001',
  company_id:         'mock-001-0000-0000-0000-000000000001',
  pdf_url:            'http://104.248.112.79/reports/acmecorp.pdf',
  video_url:          'http://104.248.112.79/videos/acmecorp.mp4',
  personal_page_slug: 'acmecorp-com',
  personal_page_url:  'http://104.248.112.79/p/acmecorp-com',
  win_card_url:       null,
  status:             'ready',
  failure_reason:     null,
  video_provider:     'sora',
  video_script:       null,
  generated_at:       new Date().toISOString(),
  created_at:         new Date().toISOString(),
}

// --- MAIN ---------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const companyIdIdx = args.indexOf('--company-id')
  const companyId = companyIdIdx !== -1
    ? args[companyIdIdx + 1]
    : args.find(a => a.startsWith('--company-id='))?.split('=')[1]

  if (!companyId) {
    console.error('Usage: npx ts-node src/delivery-engine/cli.ts --company-id <uuid|mock-xxx>')
    process.exit(1)
  }

  const isMock = companyId.startsWith('mock-')

  try {
    if (isMock) {
      log('[delivery-engine] Running in MOCK mode (dry-run, no external API calls)')
      const result = await createSequenceCore(MOCK_COMPANY, MOCK_REPORT, {
        skipSupabaseSave: true,
        dryRun: true,
      })
      log(`[✓] Mock run complete`)
      log(`[✓] Workspace: ${result.workspace_id}`)
      log(`[✓] Sequence: ${result.salesforge_sequence_id}`)
    } else {
      const result = await createSequence(companyId)
      log(`[OK] Sequence created: ${result.sequence_id}`)
      log(`[OK] Salesforge sequence: ${result.salesforge_sequence_id}`)
      log(`[OK] Workspace: ${result.workspace_id}`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: number }).code
    console.error(`[X] Error${code ? ` (${code})` : ''}: ${msg}`)
    process.exit(1)
  }
}

main()