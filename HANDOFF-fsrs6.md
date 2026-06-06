# Handoff: Upgrade FSRS engine to FSRS-6 (defaults) — mobile-api

**Status: not started.** Scope is deliberately bounded — read "NOT in scope" before
expanding it.

**Production baseline update (2026-06-06, commit `a3ecf98`):** a rating-submit hotfix is
already deployed. It keeps the hand-rolled scheduler but fixes the existing-row
snake_case → camelCase mapping, makes the old short-term learning formula finite, and
widens `fsrs_cards.stability` via migration `016_widen_fsrs_stability.sql`.

## Task
Replace the hand-rolled FSRS engine in `mobile-api` with the maintained **`ts-fsrs`**
library configured as **FSRS-6**, using the library's default weights. Per-user weight
*optimization* is explicitly OUT of scope and must NOT be built.

## Context (see CLAUDE.md)
5starmemo: spaced-repetition app, BFF architecture. Relevant service is `mobile-api`
(student-facing). The mobile app always hits prod (`api.tusavor.com`). Develop against
prod, not local docker (local DB is stale). Deploy = SSH to VPS,
`git pull && docker compose up -d --build`. No clients on prod yet, so it's safe to
iterate. Keep it lean: no dead code, no designing for hypothetical future requirements,
no new SaaS/paid services.

## Why this upgrade
`mobile-api/src/utils/fsrs.ts` is hand-rolled and two generations behind:
- **17-weight FSRS-4.5 default parameter set** (generic) — `fsrs.ts:9`.
- **Pre-4.5 exponential forgetting curve** `exp(ln(0.9)·t/S)` — `fsrs.ts:199`
  (`calculateRetrievability`). 4.5+ uses a power curve; this is older than even the 4.5 set.
- **No real short-term/same-day modeling** beyond a crude `shortTermStability` heuristic.
  The previous invalid `w[17]`/`w[18]` reference was hotfixed in `a3ecf98`, but the
  scheduler is still not FSRS-6.

FSRS-6 fixes all three: power forgetting curve, same-day modeling (FSRS-5's contribution),
the full 21-parameter formulas, and modern benchmark-trained defaults. **That engine jump
is where the accuracy win is — NOT personalization** (see decision note at the bottom).

## What to build

1. **Add `ts-fsrs`** to `mobile-api/package.json`. It is scheduler-only, a zero-runtime-
   dependency npm package — within the CLAUDE.md cost safeguards (no SaaS, no native build
   dep). Configure FSRS-6 explicitly:
   - `enable_short_term: true`
   - `request_retention: 0.9` (the current hardcoded target, `fsrs.ts:5`)
   - `maximum_interval: 36500` (current value, `fsrs.ts:6`)
   - default FSRS-6 `w` (21 params) and default `decay` — do not pin the old 17-weight array.

2. **Replace the `FSRS` class usage at the single grading call site** in
   `mobile-api/src/models/progress.ts`:
   - `:3` — `import { FSRS, Rating } from '../utils/fsrs';`
   - `:24` — `private static fsrs = new FSRS();`
   - `:103` — `this.fsrs.next(fsrsCard, review.rating as Rating)`
   - `:107` — upsert into `fsrs_cards` (keep this table, **NO additional schema change**).
   HTTP entry is `routes/progress.ts:209` (`POST /review`, rating validated 1–4) →
   `submitReview` called at `routes/progress.ts:240`.

   After the swap, `mobile-api/src/utils/fsrs.ts` should be **deleted** (don't leave the old
   class guarded or commented — delete dead code per CLAUDE.md). Keep a local `Rating` enum
   or import ts-fsrs's `Rating` — but note the scale mapping below.

3. **Weights seam — code-level only.** Grading reads weights through ONE indirection, e.g.
   a `getWeightsForUser(userId)` that, in this phase, simply returns the FSRS-6 defaults.
   This is a one-function seam so a future optimizer can drop in without a scheduler rewrite.
   **Do NOT add a DB column, `fsrs_weights`, `optimized_at`, or any unused fields** — that
   would be dead schema / designing for a hypothetical.

## Data mapping / migration notes

`fsrs_cards` columns: `card_id, user_id, difficulty, stability, retrievability, grade,
lapses, reps, state ('new'|'learning'|'review'|'relearning'), last_review, next_review,
created_at, updated_at`. Rating scale is **1–4 = Again/Hard/Good/Easy**. After migration
`016_widen_fsrs_stability.sql`, `stability` is `DECIMAL(13,8)`; keep that type.

- `getFSRSCard` now maps existing DB rows through `mapFSRSRow` before the old scheduler
  sees them. The FSRS-6 migration still must map explicitly into a ts-fsrs `Card`; do not
  pass raw snake_case rows or the existing app-facing `FSRSCard` object directly into the
  library. Map state strings to ts-fsrs `State`, `last_review`/`next_review` to `Date`,
  etc.
- ts-fsrs's scheduler returns a `RecordLog`/`Card`; map its fields back to the existing
  upsert params at `progress.ts:127-138` (difficulty, stability, retrievability/`R`?,
  grade, lapses, reps, state, next_review). `retrievability` is stored — derive it from the
  card at review time if ts-fsrs doesn't return it directly.
- ts-fsrs `Rating` is `Manual=0, Again=1, Hard=2, Good=3, Easy=4` — our 1–4 lines up; just
  don't pass 0.

## Verification (no test suite exists — `package.json` test script is a stub)
- `npm run build` (tsc) in `mobile-api` must pass after deleting `fsrs.ts`.
- Exercise `POST /review` against prod with a **test login** (writes to the live DB) across
  all four ratings on a new card and an existing review card; confirm `fsrs_cards` rows get
  sane difficulty (1–10), stability (>0), and a `next_review` that grows with Good/Easy.
- Include a regression pass on an already-reviewed card that is in `learning` or
  `relearning`; this is the path that produced the Chu Maki 500 before `a3ecf98`.
- Deploy: SSH to VPS, `git pull && docker compose up -d --build mobile-api`. Rebuild
  `web-api` too only if the FSRS-6 work adds another DB migration.

## NOT in scope — do not build
- No optimizer / training package (`@open-spaced-repetition/binding`, `fsrs-rs`).
- No per-user optimized weights computed or stored; no `fsrs_weights` column, no nightly
  cron, no doubling-rule trigger, no 1,000-review threshold logic.
- No native build dependency in the Docker image. No new SaaS / paid service.
- No per-restaurant weight pooling.
- Don't touch the study-card **ordering** — already shipped (commit `ccfdab2`,
  `deck.ts` `getDeckForStudy`: recommended = `next_review ASC, RANDOM()`, full = `RANDOM()`).

## Why personalization is deferred (the decision, so it isn't re-litigated)
FSRS **already personalizes the schedule per user on default weights** — each student's own
ratings drive their per-card difficulty/stability/next-review in `fsrs_cards`, so two
students get different intervals on the same card. The *optimizer* only personalizes the
21 model parameters on top, and it needs ~1,000 reviews/user before it beats defaults
(below that it overfits and actively degrades). Prod has no clients yet, so optimizing now
would no-op or hurt, and there's no review history to test it against. Defaults are also the
bootstrap state of every personalized FSRS deployment (Anki included), so shipping defaults
is step one of personalization, not an alternative to it. Revisit the optimizer only once
real usage shows users crossing thousands of reviews — it drops in behind the
`getWeightsForUser` seam with no scheduler rewrite. (`card_reviews` already stores
`rating` + `created_at`, the optimizer's input, so phase 2 stays additive.)
