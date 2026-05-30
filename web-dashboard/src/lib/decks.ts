import { Deck, DeckType } from '../../../shared/types';

export type CarteCategory = 'Food' | 'Bar' | 'Other';
export type CarteFilter = 'All' | 'Food' | 'Bar' | 'Other';

const LABELS: Record<DeckType, CarteCategory> = {
  food: 'Food',
  bar: 'Bar',
  other: 'Other',
};

// A deck's Carte category is now its admin-chosen type, set from a dropdown at
// creation — no longer derived from the deck's card categories.
export function deckCategory(deck: Deck): CarteCategory {
  return LABELS[deck.deckType] ?? 'Other';
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
  return decks.filter((d) => deckCategory(d) === filter);
}
