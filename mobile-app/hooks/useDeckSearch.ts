import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StudentDeck,
  StudyDeckSearchMatch,
  StudyDeckSearchMatchDetail,
  StudyDeckSearchResult,
} from '../types/shared';
import apiService from '../services/api';
import {
  collectSearchFields,
  mergeSearchMatches,
  narrowSearchResultForQuery,
} from '../utils/studySearch';

type SearchSnapshot = {
  query: string;
  result: StudyDeckSearchResult;
};

// Deck search for the Study tab: debounced server search with a client-side
// fallback that scans full deck payloads, plus snapshot narrowing so further
// typing filters the last result locally instead of re-querying.
export function useDeckSearch(decks: StudentDeck[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSnapshot, setSearchSnapshot] = useState<SearchSnapshot | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const cardSearchTextCache = useRef<Record<string, Array<{ itemName: string; fields: StudyDeckSearchMatchDetail[] }>>>({});
  const searchRequestSeq = useRef(0);

  // Cleared by the deck reload so a refresh re-fetches card payloads.
  const invalidateCardSearchCache = useCallback(() => {
    cardSearchTextCache.current = {};
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleSearchResult = useMemo(() => {
    if (!normalizedSearch || !searchSnapshot) return null;

    const snapshotQuery = searchSnapshot.query.trim().toLowerCase();
    if (snapshotQuery === normalizedSearch) {
      return searchSnapshot.result;
    }

    const canReuseSnapshot =
      snapshotQuery.length > 0 &&
      (normalizedSearch.startsWith(snapshotQuery) || snapshotQuery.startsWith(normalizedSearch));
    if (!canReuseSnapshot) return null;

    return normalizedSearch.startsWith(snapshotQuery)
      ? narrowSearchResultForQuery(searchSnapshot.result, decks, normalizedSearch)
      : searchSnapshot.result;
  }, [decks, normalizedSearch, searchSnapshot]);
  const searchMatchDeckIdSet = useMemo(
    () => new Set(visibleSearchResult?.deckIds ?? []),
    [visibleSearchResult],
  );
  const filteredDecks = useMemo(() => {
    if (!normalizedSearch) return decks;
    return decks.filter(
      deck =>
        deck.title.toLowerCase().includes(normalizedSearch) ||
        searchMatchDeckIdSet.has(deck.id),
    );
  }, [decks, normalizedSearch, searchMatchDeckIdSet]);
  const isSearchingDecks = normalizedSearch.length > 0;

  const searchCardsFromDeckPayloads = useCallback(
    async (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return { deckIds: [], matchesByDeckId: {} };

      const matches = await Promise.all(
        decks.map(async deck => {
          let cards = cardSearchTextCache.current[deck.id];
          if (cards == null) {
            const studyData = await apiService.getDeckForStudy(deck.id, 'full');
            cards = studyData.cards
              .map(cardData => {
                const itemName = cardData.card.restaurantData?.itemName;
                if (!itemName) return null;
                return {
                  itemName,
                  fields: collectSearchFields(cardData.card.restaurantData),
                };
              })
              .filter((item): item is { itemName: string; fields: StudyDeckSearchMatchDetail[] } => item != null);
            cardSearchTextCache.current[deck.id] = cards;
          }
          const cardMatches = cards
            .map(card => {
              const details = card.fields.filter(field =>
                field.value.toLowerCase().includes(q),
              );
              return details.length > 0 ? { itemName: card.itemName, details } : null;
            })
            .filter((item): item is StudyDeckSearchMatch => item != null);
          return cardMatches.length > 0 ? [deck.id, mergeSearchMatches(cardMatches)] as const : null;
        }),
      );

      const filteredMatches = matches.filter((item): item is readonly [string, StudyDeckSearchMatch[]] => item != null);
      return {
        deckIds: filteredMatches.map(([deckId]) => deckId),
        matchesByDeckId: Object.fromEntries(
          filteredMatches.map(([deckId, deckMatches]) => [deckId, deckMatches]),
        ),
      };
    },
    [decks],
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      searchRequestSeq.current += 1;
      setSearchSnapshot(null);
      setIsSearchLoading(false);
      return;
    }

    const requestSeq = searchRequestSeq.current + 1;
    searchRequestSeq.current = requestSeq;
    let cancelled = false;
    setIsSearchLoading(true);

    const timer = setTimeout(() => {
      apiService.searchStudyDecks(q)
        .then(result => {
          if (!cancelled && searchRequestSeq.current === requestSeq) {
            setSearchSnapshot({ query: q, result });
          }
        })
        .catch(async error => {
          console.warn('Failed to search study decks:', error);
          try {
            const result = await searchCardsFromDeckPayloads(q);
            if (!cancelled && searchRequestSeq.current === requestSeq) {
              setSearchSnapshot({ query: q, result });
            }
          } catch (fallbackError) {
            console.warn('Failed to search study deck cards:', fallbackError);
            if (!cancelled && searchRequestSeq.current === requestSeq) {
              setSearchSnapshot({ query: q, result: { deckIds: [], matchesByDeckId: {} } });
            }
          }
        })
        .finally(() => {
          if (!cancelled && searchRequestSeq.current === requestSeq) {
            setIsSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchCardsFromDeckPayloads]);

  return {
    searchQuery,
    setSearchQuery,
    isSearchLoading,
    isSearchingDecks,
    normalizedSearch,
    visibleSearchResult,
    filteredDecks,
    invalidateCardSearchCache,
  };
}
