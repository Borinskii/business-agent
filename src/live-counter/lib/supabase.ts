/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client (service role) — only use in Server Components / API routes
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

// Public client for client components (anon key = service key for now, read-only pages)
export const supabasePublic = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_URL ? supabaseServiceKey : supabaseServiceKey
)