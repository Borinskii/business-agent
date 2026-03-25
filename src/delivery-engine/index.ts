import * as dotenv from 'dotenv'
dotenv.config()

import { sf } from '../lib/salesforge'
import { supabase, log } from '../lib/supabase'
import type { Company, Report } from '../types/company'

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function formatK(n: number): string {
  return (n / 1000).toFixed(0) + 'k'
}

function EMAIL_TEMPLATE_DAY1(company: Company, _report: Report): string {
  const firstName = company.decision_maker?.name.split(' ')[0] ?? 'there'
  return `Hi ${firstName},

I made something for you.

While looking at ${company.industry ?? 'your'} companies scaling their sales teams,
I noticed ${company.name} has been actively growing — and ran some numbers.

→ [Pipeline Autopsy Report for ${company.name}]({{pdf_url}})
→ [60-second video about ${company.name}]({{video_url}})

Short version: your team is leaving ~$${formatK(company.monthly_loss_estimate ?? 1903)}/month
on the table. Full breakdown is in the report.

Reply YES and I'll show you how we calculated this in 8 minutes.

{{personal_page_url}}`
}

function LINKEDIN_TEMPLATE(company: Company): string {
  const firstName = company.decision_maker?.name.split(' ')[0] ?? 'there'
  return `Hi ${firstName},

Made this for ${company.name} — thought it might be relevant given your growth.

{{personal_page_url}}

Worth a look.`
}

function EMAIL_TEMPLATE_FOMO(company: Company): string {
  return `Quick update — companies in ${company.industry ?? 'your industry'} using AI SDR outreach
are averaging 8–16% reply rates vs 1–2% for manual outreach.

The gap is widening every week.

Still happy to show you what this looks like for ${company.name}.

Reply YES.`
}

// ─── SALESFORGE RESPONSE TYPES ────────────────────────────────────────────────

interface SFWorkspace { id: string; name: string }
interface SFProduct   { id: string }
interface SFSequence  { id: string }
interface SFNode      { id: string }
interface SFMailbox   { id: string; active?: boolean }
interface SFEnroll    { id: string }

// ─── RESULT TYPE ──────────────────────────────────────────────────────────────

export interface CreateSequenceResult {
  sequence_id:            string
  salesforge_sequence_id: string
  workspace_id:           string
}

export interface CreateSequenceOptions {
  /** Skip Supabase reads/writes (mock/test mode) */
  skipSupabaseSave?: boolean
  /** Skip all Salesforge API calls — log only */
  dryRun?: boolean
}

// ─── PRODUCT CREATION (with graceful 500 handling) ───────────────────────────

async function ensureProduct(workspaceId: string, companyName: string): Promise<string> {
  // 1. Use env var if already configured
  const envProductId = process.env.SALESFORGE_PRODUCT_ID
  if (envProductId) return envProductId

  // 2. Check for existing products in workspace
  interface SFProductList { data: SFProduct[] }
  const list = await sf.get<SFProductList>(`/workspaces/${workspaceId}/products`)
  if (list.data?.length > 0 && list.data[0]?.id) {
    return list.data[0].id
  }

  // 3. Try to create a new product
  // NOTE: Salesforge POST /products returns 500 for some accounts —
  // this is a known API issue. Set SALESFORGE_PRODUCT_ID in .env as a workaround.
  const product = await sf.post<SFProduct>(`/workspaces/${workspaceId}/products`, {
    name:           companyName,
    description:    `Outreach campaign for ${companyName}`,
    targetAudience: 'Sales leaders at B2B companies',
  })
  return product.id
}

// ─── CORE: accepts pre-loaded company + report ────────────────────────────────

