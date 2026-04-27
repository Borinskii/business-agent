# Phantom Pipeline

## Live Demo

**Demo available at: http://104.248.112.79/**

Full-stack product prototype for autonomous outbound prospecting.

`Phantom Pipeline` is a public-facing demo and internal workflow concept that shows how an AI-assisted sales system can identify target accounts, frame a pain-driven narrative, and present a highly personalized acquisition journey before a prospect ever books a call.

This repository is intentionally presented as an engineering showcase. The README documents the architecture, stack, and developer workflow while avoiding disclosure of secrets, private infrastructure details, internal credentials, or sensitive operating data.

## Overview

The project combines a polished landing experience with a production-style application backbone:

- A marketing-facing frontend that communicates the product thesis through interactive storytelling.
- A FastAPI backend with authentication, user management, API docs, and a database-backed service layer.
- A typed frontend API client generated from OpenAPI.
- Containerized local development with Docker Compose.
- Automated backend and end-to-end test workflows.

At a high level, the concept is:

1. Detect a company worth contacting.
2. Build a personalized narrative around their pipeline inefficiency.
3. Present the pitch through a premium landing flow, live metrics, and conversion CTA.
4. Support that experience with a maintainable full-stack application foundation.

## Product Direction

This codebase explores an outbound engine for B2B growth teams.

The experience is designed around a simple idea: instead of waiting for inbound demand, the system prepares a tailored entry point for a prospect in advance. In the current implementation, that idea is expressed through:

- A premium landing page for the `Phantom Pipeline` concept.
- A live-value framing component around lost pipeline opportunity.
- A narrative timeline explaining the autonomous prospecting flow.
- A CTA flow for starting a pilot / booking a conversation.

Some of the broader product ideas referenced in project notes are intentionally conceptual. The repository should be read as a serious prototype and architecture foundation, not as a claim that every roadmap integration is already shipped end-to-end.

## What Is Implemented

### Frontend

- React 19 + TypeScript single-page application built with Vite.
- File-based routing with TanStack Router.
- Tailwind CSS 4 UI layer with custom visual treatment.
- Interactive hero section and animated storytelling components.
- Landing page sections for concept explanation, metrics framing, and conversion CTA.
- Auth flows for login, signup, password recovery, and reset.
- Dashboard-style application routes for authenticated users.
- Admin and user settings surfaces.
- Generated API client consumed from the frontend.

### Backend

- FastAPI application with OpenAPI schema generation.
- JWT-based authentication flow.
- User CRUD and profile endpoints.
- Password reset and email-oriented account flows.
- Item CRUD example domain for authenticated app functionality.
- SQLModel + PostgreSQL persistence.
- Alembic migrations.
- Environment-based configuration with validation via Pydantic Settings.
- Health check endpoint for infrastructure and deployment readiness.

### Platform and DX

- Docker Compose setup for local and deployment-oriented environments.
- Traefik-ready routing model.
- MailCatcher for local email testing.
- Adminer for local database inspection.
- Backend tests with Pytest and coverage thresholds.
- Frontend E2E coverage with Playwright.
- GitHub Actions workflows for backend tests and browser automation.
- Pre-commit style quality gates via `prek`, `ruff`, and `biome`.

## Architecture

The repository follows a clear full-stack split:

```text
.
|- backend/      FastAPI app, models, migrations, tests
|- frontend/     React app, routes, components, Playwright tests
|- scripts/      Shared project scripts
|- compose.yml   Main container orchestration
```

### Frontend Architecture

The frontend mixes marketing and application surfaces in one codebase:

- `frontend/src/routes/index.tsx` renders the main public `Phantom Pipeline` landing experience.
- `frontend/src/components/Landing/*` contains the storytelling UI sections such as the hero, timeline, and pilot CTA.
- `frontend/src/routes/_layout*` contains authenticated application areas like dashboard, items, admin, and settings.
- `frontend/src/client/*` is generated from the backend OpenAPI schema, keeping API types and request contracts synchronized.

This is a strong pattern for fast-moving product work because it keeps public acquisition UX and authenticated product UX close to the same domain model while still maintaining separation at the route/component level.

### Backend Architecture

The backend is organized in a standard but scalable service structure:

- `backend/app/main.py` initializes the FastAPI application, OpenAPI URL, Sentry integration, and CORS handling.
- `backend/app/api/main.py` composes versioned API routers.
- `backend/app/api/routes/*` contains route modules for auth, users, utilities, private local-only helpers, and items.
- `backend/app/core/config.py` centralizes settings, secret enforcement, database DSN construction, and environment rules.
- `backend/app/models.py` and `backend/app/crud.py` define persistence and database interactions.

The result is a backend that is easy to extend into additional product domains without needing a structural rewrite.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS 4
- Radix UI primitives
- Zod
- Playwright
- Biome

### Backend

- FastAPI
- SQLModel
- PostgreSQL
- Alembic
- Pydantic v2
- Pydantic Settings
- PyJWT
- `pwdlib` with Argon2 / bcrypt support
- Pytest
- Coverage
- Ruff
- Mypy

### Infrastructure

- Docker Compose
- Traefik
- Adminer
- MailCatcher
- GitHub Actions

## Why This Project Is Interesting

From an engineering portfolio perspective, this project demonstrates more than a landing page.

It shows the ability to:

