/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Company Profiler
 * Enriches a company via Leadsforge, finds decision maker, calculates loss
 */

import { supabase, log } from '../lib/supabase'
import { lf } from '../lib/leadsforge'
import type {
  LfLookalikeResponse,
  LfSearchResponse,
  LfLead,
  LfEnrichJob,
  LfEnrichResultsResponse,
} from '../lib/leadsforge'
import type { Company, DecisionMaker } from '../types/company'

// ─── Decision maker title scoring (highest wins) ─────────────────────────────

const TITLE_SCORE: Record<string, number> = {
  'VP of Sales':      100,
  'VP Sales':         100,
  'CRO':               90,
  'Chief Revenue':     90,
  'Head of Sales':     80,
  'Director of Sales': 70,
  'Founder':           60,
  'CEO':               50,
}

function titleScore(title: string): number {
  const lower = title.toLowerCase()
  for (const [key, score] of Object.entries(TITLE_SCORE)) {
    if (lower.includes(key.toLowerCase())) return score
  }
  return 0
}

// ─── sdr_count heuristic ─────────────────────────────────────────────────────

function estimateSdrCount(size: number | null): number {
  if (!size) return 1
  if (size < 30)   return 1
  if (size <= 100)  return 3
  if (size <= 200)  return 6
  return Math.floor(size / 30)
}

// ─── enrichment_score calculation ────────────────────────────────────────────

interface EnrichmentData {
  name:          string | null
  industry:      string | null
  size:          number | null
  location:      string | null
  logo_url:      string | null
  decisionMaker: DecisionMaker | null
  techStack:     string[]
  icp:           string | null
}

function hasNameIndustrySize(name: string | null, industry: string | null, size: number | null): boolean {
  return Boolean(name && industry && size)
}

function calcEnrichmentScore(data: EnrichmentData): number {
  let score = 0
  if (data.decisionMaker?.email)                                       score += 40
  if (hasNameIndustrySize(data.name, data.industry, data.size))        score += 20
  if (data.logo_url)                                                   score += 10
  if (data.techStack.length > 0)                                       score += 10
  if (data.icp)                                                        score += 10
  if (data.location)                                                   score += 10
  return score
}

// ─── Async email enrichment via Leadsforge ────────────────────────────────────

const POLL_INTERVAL_MS = 3_000
const POLL_MAX_ATTEMPTS = 20

async function enrichEmailLeadsforge(personId: string): Promise<string | null> {
  const job = await lf.post<LfEnrichJob>('/enrichment/emails', {
    personIDs: [personId],
  })

  let attempts = 0
  while (attempts < POLL_MAX_ATTEMPTS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    const status = await lf.get<LfEnrichJob>(`/enrichment/jobs/${job.jobID}`)
    if (status.status === 'completed') break
    attempts++
  }

  const results = await lf.get<LfEnrichResultsResponse>(
    `/enrichment/jobs/${job.jobID}/results?limit=1&page=1`
  )

  const result = results.results.find(r => r.personID === personId)
  return result?.status === 'succeeded' ? result.payload?.email ?? null : null
}

// ─── Hunter.io helpers ────────────────────────────────────────────────────────

interface HunterEmail {
  value:      string
  first_name: string | null
  last_name:  string | null
  position:   string | null
  confidence: number
}

interface HunterFinderResponse {
  data: { email: string; confidence: number } | null
}

interface HunterDomainResponse {
  data: { emails: HunterEmail[]; organization: string | null; description: string | null }
}

interface HunterCompanyResponse {
  data: {
    name:        string | null
    industry:    string | null
    size:        string | null   // e.g. "1001-5000"
    description: string | null
    logo:        string | null
    city:        string | null
    country:     string | null
  } | null
}

async function hunterCompanyEnrich(domain: string): Promise<{
  name: string | null
  industry: string | null
  description: string | null
  logo: string | null
  location: string | null
} | null> {
  const API_KEY = process.env.HUNTER_API_KEY
  if (!API_KEY) return null

  const params = new URLSearchParams({ domain, api_key: API_KEY })
  const res = await fetch(`https://api.hunter.io/v2/companies/find?${params}`)
  if (!res.ok) return null

  const body = await res.json() as HunterCompanyResponse
  const d = body.data
  if (!d) return null

  const locationParts = [d.city, d.country].filter(Boolean)
  return {
    name:        d.name,
    industry:    d.industry,
    description: d.description,
    logo:        d.logo,
    location:    locationParts.length > 0 ? locationParts.join(', ') : null,
  }
}

