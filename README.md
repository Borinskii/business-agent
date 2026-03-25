# Phantom Pipeline

> **Copyright (c) 2026 vladnidz — vladyslav.nidzelskyi@edu.rtu.lv. All rights reserved.**
> Proprietary. Hackathon submission. Unauthorized use prohibited.

> Autonomous AI SDR system that finds US companies by pain signals and delivers a personalized Pipeline Autopsy PDF + Sora AI video via Salesforge — before they know they need it. Agent Frank handles all replies and runs 48H free pilots autonomously.

**Goal:** Salesforge 500 → 1,400+ demos/month
**Hackathon:** Double The Pipe, Double The Bacon — Salesforge

## Authors

| Name | Contact |
|---|---|
| **vladnidz** (Vladyslav Nidzelskyi) | vladyslav.nidzelskyi@edu.rtu.lv |
| Boris Arutinov | borinskii242@gmail.com |
| Alexey Buryanov | buryanov.alexey@gmail.com |
| Kirill Pochinchik | kirill.po05@gmail.com |
| Ivan Kluss | klussivan@gmail.com |

Built for **Salesforge Hackathon, March 2026**.
Repository: https://github.com/Borinskii/business-agent (private during competition)

---

## How It Works — 11 Automated Stages

```
Stage 1  → Pain Signal Monitoring     (LinkedIn, Crunchbase, G2)
Stage 2  → Automatic Profiling        (Leadsforge enrichment + decision maker)
Stage 3  → PDF Pipeline Autopsy       (Claude API + Puppeteer)
Stage 4  → Sora AI Video              (90-sec personalized narrated video)
Stage 5  → Triple-Channel Delivery    (Email Day 1 → LinkedIn Day 3 → FOMO Day 5)
Stage 6  → Live Loss Counter Page     (phantom-pipeline.com/[company])
Stage 7  → FOMO Trigger               (48h no-reply → industry benchmarks)
Stage 8  → Agent Frank 24/7           (intent classification → auto-reply in 5 min)
Stage 9  → 48H Free Pilot             (real ICP search → live outreach → results)
Stage 10 → Demo Booking               (prospect arrives with pilot data in hand)
Stage 11 → Pipeline Win Card          (metrics card → LinkedIn share → viral loop)
```

---

## Architecture — 3 Layers
>>>>>>> 9c50ace (docs: update README with full 11-stage pipeline, Forge Stack, AI layers, funnel metrics)

```
Layer 1 (Data):      signal-hunter → profiler → salesforge-bridge
Layer 2 (Content):   pdf-generator → video-generator → live-counter
Layer 3 (Execution): delivery-engine → pilot-runner → primebox
                     orchestrator (runs full cycle every 5 min)
```

### Company Status Machine

```
detected → profiled → content_generated → outreach_sent → page_opened
→ responded → pilot_running → pilot_results_ready → demo_booked
                                                   ↘ dnc_blocked
```

Every state transition is owned by a specific module. No ambiguity, no manual intervention.

---

## Full Forge Stack Integration

| Product | Role |
|---------|------|
| **Leadsforge** | 500M+ contact search for pain signals + 48H pilot ICP matching |
| **Salesforge** | Email + LinkedIn multichannel sequences via Multichannel API |
| **Agent Frank** | Autonomous AI SDR — handles all replies via Primebox 24/7 |
| **Warmforge** | Email deliverability — inbox, not spam |
| **Primebox** | Unified inbox + auto intent categorization |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project (run migrations first)
- API keys: Salesforge, Leadsforge, Anthropic (Claude), Shotstack or Heygen, Crunchbase

### Install

```bash
git clone https://github.com/Borinskii/business-agent.git
cd business-agent
npm install
```

### Environment Variables

Create `.env` in the project root:

```env
# Salesforge
SALESFORGE_API_KEY=your_key
SALESFORGE_WORKSPACE_ID=wks_7cksiak4q2sqw6mawjut
SALESFORGE_SENDER_ID=your_sender_id
SALESFORGE_MAIN_MAILBOX_ID=your_mailbox_id

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI / Content
ANTHROPIC_API_KEY=your_key
SHOTSTACK_API_KEY=your_key
SHOTSTACK_ENV=v1
HEYGEN_API_KEY=your_key

# Data Sources
LEADSFORGE_API_KEY=your_key
CRUNCHBASE_API_KEY=your_key

# App
APP_URL=https://phantom-pipeline.com
NEXT_PUBLIC_HUBSPOT_BOOKING_URL=https://meetings-eu1.hubspot.com/franksondors/
PERSON_3_WEBHOOK_URL=your_webhook_url
```

For the live counter (Next.js), create `src/live-counter/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run Migrations

```bash
npm run db:migrate
```

### Verify Setup

```bash
npm run build
```

---

## Usage

### Full Automated Cycle (Orchestrator)

```bash
# Continuous mode — polls every 5 minutes
npm run orchestrate

# Single pass — run once and exit
npm run orchestrate -- --once

