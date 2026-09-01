# Tusavor

Tusavor (historically `5starmemo` in the repository and build identifiers) is
a restaurant-staff learning system. Managers curate decks, cards, reference
material, and announcements in a web dashboard; staff study that material in
an Expo mobile app with FSRS-6 scheduling.

The product deliberately separates content management from studying. The
dashboard is a curator's surface, not an employee-monitoring tool: individual
study progress remains private and is never shown to managers.

## What is implemented

### Management surface

- Restaurant-scoped authentication and user administration
- Deck and card creation, editing, explicit access grants, and seasonality
- A canonical card library whose cards can belong to multiple decks
- Glossary and encyclopedia categories and terms
- Restaurant announcements and Bulletin curation
- Management-only image upload to Cloudflare R2

### Student surface

- Recommended FSRS-6 study and full-deck study, plus on-device custom decks
- Deck, card, glossary, and encyclopedia browsing and search
- On-device favorites and reminders, plus seasonality-aware ordering
- A curated Bulletin and restaurant reference library
- Account data export and deletion

## Architecture

Tusavor uses a backend-for-frontend split. Each client has an API tailored to
its responsibilities, while both APIs share one PostgreSQL database.

```text
Web dashboard ──> Web API ─────┐
                               ├──> PostgreSQL
Mobile app ─────> Mobile API ──┘

Web API ──> Cloudflare R2 (managed card images)
```

Caddy sends `/api/student/*` traffic to the mobile API and other API traffic
to the web API.

| Path | Responsibility | Main technology |
| --- | --- | --- |
| `web-dashboard/` | Management and content-curation UI | Next.js 15, React 19, TypeScript |
| `web-api/` | Management, creation, onboarding, and image API | Express, TypeScript |
| `mobile-app/` | Student application | Expo 54, React Native, TypeScript |
| `mobile-api/` | Student content, study progress, and FSRS scheduling API | Express, TypeScript, `ts-fsrs` |
| `shared/` | Types and utilities shared across packages | TypeScript |
| `database/` | Fresh-database baseline and ordered migrations | PostgreSQL |
| `docker-compose.prod.yml`, `Caddyfile` | Production service topology and routing | Docker Compose, Caddy |

The web API normally listens on port 3001, the mobile API on 3002, and the
dashboard on 3000. Their deployed state must be verified separately; code in
the repository does not prove that a particular commit is live or released.

## Product and security boundaries

- Tenant-owned reads and writes are scoped to a restaurant. Bearer JWTs carry
  the user's role and `restaurantId`; tokens without a restaurant identifier
  are rejected. Protected management routes require the `management` role,
  while student content and progress routes require the `student` role.
- Students see decks granted to them directly or through an assigned role;
  the old public/private deck model is no longer used.
- There is no public signup. A new restaurant and its first administrator are
  created with [`web-api/src/scripts/create-restaurant.ts`](web-api/src/scripts/create-restaurant.ts)
  in an authorized
  deployment context. Authenticated managers can then create users through
  the dashboard or `POST /api/auth/users`.
- Learner progress is private. Do not add per-learner progress, engagement, or
  completion analytics to management surfaces.
- Images have one write path: the management-gated web API endpoint. It
  validates size and type, re-encodes images, and stores them in R2. Do not add
  a mobile upload route or a public storage write path.
- New recurring costs and paid services require approval. See
  [`CLAUDE.md`](CLAUDE.md) for the current cost and infrastructure constraints.

## Working in this repository

Before making a material change, read these files in order:

1. [`AGENTS.md`](AGENTS.md) — collaboration, ownership, and continuity rules
2. [`WORKLOG.md`](WORKLOG.md) — accepted history, active work, and ordered next
   steps
3. [`CLAUDE.md`](CLAUDE.md) — product, production, security, and cost
   constraints
4. [`DESIGN.md`](DESIGN.md) and the relevant tracked subsystem documentation —
   visual and workflow direction

Treat pre-existing uncommitted changes as user-owned. Local `*-HANDOFF.md`
files and `design_handoff_*` directories are ignored historical material, not
durable or automatically current instructions; reconcile them with tracked
code, commits, and current user direction before relying on them.

### Environment model

The supported workflow currently exercises the production-connected
environment described in `CLAUDE.md`. The root local Docker configuration is
retained but is not kept in sync and must not be used as acceptance evidence.
The mobile app also defaults to the production student API, including during
local Expo runs, so test actions can write live data. Use only an authorized
test account and verify current external state before any risky operation.

Never put credentials, tokens, private keys, customer data, or token-bearing
URLs in documentation, work logs, fixtures, or delegated reports.

## Dependencies and checks

This repository is a collection of packages rather than a single npm
workspace. Install each package from its lockfile:

```bash
npm --prefix web-api ci
npm --prefix mobile-api ci
npm --prefix web-dashboard ci
npm --prefix mobile-app ci
```

Run checks for every package affected by a change:

```bash
npm --prefix web-api run build
npm --prefix mobile-api run build
npm --prefix mobile-api test
npm --prefix web-dashboard run lint
npm --prefix web-dashboard run build
(cd mobile-app && npm exec -- tsc --noEmit)
```

There is no root all-packages test command. Automated tests currently cover
the mobile API's scheduler, progress, and seasonality behavior. The web API's
`test` script is still a placeholder. Dashboard lint is configured but has
known repository-wide baseline violations, and dashboard builds need network
access to fetch the configured Google fonts. Mobile user-facing changes also
need representative device or simulator review.

## Database changes

`database/schema.sql` bootstraps a fresh database. Numbered SQL files in
`database/migrations/` carry later changes, and the web API applies unapplied
migrations transactionally before it begins serving requests. Add schema
changes as a new ordered migration; keep the bootstrap baseline and its
recorded migration list coherent when the baseline is regenerated.

## Deployment and release state

The tracked production topology uses Docker Compose, Caddy, PostgreSQL, the
two APIs, and the web dashboard. Mobile build profiles live in
`mobile-app/eas.json`. Deployment, TestFlight, App Store, Google Play, and
real-user status are time-sensitive external facts: confirm them with the
operator and current environment instead of inferring them from this README,
an old handoff, or Git history.

## Design

[`DESIGN.md`](DESIGN.md) defines Tusavor's **Mise en Place · Carte** direction:
a dark editorial masthead, a warm paper content surface, restrained semantic
color, and no learner analytics. Existing product code is the practical
reference when an older standalone mockup or handoff disagrees with the
implemented system.

## License

No repository-level license file is currently present.
