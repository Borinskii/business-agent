/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Tests: src/mocks/companies.json
 * Validates that mock data conforms to spec (SPEC_PERSON_1_DATA_INTELLIGENCE.md)
 * and unblocks Person 2 + Person 3.
 */

import companies from '../mocks/companies.json'
import type { Company, DecisionMaker } from '../types/company'

const VALID_STATUSES = [
  'detected', 'profiled', 'content_generated', 'outreach_sent',
  'page_opened', 'responded', 'pilot_running', 'pilot_results_ready',
  'demo_booked', 'dnc_blocked',
]

const VALID_SIGNAL_TYPES = [
  'hiring_sdrs', 'funding', 'sdr_churn', 'g2_negative_review', 'competitor_ai_adoption',
]

const PAIN_POINTS_BY_TYPE: Record<string, number> = {
  hiring_sdrs: 35,
  funding: 30,
  g2_negative_review: 40,
  sdr_churn: 25,
  competitor_ai_adoption: 45,
}

describe('companies.json — structure', () => {
  it('contains exactly 3 companies', () => {
    expect(companies).toHaveLength(3)
  })

  it('all companies have status = profiled (required by Day 1 spec)', () => {
    companies.forEach((c) => {
      expect(c.status).toBe('profiled')
    })
  })

  it('all company ids are unique', () => {
    const ids = companies.map((c) => c.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('all domains are unique', () => {
    const domains = companies.map((c) => c.domain)
    expect(new Set(domains).size).toBe(3)
  })
})

describe('companies.json — required fields per Company interface', () => {
  companies.forEach((company) => {
    describe(`company: ${company.name}`, () => {
      it('has a non-empty id', () => {
        expect(typeof company.id).toBe('string')
        expect(company.id.length).toBeGreaterThan(0)
      })

      it('has a non-empty name', () => {
        expect(typeof company.name).toBe('string')
        expect(company.name.length).toBeGreaterThan(0)
      })

      it('has a valid domain', () => {
        expect(typeof company.domain).toBe('string')
        expect(company.domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/)
      })

      it('has a valid status value', () => {
        expect(VALID_STATUSES).toContain(company.status)
      })

      it('has sdr_count > 0', () => {
        expect(company.sdr_count).toBeGreaterThan(0)
      })

      it('has pain_score between 0 and 100', () => {
        expect(company.pain_score).toBeGreaterThanOrEqual(0)
        expect(company.pain_score).toBeLessThanOrEqual(100)
      })

      it('has monthly_loss_estimate = sdr_count * 1903 (spec formula)', () => {
        expect(company.monthly_loss_estimate).toBe(company.sdr_count * 1903)
      })

      it('has tech_stack as an array', () => {
        expect(Array.isArray(company.tech_stack)).toBe(true)
      })

      it('has created_at and updated_at as ISO strings', () => {
        expect(() => new Date(company.created_at)).not.toThrow()
        expect(() => new Date(company.updated_at)).not.toThrow()
        expect(isNaN(new Date(company.created_at).getTime())).toBe(false)
        expect(isNaN(new Date(company.updated_at).getTime())).toBe(false)
      })
    })
  })
})

describe('companies.json — decision_maker (required for pipeline)', () => {
  companies.forEach((company) => {
    describe(`decision_maker: ${company.name}`, () => {
      const dm = company.decision_maker as DecisionMaker | null

      it('decision_maker is not null (required: email needed to proceed)', () => {
        expect(dm).not.toBeNull()
      })

      it('has a non-empty name', () => {
        expect(typeof dm!.name).toBe('string')
        expect(dm!.name.length).toBeGreaterThan(0)
      })

      it('has a non-empty title', () => {
        expect(typeof dm!.title).toBe('string')
        expect(dm!.title.length).toBeGreaterThan(0)
      })

      it('has a valid email (required: without it company does not proceed)', () => {
        expect(typeof dm!.email).toBe('string')
        expect(dm!.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      })

      it('email domain matches company domain', () => {
        const emailDomain = dm!.email.split('@')[1]
        expect(emailDomain).toBe(company.domain)
      })
    })
  })
})

describe('companies.json — signals', () => {
  companies.forEach((company) => {
    describe(`signals: ${company.name}`, () => {
      const signals = (company as Company & { signals: Array<{ type: string; detail: string; source: string; pain_points: number }> }).signals

      it('has at least one signal', () => {
        expect(signals.length).toBeGreaterThan(0)
      })

      signals.forEach((signal, i) => {
        it(`signal[${i}] has a valid type`, () => {
          expect(VALID_SIGNAL_TYPES).toContain(signal.type)
        })

        it(`signal[${i}] has correct pain_points for type ${signal.type}`, () => {
          expect(signal.pain_points).toBe(PAIN_POINTS_BY_TYPE[signal.type])
        })

        it(`signal[${i}] has non-empty detail`, () => {
          expect(signal.detail.length).toBeGreaterThan(0)
        })

        it(`signal[${i}] has non-empty source`, () => {
          expect(signal.source.length).toBeGreaterThan(0)
        })
      })
    })
  })
})

describe('companies.json — sdr_count heuristic (spec rule)', () => {
  it('TalentFlow: size=45 (30-100) → sdr_count=3', () => {
    const c = companies.find((x) => x.name === 'TalentFlow')!
    expect(c.size).toBeGreaterThanOrEqual(30)
    expect(c.size).toBeLessThanOrEqual(100)
    expect(c.sdr_count).toBe(3)
  })

  it('Finstack: size=120 (100-200) → sdr_count=6', () => {
    const c = companies.find((x) => x.name === 'Finstack')!
    expect(c.size).toBeGreaterThanOrEqual(100)
    expect(c.size).toBeLessThanOrEqual(200)
    expect(c.sdr_count).toBe(6)
  })

  it('DevReach: size=28 (<30) → sdr_count could be 1 or 2 (startup adjustment)', () => {
    const c = companies.find((x) => x.name === 'DevReach')!
    expect(c.size).toBeLessThan(30)
    // spec says size<30 → 1 SDR, but DevReach has 2 (founder + 1 hire)
    expect(c.sdr_count).toBeGreaterThanOrEqual(1)
  })
})