# Dry run — log only, no API calls
npm run orchestrate -- --dry-run
```

The orchestrator:
1. Finds companies with `status = content_generated` and `reports.status = ready`
2. Creates Salesforge workspace + sequence + contact + webhook for each
3. Updates `companies.status → outreach_sent`
4. Checks for overdue pilots (running > 48h) and collects results

---

### Step-by-Step (Manual)

#### Layer 1 — Find and Profile Companies

```bash
# Stage 1: Scan for pain signals across 3 sources
npm run signal:scan -- --source linkedin --limit 20
npm run signal:scan -- --source crunchbase
npm run signal:scan -- --source g2

# Stage 2: Enrich company data (Leadsforge: industry, size, decision maker, tech stack)
npm run profile:company -- --company-id <uuid>

# Upload decision maker contact to Salesforge (DNC check + email validation first)
npm run bridge:upload -- --company-id <uuid>
```

#### Layer 2 — Generate Content

```bash
# Stage 3: Generate Pipeline Autopsy PDF (Claude API → HTML → Puppeteer → Storage)
npm run content:generate -- --company-id <uuid>
npm run content:generate -- --domain acmecorp.com
npm run content:generate -- --all

# Stage 4: Generate personalized Sora AI video (90 sec, 5 scenes)
npm run video:generate -- --company-id <uuid>
```

#### Layer 3 — Deliver and Engage

```bash
# Stage 5: Create Salesforge multichannel sequence (3 nodes: Day 1 / Day 3 / Day 5)
npm run sequence:create -- --company-id <uuid>

# Stage 9: Start 48H free pilot (company must be in status 'responded')
npm run pilot:start -- --company-id <uuid> --icp "HR SaaS, 50-200 employees, VP Sales"

# Collect overdue pilot results (also runs automatically via orchestrator)
npm run pilot:collect
```

---

### Live Counter Pages

Personal landing pages with real-time money-loss counter:

```bash
npm run dev
# http://localhost:3000
```

| URL | Content |
|-----|---------|
| `/` | Landing page with booking CTA |
| `/[slug]` | Personalized page — live counter + PDF + video + pilot form |

Slug format: `domain.replace(/\./g, '-')` — e.g., `acmecorp.com` → `acmecorp-com`

Live counter logic:
```
lossPerSecond = monthly_loss_estimate / 30 / 24 / 3600
```
Counter always starts at $0.00 (not accumulated losses). Resets on each page load.

---

### Webhook Server

Receives real-time events from Salesforge:

```bash
npx ts-node src/delivery-engine/webhook-server.ts
# Listens on port 3001
```

| Endpoint | Event |
|----------|-------|
| `POST /api/webhooks/reply` | Email replied → routes to Agent Frank (Primebox) |
| `POST /api/webhooks/page-opened` | Prospect opened personal page → accelerates sequence |
| `POST /api/webhooks/primebox` | Primebox inbox events |

---

## AI Usage — 6 Layers

| Layer | Technology | What it does |
|-------|-----------|--------------|
| Signal Intelligence | Custom scoring | Behavioral buying signals, not keyword matching |
| Report Content | Claude API | Strict JSON: headline, diagnosis, loss figures, CTA |
| PDF Rendering | Puppeteer | Claude JSON → HTML template → PDF → Supabase Storage |
| Video Generation | Sora + Shotstack + Heygen | 90-sec narrated video per company, 5 fixed scenes |
| Reply Handling | Agent Frank | Intent classification → auto-reply in <5 min |
| Lead Search | Leadsforge | Natural language ICP → semantic vector search |

---

## Salesforge API Coverage

| Action | Endpoint |
|--------|----------|
| Create workspace | `POST /workspaces` |
| Create product | `POST /workspaces/{id}/products` |
| Create sequence | `POST /multichannel/sequences` |
| Add nodes | `POST /multichannel/nodes/actions` |
| Add conditions | `POST /multichannel/nodes/conditions` |
| Enroll contact | `POST /multichannel/enrollments` |
| Bulk contact upload | `POST /workspaces/{id}/contacts/bulk` |
| DNC check | `GET /workspaces/{id}/dnc/check` |
| Email validation | `POST /workspaces/{id}/contacts/validation/start` |
| Register webhook | `POST /workspaces/{id}/integrations/webhooks` |
| Reply via Frank | `POST /mailboxes/{id}/emails/{id}/reply` |
| Get analytics | `GET /workspaces/{id}/sequences/{id}/analytics` |

Rate limiting: exponential backoff 30s → 60s → 120s, max 3 retries on 429.

---

## Agent Frank — Intent Routing

| Intent | Action |
|--------|--------|
| `unsubscribe` | Immediate DNC + `companies.status = dnc_blocked` |
| `positive_intent` | Claude reply + status → `responded` |
| `pilot_request` | Claude reply + trigger pilot flow |
| `demo_request` | Claude reply with booking link |
| `pricing_question` | Claude reply with booking link |
| `info_request` | Claude reply with booking link |
| `other` | Save as draft, alert operator — no auto-reply |
| OOO | Ignore silently, no record created |

Deduplication by `email_id` — Salesforge duplicate webhooks handled gracefully.

---

## Monthly Loss Formula

```
hourlyRate       = $60,000 / 52 / 40  = $28.85/hr
dailyWaste       = $28.85 × 3 hours   = $86.54/day
monthlyWaste     = $86.54 × 22 days   = $1,903/SDR/month
totalMonthlyLoss = $1,903 × sdrCount

