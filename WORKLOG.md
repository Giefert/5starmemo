# Work Log

This is the repository's curated continuity record. It captures accepted
project state and active coordination, not a transcript. Reconcile it whenever
work or steering materially changes.

Last reconciled: 2026-09-01 by Codex root at `e32954b` (`main`; working tree
intentionally dirty)

Current work-log coordinator: Codex root for W4, the accepted-checkpoint and
maintenance integration turn.

## Resume here

- The user accepted W1 and W3 on 2026-09-01 and authorized committing
  `AGENTS.md`, `WORKLOG.md`, and `README.md` together. That checkpoint is the
  first action in W4.
- The user accepted the complete W2 mobile workspace as one checkpoint and
  authorized committing it separately after review and validation.
- Read tracked [CLAUDE.md](CLAUDE.md) for repository constraints and
  [DESIGN.md](DESIGN.md) for the Carte design system. Use current tracked code
  and commits for implemented behavior. Local `*-HANDOFF.md` files are ignored
  by Git and are historical evidence only, not durable project truth.
- [README.md](README.md) has been accepted with the workflow files and is
  awaiting its authorized commit.
- Never record credentials or other secrets here.
- `AGENTS.md` and `WORKLOG.md` remain untracked until the authorized W4
  checkpoint is created.
- W4 is active. Root owns all writes and commits; its delegated lanes are
  read-only audits.

## Where we were

### Accepted checkpoints

- `197b454` through `df29dca`: committed production hardening and R2
  architecture, privacy export, a transactional migration runner, and
  restaurant-scoped multi-tenancy with no public signup. Git establishes the
  repository behavior, not the current deployment state.
- `784789f` through `0422131`: established the tracked Carte design system and
  integrated the mobile tab/session treatment. Follow-ons include unified
  mastheads (`cadd93b`), drag-revealed cards (`7b3a838`), the Bulletin
  accordion (`99865e4`), and inline Reference index (`4703240`).
- `dc49ad6` and `f5cc8b7`: replaced the hand-rolled scheduler with tested
  FSRS-6 and repaired `database/schema.sql` into a reproducible bootstrap
  baseline. Do not reintroduce the discarded scheduler or schema-drift path.
- `1e92251` through `e32954b`: added the Study Library and reminders,
  seasonality, a canonical restaurant card library decoupled from decks,
  improved Library ordering, and mobile/API loading performance. `e32954b` is
  the latest committed baseline.

### Durable decisions

- `WORKLOG.md` is shared project memory and a coordination surface, not a small
  task queue or append-only diary.
- New steering is supplemental by default. Only explicit cancellation,
  replacement, or a directly conflicting correction changes existing work.
- Existing uncommitted changes are user-owned by default and are not evidence
  of an accepted checkpoint.
- Tracked code and commits establish accepted repository behavior. Tracked
  [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md) establish repository and
  design constraints; time-sensitive external-state claims require fresh
  verification.

### Known failures or uncertainty

- The committed [README.md](README.md) at `e32954b` is stale. Its accepted
  workspace replacement corrects the product, architecture, auth, workflow,
  validation, and license claims and is awaiting its authorized checkpoint.
- `*-HANDOFF.md` files are ignored by [.gitignore](.gitignore), absent from a
  clean checkout, and largely superseded by later commits. Do not revive their
  old questions or locked decisions as backlog without reconciling current
  code and user steering.
- A commit does not prove that a build is deployed, in TestFlight, approved by
  an app store, or serving real users. Reconfirm those external facts.
- Time-sensitive production assumptions in [CLAUDE.md](CLAUDE.md), including
  whether the service still has no real clients, must be reconfirmed before
  risky production activity.
- Ignored `.claude/settings.local.json` grants broad automatic permissions. On
  2026-09-01 the user explicitly chose to retain that configuration; do not
  narrow it without new steering.
