import * as dotenv from 'dotenv'
dotenv.config()

import { sf } from '../lib/salesforge'
import { lf } from '../lib/leadsforge'
import { supabase, log } from '../lib/supabase'
import type {
  Company,
  Pilot,
  PilotResults,
  LiveConversation,
} from '../types/company'
import type { LfPersonSearchRequest, LfLead } from '../lib/leadsforge'

// ─── SALESFORGE RESPONSE TYPES ──────────────────────────────────────────────

interface SFWorkspace { id: string }
interface SFSequence { id: string }
interface SFMailbox { id: string; active?: boolean }

interface SFAnalytics {
  sent: number
  openRate: number
  positiveReplies: number
  replyRate: number
}

interface SFThread {
  contactName: string
  contactCompany: string
  lastMessage?: string
  label?: string
}

// ─── OPTIONS ────────────────────────────────────────────────────────────────

export interface StartPilotOptions {
  /** Skip all external API calls — log only */
  dryRun?: boolean
  /** Skip Supabase reads/writes */
  skipSupabase?: boolean
}

// ─── START PILOT ────────────────────────────────────────────────────────────

export async function startPilot(
  companyId: string,
  icp: string,
  opts: StartPilotOptions = {}
): Promise<{ pilotId: string; status: string; contactsCount: number }> {
  // Validate ICP length
  if (icp.length < 10) {
    throw Object.assign(new Error('icp_description_too_short'), { code: 400 })
  }

  // Load company
  let company: Company

  if (opts.dryRun || opts.skipSupabase) {
    company = MOCK_COMPANY
    company.id = companyId
    log('[pilot-runner] DRY RUN — using mock company data')
  } else {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error || !data) {
      throw Object.assign(new Error('company_not_found'), { code: 404 })
    }
    company = data as Company

    // Check status
    if (company.status !== 'responded') {
      throw Object.assign(
        new Error(`company status must be 'responded', got '${company.status}'`),
        { code: 422 }
      )
    }

    // Check no active pilot
    const { data: existingPilot } = await supabase
      .from('pilots')
      .select('id')
      .eq('company_id', companyId)
      .in('status', ['pending', 'running'])
      .maybeSingle()

    if (existingPilot) {
      throw Object.assign(new Error('pilot_already_running'), { code: 409 })
    }
  }

  if (opts.dryRun) {
    log(`[✓] Pilot workspace: wks_pilot_dryrun_${company.domain}`)
    log(`[✓] Product creation skipped (no SALESFORGE_PRODUCT_ID)`)
    log(`[✓] Leadsforge: found 50 leads matching ICP (mock)`)
    log(`[✓] Bulk upload: 50 contacts`)
    log(`[✓] Sequence created, leads enrolled`)
    log(`[✓] Pilot running — results in 48h`)
    log(`[⏰] Scheduled: collectPilotResults (dry-run, no actual timer)`)
    return { pilotId: 'dryrun-pilot-' + Date.now(), status: 'running', contactsCount: 50 }
  }

  // ── Step 1: Create isolated workspace for pilot ───────────────────────
  log(`[pilot-runner] Creating pilot workspace for ${company.name}`)
  const pilotWorkspace = await sf.post<SFWorkspace>('/workspaces', {
    name: `PILOT_${company.domain}_${Date.now()}`,
  })
  log(`[✓] Pilot workspace: ${pilotWorkspace.id}`)

  // ── Step 2: Create product (knowledge base) in pilot workspace ─────
  log('[pilot-runner] Creating product (knowledge base)...')
  let pilotProductId: string | null = null
  try {
    interface SFProductResponse { id: string }
    const signals = await supabase
      .from('signals')
      .select('detail')
      .eq('company_id', companyId)
      .limit(1)
    const signalDetail = (signals.data?.[0] as { detail: string } | undefined)?.detail ?? ''

    const product = await sf.post<SFProductResponse>(
      `/workspaces/${pilotWorkspace.id}/products`,
      {
        product: {
          name:                 company.name,
          idealCustomerProfile: icp,
          pain:                 `Key problem: ${signalDetail || 'scaling outbound sales efficiently'}`,
          solution:             `${company.name} helps ${company.icp ?? 'businesses'} solve this`,
          language:             'american_english',
        },
      }
    )
    pilotProductId = product.id
    log(`[✓] Product created: ${pilotProductId}`)
  } catch (err) {
    log(`[~] Product creation failed: ${err instanceof Error ? err.message : String(err)} — continuing`)
  }

  // ── Step 3: Find 50 leads via Leadsforge ──────────────────────────────
  log(`[pilot-runner] Searching Leadsforge for: "${icp}"`)
  const searchBody: LfPersonSearchRequest = {
    jobTitle: icp,
    country: 'US',
    limit: 50,
  }
  const searchResult = await lf.post<{ leads: LfLead[] }>('/contacts/search', searchBody)
  const leads = searchResult.leads ?? []
  log(`[✓] Leadsforge: found ${leads.length} leads matching ICP`)

  // Check minimum leads
  if (leads.length < 10) {
    log(`[✗] Only ${leads.length} leads found — minimum is 10. Stopping pilot.`)

    if (!opts.skipSupabase) {
      await supabase.from('pilots').insert({
        company_id:      companyId,
        workspace_id:    pilotWorkspace.id,
        sequence_id:     '',
        icp_description: icp,
        contacts_count:  leads.length,
        status:          'failed',
        started_at:      new Date().toISOString(),
      })
    }

    throw Object.assign(
      new Error(`leadsforge_insufficient_leads: only ${leads.length} found, need >= 10`),
      { code: 422 }
    )
  }

  // ── Step 4: Bulk upload leads to pilot workspace ──────────────────────
  log('[pilot-runner] Uploading leads...')
  await sf.post(`/workspaces/${pilotWorkspace.id}/contacts/bulk`, {
    contacts: leads.map(l => ({
      email:       l.firstName ? `${l.firstName.toLowerCase()}@${l.company?.domain ?? 'unknown.com'}` : undefined,
      firstName:   l.firstName,
      lastName:    l.lastName,
      companyName: l.company?.name ?? '',
      jobTitle:    l.jobTitle ?? '',
    })),
  })
  log(`[✓] Bulk upload: ${leads.length} contacts`)

  // ── Step 5: Create sequence for pilot ─────────────────────────────────
  const senderName = company.decision_maker?.name ?? company.name
  log(`[pilot-runner] Creating pilot sequence (sender: ${senderName})`)

  // Use pilot product or fallback to env SALESFORGE_PRODUCT_ID
  const seqProductId = pilotProductId ?? process.env.SALESFORGE_PRODUCT_ID
  if (!seqProductId) {
    log('[✗] No productId available — cannot create sequence')
    throw Object.assign(new Error('no_product_id: create product in Salesforge dashboard and set SALESFORGE_PRODUCT_ID in .env'), { code: 503 })
  }

  const pilotSeq = await sf.post<SFSequence>(
    `/workspaces/${pilotWorkspace.id}/sequences`,
    {
      name:      `Pilot_${company.name}`,
      productId: seqProductId,
      senderName,
      language:  'american_english',
      timezone:  'America/New_York',
      status:    'active',
    }
  )
  log(`[✓] Sequence created: ${pilotSeq.id}`)

  // ── Step 6: Enroll leads via /sequences/{id}/import-lead ──────────────
  log('[pilot-runner] Enrolling leads...')
  let enrolledCount = 0
  for (const lead of leads) {
    const email = lead.firstName
      ? `${lead.firstName.toLowerCase()}@${lead.company?.domain ?? 'unknown.com'}`
      : null
    if (!email) continue

    try {
      await sf.put(
        `/workspaces/${pilotWorkspace.id}/sequences/${pilotSeq.id}/import-lead`,
        { email }
      )
      enrolledCount++
    } catch (err) {
      log(`[~] Failed to enroll ${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  log(`[✓] Leads enrolled: ${enrolledCount}/${leads.length}`)

  // ── Step 7: Save pilot to Supabase ────────────────────────────────────
  let pilotId = 'nosave-' + Date.now()

  if (!opts.skipSupabase) {
    const { data: pilot, error: pilotErr } = await supabase
      .from('pilots')
      .insert({
        company_id:      companyId,
        workspace_id:    pilotWorkspace.id,
        sequence_id:     pilotSeq.id,
        icp_description: icp,
        contacts_count:  enrolledCount,
        status:          'running',
        started_at:      new Date().toISOString(),
      })
      .select('id')
      .single()

    if (pilotErr || !pilot) {
      throw new Error(`Failed to save pilot: ${pilotErr?.message ?? 'no data'}`)
    }
    pilotId = pilot.id as string

    // Update company status
    await supabase
      .from('companies')
      .update({ status: 'pilot_running' })
      .eq('id', companyId)

    log('[✓] companies.status → pilot_running')
  }

  // ── Step 8: Schedule collectPilotResults in 48h ───────────────────────
  const collectAt = new Date(Date.now() + 48 * 3600 * 1000)
  setTimeout(() => {
    collectPilotResults(companyId).catch(err => {
      log(`[✗] collectPilotResults error for ${companyId}: ${err instanceof Error ? err.message : String(err)}`)
    })
  }, 48 * 3600 * 1000)
  log(`[✓] Pilot running — results in 48h`)
  log(`[⏰] Scheduled: collectPilotResults at ${collectAt.toISOString()}`)

  return { pilotId, status: 'running', contactsCount: enrolledCount }
}

// ─── COLLECT PILOT RESULTS ──────────────────────────────────────────────────

export async function collectPilotResults(companyId: string): Promise<PilotResults | null> {
  const { data: pilot, error } = await supabase
    .from('pilots')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'running')
    .single()

  if (error || !pilot) {
    log(`[collect] No running pilot found for company ${companyId}`)
    return null
  }

  const p = pilot as Pilot

  // Guard: check 48h have actually passed
  if (p.started_at) {
    const elapsed = Date.now() - new Date(p.started_at).getTime()
    if (elapsed < 48 * 3600 * 1000) {
      log(`[collect] Pilot for ${companyId} not yet 48h old — skipping`)
      return null
    }
  }

  log(`[collect] Collecting results for pilot ${p.id} (company ${companyId})`)

  // Fetch analytics from Salesforge
  let analytics: SFAnalytics = { sent: 0, openRate: 0, positiveReplies: 0, replyRate: 0 }
  try {
    analytics = await sf.get<SFAnalytics>(
      `/workspaces/${p.workspace_id}/sequences/${p.sequence_id}/analytics`
    )
  } catch (err) {
    log(`[collect] Analytics fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Fetch live threads from Primebox
  let threads: SFThread[] = []
  try {
    const res = await sf.get<SFThread[]>(
      `/workspaces/${p.workspace_id}/threads?label=action_required`
    )
    threads = Array.isArray(res) ? res : []
  } catch (err) {
    log(`[collect] Threads fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const liveConversations: LiveConversation[] = threads.slice(0, 3).map(t => ({
    prospect_name: t.contactName ?? 'Unknown',
    company:       t.contactCompany ?? 'Unknown',
    reply_preview: (t.lastMessage ?? '').substring(0, 100),
  }))

  const results: PilotResults = {
    contacts_reached: analytics.sent,
    open_rate:        analytics.openRate,
    positive_replies: analytics.positiveReplies,
    reply_rate:       analytics.replyRate,
    demos_booked:     threads.filter(t => t.label === 'meeting_requested').length,
    live_conversations: liveConversations,
  }

  // Save results
  await supabase
    .from('pilots')
    .update({
      contacts_reached:  results.contacts_reached,
      open_rate:         results.open_rate,
      positive_replies:  results.positive_replies,
      reply_rate:        results.reply_rate,
      demos_booked:      results.demos_booked,
      live_conversations: results.live_conversations,
      status:            'completed',
      completed_at:      new Date().toISOString(),
    })
    .eq('id', p.id)

  await supabase
    .from('companies')
    .update({ status: 'pilot_results_ready' })
    .eq('id', companyId)

  log(`[✓] Pilot ${p.id} completed`)
  log(`[✓] Results: ${results.contacts_reached} reached, ${results.positive_replies} positive, ${results.reply_rate}% reply rate`)
  log('[✓] companies.status → pilot_results_ready')

  // Send summary email via Primebox
  await sendPilotSummaryEmail(companyId, p, results)

  return results
}

// ─── SUMMARY EMAIL ──────────────────────────────────────────────────────────

async function sendPilotSummaryEmail(
  companyId: string,
  pilot: Pilot,
  results: PilotResults
): Promise<void> {
  const { data: company } = await supabase
    .from('companies')
    .select('name, decision_maker')
    .eq('id', companyId)
    .single()

  if (!company) {
    log('[collect] Cannot send summary — company not found')
    return
  }

  const companyName = company.name as string
  const dm = company.decision_maker as { name: string } | null
  const firstName = dm?.name?.split(' ')[0] ?? 'there'
  const bookingUrl = process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'

  const summaryBody = `Hi ${firstName},

Your 48-hour pilot just wrapped up. Here's what happened:

- Contacts reached: ${results.contacts_reached}
- Open rate: ${results.open_rate}%
- Positive replies: ${results.positive_replies}
- Reply rate: ${results.reply_rate}%
- Demos booked: ${results.demos_booked}
${results.live_conversations.length > 0
    ? `\nLive conversations:\n${results.live_conversations.map(c => `  - ${c.prospect_name} (${c.company}): "${c.reply_preview}"`).join('\n')}`
    : ''}

These are real results from real prospects matching your ICP.

Let's walk through them together — 8 minutes is all we need.

${bookingUrl}`

  // Find the mailbox in the pilot workspace to reply through
  try {
    interface SFMailboxList { data: SFMailbox[] }
    const mailboxes = await sf.get<SFMailboxList>(`/workspaces/${pilot.workspace_id}/mailboxes`)
    const mailbox = mailboxes.data?.find(m => m.active) ?? mailboxes.data?.[0]

    if (mailbox) {
      // We need a thread/email to reply to — get the main workspace mailbox
      const mainMailboxId = process.env.SALESFORGE_MAIN_MAILBOX_ID
      if (mainMailboxId) {
        await sf.post(
          `/workspaces/${pilot.workspace_id}/mailboxes/${mainMailboxId}/emails/summary/reply`,
          { body: summaryBody, subject: `${companyName} — your 48h pilot results` }
        )
        log(`[✓] Summary email sent to ${firstName}`)
      } else {
        log('[~] SALESFORGE_MAIN_MAILBOX_ID not set — summary email skipped')
      }
    }
  } catch (err) {
    log(`[~] Summary email failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ─── CRON: CHECK OVERDUE PILOTS ─────────────────────────────────────────────

export async function checkOverduePilots(): Promise<number> {
  log('[cron] Checking for overdue pilots (running > 48h)...')

  const { data: overdue, error } = await supabase
    .from('pilots')
    .select('company_id')
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString())

  if (error) {
    log(`[cron] Query error: ${error.message}`)
    return 0
  }

  if (!overdue || overdue.length === 0) {
    log('[cron] No overdue pilots found')
    return 0
  }

  log(`[cron] Found ${overdue.length} overdue pilot(s)`)

  let collected = 0
  for (const row of overdue) {
    const cid = row.company_id as string
    try {
      await collectPilotResults(cid)
      collected++
    } catch (err) {
      log(`[cron] Failed to collect for ${cid}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  log(`[cron] Collected ${collected}/${overdue.length} overdue pilots`)
  return collected
}

// ─── MOCK DATA (for dry-run) ────────────────────────────────────────────────

const MOCK_COMPANY: Company = {
  id:                    'mock-001',
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
  tech_stack:            ['Salesforce', 'Outreach'],
  competitor_using_ai:   null,
  monthly_loss_estimate: 11418,
  salesforce_contact_id: 'cnt_mock_test_001',
  status:                'responded',
  created_at:            new Date().toISOString(),
  updated_at:            new Date().toISOString(),
}