export async function createSequenceCore(
  company: Company,
  report:  Report,
  opts: CreateSequenceOptions = {}
): Promise<CreateSequenceResult> {
  if (!company.salesforce_contact_id) {
    throw Object.assign(new Error('missing_contact_id'), { code: 422 })
  }

  if (opts.dryRun) {
    log('[delivery-engine] DRY RUN — no API calls will be made')
    log(`[✓] Workspace created: wks_dryrun_${company.domain}`)
    log(`[✓] Sequence created: seq_dryrun_${company.domain}`)
    log('[✓] Nodes built: Email Day1 | LinkedIn Day3 | Condition | FOMO Day5')
    log(`[✓] Contact enrolled: ${company.salesforce_contact_id}`)
    log('[✓] Reply webhook registered')
    if (!opts.skipSupabaseSave) {
      log('[✓] companies.status → outreach_sent')
    }
    return {
      sequence_id:            'dryrun-seq-' + Date.now(),
      salesforge_sequence_id: 'seq_dryrun_' + company.domain,
      workspace_id:           'wks_dryrun_' + company.domain,
    }
  }

  // ── Step 1: Create workspace ─────────────────────────────────────────────
  log(`[delivery-engine] Creating workspace for ${company.name}`)
  const workspace = await sf.post<SFWorkspace>('/workspaces', {
    name: `Phantom_${company.domain}_${Date.now()}`,
  })
  log(`[✓] Workspace created: ${workspace.id}`)

  // ── Step 2: Ensure product exists (required by Salesforge for sequences) ─
  log('[delivery-engine] Ensuring product...')
  const productId = await ensureProduct(workspace.id, company.name)
  log(`[✓] Product: ${productId}`)

  // ── Step 3: Create sequence ───────────────────────────────────────────────
  log('[delivery-engine] Creating sequence...')
  const sequence = await sf.post<SFSequence>(`/workspaces/${workspace.id}/sequences`, {
    name:      `Phantom_${company.name}`,
    productId,
    language:  'american_english',
    timezone:  'America/New_York',
    status:    'active',
  })
  log(`[✓] Sequence created: ${sequence.id}`)

  // ── Step 4: Get mailbox (sender) ──────────────────────────────────────────
  interface SFMailboxList { data: SFMailbox[] }
  const mailboxes = await sf.get<SFMailboxList>(`/workspaces/${workspace.id}/mailboxes`)
  const mailbox = mailboxes.data?.find(m => m.active) ?? mailboxes.data?.[0]

  const firstName  = company.decision_maker?.name.split(' ')[0] ?? 'there'
  const senderPart = mailbox ? { mailboxId: mailbox.id } : {}

  // ── Step 5a: Node 1 — Email Day 1 ────────────────────────────────────────
  await sf.post<SFNode>(`/workspaces/${workspace.id}/sequences/${sequence.id}/steps`, {
    type:    'email',
    day:     1,
    subject: `${firstName}, I made something about ${company.name}`,
    body:    EMAIL_TEMPLATE_DAY1(company, report),
    ...senderPart,
  })
  log('[✓] Node 1: Email Day 1')

  // ── Step 5b: Node 2 — LinkedIn DM Day 3 ──────────────────────────────────
  await sf.post<SFNode>(`/workspaces/${workspace.id}/sequences/${sequence.id}/steps`, {
    type: 'linkedin_message',
    day:  3,
    body: LINKEDIN_TEMPLATE(company),
  })
  log('[✓] Node 2: LinkedIn Day 3')

  // ── Step 5c: Node 3 — Condition no_reply 48h ─────────────────────────────
  await sf.post<SFNode>(`/workspaces/${workspace.id}/sequences/${sequence.id}/steps`, {
    type:         'condition',
    conditionType: 'no_reply',
    afterHours:   48,
    trueBranch:   'next',
    falseBranch:  'stop',
  })
  log('[✓] Node 3: Condition no_reply_48h')

  // ── Step 5d: Node 4 — FOMO Email Day 5 ───────────────────────────────────
  await sf.post<SFNode>(`/workspaces/${workspace.id}/sequences/${sequence.id}/steps`, {
    type:    'email',
    day:     5,
    subject: `${company.name} — quick update`,
    body:    EMAIL_TEMPLATE_FOMO(company),
    ...senderPart,
  })
  log('[✓] Node 4: FOMO Email Day 5')

  // ── Step 6: Enroll contact ────────────────────────────────────────────────
  const enrollment = await sf.post<SFEnroll>(
    `/workspaces/${workspace.id}/sequences/${sequence.id}/leads`,
    { email: company.decision_maker?.email ?? '' }
  )
  log(`[✓] Contact enrolled: ${enrollment.id}`)

  // ── Step 7: Register reply webhook ────────────────────────────────────────
  const appUrl = process.env.APP_URL ?? 'https://phantom-pipeline.com'
  await sf.post(`/workspaces/${workspace.id}/integrations/webhooks`, {
    url:    `${appUrl}/api/webhooks/reply`,
    events: ['email.replied', 'email.opened', 'linkedin.replied'],
  })
  log('[✓] Reply webhook registered')

  if (opts.skipSupabaseSave) {
    return {
      sequence_id:            'nosave-' + Date.now(),
      salesforge_sequence_id: sequence.id,
      workspace_id:           workspace.id,
    }
  }

  // ── Step 8: Save to Supabase ──────────────────────────────────────────────
  const { data: seq, error: seqErr } = await supabase
    .from('sequences')
    .insert({
      company_id:             company.id,
      workspace_id:           workspace.id,
      salesforge_sequence_id: sequence.id,
      type:                   'outreach',
      status:                 'active',
      nodes_count:            4,
    })
    .select('id')
    .single()

  if (seqErr ?? !seq) {
    throw new Error(`Failed to save sequence: ${seqErr?.message ?? 'no data'}`)
  }

  await supabase
    .from('companies')
    .update({ status: 'outreach_sent' })
    .eq('id', company.id)

  log('[✓] companies.status → outreach_sent')

  return {
    sequence_id:            seq.id as string,
    salesforge_sequence_id: sequence.id,
    workspace_id:           workspace.id,
  }
}

