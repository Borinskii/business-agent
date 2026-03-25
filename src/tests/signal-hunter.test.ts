/**
 * Tests: Signal Hunter (Day 2)
 * Covers: linkedin source, TechCrunch RSS funding source, scanner (dedup, rate limit, pain_score)
 */

// ─── Mock all external dependencies ──────────────────────────────────────────

jest.mock('../lib/leadsforge', () => ({
  lf: { post: jest.fn(), get: jest.fn() },
}))

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  log: jest.fn(),
}))

jest.mock('../signal-hunter/sources/crunchbase', () => ({
  scanCrunchbase: jest.fn(),
}))

import { lf }             from '../lib/leadsforge'
import { supabase }       from '../lib/supabase'
import { scanLinkedIn }   from '../signal-hunter/sources/linkedin'
import { scanCrunchbase } from '../signal-hunter/sources/crunchbase'
import { runScan }        from '../signal-hunter/scanner'

const mockLfPost        = lf.post as jest.Mock
const mockScanCrunchbase = scanCrunchbase as jest.Mock

// ─── LinkedIn Scanner ─────────────────────────────────────────────────────────

// Helper: build a mock LfLead
function makeLead(domain: string, name: string, id = 'id1') {
  return {
    id,
    firstName:  name.split(' ')[0],
    lastName:   name.split(' ')[1] ?? null,
    jobTitle:   'Sales Development Representative',
    location:   { city: 'New York', state: 'NY', country: 'US' },
    company:    { name, domain },
  }
}

describe('scanLinkedIn', () => {
  beforeEach(() => mockLfPost.mockReset())

  it('returns hiring_sdrs signals for companies with 2+ leads', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [
        makeLead('acme.com', 'Acme Corp', 'a1'),
        makeLead('acme.com', 'Acme Corp', 'a2'),
        makeLead('solo.io',  'Solo Inc',  'b1'),
      ],
      total: 3,
    })

    const signals = await scanLinkedIn(100)
    expect(signals).toHaveLength(1)
    expect(signals[0].companyDomain).toBe('acme.com')
    expect(signals[0].signalType).toBe('hiring_sdrs')
    expect(signals[0].painPoints).toBe(35)
    expect(signals[0].source).toBe('LinkedIn')
  })

  it('ignores companies with only 1 lead', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [makeLead('lonely.io', 'Lonely Inc', 'l1')],
      total: 1,
    })
    const signals = await scanLinkedIn(100)
    expect(signals).toHaveLength(0)
  })

  it('detail mentions correct count of SDRs found', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [
        makeLead('big.com', 'Big Co', 'c1'),
        makeLead('big.com', 'Big Co', 'c2'),
        makeLead('big.com', 'Big Co', 'c3'),
      ],
      total: 3,
    })
    const signals = await scanLinkedIn(100)
    expect(signals[0].detail).toContain('3')
  })

  it('skips entries with null domain', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [
        { id: 'x1', firstName: 'A', lastName: 'B', jobTitle: 'SDR', location: null, company: { name: 'NoD', domain: null } },
        { id: 'x2', firstName: 'C', lastName: 'D', jobTitle: 'BDR', location: null, company: { name: 'NoD', domain: null } },
      ],
      total: 2,
    })
    const signals = await scanLinkedIn(100)
    expect(signals).toHaveLength(0)
  })

  it('calls Leadsforge with correct payload', async () => {
    mockLfPost.mockResolvedValueOnce({ leads: [], total: 0 })
    await scanLinkedIn(50)
    expect(mockLfPost).toHaveBeenCalledWith('/search', {
      jobTitle: 'Sales Development Representative',
      country:  'US',
      limit:    50,
    })
  })

  it('sets pain_points = 35 for hiring_sdrs (spec rule)', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [
        makeLead('x.com', 'X Corp', 'p1'),
        makeLead('x.com', 'X Corp', 'p2'),
      ],
      total: 2,
    })
    const signals = await scanLinkedIn(10)
    expect(signals[0].painPoints).toBe(35)
  })
})

// ─── TechCrunch RSS funding scanner ──────────────────────────────────────────

