import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import LiveCounter from '../components/LiveCounter'
import PilotForm from '../components/PilotForm'
import type { Metadata } from 'next'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  domain: string
  logo_url: string | null
  industry: string | null
  sdr_count: number
  monthly_loss_estimate: number | null
  decision_maker: { name: string; title: string } | null
  tech_stack: string[]
  status: string
}

interface Report {
  id: string
  pdf_url: string | null
  video_url: string | null
  personal_page_slug: string
  status: string
}

interface PageProps {
  params: Promise<{ slug: string }>
}

// ─── SUPABASE (server-side) ───────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── METADATA ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const domain = slug.replace(/-/g, '.')
  const supabase = getSupabase()
  const { data: company } = await supabase
    .from('companies')
    .select('name, monthly_loss_estimate')
    .eq('domain', domain)
    .single()

  if (!company) return { title: 'Pipeline Report' }

  const loss = company.monthly_loss_estimate ?? 1903
  return {
    title: `${company.name} — Hidden Revenue Leak Report`,
    description: `Your pipeline is leaking $${loss.toLocaleString()}/month. See the full breakdown.`,
  }
}

// ─── STATIC PATHS ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('reports')
    .select('personal_page_slug')
    .eq('status', 'ready')

  return (data ?? []).map((r) => ({ slug: r.personal_page_slug }))
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export const revalidate = 60

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params
  const domain = slug.replace(/-/g, '.')
  const supabase = getSupabase()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('domain', domain)
    .single<Company>()

  if (!company) notFound()

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', company.id)
    .single<Report>()

  const monthlyLoss = company.monthly_loss_estimate ?? 1903

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-12 text-center">
        {company.logo_url && (
          <Image
            src={company.logo_url}
            alt={`${company.name} logo`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-xl bg-white object-contain p-1 mb-6"
            unoptimized
          />
        )}

        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">
          Pipeline Autopsy Report · Q1 2026
        </p>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          {company.name} is losing
        </h1>

        <LiveCounter
          monthlyLoss={monthlyLoss}
          sdrCount={company.sdr_count}
          companyId={company.id}
          slug={slug}
        />

        <p className="text-slate-400 text-sm mt-4 mb-8">
          Based on {company.sdr_count} SDR{company.sdr_count !== 1 ? 's' : ''} × 3h/day manual outreach
          {company.industry ? ` in ${company.industry}` : ''}
        </p>

        <a
          href={`https://meetings-eu1.hubspot.com/franksondors/`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Book a Demo — See How to Fix This
        </a>
      </section>

      {/* ── PDF SECTION ───────────────────────────────────────────── */}
      {report?.pdf_url && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-xl font-bold mb-4">Your Pipeline Autopsy Report</h2>
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <iframe
              src={report.pdf_url}
              className="w-full h-[600px]"
              title="Pipeline Autopsy Report"
            />
          </div>
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            ↓ Download PDF
          </a>
        </section>
      )}

      {/* ── VIDEO SECTION (only if video_url exists) ──────────────── */}
      {report?.video_url && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-xl font-bold mb-4">See Your Pipeline Story</h2>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
            <video
              src={report.video_url}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full"
            />
          </div>
        </section>
      )}

      {/* ── PILOT FORM ────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-2">Start 48H Free Pilot</h2>
          <p className="text-slate-400 text-sm mb-6">
            Agent Frank will work on {company.name}&apos;s pipeline for 48 hours —
            real leads, real replies. No commitment.
          </p>
          <PilotForm companyId={company.id} companyName={company.name} />
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="text-center py-8 text-slate-600 text-xs border-t border-slate-900">
        Powered by{' '}
        <span className="text-slate-400 font-medium">Salesforge</span>
        {' · '}
        <span className="text-slate-400 font-medium">Agent Frank</span>
        {' · '}
        <span className="text-slate-400 font-medium">Phantom Pipeline</span>
      </footer>

    </main>
  )
}