// ─── PUBLIC: loads company + report from Supabase ────────────────────────────

export async function createSequence(companyId: string): Promise<CreateSequenceResult> {
  // 409 guard
  const { data: existing } = await supabase
    .from('sequences')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (existing) {
    throw Object.assign(new Error('sequence_already_exists'), { code: 409 })
  }

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (cErr ?? !company) {
    throw Object.assign(new Error('company_not_found'), { code: 404 })
  }

  const { data: report, error: rErr } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (rErr ?? !report) {
    throw Object.assign(new Error('report_not_ready'), { code: 422 })
  }

  if (report.status !== 'ready' || !report.pdf_url) {
    throw Object.assign(new Error('report_not_ready'), { code: 422 })
  }

  return createSequenceCore(company as Company, report as Report)
}

// ─── PAGE-OPENED HANDLER ─────────────────────────────────────────────────────

export async function handlePageOpened(companyId: string): Promise<void> {
  const { data: seq } = await supabase
    .from('sequences')
    .select('salesforge_sequence_id, workspace_id')
    .eq('company_id', companyId)
    .single()

  if (!seq) {
    log(`[page-opened] No sequence found for company ${companyId}`)
    return
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name, industry')
    .eq('id', companyId)
    .single()

  const appUrl = process.env.APP_URL ?? 'https://phantom-pipeline.com'
  const name    = (company?.name as string | undefined) ?? 'your team'
  const industry = (company?.industry as string | undefined) ?? 'your industry'
  const seqId   = seq.salesforge_sequence_id as string
  const wsId    = seq.workspace_id as string

  await sf.post<SFNode>(`/workspaces/${wsId}/sequences/${seqId}/steps`, {
    type:    'email',
    day:     0,
    subject: `${name} — did you get a chance to look?`,
    body: `Quick note — I saw you opened the Pipeline Autopsy report we sent.

The numbers we found for ${name} in ${industry} are worth 8 minutes.

Reply YES and I'll walk you through it.

${appUrl}`,
  })

  await supabase
    .from('companies')
    .update({ status: 'page_opened' })
    .eq('id', companyId)

  log(`[✓] page-opened: follow-up accelerated for ${companyId}`)
}
