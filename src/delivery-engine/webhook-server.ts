/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import * as dotenv from 'dotenv'
dotenv.config()

import * as http from 'http'
import { handlePageOpened, handleReplyWebhook, PageOpenedPayload, ReplyWebhookPayload } from './webhook-handlers'
import { handleIncomingReply, PrimeboxWebhookEvent } from '../primebox/index'
import { log } from '../lib/supabase'

const PORT = parseInt(process.env.WEBHOOK_PORT ?? '3001', 10)

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function send(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url  = req.url  ?? '/'
  const method = req.method ?? 'GET'

  if (method !== 'POST') {
    send(res, 405, { error: 'method_not_allowed' })
    return
  }

  let body: string
  try {
    body = await readBody(req)
  } catch {
    send(res, 400, { error: 'bad_request' })
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    send(res, 400, { error: 'invalid_json' })
    return
  }

  try {
    if (url === '/api/webhooks/page-opened') {
      const result = await handlePageOpened(payload as PageOpenedPayload)
      send(res, 200, result)
      return
    }

    if (url === '/api/webhooks/reply') {
      const p = payload as ReplyWebhookPayload

      // If event is 'email.replied', also route through primebox handleIncomingReply
      if (p.event === 'email.replied') {
        const primeboxEvent: PrimeboxWebhookEvent = {
          event:        p.event,
          threadId:     p.threadId,
          workspaceId:  p.workspaceId,
          mailboxId:    p.mailboxId,
          emailId:      p.emailId,
          contactId:    p.contactId,
          messageText:  p.messageText,
          sentiment:    p.sentiment,
        }
        const result = await handleIncomingReply(primeboxEvent)
        send(res, 200, result)
        return
      }

      // Non-reply events (email.opened, linkedin.replied) use existing handler
      const result = await handleReplyWebhook(p)
      send(res, 200, result)
      return
    }

    // Dedicated primebox endpoint
    if (url === '/api/webhooks/primebox') {
      const result = await handleIncomingReply(payload as PrimeboxWebhookEvent)
      send(res, 200, result)
      return
    }

    send(res, 404, { error: 'not_found' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log(`[webhook-server] Error: ${msg}`)
    send(res, 500, { error: 'internal_error', details: msg })
  }
})

server.listen(PORT, () => {
  log(`[webhook-server] Listening on port ${PORT}`)
  log(`[webhook-server] POST /api/webhooks/page-opened`)
  log(`[webhook-server] POST /api/webhooks/reply`)
  log(`[webhook-server] POST /api/webhooks/primebox`)
})