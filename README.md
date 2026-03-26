# Phantom Pipeline

Phantom Pipeline — AI-powered business agent platform for automating sales and outreach workflows. The product includes a landing page with interactive globe, feature showcase, and lead capture form. Built for teams that want to scale pipeline generation without scaling headcount.

# Full Stack FastAPI Template
=======
>>>>>>> a7ad5f685fa2b4238f5f37ec573ff35a7c1ed4fe

Autonomous AI SDR system that finds US companies by pain signals and delivers personalized Pipeline Autopsy PDF + Sora AI video via Salesforge before they know about it. Agent Frank handles replies and runs 48H free pilots.

**Goal:** Salesforge 500 → 1,400+ demos/month

## Architecture

```
Layer 1 (Data):      signal-hunter → profiler → salesforge-bridge
Layer 2 (Content):   pdf-generator → video-generator → live-counter
Layer 3 (Execution): delivery-engine → pilot-runner → primebox
                     orchestrator (runs full cycle)
```

### Company Status Machine

```
detected → profiled → content_generated → outreach_sent → page_opened
→ responded → pilot_running → pilot_results_ready → demo_booked
                                                   ↘ dnc_blocked
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Supabase project with tables created (see migrations)
- API keys: Salesforge, Leadsforge, Anthropic (Claude), Hunter.io

### 2. Install

```bash
git clone https://github.com/Borinskii/business-agent.git
cd business-agent
npm install
```

### 3. Environment Variables

Create `.env` in the project root:

```env
# Salesforge
SALESFORGE_API_KEY=your_key
SALESFORGE_WORKSPACE_ID=wks_your_workspace_id

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Leadsforge
LEADSFORGE_API_KEY=your_key

# Anthropic (Claude API — for PDF generation and Agent Frank replies)
ANTHROPIC_API_KEY=your_key

# Hunter.io (email enrichment fallback)
HUNTER_API_KEY=your_key

# App
APP_URL=https://phantom-pipeline.com
HUBSPOT_BOOKING_URL=https://meetings-eu1.hubspot.com/franksondors/
```

For the live counter (Next.js), create `src/live-counter/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Verify Setup

```bash
# Check TypeScript compiles
npm run build

# Check Salesforge API access
npx ts-node src/lib/check-salesforge.ts
```

## Usage

### Full Automated Cycle (Orchestrator)

The orchestrator runs the complete pipeline automatically:

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
2. Creates Salesforge workspace + product + sequence + steps + contact + webhook for each
3. Updates `companies.status → outreach_sent`
4. Checks for overdue pilots (running > 48h) and collects results

### Step-by-Step (Manual)

#### Layer 1: Find and Profile Companies

```bash
# Scan for pain signals (hiring SDRs, funding, G2 reviews)
npm run signal:scan

# Enrich company data via Leadsforge (industry, size, decision maker, tech stack)
npm run profile:company -- --company-id <uuid>

# Upload contact to Salesforge (DNC check + email validation first)
npm run bridge:upload -- --company-id <uuid>
```

#### Layer 2: Generate Content

```bash
# Generate Pipeline Autopsy PDF via Claude API + Puppeteer
npm run content:generate -- --company-id <uuid>

# Generate for all profiled companies at once
npm run content:generate -- --all

# Generate by domain
npm run content:generate -- --domain acmecorp.com
```

#### Layer 3: Deliver and Engage

```bash
# Create Salesforge sequence (workspace + product + 3 email steps + webhook)
npm run sequence:create -- --company-id <uuid>

# Start 48H free pilot for a company that responded YES
npm run pilot:start -- --company-id <uuid> --icp "HR software companies 50-200 employees in USA"

# Manually collect overdue pilot results (also runs automatically via orchestrator)
npm run pilot:collect
```

### Live Counter Pages

Personal landing pages with real-time money-loss counter for each company:

```bash
npm run dev
# Opens at http://localhost:3000

# Company page: http://localhost:3000/{slug}
# Example: http://localhost:3000/talentflow-io
```

Slug format: `domain.replace(/\./g, '-')` — e.g., `acmecorp.com` → `acmecorp-com`

Each page shows:
- Real-time money loss counter (ticking live)
- Pipeline Autopsy PDF embed
- Video (if generated)
- 48H Pilot request form
- Book a Demo CTA

### Webhook Server

Receives Salesforge events (replies, page opens):

```bash
npx ts-node src/delivery-engine/webhook-server.ts
# Listens on port 3001 (configurable via WEBHOOK_PORT env var)
```

