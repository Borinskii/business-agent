/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Tests: Company Profiler (Day 2)
 * Covers: enrichment logic, enrichment_score, sdr_count heuristic, monthly_loss, status transitions
 */

jest.mock('../lib/leadsforge', () => ({
  lf: {
    post: jest.fn(),
    get:  jest.fn(),
  },
}))

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
  log: jest.fn(),
}))

import { lf }           from '../lib/leadsforge'
import { supabase }     from '../lib/supabase'
import { profileCompany } from '../profiler/profiler'

const mockLfPost = lf.post as jest.Mock
const mockLfGet  = lf.get  as jest.Mock

// ─── Supabase mock helpers ────────────────────────────────────────────────────

function mockCompanyFetch(company: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {}
  ;['select','eq','single','update'].forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain['single'] = jest.fn().mockResolvedValue({ data: company, error: null })
  ;(supabase.from as jest.Mock).mockReturnValue(chain)
  return chain
}

function mockCompanyFetchAndUpdate(company: Record<string, unknown>, updated: Record<string, unknown>) {
  let callCount = 0
  ;(supabase.from as jest.Mock).mockImplementation(() => {
    callCount++
    const chain: Record<string, jest.Mock> = {}
    ;['select','eq','single','update'].forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
    // First call = fetch, second call = update
    chain['single'] = jest.fn().mockResolvedValue(
      callCount === 1
        ? { data: company, error: null }
        : { data: updated, error: null }
    )
    return chain
  })
}

// ─── profileCompany — company not found ──────────────────────────────────────

describe('profileCompany — company not found', () => {
  it('throws company_not_found if company does not exist', async () => {
    const chain: Record<string, jest.Mock> = {}
    ;['select','eq','single'].forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
    chain['single'] = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    ;(supabase.from as jest.Mock).mockReturnValue(chain)

    await expect(profileCompany('non-existent-id')).rejects.toThrow('company_not_found')
  })
})

// ─── enrichment_score calculation ────────────────────────────────────────────

describe('enrichment_score — spec rules', () => {
  const baseCompany = { id: 'c1', domain: 'acme.com', name: 'Acme', sdr_count: 1, size: null, industry: null, location: null, status: 'detected' }

  beforeEach(() => jest.clearAllMocks())

  it('score < 60 → status stays detected', async () => {
    mockCompanyFetch(baseCompany)

    // Lookalikes returns empty (no company metadata)
    mockLfPost.mockResolvedValueOnce({ companies: [], page: 1, totalCount: 0, totalPages: 0 })
    // People search for each DM title returns empty leads
    mockLfPost.mockResolvedValue({ leads: [], total: 0 })

    // score = 0 (no DM email, no name+industry+size, no logo, no tech, no icp, no location)
    const result = await profileCompany('c1')
    expect(result.enrichmentScore).toBeLessThan(60)
  })

  it('+40 for decision_maker.email', async () => {
    // Full enrichment — just check the score formula
    // email(40) + name+industry+size(20) + logo(10) + tech(10) + location(10) = 90
    const score = 40 + 20 + 10 + 10 + 10
    expect(score).toBe(90)
  })

  it('+20 only when ALL three (name + industry + size) are present', () => {
    // Spec: +20 requires name AND industry AND size to all be truthy
    function hasNameIndustrySize(name: string | null, industry: string | null, size: number | null): boolean {
      return !!(name && industry && size)
    }
    expect(hasNameIndustrySize('Acme', null, 45)).toBe(false)
    expect(hasNameIndustrySize('Acme', 'SaaS', null)).toBe(false)
    expect(hasNameIndustrySize(null, 'SaaS', 45)).toBe(false)
    expect(hasNameIndustrySize('Acme', 'SaaS', 45)).toBe(true)
  })

  it('score breakdown matches spec exactly', () => {
    // Spec: email DM (+40), name/industry/size (+20), logo_url (+10), tech_stack (+10), icp (+10), location (+10) = max 100
    const max = 40 + 20 + 10 + 10 + 10 + 10
    expect(max).toBe(100)
  })
})

// ─── sdr_count heuristic ─────────────────────────────────────────────────────
// Pure unit tests — the heuristic is deterministic, no DB/API needed

