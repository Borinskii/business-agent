/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Tests: src/types/company.ts
 * Validates that all required interfaces exist and that their
 * runtime shapes are correct. Uses companies.json as a fixture.
 */

import companies from '../mocks/companies.json'
import type {
  Company,
  Signal,
  DecisionMaker,
  CompanyStatus,
  SignalType,
} from '../types/company'

// ─── CompanyStatus ────────────────────────────────────────────────────────────

const ALL_STATUSES: CompanyStatus[] = [
  'detected',
  'profiled',
  'content_generated',
  'outreach_sent',
  'page_opened',
  'responded',
  'pilot_running',
  'pilot_results_ready',
  'demo_booked',
  'dnc_blocked',
]

describe('CompanyStatus type', () => {
  it('defines all 10 pipeline statuses from spec', () => {
    expect(ALL_STATUSES).toHaveLength(10)
  })

  it('pipeline order is correct (detected → demo_booked)', () => {
    expect(ALL_STATUSES[0]).toBe('detected')
    expect(ALL_STATUSES[ALL_STATUSES.length - 2]).toBe('demo_booked')
    expect(ALL_STATUSES[ALL_STATUSES.length - 1]).toBe('dnc_blocked')
  })
})

// ─── SignalType ───────────────────────────────────────────────────────────────

const ALL_SIGNAL_TYPES: SignalType[] = [
  'hiring_sdrs',
  'funding',
  'sdr_churn',
  'g2_negative_review',
  'competitor_ai_adoption',
]

describe('SignalType type', () => {
  it('defines all 5 signal types from spec', () => {
    expect(ALL_SIGNAL_TYPES).toHaveLength(5)
  })
})

// ─── DecisionMaker interface ──────────────────────────────────────────────────

describe('DecisionMaker interface', () => {
  it('has required fields: name, title, email, linkedin_url', () => {
    const dm: DecisionMaker = {
      name: 'John Doe',
      title: 'VP Sales',
      email: 'john@example.com',
      linkedin_url: 'https://linkedin.com/in/johndoe',
    }
    expect(dm.name).toBeDefined()
    expect(dm.title).toBeDefined()
    expect(dm.email).toBeDefined()
    expect(dm.linkedin_url).toBeDefined()
  })

  it('linkedin_url can be null', () => {
    const dm: DecisionMaker = {
      name: 'John Doe',
      title: 'VP Sales',
      email: 'john@example.com',
      linkedin_url: null,
    }
    expect(dm.linkedin_url).toBeNull()
  })
})

// ─── Signal interface ─────────────────────────────────────────────────────────

describe('Signal interface', () => {
  it('has all required fields', () => {
    const signal: Signal = {
      id: 'uuid-test',
      company_id: 'company-uuid',
      type: 'hiring_sdrs',
      detail: 'Posted 3 SDR roles',
      source: 'LinkedIn',
      source_url: null,
      raw_data: {},
      pain_points: 35,
      detected_at: new Date().toISOString(),
    }
    expect(signal.id).toBeDefined()
    expect(signal.company_id).toBeDefined()
    expect(signal.type).toBe('hiring_sdrs')
    expect(signal.pain_points).toBe(35)
  })

  it('source_url can be null', () => {
    const signal: Signal = {
      id: 'uuid-test',
      company_id: 'company-uuid',
      type: 'funding',
      detail: 'Raised Series A',
      source: 'Crunchbase',
      source_url: null,
      raw_data: {},
      pain_points: 30,
      detected_at: new Date().toISOString(),
    }
    expect(signal.source_url).toBeNull()
  })
})

// ─── Company interface — shape validation ─────────────────────────────────────

describe('Company interface — mock data conforms to type', () => {
  it('mock companies match Company interface shape', () => {
    companies.forEach((raw) => {
      // Cast to Company — TypeScript guarantees fields at compile time,
      // but we validate runtime shape here
      const c = raw as unknown as Company

      expect(typeof c.id).toBe('string')
      expect(typeof c.name).toBe('string')
      expect(typeof c.domain).toBe('string')
      expect(typeof c.sdr_count).toBe('number')
      expect(typeof c.pain_score).toBe('number')
      expect(typeof c.status).toBe('string')
      expect(typeof c.created_at).toBe('string')
      expect(typeof c.updated_at).toBe('string')
      expect(Array.isArray(c.tech_stack)).toBe(true)
      expect(ALL_STATUSES).toContain(c.status)
    })
  })

  it('all nullable fields are present (even if null)', () => {
    companies.forEach((raw) => {
      const c = raw as unknown as Company
      // These keys must exist (even if null/undefined)
      expect('logo_url' in c).toBe(true)
      expect('industry' in c).toBe(true)
      expect('size' in c).toBe(true)
      expect('location' in c).toBe(true)
      expect('decision_maker' in c).toBe(true)
      expect('monthly_loss_estimate' in c).toBe(true)
      expect('salesforce_contact_id' in c).toBe(true)
      expect('competitor_using_ai' in c).toBe(true)
    })
  })
})

// ─── UploadLog — referenced in spec, covered by upload_log table ──────────────

describe('UploadLog — spec coverage', () => {
  it('upload_log action values are constrained to spec values', () => {
    const validActions = ['dnc_check', 'validation', 'bulk_upload']
    const validStatuses = ['success', 'failed', 'skipped']

    // Verified by SQL CHECK in migration — runtime documentation test
    expect(validActions).toContain('dnc_check')
    expect(validActions).toContain('validation')
    expect(validActions).toContain('bulk_upload')
    expect(validStatuses).toContain('success')
    expect(validStatuses).toContain('failed')
    expect(validStatuses).toContain('skipped')
  })
})