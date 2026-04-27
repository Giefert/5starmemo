import { Deck } from '../../../shared/types';

export type CarteCategory = 'Food' | 'Bar' | '(category)';
export type CarteFilter = 'All' | 'Food' | 'Bar' | 'Featured';

const BAR_CATS = new Set(['wine', 'beer', 'cocktail', 'spirit', 'sake']);
const FOOD_CATS = new Set(['maki', 'sauce', 'fish']);

// Derive a deck's Carte category from the restaurant categories of its cards.
// All-bar → "Bar", all-food → "Food", mixed/empty → "(category)".
export function deckCategory(deck: Deck): CarteCategory {
  const cats = deck.cardCategories ?? [];
  if (cats.length === 0) return '(category)';
  const allBar = cats.every((c) => BAR_CATS.has(c));
  const allFood = cats.every((c) => FOOD_CATS.has(c));
  if (allBar) return 'Bar';
  if (allFood) return 'Food';
  return '(category)';
}

// Content-level warning. Curator-facing only; never about learner behavior.
export function deckWarn(deck: Deck, now: Date = new Date()): string | null {
  const count = deck.cardCount ?? 0;
  if (count <= 2) return `Thin — only ${count} card${count === 1 ? '' : 's'}`;

  const updated = deck.updatedAt instanceof Date ? deck.updatedAt : new Date(deck.updatedAt);
  if (!Number.isNaN(updated.getTime())) {
    const days = (now.getTime() - updated.getTime()) / 86_400_000;
    if (days > 120) {
      const months = Math.round(days / 30);
      return `Not edited in ${months} months`;
    }
  }
  return null;
}

export function applyFilter(decks: Deck[], filter: CarteFilter): Deck[] {
  if (filter === 'All') return decks;
  if (filter === 'Featured') return decks.filter((d) => d.isFeatured);
  return decks.filter((d) => deckCategory(d) === filter);
}

// Editorial lede derived from data: featured deck + warns.
export function buildLede(decks: Deck[]): string {
  const featured = decks.filter((d) => d.isFeatured);
  const warns = decks
    .map((d) => ({ deck: d, warn: deckWarn(d) }))
    .filter((x): x is { deck: Deck; warn: string } => x.warn !== null);

  const parts: string[] = [];

  if (featured.length === 1) {
    parts.push(`${featured[0].title} is on the feature this week.`);
  } else if (featured.length > 1) {
    const names = featured.map((d) => d.title);
    const joined =
      names.length === 2
        ? names.join(' and ')
        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    parts.push(`${joined} are on the feature this week.`);
  }

  if (warns.length === 1) {
    parts.push(`One deck needs a look — ${warns[0].deck.title} ${describeWarn(warns[0].warn)}.`);
  } else if (warns.length > 1) {
    parts.push(`${warns.length} decks need a look.`);
  }

  if (parts.length === 0) {
    return 'The collection is in good shape. No decks need attention this week.';
  }
  return parts.join(' ');
}

function describeWarn(warn: string): string {
  // "Thin — only 1 card" → "is thin"; "Not edited in 5 months" → "hasn't been edited in 5 months"
  if (warn.startsWith('Thin')) return 'is thin';
  if (warn.startsWith('Not edited')) return `hasn't been ${warn.toLowerCase()}`;
  return warn.toLowerCase();
}

// Number-words for the masthead headline (matches the design's "Eighty-nine cards.").
export function spellOut(n: number): string {
  if (n < 0) return String(n);
  const small = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n < 20) return small[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? tens[t] : `${tens[t]}-${small[u].toLowerCase()}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${small[h]} hundred` : `${small[h]} hundred ${spellOut(r).toLowerCase()}`;
  }
  return String(n);
}
