# Phantom Pipeline

> **Copyright (c) 2026 vladnidz — vladyslav.nidzelskyi@edu.rtu.lv. All rights reserved.**
> Proprietary. Hackathon submission. Unauthorized use prohibited.

Autonomous AI SDR system that finds US companies by pain signals and delivers personalized Pipeline Autopsy PDF + Shotstack video via Salesforge before they know about it. Agent Frank handles replies and runs 48H free pilots.

**Goal:** Salesforge 500 → 1,400+ demos/month

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
APP_URL=http://104.248.112.79
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
# Full Stack FastAPI Template

<a href="https://github.com/fastapi/full-stack-fastapi-template/actions?query=workflow%3A%22Test+Docker+Compose%22" target="_blank"><img src="https://github.com/fastapi/full-stack-fastapi-template/workflows/Test%20Docker%20Compose/badge.svg" alt="Test Docker Compose"></a>
<a href="https://github.com/fastapi/full-stack-fastapi-template/actions?query=workflow%3A%22Test+Backend%22" target="_blank"><img src="https://github.com/fastapi/full-stack-fastapi-template/workflows/Test%20Backend/badge.svg" alt="Test Backend"></a>
<a href="https://coverage-badge.samuelcolvin.workers.dev/redirect/fastapi/full-stack-fastapi-template" target="_blank"><img src="https://coverage-badge.samuelcolvin.workers.dev/fastapi/full-stack-fastapi-template.svg" alt="Coverage"></a>

## Technology Stack and Features

