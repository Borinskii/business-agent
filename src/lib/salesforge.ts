import { log } from './supabase'

if (!process.env.SALESFORGE_API_KEY) {
  throw new Error('Missing env: SALESFORGE_API_KEY')
}
if (!process.env.SALESFORGE_WORKSPACE_ID) {
  throw new Error('Missing env: SALESFORGE_WORKSPACE_ID')
}

const BASE_URL = 'https://api.salesforge.ai/public/v2'
export const WORKSPACE_ID = process.env.SALESFORGE_WORKSPACE_ID

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e: unknown) {
      const isRateLimit = e instanceof Error && e.message === 'RATE_LIMIT'
      if (!isRateLimit || i === retries - 1) throw e
      const delay = 30_000 * Math.pow(2, i)
      log(`[salesforge] 429 rate limit — retrying in ${delay / 1000}s (attempt ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('MAX_RETRIES_EXCEEDED')
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${process.env.SALESFORGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    })

    if (res.status === 429) throw new Error('RATE_LIMIT')
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SF_API_${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  })
}

export const sf = {
  get:    <T = unknown>(path: string) => request<T>('GET', path),
  post:   <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:    <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),

  // Workspace-scoped shortcuts
  ws: {
    get:  <T = unknown>(path: string) => request<T>('GET', `/workspaces/${WORKSPACE_ID}${path}`),
    post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', `/workspaces/${WORKSPACE_ID}${path}`, body),
    put:  <T = unknown>(path: string, body?: unknown) => request<T>('PUT', `/workspaces/${WORKSPACE_ID}${path}`, body),
  }
}
