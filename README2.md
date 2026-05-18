# Handoff: Tusavor — Admin Dashboard ("Mise en Place · Carte")

## Overview

This is the canonical design direction for the Tusavor admin dashboard. Tusavor is a memorization app with flashcard decks for restaurant staff; the admin dashboard is the **curator's surface** — where the person responsible for the decks goes to see the collection, spot content that needs care, and publish new material.

The aesthetic is **editorial / restaurant-menu** — a deep ink masthead over a warm paper body, Fraunces serif for display, Inter for UI, amber and red rationed as accent meanings. See `DESIGN.md` (bundled) for the full principles document — read it before touching code.

## About the design files

Files in this bundle (`Tusavor Dashboard.html`) are **design references created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly.

Your task is to **recreate this design 1:1 inside the existing Tusavor codebase**:

- **Next.js 15 App Router** — TypeScript + JSX (`.tsx`)
- **Tailwind CSS v4** — utility classes via `className` (no inline `style={{...}}` carry-over; convert to Tailwind)
- **PostCSS** pipeline (already configured)
- **Radix UI primitives + shadcn-style helpers** (`class-variance-authority`, `clsx`, `tailwind-merge`)

If the codebase already has shadcn `Button`, use it and apply Carte-tone variants via `cva`. If not, plain Tailwind buttons are fine — match the visual exactly.

## Fidelity

**High-fidelity (hifi).** Pixel-perfect mockup with final colors, typography, spacing, and a real component skeleton. Recreate it pixel-perfectly. All exact values are documented below and in `Tusavor Dashboard.html` (look at the `T` token object at the top of the script block and the inline styles on each element).

---

## Screen: Admin Dashboard — `/admin` (or wherever Decks index lives)

**Purpose.** Curator views all decks at a glance, spots issues, and publishes new material.

**Top-level layout** (single column, full-bleed):

1. **Dark thin ribbon header** — full width, `padding: 18px 36px`, `border-bottom: 1px solid #28251F`. Logo + "/ ADMIN" eyebrow on the left, nav inline (`Decks` | `Glossary`), user meta on the right (`admin@tusavor · Sign out`). Active nav item carries a 2px amber underline.
2. **Editorial masthead (dark)** — `padding: 48px 36px 40px`, CSS grid `1.3fr 1fr` with `48px` gap, `align-items: end`. Left column = title block + lede + buttons. Right column = stat rail.
3. **Paper band — deck gallery** — `background: #F4EEE1`, `padding: 40px 36px 56px`. Section header (h2 + count + filters), then a 3-column grid of deck cards.

No footer. The paper band ends the page.

### Components on this screen