- A clean linked worktree at `.claude/worktrees/nostalgic-proskuriakova` uses a
  fully merged branch with no unique commits and is 83 commits behind `main`.
  It lacks the current instruction files. Confirm that no live session owns it
  before retiring the worktree and branch; age alone does not release it.
- [DESIGN.md](DESIGN.md) points to a missing `Tusavor Dashboard.html`, while
  [web-dashboard/README.md](web-dashboard/README.md) remains unrelated
  create-next-app boilerplate. The schema baseline header also says migration
  016 even though its recorded folded list includes 017 and 018.
- Dashboard lint currently reports 38 baseline errors. The dashboard build
  also fetches Google fonts at build time and cannot complete offline. Both API
  package `start` scripts point at a different output path from their Docker
  images. These are developer-workflow reliability issues, not W3 changes.
- The intent, completeness, validation status, and desired integration point of
  W2 have not yet been confirmed.

## Where we are

### Current workstreams and pending reviews

#### W1 — Continuity-workflow bootstrap

- Owner: Codex root for the completed implementation; no active agent.
- Status: accepted by the user on 2026-09-01; commit authorized in W4.
- Outcome: added `AGENTS.md` and initialized `WORKLOG.md`; integrated three
  read-only audits covering history, concurrency/steering failure modes, and
  the W2 ownership boundary.
- Validation: referenced tracked files and commits resolve; no whitespace or
  secret-value issue was found; `AGENTS.md` remains below the default 32 KiB
  instruction cap; W2's tracked diff and path set are unchanged from the W1
  opening snapshot.
- Resume evidence: `AGENTS.md` and this file. Reopen W1 only for user-requested
  revision or acceptance/commit synchronization.

#### W2 — Mobile-app workspace changes

- Owner: Codex root for the authorized W4 integration.
- Status: accepted as a complete checkpoint by the user on 2026-09-01; review,
  validation, and a separate commit are authorized.
- Boundary: one umbrella lane because its substreams overlap in shared files.
  It includes the card-browser replacement, Library card-catalog/navigation/
  state work, card image treatment, and reminder defaults. Home and Library
  category contents are again always expanded; the Bulletin accordion remains
  unchanged. TypeScript and whitespace checks passed after the rollback. Do not
  include unrelated paths in its commit.
- Resume evidence: current `git status`, tracked diff, and the two untracked
  files listed below.

#### W3 — README and documentation consistency refresh

- Owner: Codex root for the completed workspace implementation; no active
  agent.
- Status: accepted by the user on 2026-09-01; commit authorized in W4.
- Outcome: replaced the old roadmap and local-database quick start with a
  current, security-safe overview based on tracked code at `e32954b`. The new
  README covers the four-part architecture, shipped surfaces, tenancy and role
  grants, no public signup, learner privacy, the production-connected workflow,
  real checks, migrations, and unverified external release state.
- Validation: web and mobile API builds passed; all 30 mobile API tests passed;
  mobile TypeScript passed; README whitespace, path, secret-marker, and stale-
  wording checks passed. Dashboard lint exposed 38 pre-existing errors, and
  the dashboard build stopped when the restricted environment could not fetch
  Google fonts. Three read-only audits were reviewed and integrated; no support
  lane changed files.
- Resume evidence: the `README.md` diff and this record. Review W1 and W3
  together because the README refers to the still-untracked workflow files.

#### W4 — Accepted checkpoints and maintenance integration

- Owner: Codex root; sole writer and integrator.
- Status: active by explicit user request on 2026-09-01.
- Authorized scope:
  - commit accepted W1/W3 together and accepted W2 separately;
  - retain broad Claude permissions and current Node versions;
  - keep the production-connected workflow but replace the volatile claim that
    production is inherently safe;
  - verify and remove the stale linked worktree and its merged branch;
  - remove the missing dashboard-mockup reference and replace the dashboard
    boilerplate README with a short package guide;
  - store the three dashboard font families in the project and use them
    locally at build time;
  - align both API `start` scripts with their actual compiled entry points.
