import * as SecureStore from 'expo-secure-store';
import { GlossarySection, GlossaryTermSummary } from '../types/shared';

export type CustomDeckSource = 'cards' | 'reference' | 'both';

export type CustomDeckItem =
  | {
      kind: 'card';
      cardId: string;
      deckId: string;
      deckTitle: string;
      title: string;
    }
  | {
      kind: 'reference';
      termId: string;
      term: string;
      definition?: string;
      section: GlossarySection;
      categoryId?: string;
      categoryName?: string;
      categoryColor?: string;
    };

export interface CustomStudyDeck {
  id: string;
  title: string;
  source: CustomDeckSource;
  items: CustomDeckItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomDeckDraft {
  title: string;
  source: CustomDeckSource;
  items: CustomDeckItem[];
}

const key = (restaurantId: string) => `customStudyDecks.${restaurantId}`;

export function createCustomDeckId(): string {
  return `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadCustomDecks(restaurantId: string): Promise<CustomStudyDeck[]> {
  try {
    const raw = await SecureStore.getItemAsync(key(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomDecks(
  restaurantId: string,
  decks: CustomStudyDeck[],
): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(restaurantId), JSON.stringify(decks));
  } catch (error) {
    console.warn('Failed to save custom decks:', error);
  }
}

export function makeCustomDeck(draft: CustomDeckDraft): CustomStudyDeck {
  const now = new Date().toISOString();
  return {
    id: createCustomDeckId(),
    title: draft.title.trim(),
    source: draft.source,
    items: draft.items,
    createdAt: now,
    updatedAt: now,
  };
}

export function customReferenceItemToTermSummary(
  item: Extract<CustomDeckItem, { kind: 'reference' }>,
): GlossaryTermSummary {
  return {
    id: item.termId,
    term: item.term,
    definition: item.definition ?? '',
    section: item.section,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryColor: item.categoryColor,
    linkedCardCount: 0,
  };
}

export function getCustomDeckCounts(deck: CustomStudyDeck): {
  cards: number;
  reference: number;
  total: number;
} {
  const cards = deck.items.filter(item => item.kind === 'card').length;
  const reference = deck.items.length - cards;
  return { cards, reference, total: deck.items.length };
}
