/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Signal Hunter — Funding source via TechCrunch RSS
 * Replaces Crunchbase API (requires Enterprise plan) with free RSS parsing.
 * Finds B2B SaaS companies that raised Series A/B in last 60 days → signal type: funding
 *
 * Feeds used:
 *   https://techcrunch.com/category/startups/feed/
 *   https://techcrunch.com/tag/funding/feed/
 */

import type { SignalType } from '../../types/company'
import type { RawSignal } from './linkedin'

const RSS_FEEDS = [
  'https://techcrunch.com/category/startups/feed/',
  'https://techcrunch.com/tag/funding/feed/',
]

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

// US-related keywords to filter non-US companies
const US_KEYWORDS = ['san francisco', 'new york', 'austin', 'boston', 'seattle', 'chicago',
  'los angeles', 'denver', 'atlanta', 'miami', 'usa', 'u.s.', 'united states', 'silicon valley']

// ─── Simple RSS/XML parser (no dependencies) ──────────────────────────────────

interface RssItem {
  title:       string
  description: string
  link:        string
  pubDate:     string
}

function extractCdata(raw: string): string {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? extractCdata(match[1]).trim() : ''
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title   = extractTag(block, 'title')
    const pubDate = extractTag(block, 'pubDate')
    if (!title) continue
    items.push({
      title,
      description: extractTag(block, 'description'),
      link:        extractTag(block, 'link'),
      pubDate,
    })
  }
  return items
}

// ─── Signal extraction helpers ────────────────────────────────────────────────

interface FundingInfo {
  companyName: string
  round:       'series_a' | 'series_b'
  amount:      string | null
}

const RAISE_VERBS = 'raises?|lands?|secures?|closes?|gets?|has raised|announces?|nabs?|bags?|hauls?'
const ROUND_REGEX  = /series[-\s]?[ab]/i

function extractFundingInfo(title: string): FundingInfo | null {
  const lower = title.toLowerCase()
  if (!ROUND_REGEX.test(lower)) return null

  const isSeriesA = /series[-\s]?a\b/i.test(lower)
  const round = isSeriesA ? 'series_a' : 'series_b'

  const nameMatch = title.match(
    new RegExp(`^([A-Z][^,]{2,40}?)\\s+(?:${RAISE_VERBS})\\s`, 'i')
  )
  if (!nameMatch) return null

  const companyName = nameMatch[1].trim()
  const amountMatch = title.match(/\$(\d+(?:\.\d+)?)\s*([MmBbKk])/i)
  const amount = amountMatch
    ? `$${amountMatch[1]}${amountMatch[2].toUpperCase()}`
    : null

  return { companyName, round, amount }
}

/**
 * Try to extract a company domain from the article description text.
 * TechCrunch articles typically link to the company's website.
 */
function extractDomainFromText(text: string): string | null {
  // Strip HTML tags first
  const plain = text.replace(/<[^>]+>/g, ' ')

  // Find URLs that are not TechCrunch or common social/media domains
  const SKIP = /techcrunch|twitter|linkedin|facebook|instagram|youtube|t\.co|crunchbase|apple|google|microsoft/i
  const urlRegex = /https?:\/\/(?:www\.)?([a-z0-9][a-z0-9-]{1,60}\.[a-z]{2,})/gi

  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(plain)) !== null) {
    const domain = match[1].toLowerCase()
    if (!SKIP.test(domain)) return domain
  }
  return null
}

/**
 * Heuristic domain guess from company name.
 * e.g. "Acme Corp" → "acmecorp.com"
 * Used only as last resort — profiler will verify via Leadsforge.
 */
function guessDomain(companyName: string): string | null {
  const slug = companyName
    .toLowerCase()
    .replace(/\b(inc|corp|ltd|llc|co\.?|the|technologies|solutions|platform|ai)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
  if (slug.length < 2) return null
  return `${slug}.com`
}

function isWithin60Days(pubDateStr: string): boolean {
  if (!pubDateStr) return false
  const pub = new Date(pubDateStr).getTime()
  return !isNaN(pub) && Date.now() - pub <= SIXTY_DAYS_MS
}

function isUSRelated(text: string): boolean {
  const lower = text.toLowerCase()
  return US_KEYWORDS.some(kw => lower.includes(kw))
}

// ─── Main scanner function ────────────────────────────────────────────────────

export async function scanCrunchbase(limit: number): Promise<RawSignal[]> {
  const seen    = new Set<string>()  // dedupe by company name across feeds
  const signals: RawSignal[] = []

  for (const feedUrl of RSS_FEEDS) {
    let xml: string
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'PhantomPipeline/1.0 (signal-hunter)' },
      })
      if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
      xml = await res.text()
    } catch (e: unknown) {
      // One feed failing should not stop the other
      console.error(`[funding-rss] Failed to fetch ${feedUrl}: ${(e as Error).message}`)
      continue
    }

    const items = parseRss(xml)

    for (const item of items) {
      if (signals.length >= limit) break
      if (!isWithin60Days(item.pubDate)) continue

      const funding = extractFundingInfo(item.title)
      if (!funding) continue

      // Skip duplicates across feeds
      const key = funding.companyName.toLowerCase()
      if (seen.has(key)) continue

      // Filter US companies (best-effort using article text)
      const fullText = `${item.title} ${item.description}`
      if (!isUSRelated(fullText)) continue

      // Try to find domain
      const domain = extractDomainFromText(item.description) ?? guessDomain(funding.companyName)
      if (!domain) continue

      seen.add(key)

      const roundLabel  = funding.round === 'series_a' ? 'Series A' : 'Series B'
      const amountLabel = funding.amount ?? 'undisclosed amount'
      const pubDate     = new Date(item.pubDate).toISOString().split('T')[0]

      signals.push({
        companyDomain: domain,
        companyName:   funding.companyName,
        signalType:    'funding' as SignalType,
        detail:        `Raised ${amountLabel} ${roundLabel} on ${pubDate} (TechCrunch)`,
        source:        'TechCrunch',
        sourceUrl:     item.link || null,
        painPoints:    30,
        rawData: {
          round:      funding.round,
          amount:     funding.amount,
          pub_date:   item.pubDate,
          article:    item.link,
        },
      })
    }

    if (signals.length >= limit) break
  }

  return signals
}