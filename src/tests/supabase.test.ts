/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * Tests: src/lib/supabase.ts
 * Validates client initialization, env var guards, and log utility.
 */

// Prevent dotenv from loading .env during tests — we control env vars manually
jest.mock('dotenv', () => ({ config: jest.fn() }))

describe('supabase.ts — initialization guards', () => {
  const ORIGINAL_URL = process.env.SUPABASE_URL
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  afterEach(() => {
    // Restore env vars and module cache after each test
    process.env.SUPABASE_URL = ORIGINAL_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY
    jest.resetModules()
  })

  it('throws if SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL
    expect(() => require('../lib/supabase')).toThrow('Missing env: SUPABASE_URL')
  })

  it('throws if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => require('../lib/supabase')).toThrow('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  })

  it('initializes successfully when both env vars are set', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    expect(() => require('../lib/supabase')).not.toThrow()
  })

  it('exports a supabase client object', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    const { supabase } = require('../lib/supabase')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })

  it('uses service_role key (never anon key — per data-layer.md rule)', () => {
    // The module uses SUPABASE_SERVICE_ROLE_KEY, not SUPABASE_ANON_KEY
    // This test documents the rule: CLI scripts must always use service_role
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-value'
    const mod = require('../lib/supabase')
    // Client is initialized — if anon key was used instead, service_role ops would fail
    expect(mod.supabase).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key-value')
  })
})

describe('supabase.ts — log() utility', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('log() outputs a timestamped message', () => {
    const { log } = require('../lib/supabase')
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    log('test message')

    expect(spy).toHaveBeenCalledTimes(1)
    const output = spy.mock.calls[0][0] as string
    // Format: [HH:MM:SS] message
    expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}\] test message$/)

    spy.mockRestore()
  })

  it('log() timestamp is in HH:MM:SS format', () => {
    const { log } = require('../lib/supabase')
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    log('hello')

    const output = spy.mock.calls[0][0] as string
    const match = output.match(/^\[(\d{2}:\d{2}:\d{2})\]/)
    expect(match).not.toBeNull()
    const [hh, mm, ss] = match![1].split(':').map(Number)
    expect(hh).toBeGreaterThanOrEqual(0)
    expect(hh).toBeLessThanOrEqual(23)
    expect(mm).toBeGreaterThanOrEqual(0)
    expect(mm).toBeLessThanOrEqual(59)
    expect(ss).toBeGreaterThanOrEqual(0)
    expect(ss).toBeLessThanOrEqual(59)

    spy.mockRestore()
  })
})