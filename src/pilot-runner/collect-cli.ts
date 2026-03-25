import * as dotenv from 'dotenv'
dotenv.config()

import { checkOverduePilots } from './index'
import { log } from '../lib/supabase'

async function main(): Promise<void> {
  log('[collect-cli] Running checkOverduePilots...')

  try {
    const count = await checkOverduePilots()
    log(`[collect-cli] Done — collected ${count} pilot(s)`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[✗] Error: ${msg}`)
    process.exit(1)
  }
}

main()
