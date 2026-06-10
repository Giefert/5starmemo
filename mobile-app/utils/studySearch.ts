import {
  StudentDeck,
  StudyDeckSearchMatch,
  StudyDeckSearchMatchDetail,
  StudyDeckSearchResult,
} from '../types/shared';

// Pure text helpers behind the Study tab's deck search: turning card payloads
// into searchable field lists, merging per-card matches, and narrowing a
// server search snapshot as the user keeps typing.

function splitSearchFieldValues(value: string) {
  return value
    .split(/,|\n/)
    .map(part => part.replace(/[*_`]/g, '').trim())
    .filter(Boolean);
}

export function collectSearchFields(value: unknown, field = ''): StudyDeckSearchMatchDetail[] {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return field
      ? splitSearchFieldValues(String(value)).map(searchValue => ({
        field,
        value: searchValue,
      }))
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => collectSearchFields(item, field));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
      collectSearchFields(nestedValue, key),
    );
  }
  return [];
}

export function mergeSearchMatches(matches: StudyDeckSearchMatch[]): StudyDeckSearchMatch[] {
  const merged = new Map<string, StudyDeckSearchMatch>();

  for (const match of matches) {
    const existing = merged.get(match.itemName) ?? { itemName: match.itemName, details: [] };
    for (const detail of match.details) {
      const exists = existing.details.some(
        existingDetail => existingDetail.field === detail.field && existingDetail.value === detail.value,
      );
      if (!exists) {
        existing.details.push(detail);
      }
    }
    merged.set(match.itemName, existing);
  }

  return [...merged.values()];
}

function valueIncludesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function narrowSearchResultForQuery(
  result: StudyDeckSearchResult,
  decks: StudentDeck[],
  query: string,
): StudyDeckSearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return result;

  const decksById = new Map(decks.map(deck => [deck.id, deck]));
  const deckIds: string[] = [];
  const matchesByDeckId: StudyDeckSearchResult['matchesByDeckId'] = {};

  for (const deckId of result.deckIds) {
    const deck = decksById.get(deckId);
    const deckTitleMatches = deck ? valueIncludesQuery(deck.title, q) : false;
    const matches = mergeSearchMatches(result.matchesByDeckId[deckId] ?? [])
      .map(match => {
        const itemNameMatches = valueIncludesQuery(match.itemName, q);
        const details = match.details.filter(detail => valueIncludesQuery(detail.value, q));
        return itemNameMatches || details.length > 0
          ? { itemName: match.itemName, details: itemNameMatches ? match.details : details }
          : null;
      })
      .filter((match): match is StudyDeckSearchMatch => match != null);

    if (deckTitleMatches || matches.length > 0) {
      deckIds.push(deckId);
      if (matches.length > 0) {
        matchesByDeckId[deckId] = matches;
      }
    }
  }

  return { deckIds, matchesByDeckId };
}

export function textContainsQuery(text: string, query: string) {
  const q = query.trim().toLowerCase();
  return q.length > 0 && text.toLowerCase().includes(q);
}

export function formatSearchFieldLabel(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}
