/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Shared intent classification for Primebox / webhook handlers
 * Single source of truth — imported by both modules
 */

import type { FrankIntent } from '../types/company'

export function classifyIntent(text: string): FrankIntent {
  const t = text.toLowerCase()
  if (t.match(/unsubscribe|remove|stop|opt.?out/))         return 'unsubscribe'
  if (t.match(/price|cost|how much|pricing|plan/))         return 'pricing_question'
  if (t.match(/demo|call|meeting|schedule|book/))          return 'demo_request'
  if (t.match(/pilot|try|test|48|free/))                   return 'pilot_request'
  if (t.match(/yes|interested|sounds good|tell me more/)) return 'positive_intent'
  if (t.match(/how|what|explain|tell|works/))              return 'info_request'
  return 'other'
}