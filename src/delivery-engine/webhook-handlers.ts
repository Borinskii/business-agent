import * as dotenv from 'dotenv'
dotenv.config()

import { sf } from '../lib/salesforge'
import { supabase, log } from '../lib/supabase'
import type { FrankIntent, DecisionMaker } from '../types/company'

// --- PAGE-OPENED WEBHOOK ------------------------------------------------------

export interface PageOpenedPayload {
  company_id: string
  slug:       string
}

export interface PageOpenedResult {
  ok:     true
  action: 'follow_up_accelerated'
}

export async function handlePageOpened(payload: PageOpenedPayload): Promise<PageOpenedResult> {
  const { company_id } = payload

  const { data: seq } = await supabase
    .from('sequences')
    .select('salesforge_sequence_id, workspace_id')
    .eq('company_id', company_id)
    .single()

  if (!seq) {
    log(`[page-opened] No sequence for company ${company_id}`)
    return { ok: true, action: 'follow_up_accelerated' }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name, industry')
    .eq('id', company_id)
    .single()

  const appUrl = process.env.APP_URL ?? 'https://phantom-pipeline.com'

  interface SFNode { id: string }
  await sf.post<SFNode>('/multichannel/nodes/actions', {
    sequenceId: seq.salesforge_sequence_id as string,
    type:       'send_email',
    day:        0,
    subject:    `${(company?.name as string | undefined) ?? 'your team'} — did you get a chance to look?`,
    body: `Quick note — I saw you opened the Pipeline Autopsy report we sent.

The numbers we found for ${(company?.name as string | undefined) ?? 'your team'} in ${(company?.industry as string | undefined) ?? 'your industry'} are worth 8 minutes.

Reply YES and I'll walk you through it.

${appUrl}`,
  })

  await supabase
    .from('companies')
    .update({ status: 'page_opened' })
    .eq('id', company_id)

  log(`[OK] page-opened: follow-up accelerated for ${company_id}`)
  return { ok: true, action: 'follow_up_accelerated' }
}

// --- REPLY WEBHOOK (Salesforge / Primebox) ------------------------------------

export interface ReplyWebhookPayload {
  event:        string
  threadId:     string
  workspaceId:  string
  mailboxId:    string
  emailId:      string
  contactId:    string
  messageText:  string
  sentiment?:   string
}

export interface ReplyWebhookResult {
  ok:     true
  intent: FrankIntent
  action: string
}

import { classifyIntent } from '../lib/intent-classifier'
export { classifyIntent }

export async function handleReplyWebhook(payload: ReplyWebhookPayload): Promise<ReplyWebhookResult> {
  const { emailId, workspaceId, mailboxId, threadId, contactId, messageText } = payload

  // Deduplicate by email_id
  const { data: existing } = await supabase
    .from('frank_replies')
    .select('id')
    .eq('email_id', emailId)
    .maybeSingle()

  if (existing) {
    log(`[reply-webhook] Duplicate email_id ${emailId} — skipping`)
    return { ok: true, intent: 'other', action: 'deduplicated' }
  }

  // Out-of-office check (Salesforge primebox-label)
  if (payload.sentiment === 'ooo') {
    log(`[reply-webhook] OOO detected for ${emailId} — ignoring`)
    return { ok: true, intent: 'other', action: 'ooo_ignored' }
  }

  const intent = classifyIntent(messageText)
  log(`[reply-webhook] intent=${intent} emailId=${emailId}`)

  // 1. Unsubscribe — DNC first, always
  if (intent === 'unsubscribe') {
    // Get contact email
    const { data: company } = await supabase
      .from('companies')
      .select('decision_maker, id')
      .eq('salesforce_contact_id', contactId)
      .maybeSingle()

    const decisionMaker = company?.decision_maker as DecisionMaker | null
    const email = decisionMaker?.email
    if (email) {
      await sf.post(`/workspaces/${workspaceId}/dnc/bulk`, { emails: [email] })
    }

    if (company?.id) {
      await supabase
        .from('companies')
        .update({ status: 'dnc_blocked' })
        .eq('id', company.id as string)
    }

    log(`[OK] reply-webhook: unsubscribe handled, DNC added`)
    return { ok: true, intent: 'unsubscribe', action: 'added_to_dnc' }
  }

  // 2. Positive / pilot_request — update company status
  if (intent === 'positive_intent' || intent === 'pilot_request') {
    await supabase
      .from('companies')
      .update({ status: 'responded' })
      .eq('salesforce_contact_id', contactId)

    log(`[OK] reply-webhook: companies.status -> responded`)
  }

  // 3. Other intent — save but don't auto-reply, alert operator
  if (intent === 'other') {
    await supabase.from('frank_replies').insert({
      thread_id:     threadId,
      mailbox_id:    mailboxId,
      email_id:      emailId,
      incoming_text: messageText,
      intent,
      reply_text:    '',
      status:        'draft',
    })
    log(`[reply-webhook] intent=other saved as draft — operator alert needed`)
    return { ok: true, intent: 'other', action: 'operator_alert' }
  }

  // 4. Generate reply via Claude API
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  let replyText = ''

  if (anthropicKey) {
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 400,
          system: `You are a sales rep for Salesforge.
Be helpful, concise, human. Max 4 sentences.
Always end with one soft CTA toward booking a demo at ${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}.
NEVER mention you are AI.`,
          messages: [{
            role:    'user',
            content: `Prospect message: "${messageText}"\nIntent: ${intent}\nWrite a reply.`,
          }],
        }),
      })

      interface ClaudeResponse { content: Array<{ text: string }> }
      const data = await claudeRes.json() as ClaudeResponse
      replyText = data.content[0]?.text ?? ''
    } catch (err) {
      log(`[reply-webhook] Claude API error: ${err instanceof Error ? err.message : String(err)}`)
      // Fallback reply by intent
      replyText = FALLBACK_REPLY[intent] ?? FALLBACK_REPLY.info_request ?? ''
    }
  } else {
    replyText = FALLBACK_REPLY[intent] ?? FALLBACK_REPLY.info_request ?? ''
  }

  // 5. Send reply via Primebox
  try {
    await sf.post(
      `/workspaces/${workspaceId}/mailboxes/${mailboxId}/emails/${emailId}/reply`,
      { body: replyText }
    )
  } catch (err) {
    log(`[reply-webhook] Primebox reply failed: ${err instanceof Error ? err.message : String(err)}`)
    await supabase.from('frank_replies').insert({
      thread_id:     threadId,
      mailbox_id:    mailboxId,
      email_id:      emailId,
      incoming_text: messageText,
      intent,
      reply_text:    replyText,
      status:        'failed',
    })
    return { ok: true, intent, action: 'reply_failed' }
  }

  // 6. Save to frank_replies
  await supabase.from('frank_replies').insert({
    thread_id:     threadId,
    mailbox_id:    mailboxId,
    email_id:      emailId,
    incoming_text: messageText,
    intent,
    reply_text:    replyText,
    status:        'sent',
    sent_at:       new Date().toISOString(),
  })

  log(`[OK] reply-webhook: reply sent, saved to frank_replies`)
  return { ok: true, intent, action: 'reply_sent' }
}

// --- FALLBACK REPLIES ---------------------------------------------------------

const FALLBACK_REPLY: Partial<Record<FrankIntent, string>> = {
  pricing_question: `Happy to share pricing details — they're flexible based on team size and goals.

Best to walk you through it in context of what we found for your team. Book a quick 8-minute call: ${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}`,

  demo_request: `Great — let's set that up.

Here's my calendar: ${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}

8 minutes is all we need.`,

  positive_intent: `Glad it's relevant.

Let me show you exactly how this applies to your team — takes 8 minutes.

${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}`,

  info_request: `Happy to explain how it works.

Quickest way is a live demo — I can show you the exact methodology we used for your numbers in 8 minutes.

${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}`,

  pilot_request: `Yes, we can run a 48-hour free pilot — you'd see real results before committing to anything.

Let's set it up: ${process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'}`,
}