Endpoints:
- `POST /api/webhooks/reply` — handles email.replied events via Agent Frank
- `POST /api/webhooks/page-opened` — accelerates follow-up sequence
- `POST /api/webhooks/primebox` — dedicated primebox endpoint

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `companies` | Company profiles with status machine |
| `signals` | Pain signals (hiring, funding, G2 reviews) |
| `upload_log` | Salesforge upload audit trail |
| `reports` | PDF + video URLs, generation status |
| `page_views` | Live counter page views (deduplicated by ip_hash) |
| `sequences` | Salesforge sequence tracking |
| `pilots` | 48H pilot status and results |
| `pilot_requests` | Inbound pilot requests from live counter |
| `frank_replies` | Agent Frank reply log with intent classification |

All tables have Row Level Security (RLS) enabled. Server-side operations use `service_role` key.

## Salesforge API

All Salesforge calls use the Standard engine (`/workspaces/{id}/...`):

| Action | Endpoint |
|--------|----------|
| Create workspace | `POST /workspaces` |
| Create product | `POST /workspaces/{id}/products` with `{ product: { name, language, ... } }` |
| Create sequence | `POST /workspaces/{id}/sequences` with `{ name, productId, language, timezone }` |
| Add steps | `PUT /workspaces/{id}/sequences/{id}/steps` with `{ steps: [...] }` |
| Create contact | `POST /workspaces/{id}/contacts` with `{ firstName, email, customVars }` |
| Register webhook | `POST /workspaces/{id}/integrations/webhooks` with `{ name, type, url }` |
| Reply to email | `POST /workspaces/{id}/mailboxes/{id}/emails/{id}/reply` |
| DNC bulk add | `POST /workspaces/{id}/dnc/bulk` |

Rate limiting: exponential backoff 30s → 60s → 120s, max 3 retries on 429.

## Agent Frank (Primebox)

Automated reply system for incoming emails:

| Intent | Action |
|--------|--------|
| `unsubscribe` | Add to DNC immediately, block company |
| `positive_intent` | Update status → responded, generate Claude reply |
| `pilot_request` | Update status → responded, generate Claude reply |
| `demo_request` | Generate Claude reply with booking link |
| `pricing_question` | Generate Claude reply with booking link |
| `info_request` | Generate Claude reply with booking link |
| `other` | Save as draft, alert operator (no auto-reply) |
| OOO (out-of-office) | Ignore silently |

Replies are generated via Claude API (max 4 sentences, ends with soft CTA). Fallback templates used if Claude is unavailable. Deduplication by `email_id` prevents double-processing.

## Monthly Loss Formula

```
hourlyRate   = 60000 / 52 / 40 = $28.85
dailyWaste   = hourlyRate * 3h = $86.54
monthlyWaste = dailyWaste * 22 days = $1,903/SDR
lossPerSecond = monthlyWaste * sdrCount / 30 / 24 / 3600
```

## Tech Stack

- **Runtime:** Node.js 20, TypeScript (strict mode)
- **Framework:** Next.js 16 (App Router) — live counter pages
- **Database:** Supabase (PostgreSQL + Row Level Security + Storage)
- **PDF:** Claude API (content) + Puppeteer (HTML → PDF)
- **Video:** Sora AI API (primary) / Heygen (fallback)
- **Outreach:** Salesforge Standard API + Agent Frank via Primebox
- **Data:** Leadsforge API + Hunter.io (email fallback)

## Project Structure

```
src/
  lib/                  # Shared clients (supabase, salesforge, leadsforge)
  types/                # TypeScript types (company, report, pilot, etc.)
  mocks/                # Mock data for testing (3 companies)
  signal-hunter/        # Layer 1: Pain signal scanner
  profiler/             # Layer 1: Company enrichment via Leadsforge
  salesforge-bridge/    # Layer 1: Upload contacts to Salesforge
  pdf-generator/        # Layer 2: Claude API → HTML → PDF → Supabase Storage
  video-generator/      # Layer 2: Sora/Heygen video generation
  live-counter/         # Layer 2: Next.js personal landing pages
  delivery-engine/      # Layer 3: Salesforge sequences + webhook server
  pilot-runner/         # Layer 3: 48H free pilot management
  primebox/             # Layer 3: Agent Frank reply handling
  orchestrator/         # Runs full pipeline cycle automatically
```

## All npm Commands

```bash
npm run signal:scan       # Scan for pain signals
npm run profile:company   # Enrich company data
npm run bridge:upload     # Upload contact to Salesforge
npm run content:generate  # Generate PDF (+video)
npm run sequence:create   # Create Salesforge sequence
npm run pilot:start       # Start 48H pilot
npm run pilot:collect     # Collect pilot results
npm run orchestrate       # Run full automated cycle
npm run dev               # Next.js live counter dev server
npm run build             # TypeScript check (tsc --noEmit)
npm run test              # Run Jest tests
npm run db:migrate        # Apply Supabase migrations
```
