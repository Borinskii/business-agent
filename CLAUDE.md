# CLAUDE.md — Phantom Pipeline
> AI SDR system that finds US companies by pain signals and delivers personalized PDF + Sora video before they know about Salesforge

## PROJECT OVERVIEW
Phantom Pipeline: autonomous system → finds companies → generates Pipeline Autopsy PDF + Sora AI video → delivers via Salesforge Multichannel API → Agent Frank handles replies → demo booked

Goal: Salesforge 500 → 1,400+ demos/month

## STACK
- Runtime: Node.js 20 + TypeScript (strict)
- Framework: Next.js 14 (App Router) — live counter pages only
- Database: Supabase (PostgreSQL + Storage)
- PDF: Claude API (content) + Puppeteer (render)
- Video: Sora AI API (primary) / Heygen (fallback)
- Outreach: Salesforge Multichannel API + Agent Frank via Primebox
- Data: Leadsforge API + Crunchbase API + G2 scraper

## ARCHITECTURE — 3 LAYERS
```
Person 1: signal-hunter/ → profiler/ → salesforge-bridge/
Person 2: pdf-generator/ → video-generator/ → live-counter/
Person 3: delivery-engine/ → pilot-runner/ → primebox/
```

## STATUS MACHINE (companies.status)
detected → profiled → content_generated → outreach_sent → page_opened → responded → pilot_running → pilot_results_ready → demo_booked | dnc_blocked

## RULES
- NEVER skip DNC check before any Salesforge contact upload
- NEVER start sequence without report.status = 'ready'
- NEVER generate content without company.status = 'profiled'
- ALWAYS use TypeScript strict mode — no any types
- ALWAYS handle Salesforge 429 with exponential backoff: 30s → 60s → 120s, max 3 retries
- ALWAYS validate email before Salesforge upload
- Agent Frank replies go through /mailboxes/{id}/emails/{id}/reply — never direct SMTP
- PDF generation timeout: 30s max
- Video generation timeout: 5min max (Sora), then fallback to Heygen

## KEY COMMANDS
```bash
npm run signal:scan          # run signal hunter
npm run profile:company      # enrich + calculate loss
npm run content:generate     # PDF + video for company
npm run sequence:create      # create Salesforge sequence
npm run pilot:start          # start 48H free pilot
npm run pilot:collect        # collect pilot results
npm run dev                  # Next.js live counter pages
npm run db:migrate           # apply Supabase migrations
```

## MONTHLY LOSS FORMULA
hourlyRate = 60000/52/40 = $28.85
dailyWaste = hourlyRate × 3h = $86.54
monthlyWaste = dailyWaste × 22days = $1,903/SDR
lossPerSecond = monthlyWaste × sdrCount / 30 / 24 / 3600

## INTEGRATIONS
- Salesforge workspace: wks_7cksiak4q2sqw6mawjut
- Booking URL: meetings-eu1.hubspot.com/franksondors/
- Live counter domain: phantom-pipeline.com
- PDF storage: Supabase Storage bucket 'reports'
- Video storage: Supabase Storage bucket 'videos'
