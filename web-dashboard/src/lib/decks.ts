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
