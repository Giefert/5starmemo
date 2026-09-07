# Tusavor — Design Principles

The canonical design direction for Tusavor is **"Mise en Place · Carte"** — a dark editorial masthead over a warm paper body. The tracked dashboard is the reference implementation: [`web-dashboard/src/app/globals.css`](web-dashboard/src/app/globals.css) defines the tokens, while [`web-dashboard/src/app/dashboard/page.tsx`](web-dashboard/src/app/dashboard/page.tsx) and [`web-dashboard/src/components/admin/`](web-dashboard/src/components/admin/) show page composition and reusable patterns. Every future admin surface should inherit the tokens, rhythm, and restraints below.

---

## 1 · What we're designing for

Tusavor is a memorization app with flashcard decks for restaurant staff. The admin dashboard is the curator's surface — where the person responsible for the decks goes to **see what the collection looks like**, **spot content that needs care**, and **publish new material**.

This is *not* a learner-analytics tool. Studying on Tusavor is personal. Admins never see per-learner progress, completion percentages, or "who studied this week" signals, and the design reflects that ethic — those numbers aren't demoted, they're absent.

---

## 2 · What the old dashboard got wrong

Every decision in the new direction is a response to something specific:

| Old problem | Fix in the new design |
|---|---|
| Stat cards at the top were loud but carried trivial numbers | Demoted to a **thin right-aligned stat rail** in the masthead. Four signals max, each with a clear meaning. |
| `Public` and `Featured` badges used the same green pill — unclear hierarchy | `Public` is the default (implied — "all public" noted once in the section header). `Featured` gets the **amber accent** and a dot marker; it's the only badge on the card. |
| Only Edit + Delete actions; no sense of which decks needed care | Cards surface **content-level warnings** in red — thin decks, stale edits — so the curator scans and acts, not hunts. |
| Haphazard grid; no hierarchy between primary (decks) and context | **Dark masthead / paper body** split. Masthead is context and actions, paper is the deck gallery. The eye knows where to land. |

---

## 3 · Design principles

### 3.1 · Two grounds, two jobs

- **Deep ink (`#14120F`)** for the masthead — context, identity, navigation, KPIs, and the primary call-to-action. Feels nocturnal, like the restaurant before service.
- **Warm paper (`#F4EEE1`)** for the deck gallery — content. Feels like a menu or a printed guide. High contrast for body reading, isolated color signals ring louder on it.

Grounded in contrast research — light-on-warm-paper aids short- and long-term retention. The dark masthead creates a visual "before the bell" moment; the paper band is where the work lives.

### 3.2 · One color, one meaning

Accents are **rationed**. Each appears in exactly one role, so users learn to read color as meaning:

| Color | Token | Meaning | Where |
|---|---|---|---|
| Amber | `#E89A2B` | **Attention — good.** Featured items, primary CTAs, active nav. | Eyebrow copy, button fill, `Featured` flag, nav underline. Warm color = arousal → memory binding. |
| Red | `#D94B36` | **Attention — needed.** Content-level warnings (thin deck, stale edits). | Inline warning chip on deck cards, `Needs your attention` stat. |
| Off-white on ink | `#E8E3D6` | Body text on dark | Masthead copy |
| Ink on paper | `#14120F` | Body text on paper | Deck gallery |

No other colors. No gradient backgrounds. No colored badges for categories (Food/Bar are small-caps eyebrows, not pills).

### 3.3 · Type as hierarchy

Two families, used deliberately:

- **Fraunces** (serif, display) — all deck names, stat figures, page titles, and any moment that wants editorial weight. Weight 400–500, tight tracking (`-0.02em` to `-0.03em`).
- **Inter** (sans, body) — everything else: metadata, labels, buttons, nav.
- **Newsreader italic** (serif, dek) — reserved for editorial blurbs / descriptions when they appear.

Size hierarchy is **generous** — the masthead `<h1>` is 72px; deck names are 32px. Small caps eyebrows at 10–11px with 0.2em+ letter-spacing carry categorical info. Never use an emoji where a small-caps label can do the job.

### 3.4 · Restraint beats density

The gallery is a **3-column grid of hairline-separated cells**, not a grid of bordered cards with shadows. 1px `paperHair` gaps do the separating. No rounded corners on deck cards (crisp editorial feel). Buttons have `borderRadius: 2` — not 8, not 12. Shadows are forbidden on paper.

Every element should earn its place. If a stat doesn't surface a curator decision, it shouldn't be in the rail. If a badge repeats what the layout already says, it gets cut.

### 3.5 · No learner tracking, ever

The following are **deliberately absent** from every admin screen:

- Team progress bars
- Average completion percentages
- "Learners active this week" / "N learners studying"
- Per-learner drill-down
- Engagement metrics

If you're tempted to add one because the screen "feels empty," solve it with layout, typography, or a content-level signal (e.g. "Not edited in 5 months") instead.

---

## 4 · Tokens (authoritative)

Copy these into every new admin surface. The authoritative web tokens live in [`web-dashboard/src/app/globals.css`](web-dashboard/src/app/globals.css); the table below is the portable cross-surface reference:

