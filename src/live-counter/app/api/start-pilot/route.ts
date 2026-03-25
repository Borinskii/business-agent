import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { company_id, icp_description, email } = await req.json() as {
      company_id: string
      icp_description: string
      email?: string
    }

    if (!company_id) {
      return NextResponse.json({ error: 'missing_company_id' }, { status: 400 })
    }

    if (!icp_description || icp_description.trim().length < 10) {
      return NextResponse.json({ error: 'icp_description_required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Save pilot request
    await supabase.from('pilot_requests').insert({
      company_id,
      icp_description: icp_description.trim(),
      requester_email: email ?? null,
    })

    // Advance status → responded (Person 3 will pick it up)
    await supabase
      .from('companies')
      .update({ status: 'responded' })
      .eq('id', company_id)
      .in('status', ['page_opened', 'outreach_sent', 'profiled'])

    // Notify Person 3
    const webhookUrl = process.env.PERSON_3_WEBHOOK_URL
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'pilot_requested',
          company_id,
          icp_description: icp_description.trim(),
          email: email ?? null,
        }),
      }).catch(() => {/* fire and forget */})
    }

    return NextResponse.json({ ok: true, message: 'Pilot starting within 1 hour' })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
