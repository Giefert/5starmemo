# Work Log

This is the repository's curated continuity record. It captures accepted
project state and active coordination, not a transcript. Reconcile it whenever
work or steering materially changes.

Last reconciled: 2026-09-01 by Codex root at `6566859` (`main`; W6 live audit
paused for an urgent credential-revocation decision)

Current work-log coordinator: Codex root for the W5 closure and W6 access
decision handoff.

## Resume here

- W1 and W3 are durable in `df4810f`: `AGENTS.md`, `WORKLOG.md`, and the
  corrected `README.md` now survive a clean checkout.
- W2 is durable in `b173d88`: the accepted card-browser, Library, image, and
  automatic-On reminder work was committed as one separate mobile checkpoint.
  Automatic-On means the first authenticated use with no saved reminder
  preference; it is not a literal reinstall detector because SecureStore is
  account-scoped and may survive an iOS reinstall.
- Read tracked [CLAUDE.md](CLAUDE.md) for repository constraints and
  [DESIGN.md](DESIGN.md) for the Carte design system. Use current tracked code
  and commits for implemented behavior. Local `*-HANDOFF.md` files are ignored
  by Git and are historical evidence only, not durable project truth.
- [README.md](README.md) is current and committed in `df4810f`.
- Never record credentials or other secrets here.
- W4 is complete. The user approved W5 Option A: repair all dashboard lint
  errors and meaningful warnings, retain two narrowly documented raw-image
  exceptions, and repair the related preview object-URL leak.
- W5 is durable in `e8b6836`. The next required discussion is deployment and
  GitHub access; no live credential, server, repository, push, or deployment
  change is authorized yet.
- W6 Option C read-only verification confirmed that the tracked access gates
  are not satisfied. It also caused an inline server-side GitHub credential to
  appear in audit output. Never reproduce the value; treat it as exposed and
  obtain explicit authorization to revoke it and remove it from the server
  checkout configuration before any further live audit.

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
- `b173d88`: integrated the accepted mobile Library/card-browser/image changes
  and a serialized automatic-On reminder lifecycle that fails closed when
  native notification capability is unavailable.
- `e8b6836`: removed the dashboard lint baseline, repaired stale route/load
  races, and made preview object-URL ownership explicit while retaining two
  narrowly justified raw-image exceptions.

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
- W2's automatic-On lifecycle is implemented and statically validated. Native
  notification permission prompts and delivery still require a clean-device
  check; no production-connected account or device state was changed during W4.
- W6 has an urgent unresolved credential incident: a GitHub credential embedded
  in the server checkout URL was exposed to the audit output. No value is
  retained here. No mutation has occurred; revocation and server-side removal
  are awaiting the user's explicit authorization.

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
- Status: accepted and committed in `b173d88`.
- Boundary: one umbrella lane because its substreams overlap in shared files.
  It includes the card-browser replacement, Library card-catalog/navigation/
  state work, card image treatment, and reminder defaults. The user's
  automatic-On choice expands the boundary to `mobile-app/App.tsx` for the
  authenticated-session initialization hook. Home and Library category
  contents are again always expanded; the Bulletin accordion remains unchanged.
  TypeScript and whitespace checks passed after the rollback.
- Validation: mobile TypeScript and whitespace checks passed; iOS, Android, and
  web Expo bundles completed; no stale `BrowseScreen` reference remained; three
  read-only audits found no static commit blocker.
- Resume evidence: `b173d88`.

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
- Status: completed through `b173d88`.
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
- Completed outcomes: created `df4810f`, `5c2e259`, `6ce6a73`, and `b173d88`;
  removed the stale worktree and branch; implemented the user's automatic-On
  reminder choice; all read-only audits were reviewed and integrated.
- Validation: both API builds and emitted-entry `node --check` checks passed;
  all 30 mobile API tests passed; the dashboard build completed without network
  font access; targeted layout lint passed; local browser review confirmed the
  login UI renders correctly and font requests use only `/_next/static/media`
  with no Google font requests.
- W2 validation: mobile TypeScript and whitespace checks pass; iOS, Android,
  and web Expo bundles complete; no stale `BrowseScreen` reference remains.
  The reminder manager waits for authentication, serializes lifecycle changes,
  uses a deterministic device schedule, handles iOS provisional permission and
  blocked Android channels, retries on foreground return, clears on sign-out,
  and fails closed on denial. Library tab changes now explicitly dismiss the
  keyboard while preserving the mounted card-catalog state.