lossPerSecond    = totalMonthlyLoss / 30 / 24 / 3600
```

sdrCount heuristic: `size < 30 → 1`, `30–100 → 3`, `100–200 → 6`, `> 200 → size / 30`

---

## Database — 9 Tables

| Table | Purpose |
|-------|---------|
| `companies` | Company profiles + 10-state status machine |
| `signals` | Pain signals with type + pain_points + source |
| `upload_log` | Salesforge upload audit (dnc_check → validation → bulk_upload) |
| `reports` | PDF + video URLs, personal_page_slug, generation status |
| `page_views` | Live counter views, deduplicated by ip_hash |
| `sequences` | Salesforge sequence tracking per company |
| `pilots` | 48H pilot status, ICP, metrics (reply_rate, demos_booked) |
| `pilot_requests` | Inbound pilot requests from live counter form |
| `frank_replies` | Agent Frank reply log with intent + sent status |

All server-side operations use `service_role` key. Never use `anon` key in CLI scripts.

---

## Projected Funnel

```
1,000 companies/month detected (high pain_score)
  → 400 contacted (after DNC + email validation)
  → 40 page opens (10% click-to-page)
  → 16 pilot requests (40% of page openers)
  → 13 demos booked (80% pilot → demo conversion)

Scale to 10 scans/day across 5 signal types = 1,400+ demos/month
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20, TypeScript strict (no `any`) |
| Frontend | Next.js 14 App Router, React 19, Tailwind CSS |
| Database | Supabase PostgreSQL + Storage + RLS |
| PDF | Claude API (content) + Puppeteer (render) |
| Video | Sora AI (primary) → Shotstack (fallback) → Heygen (fallback) |
| Outreach | Salesforge Multichannel API + Agent Frank via Primebox |
| Data | Leadsforge API + Crunchbase API + G2 scraper |

---

## Project Structure

```
src/
  lib/                  # Shared clients (supabase, salesforge, leadsforge)
  types/                # TypeScript types (company, report, pilot, signal...)
  mocks/                # Mock data for testing
  signal-hunter/        # Stage 1: Pain signal scanner (LinkedIn, Crunchbase, G2)
  profiler/             # Stage 2: Company enrichment via Leadsforge
  salesforge-bridge/    # DNC check + email validation + contact upload
  pdf-generator/        # Stage 3: Claude API → HTML template → PDF → Storage
  video-generator/      # Stage 4: Sora/Shotstack AI video generation
  live-counter/         # Stage 6: Next.js personal landing pages + API routes
  delivery-engine/      # Stage 5: Salesforge sequences + webhook server
  pilot-runner/         # Stage 9: 48H free pilot management + result collection
  primebox/             # Stage 8: Agent Frank reply handler
  orchestrator/         # Continuous loop: content_generated → outreach_sent
supabase/
  migrations/           # Full database schema
```

---

## All npm Commands

```bash
npm run signal:scan       # Scan for pain signals (--source linkedin|crunchbase|g2)
npm run profile:company   # Enrich company (--company-id <uuid>)
npm run bridge:upload     # Upload contact to Salesforge (--company-id <uuid>)
npm run content:generate  # Generate PDF (--company-id | --domain | --all)
npm run video:generate    # Generate AI video (--company-id <uuid>)
npm run sequence:create   # Create Salesforge sequence (--company-id <uuid>)
npm run pilot:start       # Start 48H pilot (--company-id --icp "...")
npm run pilot:collect     # Collect overdue pilot results
npm run orchestrate       # Full automated cycle (--once | --dry-run)
npm run dev               # Next.js live counter dev server
npm run build             # TypeScript compile check
npm run test              # Run Jest tests
npm run db:migrate        # Apply Supabase migrations
```

---

## Resilience & Edge Cases

| Scenario | Handling |
|----------|---------|
| Logo URL 404 | SVG fallback with company initials |
| Video generation timeout (5 min) | `video_provider='skipped'`, pipeline continues |
| Leadsforge < 10 leads | Auto-request ICP refinement, halt pilot |
| PDF generation timeout (30s) | `reports.status='failed'`, failure_reason logged |
| Salesforge sequence 409 | Returns existing sequence_id, no duplicate created |
| Pilot `setTimeout` lost | Cron safety net via `checkOverduePilots()` every 30 min |
| Signal scan rate limit | 1 scan per source per 6 hours enforced in code |
| Duplicate webhook from Salesforge | Deduplicated by `email_id` in `frank_replies` |

---

*Phantom Pipeline — The pipeline that builds your pipeline.*