async function enrichEmailHunter(
  domain: string,
  firstName: string | null,
  lastName: string | null,
): Promise<string | null> {
  const API_KEY = process.env.HUNTER_API_KEY
  if (!API_KEY) return null

  // Email Finder — most precise when we have first+last name
  if (firstName && lastName) {
    const params = new URLSearchParams({ domain, first_name: firstName, last_name: lastName, api_key: API_KEY })
    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`)
    if (res.ok) {
      const body = await res.json() as HunterFinderResponse
      if (body.data?.email) return body.data.email
    }
  }

  // Domain Search fallback — find highest-confidence sales leader
  const DM_KEYWORDS = ['vp', 'head', 'director', 'chief', 'cro', 'founder', 'ceo', 'sales', 'revenue']
  const params = new URLSearchParams({ domain, api_key: API_KEY, limit: '10' })
  const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`)
  if (!res.ok) return null

  const body = await res.json() as HunterDomainResponse
  const emails = body.data?.emails ?? []
  if (emails.length === 0) return null

  const byTitle = emails
    .filter(e => e.position && DM_KEYWORDS.some(k => e.position!.toLowerCase().includes(k)))
    .sort((a, b) => b.confidence - a.confidence)

  return byTitle[0]?.value ?? emails.sort((a, b) => b.confidence - a.confidence)[0]?.value ?? null
}

// ─── Email enrichment with Hunter.io fallback ─────────────────────────────────

async function enrichEmail(
  personId: string,
  domain: string,
  firstName: string | null,
  lastName: string | null,
): Promise<{ email: string; source: 'leadsforge' | 'hunter' } | null> {
  // 1. Try Leadsforge first
  try {
    const email = await enrichEmailLeadsforge(personId)
    if (email) {
      log(`[profiler] Email via Leadsforge: ${email}`)
      return { email, source: 'leadsforge' }
    }
  } catch (e: unknown) {
    log(`[profiler] Leadsforge email failed: ${(e as Error).message}`)
  }

  // 2. Fallback: Hunter.io
  try {
    const email = await enrichEmailHunter(domain, firstName, lastName)
    if (email) {
      log(`[profiler] Email via Hunter.io fallback: ${email}`)
      return { email, source: 'hunter' }
    }
  } catch (e: unknown) {
    log(`[profiler] Hunter.io email failed: ${(e as Error).message}`)
  }

  return null
}

// ─── Main profile function ────────────────────────────────────────────────────

export interface ProfileResult {
  company:         Company
  enrichmentScore: number
  missingFields:   string[]
}

