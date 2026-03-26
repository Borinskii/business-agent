import type { Company } from '../types/company'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ReportContent {
  headline: string
  diagnosis: string
  monthly_loss_dollars: number
  annual_loss_dollars: number
  hours_wasted_monthly: number
  demos_missed_monthly: number
  competitor_insight: string
  solution_preview: string
  cta_text: string
}

// ─── LOGO FALLBACK ────────────────────────────────────────────────────────────

function buildLogoSvg(name: string): string {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="12" fill="#0f172a"/>
      <text x="50%" y="55%" font-family="Arial,sans-serif" font-size="28" font-weight="700"
            fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    </svg>`
  ).toString('base64')}`
}

// ─── NUMBER FORMATTING ────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ─── HTML BUILDER ─────────────────────────────────────────────────────────────

export function buildReportHTML(company: Company, content: ReportContent): string {
  const slug = company.domain.replace(/\./g, '-')
  const logoUrl = company.logo_url ?? buildLogoSvg(company.name)
  const pageUrl = `https://phantom-pipeline.com/${slug}`

  const primarySignal = Array.isArray((company as unknown as Record<string, unknown>).signals)
    ? ((company as unknown as Record<string, unknown>).signals as Array<{ detail: string }>)[0]?.detail ?? ''
    : ''

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company.name} — Pipeline Autopsy Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
    }

    /* ── PAGE LAYOUT ────────────────────────────────────── */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      page-break-after: always;
      overflow: hidden;
      position: relative;
    }
    .page:last-child { page-break-after: auto; }

    /* ── COMMON ELEMENTS ─────────────────────────────────── */
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 100px;
    }
    .badge-red    { background: #fef2f2; color: #dc2626; }
    .badge-dark   { background: #0f172a; color: #f8fafc; }
    .badge-orange { background: #fff7ed; color: #ea580c; }
    .badge-green  { background: #f0fdf4; color: #16a34a; }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }

    /* ── PAGE 1: COVER ───────────────────────────────────── */
    .cover {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 56px 64px;
      color: white;
    }

    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .cover-logo-wrap {
      width: 80px;
      height: 80px;
      border-radius: 14px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .cover-logo-wrap img {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }

    .cover-meta {
      text-align: right;
    }
    .cover-meta .report-type {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .cover-meta .report-date {
      font-size: 13px;
      color: #cbd5e1;
      margin-top: 4px;
    }

    .cover-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px 0 32px;
    }

    .cover-company-name {
      font-size: 48px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 12px;
    }

    .cover-report-title {
      font-size: 20px;
      font-weight: 500;
      color: #94a3b8;
      margin-bottom: 40px;
    }

    .cover-headline-box {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 24px 28px;
      font-size: 22px;
      font-weight: 700;
      color: #fca5a5;
      line-height: 1.4;
      max-width: 540px;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 32px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .cover-footer-label {
      font-size: 11px;
      color: #475569;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .cover-loss-preview {
      font-size: 32px;
      font-weight: 900;
      color: #ef4444;
    }
    .cover-loss-label {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
      text-align: right;
    }

    /* ── PAGE 2: METRICS ─────────────────────────────────── */
    .metrics-page {
      padding: 56px 64px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    .metrics-page h2 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }

    .diagnosis-text {
      font-size: 15px;
      line-height: 1.7;
      color: #475569;
      max-width: 520px;
      margin-bottom: 40px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px 24px;
    }
    .metric-card.danger {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .metric-value {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1;
      margin-bottom: 6px;
    }
    .metric-card.danger .metric-value { color: #dc2626; }

    .metric-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .signal-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 20px 24px;
    }

    .signal-box .signal-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #d97706;
      margin-bottom: 6px;
    }

    .signal-box .signal-text {
      font-size: 14px;
      color: #78350f;
      line-height: 1.5;
    }

    /* ── PAGE 3: COMPETITOR ──────────────────────────────── */
    .competitor-page {
      padding: 56px 64px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
    }

    .competitor-page h2 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }

    .competitor-intro {
      font-size: 15px;
      line-height: 1.7;
      color: #475569;
      margin-bottom: 32px;
    }

    .industry-stat {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .industry-stat:last-child { border-bottom: none; }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #0f172a;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .stat-body {}
    .stat-headline {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .stat-detail {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }

    /* ── PAGE 4: SOLUTION ────────────────────────────────── */
    .solution-page {
      padding: 56px 64px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    .solution-page h2 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }

    .solution-text {
      font-size: 15px;
      line-height: 1.7;
      color: #475569;
      margin-bottom: 36px;
      max-width: 540px;
    }

    .pipeline-timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .timeline-item {
      display: flex;
      gap: 20px;
      position: relative;
    }

    .timeline-dot-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .timeline-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0f172a;
      color: white;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .timeline-line {
      width: 2px;
      flex: 1;
      min-height: 24px;
      background: #e2e8f0;
      margin: 4px 0;
    }

    .timeline-content {
      padding-bottom: 24px;
      flex: 1;
    }

    .timeline-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }

    .timeline-desc {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }

    .results-row {
      display: flex;
      gap: 16px;
      margin-top: 32px;
    }

    .result-pill {
      flex: 1;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .result-pill .pill-value {
      font-size: 24px;
      font-weight: 900;
      color: #16a34a;
    }

    .result-pill .pill-label {
      font-size: 11px;
      color: #15803d;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 2px;
    }

    /* ── PAGE 5: CTA ─────────────────────────────────────── */
    .cta-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 64px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 297mm;
    }

    .cta-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 20px;
    }

    .cta-headline {
      font-size: 36px;
      font-weight: 900;
      line-height: 1.2;
      letter-spacing: -0.02em;
      max-width: 480px;
      margin-bottom: 16px;
    }

    .cta-text {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      max-width: 420px;
      margin-bottom: 48px;
    }

    .reply-box {
      background: rgba(239, 68, 68, 0.12);
      border: 2px solid rgba(239, 68, 68, 0.5);
      border-radius: 16px;
      padding: 32px 40px;
      font-size: 24px;
      font-weight: 700;
      color: #fca5a5;
      margin-bottom: 32px;
      max-width: 440px;
    }

    .reply-box strong {
      color: #ef4444;
      font-size: 28px;
    }

    .page-link {
      font-size: 13px;
      color: #475569;
      margin-bottom: 48px;
    }

    .page-link a {
      color: #60a5fa;
      text-decoration: none;
    }

    .powered-by {
      font-size: 11px;
      color: #334155;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-top: auto;
    }

    @media print {
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 1: COVER
  ════════════════════════════════════════════════════════════ -->
  <div class="page cover">
    <div class="cover-top">
      <div class="cover-logo-wrap">
        <img
          src="${logoUrl}"
          alt="${company.name} logo"
          onerror="this.src='${buildLogoSvg(company.name)}'"
        />
      </div>
      <div class="cover-meta">
        <div class="report-type">Pipeline Autopsy Report</div>
        <div class="report-date">Q1 2026 · Confidential</div>
      </div>
    </div>

    <div class="cover-main">
      <div class="cover-company-name">${company.name}</div>
      <div class="cover-report-title">Hidden Revenue Leak Report · Q1 2026</div>
      <div class="cover-headline-box">${content.headline}</div>
    </div>

    <div class="cover-footer">
      <div>
        <div class="cover-footer-label">Prepared by</div>
        <div style="color:#60a5fa;font-weight:700;font-size:15px;margin-top:4px">Phantom Pipeline</div>
        <div style="color:#475569;font-size:11px;margin-top:2px">Powered by Salesforge · Agent Frank</div>
      </div>
      <div style="text-align:right">
        <div class="cover-loss-preview">${formatMoney(content.monthly_loss_dollars)}</div>
        <div class="cover-loss-label">estimated loss / month</div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 2: DIAGNOSIS & METRICS
  ════════════════════════════════════════════════════════════ -->
  <div class="page metrics-page">
    <div class="section-label">The Diagnosis</div>
    <h2>Here's What the Numbers Say</h2>
    <hr class="divider">

    <p class="diagnosis-text">${content.diagnosis}</p>

    <div class="metrics-grid">
      <div class="metric-card danger">
        <div class="metric-value">${formatMoney(content.monthly_loss_dollars)}</div>
        <div class="metric-label">Lost per month</div>
      </div>
      <div class="metric-card danger">
        <div class="metric-value">${formatMoney(content.annual_loss_dollars)}</div>
        <div class="metric-label">Annual revenue impact</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${content.hours_wasted_monthly}h</div>
        <div class="metric-label">SDR hours wasted / month</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${content.demos_missed_monthly}</div>
        <div class="metric-label">Demos missed / month</div>
      </div>
    </div>

    ${primarySignal ? `<div class="signal-box">
      <div class="signal-label">⚡ Pain signal detected</div>
      <div class="signal-text">${primarySignal}</div>
    </div>` : ''}

    <div style="margin-top:auto;padding-top:32px;font-size:12px;color:#94a3b8;">
      Based on: ${company.sdr_count} SDR${company.sdr_count !== 1 ? 's' : ''} × 3h/day manual outreach × 22 working days
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 3: WHAT'S HAPPENING IN YOUR SPACE
  ════════════════════════════════════════════════════════════ -->
  <div class="page competitor-page">
    <div class="section-label">Industry Intelligence</div>
    <h2>What's Happening in Your Space</h2>
    <hr class="divider">

    <p class="competitor-intro">${content.competitor_insight}</p>

    <div>
      <div class="industry-stat">
        <div class="stat-icon">📈</div>
        <div class="stat-body">
          <div class="stat-headline">AI SDR adoption growing 340% year-over-year</div>
          <div class="stat-detail">
            ${company.industry ?? 'Your industry'} companies are moving fast. Those who automate their pipeline now lock in the moat for the next 18–24 months.
          </div>
        </div>
      </div>
      <div class="industry-stat">
        <div class="stat-icon">🎯</div>
        <div class="stat-body">
          <div class="stat-headline">8–16% reply rate with AI personalization vs 1–2% manual</div>
          <div class="stat-detail">
            Your current stack (${company.tech_stack.join(', ')}) is built for manual sequences. AI-personalized outreach converts 8x better on average.
          </div>
        </div>
      </div>
      <div class="industry-stat">
        <div class="stat-icon">⏱️</div>
        <div class="stat-body">
          <div class="stat-headline">60% of companies plan AI SDR by 2026</div>
          <div class="stat-detail">
            The window to be first in your category is closing. Companies who acted in 2024–2025 now have a compound data advantage.
          </div>
        </div>
      </div>
      <div class="industry-stat">
        <div class="stat-icon">💰</div>
        <div class="stat-body">
          <div class="stat-headline">ROI turns positive within the first 30 days</div>
          <div class="stat-detail">
            At ${formatMoney(content.monthly_loss_dollars)} monthly waste, the break-even on automated outreach is measured in days, not months.
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 4: SOLUTION
  ════════════════════════════════════════════════════════════ -->
  <div class="page solution-page">
    <div class="section-label">The Fix</div>
    <h2>What ${company.name}'s Pipeline Could Look Like</h2>
    <hr class="divider">

    <p class="solution-text">${content.solution_preview}</p>

    <div class="pipeline-timeline">
      <div class="timeline-item">
        <div class="timeline-dot-wrap">
          <div class="timeline-dot">1</div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">Signal Detection</div>
          <div class="timeline-desc">AI monitors ${company.industry ?? 'your industry'} for hiring signals, funding events, and G2 reviews — identifying warm prospects before they start searching.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot-wrap">
          <div class="timeline-dot">2</div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">Automated Profile + Personalization</div>
          <div class="timeline-desc">Each prospect gets a personalized report with their exact numbers — generated in seconds, not hours.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot-wrap">
          <div class="timeline-dot">3</div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">Multichannel Outreach (Email + LinkedIn)</div>
          <div class="timeline-desc">Sequences launch automatically. Agent Frank handles replies 24/7 — responding in under 5 minutes, qualifying intent, and booking demos.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot-wrap">
          <div class="timeline-dot">4</div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">48H Free Pilot → Demo Booked</div>
          <div class="timeline-desc">Interested? Your ${company.sdr_count} SDR${company.sdr_count !== 1 ? 's' : ''} get a live 48-hour pilot — real leads, real replies — before any commitment.</div>
        </div>
      </div>
    </div>

    <div class="results-row">
      <div class="result-pill">
        <div class="pill-value">8–16%</div>
        <div class="pill-label">Reply rate</div>
      </div>
      <div class="result-pill">
        <div class="pill-value">5 min</div>
        <div class="pill-label">Avg response time</div>
      </div>
      <div class="result-pill">
        <div class="pill-value">48h</div>
        <div class="pill-label">Time to first result</div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 5: CTA
  ════════════════════════════════════════════════════════════ -->
  <div class="page cta-page">
    <div class="cta-eyebrow">Next step</div>
    <div class="cta-headline">${content.cta_text}</div>
    <div class="cta-text">
      We'll walk you through exactly how we calculated ${company.name}'s ${formatMoney(content.monthly_loss_dollars)}/month leak
      — and show you a live demo of the automated pipeline.
    </div>

    <div class="reply-box">
      Reply <strong>YES</strong> — we'll show you how we<br>
      calculated this — book a demo
    </div>

    <div class="page-link">
      Or visit: <a href="${pageUrl}">${pageUrl}</a>
    </div>

    <div class="powered-by">Powered by Salesforge · Agent Frank · Phantom Pipeline</div>
  </div>

</body>
</html>`
}

// ─── MOCK RENDER TEST ─────────────────────────────────────────────────────────
// Run: npx ts-node src/pdf-generator/template.ts
// to verify the template renders without errors on mock data

if (require.main === module) {
  const companies = require('../mocks/companies.json') as Array<
    Company & { signals: Array<{ detail: string }> }
  >

  const mockContent: ReportContent = {
    headline: 'Your 3 SDRs are burning $5,709/month on manual outreach that converts at 1%',
    diagnosis:
      'TalentFlow is spending roughly 198 SDR-hours per month on manual prospecting and cold outreach — time that converts at under 2%. With AI-personalized sequencing, that same effort yields 8–16x more demos and closes the pipeline gap that hiring alone cannot fix.',
    monthly_loss_dollars: 5709,
    annual_loss_dollars: 68508,
    hours_wasted_monthly: 198,
    demos_missed_monthly: 79,
    competitor_insight:
      'HR Tech companies that adopted AI SDR automation in 2024 are now running 3x the outreach volume with the same headcount. Competitors in your ATS and talent-intelligence space are already at scale.',
    solution_preview:
      'Imagine your pipeline running 24/7: Agent Frank qualifies every inbound reply within 5 minutes, books demos directly into your calendar, and your SDRs spend 100% of their time on warm conversations — not cold prospecting.',
    cta_text: "Let's show TalentFlow exactly where the $5,709/month is going",
  }

  for (const company of companies) {
    const html = buildReportHTML(company as unknown as Company, mockContent)
    console.log(`[✓] Template rendered for ${company.name} — ${html.length} chars`)
  }
}
