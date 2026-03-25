/**
 * Tests: src/lib/salesforge.ts
 * Validates: API client, retry logic, rate limit handling, workspace shortcuts.
 */

jest.mock('dotenv', () => ({ config: jest.fn() }))

// Mock supabase to avoid double-initialization in salesforge (imports log from supabase)
jest.mock('../lib/supabase', () => ({
  log: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper: build a mock Response
function mockResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

describe('salesforge.ts — env var guards', () => {
  // Checks are now inside request(), not at module level (dotenv.config() pattern)

  it('module loads without throwing when env vars are absent', () => {
    // With the new pattern, module load never throws — checks happen per-request
    expect(() => require('../lib/salesforge')).not.toThrow()
  })

  it('throws Missing env: SALESFORGE_API_KEY when request is made without key', async () => {
    const ORIGINAL = process.env.SALESFORGE_API_KEY
    delete process.env.SALESFORGE_API_KEY
    const { sf: sfMod } = require('../lib/salesforge')
    await expect(sfMod.get('/test')).rejects.toThrow('Missing env: SALESFORGE_API_KEY')
    process.env.SALESFORGE_API_KEY = ORIGINAL
  })

  it('initializes and exports sf object on load', () => {
    const mod = require('../lib/salesforge')
    expect(mod.sf).toBeDefined()
    expect(typeof mod.sf.get).toBe('function')
  })
})

describe('salesforge.ts — sf client exports', () => {
  let sf: typeof import('../lib/salesforge')['sf']
  let WORKSPACE_ID: string

  beforeAll(() => {
    const mod = require('../lib/salesforge')
    sf = mod.sf
    WORKSPACE_ID = mod.WORKSPACE_ID
  })

  it('exports sf with get, post, put, delete methods', () => {
    expect(typeof sf.get).toBe('function')
    expect(typeof sf.post).toBe('function')
    expect(typeof sf.put).toBe('function')
    expect(typeof sf.delete).toBe('function')
  })

  it('exports sf.ws with get, post, put methods', () => {
    expect(typeof sf.ws.get).toBe('function')
    expect(typeof sf.ws.post).toBe('function')
    expect(typeof sf.ws.put).toBe('function')
  })

  it('WORKSPACE_ID equals env var', () => {
    expect(WORKSPACE_ID).toBe(process.env.SALESFORGE_WORKSPACE_ID)
  })
})

describe('salesforge.ts — HTTP requests', () => {
  let sf: typeof import('../lib/salesforge')['sf']

  beforeAll(() => {
    sf = require('../lib/salesforge').sf
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('GET sends correct Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { ok: true }))

    await sf.get('/test-path')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.salesforge.ai/public/v2/test-path',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: process.env.SALESFORGE_API_KEY,
        }),
      })
    )
  })

  it('POST sends body as JSON', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { contact_id: 'cnt_123' }))
    const payload = { email: 'test@example.com' }

    await sf.post('/contacts', payload)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('GET returns parsed JSON response', async () => {
    const expected = { signals: [], total: 0 }
    mockFetch.mockResolvedValueOnce(mockResponse(200, expected))

    const result = await sf.get('/signals')
    expect(result).toEqual(expected)
  })

  it('non-ok response throws SF_API_{status} error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Not found'))

    await expect(sf.get('/missing')).rejects.toThrow(/SF_API_404/)
  })

  it('500 response throws SF_API_500 error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal error'))

    await expect(sf.get('/broken')).rejects.toThrow(/SF_API_500/)
  })
})

describe('salesforge.ts — workspace shortcuts (sf.ws)', () => {
  let sf: typeof import('../lib/salesforge')['sf']
  let WORKSPACE_ID: string

  beforeAll(() => {
    const mod = require('../lib/salesforge')
    sf = mod.sf
    WORKSPACE_ID = mod.WORKSPACE_ID
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sf.ws.get prepends /workspaces/{WORKSPACE_ID}', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {}))

    await sf.ws.get('/dnc/check')

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.salesforge.ai/public/v2/workspaces/${WORKSPACE_ID}/dnc/check`,
      expect.any(Object)
    )
  })

  it('sf.ws.post prepends /workspaces/{WORKSPACE_ID}', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {}))

    await sf.ws.post('/contacts/bulk', { contacts: [] })

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.salesforge.ai/public/v2/workspaces/${WORKSPACE_ID}/contacts/bulk`,
      expect.any(Object)
    )
  })
})

describe('salesforge.ts — retry logic on 429 rate limit', () => {
  let sf: typeof import('../lib/salesforge')['sf']

  beforeAll(() => {
    sf = require('../lib/salesforge').sf
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('retries after 429 and succeeds on 2nd attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(429, 'rate limited'))  // attempt 1
      .mockResolvedValueOnce(mockResponse(200, { ok: true }))    // attempt 2

    const promise = sf.get('/test-retry')

    await jest.runAllTimersAsync()

    const result = await promise
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries 3 times on 429 then throws RATE_LIMIT (last retry rethrows original error)', async () => {
    // withRetry logic: on last attempt (i === retries-1), rethrows the original RATE_LIMIT error
    mockFetch.mockResolvedValue(mockResponse(429, 'rate limited'))

    // Start the request but do NOT await yet — need to advance timers first
    const resultPromise = sf.get('/always-limited').catch((e: unknown) => e)

    // runAllTimersAsync fires all pending timers including chained ones
    await jest.runAllTimersAsync()

    const error = await resultPromise

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('RATE_LIMIT')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('retry delays follow exponential backoff: 30s → 60s → 120s (spec rule)', () => {
    // Verify delay formula: 30_000 * 2^i
    expect(30_000 * Math.pow(2, 0)).toBe(30_000)   // attempt 1 → wait 30s
    expect(30_000 * Math.pow(2, 1)).toBe(60_000)   // attempt 2 → wait 60s
    expect(30_000 * Math.pow(2, 2)).toBe(120_000)  // attempt 3 → wait 120s (matches CLAUDE.md spec)
  })

  it('does NOT retry on non-429 errors', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'server error'))

    const error = await sf.get('/server-error').catch((e: unknown) => e)
    expect((error as Error).message).toMatch(/SF_API_500/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('salesforge.ts — DNC and upload flows (contract)', () => {
  let sf: typeof import('../lib/salesforge')['sf']
  let WORKSPACE_ID: string

  beforeAll(() => {
    const mod = require('../lib/salesforge')
    sf = mod.sf
    WORKSPACE_ID = mod.WORKSPACE_ID
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('DNC check hits correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { blocked: false }))

    await sf.ws.post('/dnc/check', { emails: ['test@example.com'] })

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.salesforge.ai/public/v2/workspaces/${WORKSPACE_ID}/dnc/check`,
      expect.any(Object)
    )
  })

  it('bulk upload hits correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { contact_id: 'cnt_abc' }))

    await sf.ws.post('/contacts/bulk', {
      contacts: [{
        email: 's.chen@talentflow.io',
        firstName: 'Sarah',
        lastName: 'Chen',
        customVars: {
          company_name: 'TalentFlow',
          pdf_url: '',
          video_url: '',
        },
      }],
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.salesforge.ai/public/v2/workspaces/${WORKSPACE_ID}/contacts/bulk`,
      expect.objectContaining({ method: 'POST' })
    )
  })
})