#### W5 — Dashboard lint remediation

- Owner: Codex root; sole writer. Read-only support lanes may audit but not edit.
- Status: accepted and committed in `e8b6836`.
- Entry findings: 38 errors (36 unsafe `any` types, one unescaped apostrophe,
  one empty interface) and 10 warnings (four unused declarations, four React
  effect dependency findings, and two raw-image findings).
- Boundary: `web-dashboard` only. Preserve behavior, R2 cost safeguards, and
  the already accepted self-hosted-font implementation.
- Read-only audit outcome:
  - the 36 `any` errors are 29 catch variables, six card-API contract types,
    and one management display cast; existing shared types plus one narrowed
    Axios-error helper can replace them without a broad rule exemption;
  - the apostrophe, empty interface, and four unused declarations are safe
    mechanical cleanup;
  - all four effect warnings should be repaired with stale-response protection,
    not suppressed, because route or filter changes can otherwise show older
    data;
  - both raw images are intentional: one preserves direct immutable R2 delivery
    without adding VPS image-proxy work, and the editor preview also accepts
    browser-only `blob:` URLs. Use narrow documented suppressions rather than a
    global rule change or a mechanical `next/image` conversion;
  - the preview created object URLs during render without revoking them; Option
    A moved creation to file selection and added replacement/unmount cleanup.
- All three support audits completed without editing files; no active support
  lane remained at the decision checkpoint.
- Implementation outcome:
  - `active_changes` completed the API/error-boundary typing and safe mechanical
    cleanup in its assigned files;
  - `workflow_audit` completed the deck-editor loader, types, unused cleanup,
    and narrow direct-R2 image exception;
  - `repo_history` was interrupted before editing after making no filesystem
    progress; root took over and completed the glossary loaders, input type,
    blob-capable image exception, and object-URL lifecycle without overlapping
    another writer.
- Final outcome: real request/response and error-boundary types replace every
  dashboard `any`; dynamic deck and glossary editors isolate state by route;
  warned loaders reject stale results; object URLs are reused and revoked; and
  the only image-rule suppressions are the two approved one-element exceptions.
- Validation: full dashboard lint is clean, dashboard TypeScript passes, the
  production build completes, and whitespace checks pass. Three independent
  final read-only reviews accepted the integrated diff after their route-race
  findings were repaired; no active support lane remains.

All current lanes use `main` in `/Users/one/Documents/git/5starmemo`; no linked
worktree remains. W2 is recoverable from `b173d88` and W5 from `e8b6836`.

#### W6 — Deployment and GitHub access decision

- Owner: Codex root; read-only until the user authorizes a specific mutation.
- Status: the user chose Option C, but the read-only audit is paused because it
  exposed an inline server-side GitHub credential. Await urgent authorization
  to revoke/remove it; all other hardening remains deferred.
- Boundary: reconcile the tracked pre-launch SSH/deploy-user and broad GitHub
  credential TODOs in [CLAUDE.md](CLAUDE.md) with freshly verified external
  state before changing access. Do not display or copy credential values.
- No server, GitHub, credential, push, deployment, or production-data action is
  currently authorized.
- The three read-only support lanes completed without editing: they reconciled
  tracked history, the Docker Compose deployment boundary, local Git/SSH
  selection metadata, and what requires live evidence. No support lane remains.
- Root completed limited live read-only GitHub/server checks, then stopped when
  the inline credential appeared. Do not resume live inspection before the
  revocation decision.
- Sanitized audit outcome: the local Git credential still has broad repository
  authority and `main` has no server-side protection; the production login path
  is a general privileged account with an unrestricted key rather than a
  dedicated deploy identity. The server checkout also stored the now-exposed
  inline GitHub credential. No credential, rule, key, account, or server setting
  was changed.

## Where we are going

### Current milestone

Revisit access and release decisions in the user's required order now that the
dashboard lint baseline is resolved.

W6 acceptance bar:

- explain deployment-key/user and GitHub-credential choices in plain language;
- verify current external state read-only before relying on the tracked TODO;
- do not expose credential values or mutate live access without explicit scope;
- preserve explicit deployment approval regardless of the access design;
- record the accepted access decision before release-status review.

### Ordered next work

1. Obtain authorization to revoke the exposed GitHub credential and remove it
   from the server checkout URL; do not continue the live audit first.
2. Keep all other access hardening deferred under Option C.
3. After access is resolved, revisit release and platform status.

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
