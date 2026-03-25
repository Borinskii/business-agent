import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const supabase = getSupabase()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, domain, industry, location, sdr_count, monthly_loss_estimate, decision_maker, status, pain_score, salesforce_contact_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch reports for these companies
  const companyIds = companies.map((c: { id: string }) => c.id)
  const { data: reports } = await supabase
    .from('reports')
    .select('company_id, pdf_url, video_url, status, personal_page_slug')
    .in('company_id', companyIds)

  // Fetch sequences
  const { data: sequences } = await supabase
    .from('sequences')
    .select('company_id, salesforge_sequence_id, status')
    .in('company_id', companyIds)

  const reportsMap = new Map((reports ?? []).map((r: Record<string, unknown>) => [r.company_id, r]))
  const seqMap = new Map((sequences ?? []).map((s: Record<string, unknown>) => [s.company_id, s]))

  const result = companies.map((c: Record<string, unknown>) => {
    const report = reportsMap.get(c.id) as Record<string, unknown> | undefined
    const seq = seqMap.get(c.id) as Record<string, unknown> | undefined
    return {
      ...c,
      report: report ?? null,
      sequence: seq ?? null,
    }
  })

  return NextResponse.json({ companies: result })
}
