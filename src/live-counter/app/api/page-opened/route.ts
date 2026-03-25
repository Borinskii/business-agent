import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + 'phantom-salt').digest('hex').slice(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    const { company_id, slug } = await req.json() as { company_id: string; slug: string }

    if (!company_id) {
      return NextResponse.json({ error: 'missing_company_id' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? '0.0.0.0'
    const ip_hash = hashIp(ip)
    const user_agent = req.headers.get('user-agent') ?? ''

    const supabase = getSupabase()

    // Deduplicate: check if this ip_hash already viewed this company
    const { data: existing } = await supabase
      .from('page_views')
      .select('id')
      .eq('company_id', company_id)
      .eq('ip_hash', ip_hash)
      .single()

    if (!existing) {
      // Record the view
      await supabase.from('page_views').insert({ company_id, ip_hash, user_agent })

      // Advance status: outreach_sent → page_opened
      await supabase
        .from('companies')
        .update({ status: 'page_opened' })
        .eq('id', company_id)
        .eq('status', 'outreach_sent')

      // Notify Person 3 if webhook configured
      const webhookUrl = process.env.PERSON_3_WEBHOOK_URL
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'page_opened', company_id, slug, ip_hash }),
        }).catch(() => {/* fire and forget */})
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
