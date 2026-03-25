/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Agent Frank via Primebox
 *
 * This module is the entrypoint for handling incoming replies from Salesforge
 * Primebox webhooks. It delegates to the core logic in webhook-handlers.ts
 * and adds the primebox-specific handleIncomingReply wrapper.
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { sf } from '../lib/salesforge'
import { supabase, log } from '../lib/supabase'
import type { FrankIntent, DecisionMaker } from '../types/company'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface PrimeboxWebhookEvent {
  event:        string
  threadId:     string
  workspaceId:  string
  mailboxId:    string
  emailId:      string
  contactId:    string
  contactEmail?: string
  messageText:  string
  sentiment?:   string   // Salesforge primebox-label
}

export interface HandleReplyResult {
  ok:      boolean
  intent:  FrankIntent
  action:  string
}

// ─── INTENT CLASSIFICATION (shared) ─────────────────────────────────────────

import { classifyIntent } from '../lib/intent-classifier'
export { classifyIntent }

// ─── FALLBACK REPLIES ───────────────────────────────────────────────────────

const BOOKING_URL = process.env.HUBSPOT_BOOKING_URL ?? 'https://meetings-eu1.hubspot.com/franksondors/'

const FALLBACK_REPLY: Partial<Record<FrankIntent, string>> = {
  pricing_question: `Happy to share pricing details — they're flexible based on team size and goals.\n\nBest to walk you through it in context of what we found for your team. Book a quick call: ${BOOKING_URL}`,
  demo_request: `Great — let's set that up.\n\nHere's my calendar: ${BOOKING_URL}\n\nPick a time that works.`,
  positive_intent: `Glad it's relevant.\n\nLet me show you exactly how this applies to your team.\n\n${BOOKING_URL}`,
  info_request: `Happy to explain how it works.\n\nQuickest way is a live demo — I can show you the exact methodology we used for your numbers.\n\n${BOOKING_URL}`,
  pilot_request: `Yes, we can run a 48-hour free pilot — you'd see real results before committing to anything.\n\nLet's set it up: ${BOOKING_URL}`,
}

// ─── CORE: handleIncomingReply ──────────────────────────────────────────────

export async function handleIncomingReply(event: PrimeboxWebhookEvent): Promise<HandleReplyResult> {
  const { emailId, workspaceId, mailboxId, threadId, contactId, messageText } = event

  // Deduplicate by email_id
  const { data: existing } = await supabase
    .from('frank_replies')
    .select('id')
    .eq('email_id', emailId)
    .maybeSingle()

  if (existing) {
    log(`[primebox] Duplicate email_id ${emailId} — skipping`)
    return { ok: true, intent: 'other', action: 'deduplicated' }
  }

  // Out-of-office check
  if (event.sentiment === 'ooo') {
    log(`[primebox] OOO detected for ${emailId} — ignoring`)
    return { ok: true, intent: 'other', action: 'ooo_ignored' }
  }

  const intent = classifyIntent(messageText)
  log(`[primebox] intent=${intent} emailId=${emailId}`)

  // ── 1. Unsubscribe — DNC first, always ────────────────────────────────
  if (intent === 'unsubscribe') {
    const contactEmail = event.contactEmail
    if (contactEmail) {
      await sf.post(`/workspaces/${workspaceId}/dnc/bulk`, { emails: [contactEmail] })
    } else {
      // Try to get email from company record
      const { data: company } = await supabase
        .from('companies')
        .select('decision_maker, id')
        .eq('salesforce_contact_id', contactId)
        .maybeSingle()

      const dm = company?.decision_maker as DecisionMaker | null
      if (dm?.email) {
        await sf.post(`/workspaces/${workspaceId}/dnc/bulk`, { emails: [dm.email] })
      }

      if (company?.id) {
        await supabase
          .from('companies')
          .update({ status: 'dnc_blocked' })
          .eq('id', company.id as string)
      }
    }

    log('[✓] primebox: unsubscribe handled, DNC added')
    return { ok: true, intent: 'unsubscribe', action: 'added_to_dnc' }
  }

  // ── 2. Positive / pilot_request → update company status ───────────────
  if (intent === 'positive_intent' || intent === 'pilot_request') {
    await supabase
      .from('companies')
      .update({ status: 'responded' })
      .eq('salesforce_contact_id', contactId)

    log('[✓] primebox: companies.status → responded')
  }

  // ── 3. Other intent → save draft, alert operator, don't auto-reply ────
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
    log('[primebox] intent=other — saved as draft, operator alert needed')
    return { ok: true, intent: 'other', action: 'operator_alert' }
  }

  // ── 4. Generate reply via Claude API ──────────────────────────────────
  let replyText = ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (anthropicKey) {
    // Get knowledge base for context
    let productInfo = ''
    try {
      const products = await sf.get<Array<{ name: string; description: string }>>(
        `/workspaces/${workspaceId}/products`
      )
      if (Array.isArray(products) && products.length > 0) {
        productInfo = JSON.stringify(products[0])
      }
    } catch {
      log('[primebox] Could not fetch product info — proceeding without it')
    }

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
Always end with one soft CTA toward booking a demo at ${BOOKING_URL}.
${productInfo ? `Product context: ${productInfo}` : ''}
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
      log(`[primebox] Claude API error: ${err instanceof Error ? err.message : String(err)}`)
      replyText = FALLBACK_REPLY[intent] ?? FALLBACK_REPLY.info_request ?? ''
    }
  } else {
    replyText = FALLBACK_REPLY[intent] ?? FALLBACK_REPLY.info_request ?? ''
  }

  // ── 5. Send reply via Primebox ────────────────────────────────────────
  try {
    await sf.post(
      `/workspaces/${workspaceId}/mailboxes/${mailboxId}/emails/${emailId}/reply`,
      { body: replyText }
    )
  } catch (err) {
    log(`[primebox] Reply send failed: ${err instanceof Error ? err.message : String(err)}`)
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

  // ── 6. Save to frank_replies ──────────────────────────────────────────
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

  log(`[✓] primebox: reply sent & saved (intent=${intent})`)
  return { ok: true, intent, action: 'reply_sent' }
}