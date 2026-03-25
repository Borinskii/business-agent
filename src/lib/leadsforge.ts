import * as dotenv from 'dotenv'
dotenv.config()

import { log } from './supabase'

export const BASE_URL = 'https://api.leadsforge.ai/public/v1'

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e: unknown) {
      const isRateLimit = e instanceof Error && e.message === 'RATE_LIMIT'
      if (!isRateLimit || i === retries - 1) throw e
      const delay = 30_000 * Math.pow(2, i)
      log(`[leadsforge] 429 rate limit — retrying in ${delay / 1000}s (attempt ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('MAX_RETRIES_EXCEEDED')
}

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const API_KEY = process.env.LEADSFORGE_API_KEY
  if (!API_KEY) throw new Error('Missing env: LEADSFORGE_API_KEY')

  return withRetry(async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) throw new Error('RATE_LIMIT')
    if (!res.ok) throw new Error(`LF_API_${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  })
}

export const lf = {
  get:  <T = unknown>(path: string)                 => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
}

// ─── Leadsforge types (real API) ─────────────────────────────────────────────

export interface LfLead {
  id:              string
  firstName:       string | null
  lastName:        string | null
  jobTitle:        string | null
  jobDescription:  string | null
  linkedinUrl:     string | null
  location:        { city: string | null; state: string | null; country: string | null } | null
  company:         { name: string | null; domain: string | null } | null
}

export interface LfSearchResponse {
  leads: LfLead[]
  total: number
}

export interface LfLookalikeCompany {
  domain:      string
  name:        string
  website:     string
  industry:    string | null
  description: string | null
  keywords:    string[]
  logo:        string | null
}

export interface LfLookalikeResponse {
  companies:  LfLookalikeCompany[]
  page:       number
  pageSize:   number
  totalCount: number
  totalPages: number
}

// ─── Leadsforge request body types ───────────────────────────────────────────

export interface LfLookalikeSearchRequest {
  domains:  string[]
  page:     number
  pageSize: number
}

export interface LfPersonSearchRequest {
  jobTitle?:     string
  jobTitles?:    string[]
  country?:      string
  companyDomain?: string
  limit?:        number
  page?:         number
}

export interface LfEnrichJob {
  jobID:          string
  status:         string   // 'pending' | 'completed'
  total:          number
  processed:      number
  succeeded:      number
  failed:         number
  consumedCredits: number
}

export interface LfEnrichResult {
  personID:    string
  status:      string   // 'succeeded' | 'failed'
  payload:     { email: string } | null
  error:       string | null
}

export interface LfEnrichResultsResponse {
  results: LfEnrichResult[]
  total:   number
}