#### 1. Header ribbon
- Container: `flex items-center justify-between`, `px-9 py-[18px]`, `border-b border-[#28251F]`, on `bg-ink` (`#14120F`)
- Logo: `Tusavor` in **Fraunces 22px / 500 / -0.02em / `#F4EEE1`**, baseline-aligned with `/ ADMIN` in **Inter 10px / `0.2em` letter-spacing / uppercase / `#8A8578`**, `gap-2`
- Nav links: **Inter 13px**, `gap-5`. Active = `#F4EEE1` text + 2px solid `#E89A2B` bottom-border (offset down by `padding-bottom: 16px; margin-bottom: -17px` so it lines up with the ribbon's bottom rule). Inactive = `#8A8578`.
- User meta: `flex gap-[14px]`, `text-xs`, `#8A8578`. Plain `·` separator.

#### 2. Editorial masthead — left column

- Eyebrow: **Inter 11px / 0.24em / uppercase / `#E89A2B` / mb-[14px]** — copy: `The carte · Week 17`
- H1: **Fraunces 72px / weight 400 / line-height 0.95 / -0.03em**, color `#F4EEE1`. Two lines, with a `<br>`. Second line: the word "Eighty-nine" wrapped in `<span>` with `font-style: italic; color: #8A8578`.
  - Copy: `Six decks.\nEighty-nine cards.` (the "Eighty-nine" is the italic span; the rest of the second line is regular)
- Lede paragraph: **Inter 15px / lh 1.55 / `#8A8578` / mt-[22px] / max-w-[540px]**
  - Copy: `Sauces is on the feature this week. Two decks need a look — Cocktails is thin and Chu Makis hasn't been touched since November.`
  - In production, derive from data: featured deck name + warn count. Don't hardcode — see "State Management" below.
- Button row: `flex gap-[10px] mt-7`
  - **Primary:** `+ New deck` — bg `#E89A2B`, text `#14120F`, `px-5 py-3`, **Inter 13px / 600 / 0.02em**, `rounded-[2px]` (NOT 8 or 12 — editorial feel demands 2px)
  - **Secondary:** `Import glossary` — transparent bg, `border border-[#28251F]`, text `#E8E3D6`, same padding/size, `rounded-[2px]`

#### 3. Editorial masthead — right column (Stat Rail)

- Container: `flex flex-col border-t border-[#28251F]`
- Four `StatRow` rows in this order:
  | Label | Value | Tone |
  |---|---|---|
  | `Decks published` | `decks.length` | default (paper) |
  | `Total cards` | sum of `cards` | default |
  | `Featured this week` | count of `featured` | **amber** |
  | `Needs your attention` | count of `warn` | **red** |
- Each row: `flex justify-between items-baseline py-[14px] border-b border-[#28251F]`
  - Label: **Inter 13px / `#8A8578`**
  - Value: **Fraunces 28px / weight 400 / -0.02em / tabular-nums**, color by tone:
    - default → `#F4EEE1`
    - `amber` → `#E89A2B`
    - `red` → `#D94B36`

#### 4. Paper band — section header

- Container: `flex items-baseline justify-between mb-6`
- Left: H2 `The pass` in **Fraunces 28px / 500 / -0.02em / `#14120F`** + count chip beside it: **Inter 12px / 0.16em / uppercase / `#6B6255`** — copy: `6 decks · all public`
- Right: filter pills (plain text, no chrome): `All | Food | Bar | Featured`. Active (`All`) = `#14120F` weight 500; rest = `#6B6255`. **Inter 13px**, `gap-[18px]`.

#### 5. Paper band — deck grid

- 3-column grid, **`gap: 1px`**, `background: #D8CFB8`, `border: 1px solid #D8CFB8`.
  - The 1px gap and border are the paper-hair rules between cards. Don't replace with `divide-x` — the trick is that the grid background bleeds through the 1px gaps.
  - In Tailwind: `grid grid-cols-3 gap-px bg-[#D8CFB8] border border-[#D8CFB8]`
- Each cell is a `DeckCard` (see below).

#### 6. DeckCard

- Container: `relative flex flex-col gap-[14px] bg-paper p-[22px] pb-[18px] min-h-[176px]`
  - Card bg is the paper color (`#F4EEE1`); the visible "borders" between cards are the 1px grid gap showing the parent's hair color.
- **Featured flag (conditional)** — absolute top-right: `absolute top-3 right-3`, `flex items-center gap-[5px]`, **Inter 10px / 0.18em / uppercase / 700 / `#E89A2B`**, with a 5×5 amber dot (`rounded-full bg-[#E89A2B]`) before "Featured".
- **Category eyebrow:** **Inter 10px / 0.2em / uppercase / `#8A7E68` / mb-2**
- **Deck name (h3):** **Fraunces 32px / weight 400 / -0.02em / line-height 1 / `#14120F`**, no margin
- **Metadata row** (pushed to bottom with `mt-auto`): `flex gap-[14px]`, **Inter 12px / `#6B6255` / tabular-nums**
  - `{cards} card(s)` · `Edited {date}`  (use `·` as separator)
- **Warn row (conditional):** `flex items-center gap-[6px]`, **Inter 11px / `#D94B36`**, with a 4×4 red dot before the message.
  - `warn` is content-level only (thin deck, stale edits). NEVER about learner behavior.
- **Action row:** `flex gap-[14px] pt-3 border-t border-[#D8CFB8]`, **Inter 12px / 0.04em**
  - `EDIT` (`#14120F` weight 600) — primary
  - `PREVIEW` (`#6B6255`)
  - `DUPLICATE` (`#6B6255`)
  - `DELETE` (`#A89B7E`, `ml-auto`) — destructive, faded, pushed right
  - In production these become real `<button>`s with hover/focus rings. Visual stays the same.

---

## Interactions & Behavior

The HTML prototype is static. Implement these in the real version:

### Buttons
- **Primary (`+ New deck`):** opens a "create deck" modal or navigates to `/admin/decks/new`. (Pick whichever fits the existing app's pattern — modal is preferred if other create flows use modals.)
- **Secondary (`Import glossary`):** navigates to glossary import flow.
- **Hover states:** primary amber → darken ~8% on hover; secondary → border becomes `#3A332B`. Both `transition-colors duration-150`.
- **Focus rings:** standard accessible focus ring (Radix or `focus-visible:ring-2 focus-visible:ring-[#E89A2B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14120F]` on dark; offset color flips to paper on the paper band).

### Filter pills
- Single-select (one active at a time). Clicking one updates a filter state; deck grid re-renders filtered list.
- No URL-syncing required for v1 (but a `?filter=food` query param would be nice).

### Deck card actions
- `EDIT` → `/admin/decks/{id}/edit`
- `PREVIEW` → `/admin/decks/{id}` or opens preview drawer
- `DUPLICATE` → API call, creates a copy, toasts success, refreshes list
- `DELETE` → confirmation dialog (Radix AlertDialog), then API call
- Hover: action text underlines, or shifts to `#14120F` weight 600 for non-primary items. Subtle.

### Featured flag
- Read-only on this view. Editing happens in the deck editor.

### Loading / empty states
- **Not designed yet.** Use a minimal skeleton matching the layout (paper band with 3 ghost cards in `#E8DFC4`). Empty state: Fraunces italic message centered in the paper band — *"No decks yet. Add your first one above."* Confirm copy with design before shipping.

### Responsive
- Designed at **1440px**. Tablet (≤1024): collapse stat rail under the headline (full width), keep grid at 2 columns. Mobile (≤640): single column, masthead font scales down (h1 → 48px), buttons stack. Confirm specifics with design before shipping mobile.

---

## State Management

The dashboard reads decks from your existing data layer. Suggested shape:

```ts
type Category = 'Food' | 'Bar';

interface Deck {
  id: string;
  name: string;
  cards: number;            // count, derived server-side
  updatedAt: string;        // ISO; format to "Mar 23 · 2026" client-side
  category: Category;
  featured: boolean;
  warn?: string | null;     // content-level warning, derived server-side. e.g. "Thin — only 1 card", "Not edited in 5 months"
}
```

**`warn` derivation rules** (server-side or in a hook):
- `cards <= 2` → `"Thin — only ${cards} card${cards===1?'':'s'}"`
- `Date.now() - updatedAt > 120 days` → `"Not edited in ${months} months"`
- Featured decks should still show warns if they apply (don't suppress).

**Client state on the page:**
- `filter: 'All' | 'Food' | 'Bar' | 'Featured'` — local `useState`, default `All`.
- Derived: `visibleDecks = decks.filter(applyFilter)`.
- Stat rail figures are computed off the **full** deck list, not the filtered view (those are collection-wide signals).

**Lede copy** is mostly static, but the dynamic phrasing should reflect data when feasible. For v1, hardcode is fine — flag for later.

---

## Design Tokens

Add these to your Tailwind v4 `@theme` block (`globals.css` or wherever your theme lives). Once added, every utility (`bg-ink`, `text-paper`, `border-bg-hair`, etc.) becomes available globally.

```css
@theme {
  /* Grounds */
  --color-ink: #14120F;          /* deep ink — masthead ground */
  --color-ink-soft: #1C1A16;
  --color-bg-hair: #28251F;      /* 1px rules on dark */
  --color-paper: #F4EEE1;        /* warm paper — body ground */
  --color-paper-hair: #D8CFB8;   /* 1px rules on paper */

  /* Text */
  --color-on-paper: #14120F;
  --color-on-paper-mute: #6B6255;
  --color-on-paper-faint: #A89B7E;
  --color-on-paper-eyebrow: #8A7E68;
  --color-on-dark: #E8E3D6;
  --color-on-dark-mute: #8A8578;

  /* Accents — rationed, each one meaning */
  --color-amber: #E89A2B;        /* FEATURED / primary CTA */
  --color-red: #D94B36;          /* NEEDS ATTENTION (content-level only) */

  /* Type */
  --font-serif: "Fraunces", Georgia, serif;
  --font-sans:  "Inter", "Helvetica Neue", system-ui, sans-serif;
  --font-dek:   "Newsreader", Georgia, serif;
}
```

### Spacing scale
The design uses Tailwind's default spacing scale where possible. Specific values that don't map cleanly: `18px` (header py), `22px` (card padding), `36px` (page horizontal padding), `48px` (masthead top padding), `56px` (paper band bottom). Use arbitrary values (`p-[22px]`) or extend the scale if you'd rather.

### Typography scale (referenced)

| Token / element | Size | Weight | Tracking | LH |
|---|---|---|---|---|
| H1 (masthead) | 72px | 400 | -0.03em | 0.95 |
| H2 (section) | 28px | 500 | -0.02em | — |
| H3 (deck name) | 32px | 400 | -0.02em | 1.0 |
| Stat figure | 28px | 400 | -0.02em | — |
| Body / lede | 15px | 400 | — | 1.55 |
| UI text | 13px | 400/500 | — | — |
| Metadata | 12px | 400 | — | — |
| Eyebrow | 10–11px | 400/700 | 0.18–0.24em uppercase | — |

### Border radius
- Buttons: `2px` (NOT 8/12)
- Cards: 0 (crisp editorial)
- Featured dot, warn dot: `9999px`

### Shadows
- **None.** No shadows on the paper band. No shadows on cards. The hairline grid is the visual separator.

---

## Fonts

Replace the prototype's `<link>` tag with `next/font/google`:

```ts
// app/fonts.ts (or in layout.tsx)
import { Fraunces, Inter, Newsreader } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dek',
  display: 'swap',
});
```

Then on `<html>`: `className={`${fraunces.variable} ${inter.variable} ${newsreader.variable}`}`. Tailwind `font-serif`, `font-sans`, `font-dek` will resolve to these via the `@theme` declarations above.

---

## Files in this bundle

- **`Tusavor Dashboard.html`** — the HTML prototype. Open it in a browser at 1440px width to see the target visual. Inspect any element to read off exact values; the inline `style` props on every element are the source of truth.
- **`DESIGN.md`** — the principles document. Read this before writing code. It defines the system's *why* (what the old dashboard got wrong, the two-ground rhythm, one-color-one-meaning rule, type pairing, the no-learner-tracking ethic). All future Tusavor admin surfaces should inherit these principles, so the dashboard implementation should set patterns reusable across deck editor, glossary, settings, etc.

## Suggested file structure in the codebase

```
app/admin/
  page.tsx                   # Dashboard route — composes header + masthead + paper band
  layout.tsx                 # (optional) admin shell with header

components/admin/
  header-ribbon.tsx          # the dark ribbon, with logo + nav + user meta
  masthead.tsx               # editorial masthead block (title + lede + buttons + stat rail)
  stat-row.tsx               # one row in the stat rail
  deck-grid.tsx              # paper band + section header + grid container
  deck-card.tsx              # individual deck card
  filter-pills.tsx           # All/Food/Bar/Featured

lib/
  decks.ts                   # types (Deck, Category) and warn-derivation helpers
  format-date.ts             # "Mar 23 · 2026" formatter
```

## Things explicitly OUT of scope

These are **deliberate omissions** — do not add them, even if a screen "feels empty":

- Per-learner progress / completion / "active this week"
- Team progress bars
- Engagement metrics
- Decorative gradients, drop shadows, rounded cards
- Emoji or stock iconography in deck cards (categories are small-caps eyebrows, not icons)

If a future surface needs something Carte doesn't define (form inputs, modals, mobile breakpoints), confirm the addition with the designer before inventing — see `DESIGN.md` § 7 "What's NOT in this system (yet)".