- Turn a product thesis into a concrete user experience.
- Build a modern frontend with deliberate visual identity instead of default dashboard boilerplate.
- Connect a typed React application to a documented backend API.
- Maintain a real backend foundation with auth, persistence, migrations, and test coverage.
- Run the system in containers with local parity for multiple services.
- Set up CI around both API correctness and browser-level workflows.

## Key Product Surfaces

### 1. Narrative Landing Experience

The homepage is not a generic SaaS shell. It is structured as a conversion narrative:

- cinematic hero section,
- concept explanation,
- system walkthrough,
- performance framing,
- pilot CTA.

That makes the repo relevant not only as a backend/full-stack sample, but also as a product storytelling exercise.

### 2. Live Value Framing

The project includes a live counter pattern to visualize ongoing inefficiency cost. Even as a prototype mechanic, it is valuable because it demonstrates how product positioning can be translated into interface behavior.

### 3. Typed API Workflow

The frontend client is generated from OpenAPI, which reduces drift between backend contracts and frontend consumption. For small teams and early-stage products, this is one of the highest leverage quality improvements available.

### 4. Production-Oriented Local Setup

Even in prototype form, the repo supports:

- database,
- local mail capture,
- reverse proxy setup,
- API docs,
- containerized app services,
- browser tests.

That means the project is much closer to a deployable system than a static demo.

## Running Locally

There are two practical ways to work with the project.

### Option 1: Full stack with Docker Compose

This is the easiest way to get the whole system up.

```bash
docker compose watch
```

Useful local endpoints:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Adminer: `http://localhost:8080`
- Traefik dashboard: `http://localhost:8090`
- MailCatcher: `http://localhost:1080`

### Option 2: Hybrid local development

You can stop an individual container and run that service natively while keeping the rest of the stack in Docker.

Frontend:

```bash
bun install
bun run dev
```

Backend:

```bash
cd backend
uv sync
uv run fastapi dev app/main.py
```

## Environment and Security Notes

This repository uses environment-driven configuration and includes security checks for unsafe default values.

Important points:

- Do not commit real credentials, API keys, DSNs, or private infrastructure values.
- Replace placeholder secrets before any non-local deployment.
- Keep `.env` values environment-specific and inject production secrets through your deployment platform.
- The backend explicitly validates critical values such as `SECRET_KEY`, `POSTGRES_PASSWORD`, and `FIRST_SUPERUSER_PASSWORD`.

This README intentionally does not reproduce sensitive values or internal deployment settings.

## API and Data Model

The backend exposes a versioned API under `'/api/v1'` and includes:

- login and token endpoints,
- user registration and profile management,
- password recovery and reset,
- health check utilities,
- authenticated item CRUD routes.

The current backend domain is partly foundational. It provides the infrastructure expected in a serious application while leaving room for the prospecting-specific domain model to expand.

## Testing

### Backend

From `backend/`:

```bash
uv run bash scripts/test.sh
```

The backend test workflow uses:

- Pytest
- coverage reporting
- coverage HTML output
- CI fail threshold of 90%

### Frontend

From the repo root:

```bash
bun run test
```

Or directly inside `frontend/`:

```bash
bunx playwright test
```

Playwright is already configured for app startup and CI sharding.

## API Client Generation

The frontend client is generated from the backend OpenAPI schema.

Convenience script:

```bash
bash ./scripts/generate-client.sh
```

This is a useful workflow whenever backend contracts change and the frontend types need to stay in sync.

## Deployment Shape

The repo is set up for container-based deployment with subdomain routing in mind.

The deployment model expects:

- a reverse proxy,
- HTTPS termination,
- environment-injected configuration,
- separate frontend and backend services,
- PostgreSQL persistence.

The included Compose and workflow files show how the project can move from local development to staging/production-style environments without changing the application structure.

For public documentation purposes, this README keeps deployment details high level and avoids exposing private operational conventions.

## Repository Highlights

If you are reviewing this project as a hiring manager or collaborator, the most relevant areas are:

- `frontend/src/routes/index.tsx`
- `frontend/src/components/Landing/`
- `backend/app/main.py`
- `backend/app/api/routes/`
- `backend/app/core/config.py`
- `compose.yml`
- `.github/workflows/`

Together these show the product thinking, frontend execution, backend foundation, configuration discipline, and delivery workflow.

## Tradeoffs and Scope

This project intentionally sits between prototype and production foundation.

That means:

- the concept and UX are more ambitious than the current domain model,
- the infrastructure and app scaffolding are more mature than a throwaway hackathon demo,
- some roadmap ideas are documented as product direction rather than completed features.

That tradeoff is deliberate. It allowed rapid exploration of a strong go-to-market concept while preserving a maintainable technical base.

## Future Extensions

Natural next steps for the codebase would be:

1. Replace placeholder prospecting flows with first-class domain entities for accounts, signals, campaigns, and generated assets.
2. Persist landing CTA submissions and connect them to a backend workflow.
3. Introduce background job orchestration for enrichment and content generation tasks.
4. Add observability around conversion funnels and outbound execution.
5. Expand the authenticated dashboard from template entities into prospecting-specific analytics and operations.

## Final Note

`Phantom Pipeline` is a strong example of applied product engineering: not just shipping backend endpoints or frontend screens in isolation, but using code to communicate a commercial thesis, support a realistic operator workflow, and maintain a deployment-capable full-stack foundation.