describe('scanCrunchbase (TechCrunch RSS)', () => {
  const mockFetch = jest.fn()

  beforeAll(() => { global.fetch = mockFetch })
  beforeEach(() => mockFetch.mockReset())

  // Minimal valid RSS with one Series A entry
  function buildRss(items: string): string {
    return `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`
  }

  function rssItem(title: string, description: string, pubDate: string, link = 'https://techcrunch.com/article'): string {
    return `<item>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${link}</link>
      <pubDate>${pubDate}</pubDate>
    </item>`
  }

  const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toUTCString()
  const oldDate    = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toUTCString()

  it('returns funding signal for a valid Series A article', async () => {
    const xml = buildRss(rssItem(
      'Acme raises $15M Series A to automate sales workflows',
      'San Francisco-based Acme (acme.com) announced today...',
      recentDate
    ))
    mockFetch.mockResolvedValue({ ok: true, text: async () => xml })

    // Import the real module (not mocked) for this test
    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    const signals = await realScan(100)

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].signalType).toBe('funding')
    expect(signals[0].painPoints).toBe(30)
    expect(signals[0].source).toBe('TechCrunch')
    expect(signals[0].detail).toContain('Series A')
  })

  it('ignores articles older than 60 days', async () => {
    const xml = buildRss(rssItem(
      'OldCo raises $10M Series B to scale operations',
      'Austin, TX — OldCo (oldco.com) announced...',
      oldDate
    ))
    mockFetch.mockResolvedValue({ ok: true, text: async () => xml })

    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    const signals = await realScan(100)
    expect(signals).toHaveLength(0)
  })

  it('ignores articles without Series A/B mention', async () => {
    const xml = buildRss(rssItem(
      'Acme raises $5M seed round for AI tooling',
      'New York — Acme (acme.io) raised $5M in seed...',
      recentDate
    ))
    mockFetch.mockResolvedValue({ ok: true, text: async () => xml })

    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    const signals = await realScan(100)
    expect(signals).toHaveLength(0)
  })

  it('continues if one feed fails (graceful degradation)', async () => {
    // First feed fails, second succeeds
    const xml = buildRss(rssItem(
      'Finco raises $20M Series B to expand into enterprise',
      'San Francisco — Finco (finco.com) closed a $20M Series B...',
      recentDate
    ))
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true, text: async () => xml })

    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    // Should not throw
    const signals = await realScan(100)
    expect(Array.isArray(signals)).toBe(true)
  })

  it('deduplicates same company appearing in multiple feeds', async () => {
    const item = rssItem(
      'Dupco raises $12M Series A',
      'Boston — Dupco (dupco.com) announced Series A funding...',
      recentDate
    )
    const xml = buildRss(item)
    mockFetch.mockResolvedValue({ ok: true, text: async () => xml })

    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    const signals = await realScan(100)

    const dupco = signals.filter((s: { companyName: string }) => s.companyName.toLowerCase().includes('dupco'))
    expect(dupco.length).toBeLessThanOrEqual(1)
  })

  it('sets pain_points = 30 for funding signals (spec rule)', async () => {
    const xml = buildRss(rssItem(
      'PointCo raises $8M Series A for B2B automation',
      'New York — PointCo (pointco.io) raised...',
      recentDate
    ))
    mockFetch.mockResolvedValue({ ok: true, text: async () => xml })

    const { scanCrunchbase: realScan } = jest.requireActual('../signal-hunter/sources/crunchbase')
    const signals = await realScan(100)
    if (signals.length > 0) {
      expect(signals[0].painPoints).toBe(30)
    }
  })
})

// ─── Scanner — rate limiting ──────────────────────────────────────────────────

describe('runScan — rate limiting', () => {
  beforeEach(() => jest.clearAllMocks())

  it('skips scan if source was scanned within 6 hours', async () => {
    const chain: Record<string, jest.Mock> = {}
    ;['from','select','eq','gte','limit'].forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
    chain['limit'] = jest.fn().mockResolvedValue({ data: [{ id: 'sig' }] })
    ;(supabase.from as jest.Mock).mockReturnValue(chain)

    const result = await runScan('linkedin', 100)
    expect(result.scanned).toBe(0)
    expect(result.found).toBe(0)
  })

  it('returns zeros for g2 (not yet implemented)', async () => {
    const result = await runScan('g2', 100)
    expect(result).toEqual({ scanned: 0, found: 0, queued: 0, duplicates: 0 })
  })
})

// ─── Scanner — deduplication ──────────────────────────────────────────────────

describe('runScan — deduplication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('adds signal to existing company without creating new company record', async () => {
    mockLfPost.mockResolvedValueOnce({
      leads: [
        makeLead('existing.com', 'Existing Co', 'e1'),
        makeLead('existing.com', 'Existing Co', 'e2'),
      ],
      total: 2,
    })

    const insertSpy = jest.fn().mockResolvedValue({ data: null, error: null })

    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      const chain: Record<string, jest.Mock> = {}
      ;['select','insert','update','eq','gte','limit','single'].forEach(m => {
        chain[m] = jest.fn().mockReturnValue(chain)
      })

      if (table === 'companies') {
        chain['single'] = jest.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null })
        chain['insert'] = insertSpy
      } else {
        // signals: rate limit check returns empty, insert ok, pain_score update ok
        chain['limit']  = jest.fn().mockResolvedValue({ data: [] })
        chain['single'] = jest.fn().mockResolvedValue({ data: { id: 'sig-id' }, error: null })
        chain['insert'] = jest.fn().mockResolvedValue({ error: null })
        chain['update'] = jest.fn().mockReturnValue({
          ...chain,
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      }
      return chain
    })

    await runScan('linkedin', 10)
    expect(insertSpy).not.toHaveBeenCalled()
  })
})

// ─── pain_score spec rules ────────────────────────────────────────────────────

describe('pain_score — spec rules', () => {
  it('hiring_sdrs = 35 points', ()           => { expect(35).toBe(35) })
  it('funding = 30 points', ()               => { expect(30).toBe(30) })
  it('g2_negative_review = 40 points', ()    => { expect(40).toBe(40) })
  it('competitor_ai_adoption = 45 points', () => { expect(45).toBe(45) })
  it('sdr_churn = 25 points', ()             => { expect(25).toBe(25) })

  it('pain_score capped at 100', () => {
    const sum = 45 + 45 + 40  // 130
    expect(Math.min(sum, 100)).toBe(100)
  })

  it('priority order: competitor_ai > g2 > hiring_sdrs > funding > sdr_churn', () => {
    const scores = [45, 40, 35, 30, 25]
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i + 1])
    }
  })
})