- Deferred sequence explicitly requested by the user: after W4, discuss the
  dashboard lint corrections before editing them; after lint is resolved,
  revisit deployment/GitHub access; then revisit release and platform status.
- Read-only support lanes:
  - `workflow_audit` verifies stale-worktree ownership, ignored paths, and safe
    removal prerequisites.
  - `repo_history` audits the proposed documentation, font, and API-command
    changes against tracked code without editing.
  - `active_changes` reviews the accepted W2 diff, boundary, and proportional
    validation without editing.

W1-W3 use `main` in `/Users/one/Documents/git/5starmemo`. The separate legacy
worktree noted above is not assigned to any current lane. W2 is workspace-local
and cannot be recovered from Git.

### W2 protected path boundary

This is a reconciliation snapshot, not proof of intent. Recheck `git status`
before any later work:

- `mobile-app/components/StudyCard.tsx`
- `mobile-app/components/BlurredImageBackground.tsx` (untracked)
- `mobile-app/contexts/DecksContext.tsx`
- `mobile-app/screens/BrowseScreen.tsx` (deleted; paired with the replacement)
- `mobile-app/screens/BulletinScreen.tsx`
- `mobile-app/screens/DeckCardBrowserScreen.tsx` (untracked replacement)
- `mobile-app/screens/HomeScreen.tsx`
- `mobile-app/screens/LibraryScreen.tsx`
- `mobile-app/screens/SettingsScreen.tsx`
- `mobile-app/services/reminders.ts`

## Where we are going

### Current milestone

Make the continuity workflow and current project overview durable so a fresh
agent can recover the project narrative, preserve parallel ownership, interpret
steering correctly, and pick the next useful action without chat history.

Acceptance bar:

- root instructions require the work log to be read and synchronized;
- the log clearly distinguishes accepted history, active state, and future work;
- pre-existing uncommitted work remains visible and protected;
- delegated work has explicit ownership, boundaries, and integration status;
- the workflow remains compact enough to maintain in normal work;
- once the workflow is accepted and committed, a clean checkout of that
  checkpoint retains the durable context needed to resume;
- workspace-local work such as W2 is labeled honestly as nonrecoverable from
  Git rather than presented as a durable checkpoint.
- the root README accurately summarizes implemented behavior and points to the
  durable guidance without becoming a second roadmap or work log.

### Ordered next work

1. Complete W4 in the authorized order and keep its commits separated by
   concern.
2. Present the dashboard lint findings and choices to the user before changing
   lint-related code.
3. After the lint step is resolved, revisit deployment and GitHub access.
4. After the access step is resolved, revisit release and platform status.

### Candidate product backlog

Firm tracked requirements, not active work:

1. Before real-user launch, complete the deploy-key/user hardening and replace
   the broad GitHub credential or adopt the PR-based alternative described in
   [CLAUDE.md](CLAUDE.md).
2. Keep the tracked project overview current after W3 closes; do not allow it
   to become a second roadmap or continuity log.

Requires user and external-state reconfirmation:

1. Current TestFlight end-to-end testing and iOS App Store submission status.
2. Whether an Android/Google Play release remains desired.
3. Any further Carte mobile polish, based on a fresh visual review and W2—not
   on ignored historical handoff TODOs.

### Parked or protected decisions

- Do not use the abandoned local database as product-validation evidence;
  follow the environment guidance in `CLAUDE.md`.
- Retain the broad local Claude permission configuration unless the user gives
  new steering.
- Do not introduce learner analytics, public signup, a second image-upload
  path, a new paid service, or other changes ruled out or approval-gated by the
  repository guidance unless the user explicitly revises that direction.
- Do not treat ignored historical handoffs as durable instructions or revive
  their superseded decisions without reconciling tracked code and user steering.