export async function profileCompany(companyId: string): Promise<ProfileResult> {
  // 1. Get company from Supabase
  const { data: company, error: fetchErr } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (fetchErr || !company) {
    throw new Error(`company_not_found: ${companyId}`)
  }

  const domain = (company.domain as string).replace(/^(blog|www|app)\./, '')
  log(`[profiler] Starting enrichment for ${domain}`)

  // 2. Company metadata — Hunter.io Company Enrichment (primary) → Leadsforge lookalikes (fallback)
  let companyName:     string | null = null
  let companyIndustry: string | null = null
  let companyLogo:     string | null = null
  let companyDesc:     string | null = null
  let companyLocation: string | null = null

  try {
    const hunterCo = await hunterCompanyEnrich(domain)
    if (hunterCo) {
      companyName     = hunterCo.name
      companyIndustry = hunterCo.industry
      companyLogo     = hunterCo.logo
      companyDesc     = hunterCo.description
      companyLocation = hunterCo.location
      log(`[profiler] Hunter company: name=${companyName}, industry=${companyIndustry}, location=${companyLocation}`)
    }
  } catch (e: unknown) {
    log(`[profiler] Hunter company enrich failed: ${(e as Error).message}`)
  }

  // Leadsforge lookalikes as fallback for any missing fields
  if (!companyName || !companyIndustry) {
    try {
      const lookalikes = await lf.post<LfLookalikeResponse>('/lookalikes/search', {
        domains:  [domain],
        page:     1,
        pageSize: 1,
      })
      const first = lookalikes.companies[0]
      if (first) {
        companyName     = companyName     ?? first.name     ?? null
        companyIndustry = companyIndustry ?? first.industry ?? null
        companyLogo     = companyLogo     ?? first.logo     ?? null
        companyDesc     = companyDesc     ?? first.description ?? null
        log(`[profiler] Lookalike fallback: name=${companyName}, industry=${companyIndustry}`)
      }
    } catch (e: unknown) {
      log(`[profiler] Lookalike fallback failed: ${(e as Error).message}`)
    }
  }

  // 3. Decision maker via people search at this domain
  let decisionMaker: DecisionMaker | null = null
  try {
    const DM_TITLES = ['VP of Sales', 'VP Sales', 'Head of Sales', 'CRO', 'Chief Revenue Officer', 'Founder', 'CEO']
    let bestLead: LfLead | null = null
    let bestScore = -1

    for (const jobTitle of DM_TITLES) {
      const res = await lf.post<LfSearchResponse>('/search', {
        companyDomain: domain,
        jobTitle,
        limit: 3,
      })
      for (const lead of res.leads) {
        if (!lead.jobTitle) continue
        const score = titleScore(lead.jobTitle)
        if (score > bestScore) {
          bestScore = score
          bestLead  = lead
        }
      }
      if (bestScore >= 80) break  // found VP+ — stop searching
    }

    if (bestLead) {
      log(`[profiler] DM candidate: ${bestLead.firstName} ${bestLead.lastName} — ${bestLead.jobTitle} (id=${bestLead.id})`)

      // 4. Email enrichment: Leadsforge → Hunter.io fallback
      const enriched = await enrichEmail(
        bestLead.id,
        domain,
        bestLead.firstName,
        bestLead.lastName,
      )

      if (enriched) {
        decisionMaker = {
          name:         `${bestLead.firstName ?? ''} ${bestLead.lastName ?? ''}`.trim(),
          title:        bestLead.jobTitle ?? '',
          email:        enriched.email,
          linkedin_url: bestLead.linkedinUrl ?? null,
        }
        log(`[profiler] DM email (${enriched.source}): ${enriched.email}`)
      }
    } else {
      log(`[profiler] No decision maker found for ${domain}`)
    }
  } catch (e: unknown) {
    log(`[profiler] DM search failed: ${(e as Error).message}`)
  }

  // 5. Tech stack detection from job descriptions
  const KNOWN_TOOLS = ['Instantly', 'Apollo', 'Lemlist', 'Outreach', 'Salesloft', 'HubSpot', 'Salesforce', 'Pipedrive', 'Close', 'Mailshake']
  let techStack: string[] = []

  try {
    const jobRes = await lf.post<LfSearchResponse>('/search', {
      companyDomain: domain,
      jobTitle: 'SDR',
      limit: 5,
    })
    // Scan job titles and any available description text for known tools
    const allText = jobRes.leads.map(l =>
      [l.jobTitle ?? '', l.jobDescription ?? ''].join(' ')
    ).join(' ').toLowerCase()

    techStack = KNOWN_TOOLS.filter(tool => allText.includes(tool.toLowerCase()))
    if (techStack.length > 0) {
      log(`[profiler] Tech stack detected: ${techStack.join(', ')}`)
    }
  } catch {
    log('[profiler] Tech stack detection failed — continuing with empty')
  }

  // 6. logo_url fallback
  const logoUrl = companyLogo ?? `https://logo.clearbit.com/${domain}`

  // 7. sdr_count
  const sdrCount = (company.sdr_count as number) > 1
    ? (company.sdr_count as number)
    : estimateSdrCount(company.size as number | null)

  // 8. monthly_loss
  const monthlyLoss = sdrCount * 1903

  // 9. ICP from company description
  const icp = companyDesc ? companyDesc.slice(0, 200) : null

  // 10. enrichment_score
  const enrichmentData: EnrichmentData = {
    name:          companyName     ?? (company.name     as string | null),
    industry:      companyIndustry ?? (company.industry as string | null),
    size:          company.size    as number | null,
    location:      companyLocation ?? (company.location as string | null),
    logo_url:      logoUrl,
    decisionMaker,
    techStack,
    icp,
  }
  const enrichmentScore = calcEnrichmentScore(enrichmentData)

  const missingFields: string[] = []
  if (!decisionMaker?.email)       missingFields.push('decision_maker.email')
  if (!enrichmentData.name)        missingFields.push('name')
  if (!enrichmentData.industry)    missingFields.push('industry')
  if (!enrichmentData.size)        missingFields.push('size')
  if (!enrichmentData.location)    missingFields.push('location')

  // 10. If enrichment_score < 60 → stay 'detected'
  if (enrichmentScore < 60) {
    log(`[profiler] enrichment_score=${enrichmentScore} < 60 — status stays 'detected'. Missing: ${missingFields.join(', ')}`)

    await supabase
      .from('companies')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', companyId)

    return {
      company: company as unknown as Company,
      enrichmentScore,
      missingFields,
    }
  }

  // 11. Update company to 'profiled'
  const updatePayload = {
    name:                  enrichmentData.name     ?? company.name,
    industry:              enrichmentData.industry ?? company.industry,
    location:              enrichmentData.location ?? company.location,
    logo_url:              logoUrl,
    decision_maker:        decisionMaker,
    tech_stack:            techStack,
    monthly_loss_estimate: monthlyLoss,
    sdr_count:             sdrCount,
    status:                'profiled',
    updated_at:            new Date().toISOString(),
  }

  const { data: updated, error: updateErr } = await supabase
    .from('companies')
    .update(updatePayload)
    .eq('id', companyId)
    .select('*')
    .single()

  if (updateErr || !updated) {
    throw new Error(`update_failed: ${updateErr?.message}`)
  }

  log(`[profiler] enrichment_score=${enrichmentScore}`)
  log(`[profiler] monthly_loss_estimate: $${monthlyLoss.toLocaleString()}`)
  log(`[profiler] Status → profiled`)

  return {
    company:        updated as unknown as Company,
    enrichmentScore,
    missingFields,
  }
}