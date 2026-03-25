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

Reply YES and I'll show you how we calculated this.

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

async function ensureProduct(workspaceId: string, companyName: string): Promise<string | null> {
  // 1. Check for existing products in this workspace
  try {
    interface SFProductList { data: SFProduct[] }
    const list = await sf.get<SFProductList>(`/workspaces/${workspaceId}/products`)
    if (list.data?.length > 0 && list.data[0]?.id) {
      return list.data[0].id
    }
  } catch {
    log('[delivery-engine] Could not list products — will try to create')
  }

  // 2. Create product in this workspace using Salesforge schema: { product: { ...ProductRequest } }
  //    Products are workspace-scoped — env SALESFORGE_PRODUCT_ID only works for the main workspace.
  try {
    interface SFCreateProductResponse { id: string }
    const result = await sf.post<SFCreateProductResponse>(`/workspaces/${workspaceId}/products`, {
      product: {
        name:                 companyName,
        idealCustomerProfile: 'Sales leaders at B2B companies',
        pain:                 'Manual SDR outreach gets 1-2% reply rates',
        solution:             'AI-powered SDR platform with 8-16% reply rates',
        language:             'american_english',
      },
    })
    return result.id
  } catch (err) {
    log(`[delivery-engine] Product creation failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
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
    log('[✓] Nodes built: Email Day1 | LinkedIn Day3 | FOMO Day5 (no reply 48h)')
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
  if (productId) {
    log(`[✓] Product: ${productId}`)
  } else {
    const msg = 'Cannot create sequence: SALESFORGE_PRODUCT_ID not set and product creation API returns 500. Create a product in Salesforge dashboard and add SALESFORGE_PRODUCT_ID=prod_xxx to .env'
    log(`[✗] ${msg}`)
    throw Object.assign(new Error(msg), { code: 503 })
  }

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

  const firstName = company.decision_maker?.name.split(' ')[0] ?? 'there'

  // ── Step 4: Add sequence steps via Standard engine ──────────────────────
  //    PUT /workspaces/{id}/sequences/{id}/steps
  //    Schema: UpdateSequenceStepsRequest { steps: UpsertStepRequest[] }
  log('[delivery-engine] Adding sequence steps...')

  interface SFStepsResponse {
    steps: Array<{ id: string; name: string }>
  }

  const stepsResult = await sf.put<SFStepsResponse>(
    `/workspaces/${workspace.id}/sequences/${sequence.id}/steps`,
    {
      steps: [
        {
          name:     'Email Day 1',
          order:    0,
          waitDays: 0,
          distributionStrategy: 'equal',
          variants: [{
            label:              'Main',
            order:              0,
            emailSubject:       `${firstName}, I made something about ${company.name}`,
            emailContent:       EMAIL_TEMPLATE_DAY1(company, report),
            status:             'active',
            distributionWeight: 100,
          }],
        },
        {
          name:     'LinkedIn Day 3',
          order:    1,
          waitDays: 2,
          distributionStrategy: 'equal',
          variants: [{
            label:              'Main',
            order:              0,
            emailSubject:       `Re: ${firstName}, I made something about ${company.name}`,
            emailContent:       LINKEDIN_TEMPLATE(company),
            status:             'active',
            distributionWeight: 100,
          }],
        },
        {
          name:     'FOMO Day 5 (no reply 48h)',
          order:    2,
          waitDays: 2,  // 2 days after Day 3 = Day 5 = ~48h no-reply window
          distributionStrategy: 'equal',
          variants: [{
            label:              'Main',
            order:              0,
            emailSubject:       `${company.name} — quick update`,
            emailContent:       EMAIL_TEMPLATE_FOMO(company),
            status:             'active',
            distributionWeight: 100,
          }],
        },
      ],
    }
  )
  const stepsCount = stepsResult.steps?.length ?? 0
  log(`[✓] Steps added: ${stepsCount} (${stepsResult.steps?.map(s => s.name).join(' | ')})`)

  // ── Step 5: Create contact + enroll ─────────────────────────────────────
  //    POST /workspaces/{id}/contacts — CreateSimpleLeadRequest
  const dm = company.decision_maker
  const contactEmail = dm?.email ?? ''

  if (contactEmail) {
    log(`[delivery-engine] Creating contact: ${contactEmail}`)
    interface SFContact { id: string }

    // Build contact payload — Salesforge rejects empty linkedinUrl and empty customVars values
    const contactPayload: Record<string, unknown> = {
      firstName:  dm?.name.split(' ')[0] ?? '',
      lastName:   dm?.name.split(' ').slice(1).join(' ') ?? '',
      email:      contactEmail,
      company:    company.name,
      position:   dm?.title ?? '',
    }

    if (dm?.linkedin_url) {
      contactPayload.linkedinUrl = dm.linkedin_url
    }

    // Only include non-empty custom_vars (Salesforge rejects empty strings)
    const customVars: Record<string, string> = {}
    if (report.pdf_url)           customVars.pdf_url = report.pdf_url
    if (report.video_url)         customVars.video_url = report.video_url
    if (report.personal_page_url) customVars.personal_page_url = report.personal_page_url
    if (Object.keys(customVars).length > 0) {
      contactPayload.customVars = customVars
    }

    const contact = await sf.post<SFContact>(`/workspaces/${workspace.id}/contacts`, contactPayload)
    log(`[✓] Contact created: ${contact.id}`)
  }

  // ── Step 6: Register reply webhook ──────────────────────────────────────
  //    POST /workspaces/{id}/integrations/webhooks — CreateWebhookRequest
  const appUrl = process.env.APP_URL ?? 'https://phantom-pipeline.com'

  interface SFWebhook { id: string }
  const webhook = await sf.post<SFWebhook>(`/workspaces/${workspace.id}/integrations/webhooks`, {
    name: `phantom_reply_${company.domain}`,
    type: 'email_replied',
    url:  `${appUrl}/api/webhooks/reply`,
  })
  log(`[✓] Reply webhook registered: ${webhook.id}`)

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
      nodes_count:            stepsCount,
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

The numbers we found for ${name} in ${industry} are worth a quick look.

Reply YES and I'll walk you through it.

${appUrl}`,
  })

  await supabase
    .from('companies')
    .update({ status: 'page_opened' })
    .eq('id', companyId)

  log(`[✓] page-opened: follow-up accelerated for ${companyId}`)
}