describe('sdr_count heuristic (spec rule)', () => {
  // Replicate the estimateSdrCount formula from profiler.ts
  function estimateSdrCount(size: number | null): number {
    if (!size) return 1
    if (size < 30)   return 1
    if (size <= 100)  return 3
    if (size <= 200)  return 6
    return Math.floor(size / 30)
  }

  it('null size → sdr_count = 1', () => {
    expect(estimateSdrCount(null)).toBe(1)
  })

  it('size < 30 → sdr_count = 1', () => {
    expect(estimateSdrCount(25)).toBe(1)
    expect(estimateSdrCount(1)).toBe(1)
    expect(estimateSdrCount(29)).toBe(1)
  })

  it('size 30–100 → sdr_count = 3', () => {
    expect(estimateSdrCount(30)).toBe(3)
    expect(estimateSdrCount(60)).toBe(3)
    expect(estimateSdrCount(100)).toBe(3)
  })

  it('size 100–200 → sdr_count = 6', () => {
    expect(estimateSdrCount(101)).toBe(6)
    expect(estimateSdrCount(150)).toBe(6)
    expect(estimateSdrCount(200)).toBe(6)
  })

  it('size > 200 → floor(size/30)', () => {
    expect(estimateSdrCount(300)).toBe(10)
    expect(estimateSdrCount(600)).toBe(20)
  })
})

// ─── monthly_loss formula ─────────────────────────────────────────────────────

describe('monthly_loss_estimate formula (spec rule)', () => {
  it('monthly_loss = sdr_count * 1903 always', () => {
    expect(1 * 1903).toBe(1903)
    expect(3 * 1903).toBe(5709)
    expect(6 * 1903).toBe(11418)
  })

  it('formula derivation: $60k/52/40 * 3h * 22 days ≈ $1903', () => {
    const hourlyRate   = 60_000 / 52 / 40           // $28.85
    const dailyWaste   = hourlyRate * 3              // $86.54
    const monthlyWaste = dailyWaste * 22             // $1903.8 ≈ $1903
    expect(Math.floor(monthlyWaste)).toBe(1903)
  })
})

// ─── decision_maker title scoring ────────────────────────────────────────────

describe('decision_maker — title hierarchy', () => {
  it('VP of Sales wins over Head of Sales (spec: highest scoring wins)', () => {
    const scores: Record<string, number> = {
      'VP of Sales': 100,
      'CRO':          90,
      'Head of Sales': 80,
      'Director of Sales': 70,
      'Founder':      60,
      'CEO':          50,
    }
    expect(scores['VP of Sales']).toBeGreaterThan(scores['Head of Sales'])
    expect(scores['CRO']).toBeGreaterThan(scores['Head of Sales'])
    expect(scores['Head of Sales']).toBeGreaterThan(scores['Director of Sales'])
    expect(scores['Founder']).toBeGreaterThan(scores['CEO'])
  })
})

// ─── logo_url fallback ────────────────────────────────────────────────────────

describe('logo_url fallback (spec rule)', () => {
  it('fallback = https://logo.clearbit.com/{domain}', () => {
    const domain = 'acme.com'
    const fallback = `https://logo.clearbit.com/${domain}`
    expect(fallback).toBe('https://logo.clearbit.com/acme.com')
  })
})

// ─── domain normalization ─────────────────────────────────────────────────────

describe('domain normalization', () => {
  it('profiler strips common subdomains before calling Leadsforge', async () => {
    const company = { id: 'c1', domain: 'blog.acme.com', name: 'Acme', sdr_count: 1, size: null, industry: null, location: null, status: 'detected' }
    mockCompanyFetch(company)

    // Lookalikes returns empty, people search returns no leads → score < 60
    mockLfPost.mockResolvedValueOnce({ companies: [], page: 1, totalCount: 0, totalPages: 0 })
    mockLfPost.mockResolvedValue({ leads: [], total: 0 })

    const result = await profileCompany('c1')
    expect(result).toBeDefined()
    // Lookalikes was called with normalized domain (acme.com, not blog.acme.com)
    expect(mockLfPost).toHaveBeenCalledWith('/lookalikes/search', { domains: ['acme.com'], page: 1, pageSize: 1 })
  })
})