```js
const T = {
  bg:          '#14120F',   // deep ink — masthead ground
  bgSoft:      '#1C1A16',
  bgHair:      '#28251F',   // 1px rules on dark
  paper:       '#F4EEE1',   // warm paper — body ground
  paperHair:   '#D8CFB8',   // 1px rules on paper

  ink:         '#14120F',   // body text on paper
  inkMute:     '#6B6255',   // secondary on paper
  inkFaint:    '#A89B7E',   // tertiary / delete-state
  onDark:      '#E8E3D6',   // body text on ink
  onDarkMuted: '#8A8578',   // secondary on ink

  amber:       '#E89A2B',   // FEATURED / primary CTA
  red:         '#D94B36',   // NEEDS ATTENTION (content-level)

  serif:       '"Fraunces", Georgia, serif',
  sansBody:    '"Inter", "Helvetica Neue", sans-serif',
  italicDek:   '"Newsreader", Georgia, serif',
};
```

---

## 5 · Layout rhythm for new screens

Every admin page follows the same skeleton:

1. **Dark thin ribbon header** (18px vertical padding, 36px horizontal). Logo + `/ Admin` tag on the left, nav inline, user meta on the right. Active nav item carries the amber underline.
2. **Dark editorial masthead** (48px top padding, grid-split ~1.3fr / 1fr). Left side: small-caps eyebrow, display-serif title, one-paragraph lede, two buttons (amber primary, ghost secondary). Right side: thin stat rail or contextual metadata.
3. **Paper body band** — the actual work. Content here lives on warm paper, all typography ink-on-paper.
4. No footer. The paper band ends the page.

On screens where a full masthead is overkill (a deck editor, a modal-ish settings page), keep the dark ribbon header and drop straight into the paper body. Never use paper-on-paper or ink-on-ink — the two grounds are the page's rhythm; preserve it.

---

## 6 · Component patterns established

- **Stat rail** ([`web-dashboard/src/components/admin/stat-panel.tsx`](web-dashboard/src/components/admin/stat-panel.tsx)) — label left, serif figure right, tone in `red` / `amber` / default. 4 rows max.
- **Deck card** — category eyebrow, serif name, metadata line, optional red warn, action row. Actions are uppercase small-caps in-line, primary (`EDIT`) in ink, destructive (`DELETE`) in `inkFaint` pushed to the right.
- **Featured flag** — amber dot + "Featured" small-caps at top-right of the card, absolute positioned. No badge chrome.
- **Section header** — `h2` in serif + a small-caps count/descriptor beside it + filter tabs on the right.

Reuse these verbatim before inventing new ones.

---

## 7 · What's NOT in this system (yet)

When a new surface needs something the Carte direction doesn't define, **ask before inventing**. Open questions to resolve as we go:

- Form inputs (deck editor fields) — not yet designed
- Empty states — not yet designed
- Dashboard-specific dialog integration — the mobile dialog pattern below is defined
- Loading / skeleton states — not yet designed
- Mobile / narrow-viewport behavior — this dashboard is designed at 1440px; responsive rules tbd
- Dark-mode toggle — none. The admin is always ink+paper.

Every addition should feel like it was always part of the Carte system. If a candidate solution could belong to any generic SaaS dashboard, it's wrong.

## 8 · Mobile popups

The supplied September 2026 popup mockups define app-owned dialogs. The user's
clarification makes the **first mockup's split action row** authoritative for
all two-action popups; the stacked examples are references for copy and styling.
The shared implementation is [`AppDialog`](mobile-app/components/AppDialog.tsx).

- Center a paper `#F4EEE1` panel, maximum width 300, radius 2, with no shadow,
  accent rule, eyebrow, or serif title. Use a `rgba(20,18,15,0.72)` scrim without
  blur. Allow long content to scroll while keeping actions reachable.
- Titles use Inter 600, 18px, tracking −0.015em, ink and sentence case. Describe
  the action directly. Body uses Inter 400, 14px, 1.45 line height, inkMute,
  with one short consequence or recovery message wherever possible.
- Put the unfilled secondary action on the **left**, and the filled amber safe
  action on the **right**, separated by 8px. Both use Inter 600, 15px, sentence
  case, radius 2, and at least 44px height. A single action fills the row.
  Destructive actions are red; simple dismissals are muted. The session's red
  Exit action follows the first mockup, alongside amber Keep studying.
- Use 22px copy padding and 14px action padding. The scrim fades in over 120ms;
  the panel fades and rises 8px over 160ms with ease-out and no scale or spring.
  Respect reduced motion and text scaling.
- Backdrop, Back, and accessibility escape choose the non-destructive dismissal:
  Keep studying, Cancel, Not now, or a notice's OK. They never reset/delete or
  start/retry an operation. Single-notice dismissal preserves its completion
  callback. Block duplicate presses and dismissal during a pending operation.
- Settings forms and their nested confirmations share one native host. The
  glossary preserves rich definitions inside the same paper dialog. Actual OS
  permission and share interfaces remain native system surfaces.

`DialogProvider` supplies queued app notices/confirmations to Login, Study and
Home. Settings owns its form/notice state locally so a confirmation or recovery
notice remains above its form without competing native modal presentations.
