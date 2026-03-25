/**
 * Signal Hunter — LinkedIn source via Leadsforge People Search API
 * Finds companies with 2+ active SDRs → signal type: hiring_sdrs
 */

import { lf } from '../../lib/leadsforge'
import type { LfSearchResponse, LfLead } from '../../lib/leadsforge'
import type { SignalType } from '../../types/company'

export interface RawSignal {
  companyDomain: string
  companyName:   string
  signalType:    SignalType
  detail:        string
  source:        string
  sourceUrl:     string | null
  painPoints:    number
  rawData:       Record<string, unknown>
}

export async function scanLinkedIn(limit: number): Promise<RawSignal[]> {
  const response = await lf.post<LfSearchResponse>('/search', {
    jobTitle: 'Sales Development Representative',
    country:  'US',
    limit,
  })

  // Group leads by company domain
  const byDomain = new Map<string, LfLead[]>()
  for (const lead of response.leads) {
    const domain = normalizeDomain(lead.company?.domain)
    if (!domain) continue
    const existing = byDomain.get(domain) ?? []
    byDomain.set(domain, [...existing, lead])
  }

  // Filter: 2+ SDRs at the same company = they're scaling SDR headcount
  const signals: RawSignal[] = []
  for (const [domain, leads] of byDomain) {
    if (leads.length < 2) continue
    const first = leads[0]
    const companyName = first.company?.name ?? domain
    signals.push({
      companyDomain: domain,
      companyName,
      signalType:    'hiring_sdrs',
      detail:        `Found ${leads.length} active SDRs at ${companyName} — likely scaling headcount`,
      source:        'LinkedIn',
      sourceUrl:     null,
      painPoints:    35,
      rawData:       {
        leads: leads.map(l => ({
          name:     `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(),
          title:    l.jobTitle,
          location: l.location,
        })),
      },
    })
  }

  return signals
}

/**
 * Normalize domain: strip protocol, subdomains, and paths.
 * e.g. "https://blog.acme.com/path" → "acme.com"
 */
function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Strip protocol + path
  const clean = raw.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()

  // Strip common subdomains
  const parts = clean.split('.')
  if (parts.length > 2 && !['co', 'com', 'io', 'ai'].includes(parts[parts.length - 2])) {
    return parts.slice(-2).join('.')
  }

  return clean || null
}
