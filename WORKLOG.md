# Work Log

This is the repository's curated continuity record. It captures accepted
project state and active coordination, not a transcript. Reconcile it whenever
work or steering materially changes.

Last reconciled: 2026-09-01 by Codex root at `6ce6a73` (`main`; working tree
intentionally dirty)

Current work-log coordinator: Codex root for W4, the accepted-checkpoint and
maintenance integration turn.

## Resume here

- W1 and W3 are durable in `df4810f`: `AGENTS.md`, `WORKLOG.md`, and the
  corrected `README.md` now survive a clean checkout.
- The user accepted the complete W2 mobile workspace as one checkpoint and
  authorized committing it separately. Its commit is paused on one newly found
  product contradiction: fresh users are shown reminders enabled at noon even
  though no notification has been scheduled. Await the user's choice between
  default-Off and automatic scheduling before editing or committing W2.
- Read tracked [CLAUDE.md](CLAUDE.md) for repository constraints and
  [DESIGN.md](DESIGN.md) for the Carte design system. Use current tracked code
  and commits for implemented behavior. Local `*-HANDOFF.md` files are ignored
  by Git and are historical evidence only, not durable project truth.
- [README.md](README.md) is current and committed in `df4810f`.
- Never record credentials or other secrets here.
- W4 is active but waiting for the reminder decision. Root owns all writes and
  commits; its read-only audits are complete.

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
  the last product-code checkpoint before W4.
- `df4810f`: established the accepted continuity workflow and replaced the
  obsolete root README with a current project overview.
- `5c2e259`: replaced unsafe volatile production wording, removed the dead
  dashboard-mockup references, and replaced the dashboard's starter README.
- `6ce6a73`: self-hosted the dashboard's Fraunces, Inter, and Newsreader files
  with their OFL licenses and repaired both host API `start` commands.

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

- `*-HANDOFF.md` files are ignored by [.gitignore](.gitignore), absent from a
  clean checkout, and largely superseded by later commits. Do not revive their
  old questions or locked decisions as backlog without reconciling current
  code and user steering.
- A commit does not prove that a build is deployed, in TestFlight, approved by
  an app store, or serving real users. Reconfirm those external facts.
- [CLAUDE.md](CLAUDE.md) now describes the chosen production-connected workflow
  without asserting that production is safe or unused. External state must
  still be reconfirmed before risky production activity.
- Ignored `.claude/settings.local.json` grants broad automatic permissions. On
  2026-09-01 the user explicitly chose to retain that configuration; do not
  narrow it without new steering.
- The stale `nostalgic-proskuriakova` linked worktree and its already-merged
  local branch were removed after confirming zero unique commits, no tracked or
  ordinary untracked changes, no process/session owner, and only an obsolete
  ignored permissions file whose rules were all duplicated in the retained
  primary settings.
- The schema baseline header says migration 016 even though its recorded folded
  list includes 017 and 018; this documentation cleanup was not part of W4.
- Dashboard lint currently reports 48 findings: 38 errors and 10 warnings. The
  user wants the errors repaired but requested a separate review before any
  lint-related edit.
- W2's reminder default is internally inconsistent as described above. Static
  checks otherwise pass; the hidden-but-mounted Library card catalog also needs
  later device verification for keyboard dismissal when switching tabs.

## Where we are

### Current workstreams and pending reviews

#### W1 — Continuity-workflow bootstrap

- Owner: Codex root for the completed implementation; no active agent.
- Status: accepted and committed in `df4810f`.
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
- Status: accepted as a complete checkpoint by the user on 2026-09-01, but its
  separate commit is paused for the reminder behavior decision.
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
- Status: accepted and committed with W1 in `df4810f`.
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
  together at `df4810f`.

#### W4 — Accepted checkpoints and maintenance integration

- Owner: Codex root; sole writer and integrator.
- Status: active; waiting for the user's reminder-default choice before W2 can
  be integrated.
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
- Completed outcomes: created `df4810f`, `5c2e259`, and `6ce6a73`; removed the
  stale worktree and branch; all read-only audits were reviewed and integrated.
- Validation: both API builds and emitted-entry `node --check` checks passed;
  all 30 mobile API tests passed; the dashboard build completed without network
  font access; targeted layout lint passed; local browser review confirmed the
  login UI renders correctly and font requests use only `/_next/static/media`
  with no Google font requests.

All current lanes use `main` in `/Users/one/Documents/git/5starmemo`; no linked
worktree remains. W2 is workspace-local and cannot be recovered from Git until
its authorized checkpoint is created.

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

Finish W4 without committing a misleading reminder state, then present and
resolve the dashboard lint plan before revisiting access and release decisions.

W4 acceptance bar:

- root instructions require the work log to be read and synchronized;
- the log clearly distinguishes accepted history, active state, and future work;
- pre-existing uncommitted work remains visible and protected;
- delegated work has explicit ownership, boundaries, and integration status;
- the workflow remains compact enough to maintain in normal work;
- the accepted workflow and project overview remain durable in Git;
- W2 is committed separately only after its reminder behavior is coherent;
- accepted documentation/runtime cleanup remains separated by concern;
- the next lint discussion presents concrete findings before any edit.

### Ordered next work

1. Obtain the reminder behavior decision, make only the corresponding W2 fix,
   rerun mobile validation, and create the authorized W2 checkpoint.
2. Close W4 and present the dashboard lint findings and choices before changing
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