- ⚡ [**FastAPI**](https://fastapi.tiangolo.com) for the Python backend API.
  - 🧰 [SQLModel](https://sqlmodel.tiangolo.com) for the Python SQL database interactions (ORM).
  - 🔍 [Pydantic](https://docs.pydantic.dev), used by FastAPI, for the data validation and settings management.
  - 💾 [PostgreSQL](https://www.postgresql.org) as the SQL database.
- 🚀 [React](https://react.dev) for the frontend.
  - 💃 Using TypeScript, hooks, [Vite](https://vitejs.dev), and other parts of a modern frontend stack.
  - 🎨 [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) for the frontend components.
  - 🤖 An automatically generated frontend client.
  - 🧪 [Playwright](https://playwright.dev) for End-to-End testing.
  - 🦇 Dark mode support.
- 🐋 [Docker Compose](https://www.docker.com) for development and production.
- 🔒 Secure password hashing by default.
- 🔑 JWT (JSON Web Token) authentication.
- 📫 Email based password recovery.
- 📬 [Mailcatcher](https://mailcatcher.me) for local email testing during development.
- ✅ Tests with [Pytest](https://pytest.org).
- 📞 [Traefik](https://traefik.io) as a reverse proxy / load balancer.
- 🚢 Deployment instructions using Docker Compose, including how to set up a frontend Traefik proxy to handle automatic HTTPS certificates.
- 🏭 CI (continuous integration) and CD (continuous deployment) based on GitHub Actions.

### Dashboard Login

[![API docs](img/login.png)](https://github.com/fastapi/full-stack-fastapi-template)

### Dashboard - Admin

[![API docs](img/dashboard.png)](https://github.com/fastapi/full-stack-fastapi-template)

### Dashboard - Items

[![API docs](img/dashboard-items.png)](https://github.com/fastapi/full-stack-fastapi-template)

### Dashboard - Dark Mode

[![API docs](img/dashboard-dark.png)](https://github.com/fastapi/full-stack-fastapi-template)

### Interactive API Documentation

[![API docs](img/docs.png)](https://github.com/fastapi/full-stack-fastapi-template)

## How To Use It

You can **just fork or clone** this repository and use it as is.

✨ It just works. ✨

### How to Use a Private Repository

If you want to have a private repository, GitHub won't allow you to simply fork it as it doesn't allow changing the visibility of forks.

But you can do the following:

- Create a new GitHub repo, for example `my-full-stack`.
- Clone this repository manually, set the name with the name of the project you want to use, for example `my-full-stack`:

```bash
git clone git@github.com:fastapi/full-stack-fastapi-template.git my-full-stack
```

- Enter into the new directory:

```bash
cd my-full-stack
```

- Set the new origin to your new repository, copy it from the GitHub interface, for example:

```bash
git remote set-url origin git@github.com:octocat/my-full-stack.git
```

- Add this repo as another "remote" to allow you to get updates later:

```bash
git remote add upstream git@github.com:fastapi/full-stack-fastapi-template.git
```

- Push the code to your new repository:

```bash
git push -u origin master
```

### Update From the Original Template

After cloning the repository, and after doing changes, you might want to get the latest changes from this original template.

- Make sure you added the original repository as a remote, you can check it with:

```bash
git remote -v

origin    git@github.com:octocat/my-full-stack.git (fetch)
origin    git@github.com:octocat/my-full-stack.git (push)
upstream    git@github.com:fastapi/full-stack-fastapi-template.git (fetch)
upstream    git@github.com:fastapi/full-stack-fastapi-template.git (push)
```

- Pull the latest changes without merging:

```bash
git pull --no-commit upstream master
```

This will download the latest changes from this template without committing them, that way you can check everything is right before committing.

- If there are conflicts, solve them in your editor.

- Once you are done, commit the changes:

```bash
git merge --continue
```

### Configure

You can then update configs in the `.env` files to customize your configurations.

Before deploying it, make sure you change at least the values for:

- `SECRET_KEY`
- `FIRST_SUPERUSER_PASSWORD`
- `POSTGRES_PASSWORD`

You can (and should) pass these as environment variables from secrets.

Read the [deployment.md](./deployment.md) docs for more details.

### Generate Secret Keys

Some environment variables in the `.env` file have a default value of `changethis`.

You have to change them with a secret key, to generate secret keys you can run the following command:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the content and use that as password / secret key. And run that again to generate another secure key.

## How To Use It - Alternative With Copier

This repository also supports generating a new project using [Copier](https://copier.readthedocs.io).

It will copy all the files, ask you configuration questions, and update the `.env` files with your answers.

### Install Copier

You can install Copier with:

```bash
pip install copier
```

Or better, if you have [`pipx`](https://pipx.pypa.io/), you can run it with:

```bash
pipx install copier
```

**Note**: If you have `pipx`, installing copier is optional, you could run it directly.

### Generate a Project With Copier

Decide a name for your new project's directory, you will use it below. For example, `my-awesome-project`.

Go to the directory that will be the parent of your project, and run the command with your project's name:

```bash
copier copy https://github.com/fastapi/full-stack-fastapi-template my-awesome-project --trust
```

If you have `pipx` and you didn't install `copier`, you can run it directly:

```bash
pipx run copier copy https://github.com/fastapi/full-stack-fastapi-template my-awesome-project --trust
```

**Note** the `--trust` option is necessary to be able to execute a [post-creation script](https://github.com/fastapi/full-stack-fastapi-template/blob/master/.copier/update_dotenv.py) that updates your `.env` files.

### Input Variables

Copier will ask you for some data, you might want to have at hand before generating the project.

But don't worry, you can just update any of that in the `.env` files afterwards.

The input variables, with their default values (some auto generated) are:

- `project_name`: (default: `"FastAPI Project"`) The name of the project, shown to API users (in .env).
- `stack_name`: (default: `"fastapi-project"`) The name of the stack used for Docker Compose labels and project name (no spaces, no periods) (in .env).
- `secret_key`: (default: `"changethis"`) The secret key for the project, used for security, stored in .env, you can generate one with the method above.
- `first_superuser`: (default: `"admin@example.com"`) The email of the first superuser (in .env).
- `first_superuser_password`: (default: `"changethis"`) The password of the first superuser (in .env).
- `smtp_host`: (default: "") The SMTP server host to send emails, you can set it later in .env.
- `smtp_user`: (default: "") The SMTP server user to send emails, you can set it later in .env.
- `smtp_password`: (default: "") The SMTP server password to send emails, you can set it later in .env.
- `emails_from_email`: (default: `"info@example.com"`) The email account to send emails from, you can set it later in .env.
- `postgres_password`: (default: `"changethis"`) The password for the PostgreSQL database, stored in .env, you can generate one with the method above.
- `sentry_dsn`: (default: "") The DSN for Sentry, if you are using it, you can set it later in .env.

## Backend Development

Backend docs: [backend/README.md](./backend/README.md).

## Frontend Development

Frontend docs: [frontend/README.md](./frontend/README.md).

## Deployment

Deployment docs: [deployment.md](./deployment.md).

## Development

General development docs: [development.md](./development.md).

This includes using Docker Compose, custom local domains, `.env` configurations, etc.

## Release Notes

Check the file [release-notes.md](./release-notes.md).

## License

The Full Stack FastAPI Template is licensed under the terms of the MIT license.
