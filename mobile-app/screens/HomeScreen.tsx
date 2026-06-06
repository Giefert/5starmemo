import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import {
  StudentDeck,
  DeckType,
  GlossaryTermSummary,
  StudyDeckSearchMatch,
  StudyDeckSearchMatchDetail,
  StudyDeckSearchResult,
} from '../types/shared';
import apiService from '../services/api';
import { loadFavorites, saveFavorites } from '../utils/favorites';
import {
  CustomDeckDraft,
  CustomStudyDeck,
  customReferenceItemToTermSummary,
  getCustomDeckCounts,
  loadCustomDecks,
  makeCustomDeck,
  saveCustomDecks,
} from '../utils/customDecks';
import { StudySessionItem } from '../services/StudySessionManager';
import { StudyScreen } from './StudyScreen';
import { StudyCompletedScreen } from './StudyCompletedScreen';
import { BrowseScreen } from './BrowseScreen';
import { CustomDeckBuilder } from '../components/CustomDeckBuilder';

type ScreenState = 'home' | 'study' | 'completed' | 'browse';
type Mode = 'recommended' | 'full' | 'browse' | 'custom';
type SearchSnapshot = {
  query: string;
  result: StudyDeckSearchResult;
};

// Carte tokens — shared with BulletinScreen so the two tabs read as one app.
const COLORS = {
  bg: '#14120F',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  ink: '#14120F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  onDark: '#E8E3D6',
  onDarkMuted: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

const MODE_LABELS: Array<'Recommended' | 'Full' | 'Browse' | 'Custom'> = [
  'Recommended',
  'Full',
  'Browse',
  'Custom',
];

// MODE_VALUES lines up index-for-index with MODE_LABELS so the segmented
// toggle can be labelled without forking the existing `mode` state.
const MODE_VALUES = ['recommended', 'full', 'browse', 'custom'] as const;

// The Study tab's Index strip mirrors the Reference tab's: a "Decks" default
// (every category) followed by the deck categories the team sets in the
// dashboard. A deck's category is its deckType; labels and order match the
// dashboard's Pass. Empty categories are dropped so the strip never shows a
// bare tab.
const CATEGORY_ORDER: { type: DeckType; label: string }[] = [
  { type: 'food', label: 'Food' },
  { type: 'bar', label: 'Bar' },
  { type: 'other', label: 'Other' },
];

function splitSearchFieldValues(value: string) {
  return value
    .split(/,|\n/)
    .map(part => part.replace(/[*_`]/g, '').trim())
    .filter(Boolean);
}

function collectSearchFields(value: unknown, field = ''): StudyDeckSearchMatchDetail[] {
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

function mergeSearchMatches(matches: StudyDeckSearchMatch[]): StudyDeckSearchMatch[] {
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

function narrowSearchResultForQuery(
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

// How long a deck must be held to toggle Favorites. The grow animation ramps
// over this same window so the swell peaks exactly as the toggle fires.
const LONG_PRESS_MS = 600;

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [decks, setDecks] = useState<StudentDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [mode, setMode] = useState<Mode>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSnapshot, setSearchSnapshot] = useState<SearchSnapshot | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<StudentDeck | null>(null);
  const [selectedCustomStudy, setSelectedCustomStudy] = useState<{
    title: string;
    items: StudySessionItem[];
  } | null>(null);
  const [studyStats, setStudyStats] = useState<{
    studied: number;
    correct: number;
    total: number;
    isGraded?: boolean;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customDecks, setCustomDecks] = useState<CustomStudyDeck[]>([]);
  const [isBuildingCustomDeck, setIsBuildingCustomDeck] = useState(false);
  const [isStartingCustomDeck, setIsStartingCustomDeck] = useState(false);
  const { logout, restaurant } = useAuth();

  // Favorites — a personal, on-device pinning of decks to the top of the list.
  // Long-pressing a deck pops it in or out with a haptic + little scale swell;
  // the swell itself lives in each DeckRow (see below).
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Mode toggle underline — the amber bar slides beneath the active mode and
  // resizes to its label, matching the Reference tab's Index strip. `barX`/
  // `barW` drive the slide; `toggleLayouts` caches each label's measured x/
  // width, keyed by mode value, so the bar can be placed without a re-measure.
  const barX = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(0)).current;
  const toggleLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const cardSearchTextCache = useRef<Record<string, Array<{ itemName: string; fields: StudyDeckSearchMatchDetail[] }>>>({});
  const searchRequestSeq = useRef(0);

  const moveBar = useCallback(
    (value: Mode, animate: boolean) => {
      const l = toggleLayouts.current[value];
      if (!l) return;
      if (animate) {
        Animated.parallel([
          Animated.timing(barX, {
            toValue: l.x,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(barW, {
            toValue: l.width,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        barX.setValue(l.x);
        barW.setValue(l.width);
      }
    },
    [barX, barW],
  );

  useEffect(() => {
    moveBar(mode, true);
  }, [mode, moveBar]);

  // ── Index strip ─────────────────────────────────────────────
  // The category the deck list is narrowed to; `undefined` is the "Decks"
  // default that shows every category. Set by tapping the strip or swiping
  // the paper — twin of the Reference tab.
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // Category swipe — `dragX` tracks the in-progress horizontal drag and
  // `isSwiping` mounts the neighbouring category pages so they slide in
  // alongside the gesture instead of popping into place on release.
  const [isSwiping, setIsSwiping] = useState(false);
  const dragX = useRef(new Animated.Value(0)).current;

  // Index strip underline — its own amber bar, twin to the mode toggle's,
  // sliding beneath the active category tab and resizing to its label.
  const idxBarX = useRef(new Animated.Value(0)).current;
  const idxBarW = useRef(new Animated.Value(0)).current;
  const idxTabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  // Categories present in the current deck set, in the dashboard's fixed order;
  // empty ones are dropped. The cycle prepends the "Decks" default (undefined)
  // and the always-on "Favorites" tab ahead of the dashboard categories.
  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter(c => decks.some(d => d.deckType === c.type)),
    [decks],
  );
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

  const cycle = useMemo<(string | undefined)[]>(
    () => [undefined, 'Favorites', ...presentCategories.map(c => c.label)],
    [presentCategories],
  );
  const cycleIndex = useMemo(() => {
    const i = cycle.indexOf(selectedCategory);
    return i < 0 ? 0 : i;
  }, [cycle, selectedCategory]);

  // Drive the amber underline to a tab — placed without animation the first
  // time a tab reports its layout, animated thereafter on tap or swipe. Keyed
  // by label so the shared 'Decks' tab keeps its cached layout across changes.
  const moveIdxBar = useCallback(
    (index: number, animate: boolean) => {
      const l = idxTabLayouts.current[cycle[index] ?? 'Decks'];
      if (!l) return;
      if (animate) {
        Animated.parallel([
          Animated.timing(idxBarX, {
            toValue: l.x,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(idxBarW, {
            toValue: l.width,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        idxBarX.setValue(l.x);
        idxBarW.setValue(l.width);
      }
    },
    [idxBarX, idxBarW, cycle],
  );

  useEffect(() => {
    moveIdxBar(cycleIndex, true);
  }, [cycleIndex, moveIdxBar]);

  // Snap the drag to rest: dir +1 advances a category, -1 goes back, 0 returns
  // to the current page. A committed move applies the page swap only once the
  // slide has carried the target page to centre.
  const settleSwipe = useCallback(
    (dir: -1 | 0 | 1) => {
      const toValue = dir === 1 ? -width : dir === -1 ? width : 0;
      Animated.timing(dragX, {
        toValue,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (dir !== 0) {
          setSelectedCategory(cycle[(cycleIndex + dir + cycle.length) % cycle.length]);
        } else {
          dragX.setValue(0);
        }
        setIsSwiping(false);
      });
    },
    [dragX, width, cycle, cycleIndex],
  );

  const swipePan = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags so vertical scrolling and the
        // deck rows' long-press-to-favorite stay untouched.
        onMoveShouldSetPanResponder: (_e, g) =>
          cycle.length > 1 &&
          Math.abs(g.dx) > 14 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: () => {
          dragX.stopAnimation();
          setIsSwiping(true);
        },
        // Clamp to a single page so an over-drag can't reveal blank paper.
        onPanResponderMove: (_e, g) =>
          dragX.setValue(Math.max(-width, Math.min(width, g.dx))),
        // Keep the gesture once it is horizontal so a stray vertical nudge
        // can't hand it back to the list mid-swipe.
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_e, g) => {
          const pass = width * 0.26;
          if (g.dx <= -pass || (g.dx < -24 && g.vx <= -0.35)) settleSwipe(1);
          else if (g.dx >= pass || (g.dx > 24 && g.vx >= 0.35)) settleSwipe(-1);
          else settleSwipe(0);
        },
        onPanResponderTerminate: () => settleSwipe(0),
      }),
    [cycle.length, width, dragX, settleSwipe],
  );

  // After a committed swipe the new category renders while `dragX` still holds
  // the slide's end value; reset it before paint so the page that just slid
  // into centre stays put instead of jumping back.
  useLayoutEffect(() => {
    dragX.setValue(0);
  }, [selectedCategory, dragX]);

  useEffect(() => {
    loadData();
  }, []);

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

  useEffect(() => {
    if (normalizedSearch && visibleSearchResult && mode !== 'browse' && mode !== 'custom') {
      setMode('browse');
    }
  }, [mode, normalizedSearch, visibleSearchResult]);

  // Hydrate favorites for the active restaurant.
  useEffect(() => {
    if (!restaurant?.id) return;
    loadFavorites(restaurant.id).then(setFavoriteIds);
  }, [restaurant?.id]);

  // Hydrate local-only custom decks for the active restaurant.
  useEffect(() => {
    if (!restaurant?.id) {
      setCustomDecks([]);
      return;
    }
    loadCustomDecks(restaurant.id).then(setCustomDecks);
  }, [restaurant?.id]);

  // The masthead is dark behind the status bar — keep its text light.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
    }, []),
  );

  // Hide the tab bar during study sessions. The visible bar is the custom
  // CarteTabBar in TabNavigator — `undefined` lets it render, `display: 'none'`
  // is the flag it reads to hide itself.
  useEffect(() => {
    const shouldHideTabs = screenState === 'study' || screenState === 'completed' || screenState === 'browse';
    navigation.setOptions({
      tabBarStyle: shouldHideTabs ? { display: 'none' } : undefined,
    });
  }, [screenState, navigation]);

  const loadData = async () => {
    try {
      if (!isRefreshing) setIsLoading(true);
      const decksData = await apiService.getAvailableDecks();
      setDecks(decksData);
      cardSearchTextCache.current = {};
    } catch (error) {
      // Handle authentication errors by logging out
      if (error instanceof Error && error.name === 'AuthenticationError') {
        logout();
        return; // Don't show alert, user will be redirected to login
      }
      
      // Provide network-specific error messages
      let alertTitle = 'Connection Error';
      let alertMessage = 'Failed to load study data. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'ECONNABORTED':
            alertTitle = 'Request Timeout';
            alertMessage = 'The server is taking too long to respond. Please check if the API server is running and try again.';
            break;
          case 'ECONNREFUSED':
            alertTitle = 'Connection Refused';
            alertMessage = 'Cannot reach the server. Please check your internet connection and try again.';
            break;
          case 'ENOTFOUND':
            alertTitle = 'Server Not Found';
            alertMessage = 'Cannot find the API server. Please check your network configuration.';
            break;
          default:
            alertMessage = `Network error (${error.code}): ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status) {
          alertTitle = 'Server Error';
          alertMessage = `Server returned error ${axiosError.response.status}. Please try again later.`;
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alertMessage = `Failed to load study data.\n\nError: ${errorMessage}`;
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Retry', onPress: () => loadData() },
          { text: 'Continue Offline', onPress: () => {
            // Set empty data for offline mode
            setDecks([]);
          }}
        ]
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleDeckTap = (deck: StudentDeck) => {
    if (isSearchingDecks || mode === 'browse') {
      handleBrowseDeck(deck);
    } else {
      handleStartStudy(deck);
    }
  };

  // Long-press toggles a deck in/out of Favorites with a haptic tap, then the
  // row jumps to (or out of) the pinned Favorites section. The relocated row is
  // a fresh DeckRow mount with its own scale at rest, so the swell never
  // carries over — no need to reset anything here.
  const toggleFavorite = (deck: StudentDeck) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavoriteIds(prev => {
      const next = prev.includes(deck.id)
        ? prev.filter(id => id !== deck.id)
        : [...prev, deck.id];
      if (restaurant?.id) saveFavorites(restaurant.id, next);
      return next;
    });
  };

  const handleSaveCustomDeck = async (draft: CustomDeckDraft) => {
    if (!restaurant?.id) return;

    const deck = makeCustomDeck(draft);
    const next = [deck, ...customDecks];
    setCustomDecks(next);
    setIsBuildingCustomDeck(false);
    await saveCustomDecks(restaurant.id, next);
  };

  const handleDeleteCustomDeck = (deck: CustomStudyDeck) => {
    if (!restaurant?.id) return;
    Alert.alert(
      'Delete Custom Deck',
      `Delete "${deck.title}" from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = customDecks.filter(existing => existing.id !== deck.id);
            setCustomDecks(next);
            await saveCustomDecks(restaurant.id!, next);
          },
        },
      ],
    );
  };

  const handleStartCustomDeck = async (deck: CustomStudyDeck) => {
    if (isStartingCustomDeck) return;

    try {
      setIsStartingCustomDeck(true);
      const cardIds = deck.items.flatMap(item => item.kind === 'card' ? [item.cardId] : []);
      const referenceItems = deck.items.flatMap(item => item.kind === 'reference' ? [item] : []);
      const hydratedCards = await apiService.getStudyCardsByIds(cardIds);
      const cardsById = new Map(hydratedCards.map(cardData => [cardData.card.id, cardData]));
      const hydratedTerms = await Promise.all(
        referenceItems.map(async item => {
          try {
            const term = await apiService.getGlossaryTerm(item.termId);
            const summary: GlossaryTermSummary = {
              id: term.id,
              term: term.term,
              definition: term.definition,
              section: term.section,
              categoryId: term.categoryId,
              categoryName: term.category?.name ?? item.categoryName,
              categoryColor: term.category?.color ?? item.categoryColor,
              linkedCardCount: term.linkedCardCount ?? term.linkedCards?.length ?? 0,
            };
            return [item.termId, summary] as const;
          } catch {
            if (!item.definition) return null;
            return [item.termId, customReferenceItemToTermSummary(item)] as const;
          }
        }),
      );
      const termsById = new Map(
        hydratedTerms.filter((entry): entry is NonNullable<typeof entry> => entry != null),
      );

      const items = deck.items
        .map<StudySessionItem | null>(item => {
          if (item.kind === 'reference') {
            const term = termsById.get(item.termId);
            return term ? {
              kind: 'reference',
              term,
            } : null;
          }

          const cardData = cardsById.get(item.cardId);
          return cardData ? { kind: 'card', cardData } : null;
        })
        .filter((item): item is StudySessionItem => item != null);

      if (items.length === 0) {
        Alert.alert('Custom Deck Unavailable', 'None of this deck\'s items are available right now.');
        return;
      }

      setSelectedDeck(null);
      setSelectedCustomStudy({ title: deck.title, items });
      setScreenState('study');
    } catch (error) {
      Alert.alert('Error', `Failed to load custom deck: ${error}`);
    } finally {
      setIsStartingCustomDeck(false);
    }
  };

  const handleStartStudy = (deck: StudentDeck) => {
    setSelectedCustomStudy(null);
    setSelectedDeck(deck);
    setScreenState('study');
  };

  const handleBrowseDeck = (deck: StudentDeck) => {
    setSelectedCustomStudy(null);
    setSelectedDeck(deck);
    setScreenState('browse');
  };

  const handleStudyComplete = (stats: {
    studied: number;
    correct: number;
    total: number;
    isGraded?: boolean;
  }) => {
    setStudyStats(stats);
    setScreenState('completed');
    if (stats.isGraded !== false) {
      loadData();
    }
  };

  const handleBackToHome = () => {
    setScreenState('home');
    setSelectedDeck(null);
    setSelectedCustomStudy(null);
    setStudyStats(null);
    // Refresh data when returning to home
    loadData();
  };

  // Render different screens based on state
  if (screenState === 'study' && selectedCustomStudy) {
    return (
      <StudyScreen
        target={{
          kind: 'custom',
          title: selectedCustomStudy.title,
          items: selectedCustomStudy.items,
        }}
        onComplete={handleStudyComplete}
        onExit={handleBackToHome}
      />
    );
  }

  if (screenState === 'study' && selectedDeck) {
    return (
      <StudyScreen
        target={{
          kind: 'deck',
          deckId: selectedDeck.id,
          deckTitle: selectedDeck.title,
          mode: mode === 'full' ? 'full' : 'recommended',
        }}
        onComplete={handleStudyComplete}
        onExit={handleBackToHome}
      />
    );
  }

  if (screenState === 'completed' && studyStats) {
    return (
      <StudyCompletedScreen
        stats={studyStats}
        deckTitle={selectedDeck?.title ?? selectedCustomStudy?.title}
        onContinue={handleBackToHome}
      />
    );
  }

  if (screenState === 'browse' && selectedDeck) {
    return (
      <BrowseScreen
        deckId={selectedDeck.id}
        deckTitle={selectedDeck.title}
        onExit={handleBackToHome}
        backLabel="Study"
        searchQuery={searchQuery}
        searchMatches={visibleSearchResult?.matchesByDeckId[selectedDeck.id] ?? []}
      />
    );
  }

  // On the "Decks" page pinned favorites float to the top; the rest fall into
  // the menu's category split (deckType, set by the team in the dashboard).
  // Each section keeps the server's alphabetical order, and a favorited deck
  // only appears under Favorites.
  const favSet = new Set(favoriteIds);
  const favoriteDecks = filteredDecks.filter(d => favSet.has(d.id));
  const rest = filteredDecks.filter(d => !favSet.has(d.id));
  const getSearchMatches = (deck: StudentDeck) =>
    visibleSearchResult?.matchesByDeckId[deck.id] ?? [];

  // A section is a Glossary-style header (large serif title + count) followed by
  // its rows. Rendered only when the section has decks — unless an `emptyText`
  // placeholder is given, in which case the header always shows with the
  // placeholder standing in for the rows (used by Favorites, which is always on).
  const renderSection = (
    title: string,
    sectionDecks: StudentDeck[],
    emptyText?: string,
  ) =>
    sectionDecks.length > 0 ? (
      <View key={title}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionGlyph}>{title}</Text>
          <Text style={styles.sectionCount}>{sectionDecks.length}</Text>
        </View>
        {sectionDecks.map((deck, i) => (
          <DeckRow
            key={deck.id}
            deck={deck}
            isFirstInGroup={i === 0}
            isFavorite={favSet.has(deck.id)}
            mode={mode}
            isSearching={isSearchingDecks}
            searchQuery={searchQuery}
            searchMatches={getSearchMatches(deck)}
            onTap={handleDeckTap}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </View>
    ) : emptyText ? (
      <View key={title}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionGlyph}>{title}</Text>
        </View>
        <Text style={styles.sectionPlaceholder}>{emptyText}</Text>
      </View>
    ) : null;

  const renderSearchEmpty = () => (
    <View style={styles.stateBlock}>
      <Text style={styles.emptyTitle}>No deck matches.</Text>
      <Text style={styles.emptyBody}>Try a different search.</Text>
    </View>
  );

  const renderSearchLoading = () => (
    <View style={styles.stateBlock}>
      <ActivityIndicator color={COLORS.inkMute} />
    </View>
  );

  const renderCustomContent = () => {
    if (isBuildingCustomDeck) {
      return (
        <View style={styles.body}>
          <CustomDeckBuilder
            onCancel={() => setIsBuildingCustomDeck(false)}
            onSave={handleSaveCustomDeck}
          />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.customContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setIsBuildingCustomDeck(true)}
          style={({ pressed }) => [styles.createCustomButton, pressed && styles.rowPressed]}
        >
          <Text style={styles.createCustomLabel}>CREATE DECK</Text>
        </Pressable>

        {isStartingCustomDeck && (
          <View style={styles.customLoading}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        )}

        {customDecks.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.emptyTitle}>No custom decks yet.</Text>
            <Text style={styles.emptyBody}>
              Build one from cards, reference terms, or both.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionGlyph}>Custom</Text>
              <Text style={styles.sectionCount}>{customDecks.length}</Text>
            </View>
            {customDecks.map((deck, i) => (
              <CustomDeckRow
                key={deck.id}
                deck={deck}
                isFirstInGroup={i === 0}
                disabled={isStartingCustomDeck}
                onTap={handleStartCustomDeck}
                onDelete={handleDeleteCustomDeck}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // The "Decks" page pins Favorites on top, then lays out each category as a
  // chapter — the full menu. A category page (incl. Favorites) is a flat list
  // of just that category's decks; the strip's amber underline names it, so it
  // gets no chapter header, and favorites show their star in place.
  const renderPageContent = (category: string | undefined) => {
    if (isSearchingDecks && filteredDecks.length === 0) {
      return isSearchLoading ? renderSearchLoading() : renderSearchEmpty();
    }

    if (category === undefined) {
      return (
        <>
          {renderSection(
            'Favorites',
            favoriteDecks,
            isSearchingDecks ? undefined : 'Hold a study deck to add it to favorites.',
          )}
          {presentCategories.map(c =>
            renderSection(c.label, rest.filter(d => d.deckType === c.type)),
          )}
        </>
      );
    }
    if (category === 'Favorites') {
      if (favoriteDecks.length === 0) {
        if (isSearchingDecks && isSearchLoading) return renderSearchLoading();
        return (
          <Text style={styles.sectionPlaceholder}>
            {isSearchingDecks
              ? 'No favorite decks match that search.'
              : 'Hold a study deck to add it to favorites.'}
          </Text>
        );
      }
      return favoriteDecks.map((deck, i) => (
        <DeckRow
          key={deck.id}
          deck={deck}
          isFirstInGroup={i === 0}
          isFavorite
          mode={mode}
          isSearching={isSearchingDecks}
          searchQuery={searchQuery}
          searchMatches={getSearchMatches(deck)}
          onTap={handleDeckTap}
          onToggleFavorite={toggleFavorite}
        />
      ));
    }
    const cat = CATEGORY_ORDER.find(c => c.label === category);
    const catDecks = cat ? filteredDecks.filter(d => d.deckType === cat.type) : [];
    if (isSearchingDecks && catDecks.length === 0) {
      return isSearchLoading ? renderSearchLoading() : renderSearchEmpty();
    }
    return catDecks.map((deck, i) => (
      <DeckRow
        key={deck.id}
        deck={deck}
        isFirstInGroup={i === 0}
        isFavorite={favSet.has(deck.id)}
        mode={mode}
        isSearching={isSearchingDecks}
        searchQuery={searchQuery}
        searchMatches={getSearchMatches(deck)}
        onTap={handleDeckTap}
        onToggleFavorite={toggleFavorite}
      />
    ));
  };

  // One swipe page. The centre page wires up pull-to-refresh; neighbour pages
  // are transient and only there to slide in alongside the gesture.
  const renderPage = (category: string | undefined, current: boolean) => (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        current ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.inkMute}
          />
        ) : undefined
      }
    >
      {renderPageContent(category)}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dark masthead — shared title block + segmented toggle */}
      <View style={[styles.masthead, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.eyebrow}>{restaurant?.name ?? ''}</Text>
        <Text style={styles.mastheadTitle}>Study.</Text>

        <View style={styles.toggleBar}>
          <View style={styles.toggleRow}>
            {MODE_LABELS.map((label, i) => {
              const value = MODE_VALUES[i];
              const active = mode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  onLayout={e => {
                    const { x, width: w } = e.nativeEvent.layout;
                    toggleLayouts.current[value] = { x, width: w };
                    if (value === mode) moveBar(value, false);
                  }}
                  hitSlop={8}
                  style={styles.toggleItem}
                >
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <Animated.View
              pointerEvents="none"
              style={[styles.toggleBarUnderline, { width: barW, transform: [{ translateX: barX }] }]}
            />
          </View>
        </View>
      </View>

      {/* Paper body */}
      {isLoading && decks.length === 0 ? (
        <View style={styles.body}>
          <View style={styles.stateBlock}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        </View>
      ) : mode === 'custom' ? (
        renderCustomContent()
      ) : decks.length === 0 ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.inkMute}
            />
          }
        >
          <View style={styles.stateBlock}>
            <Text style={styles.emptyTitle}>Nothing on the shelf yet.</Text>
            <Text style={styles.emptyBody}>
              Decks the team publishes will show up here.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Index strip — tap a category to narrow the list; the amber bar
              slides beneath the active tab. The full-width ink rule along the
              base divides the strip from the list. */}
          {cycle.length > 1 && (
            <View style={styles.indexStrip}>
              <View style={styles.indexRule} pointerEvents="none" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
                keyboardShouldPersistTaps="handled"
              >
                {cycle.map((cat, i) => {
                  const label = cat ?? 'Decks';
                  const active = i === cycleIndex;
                  return (
                    <React.Fragment key={label}>
                      {i > 0 && <Text style={styles.tabDot}>·</Text>}
                      <Pressable
                        onPress={() => setSelectedCategory(cat)}
                        onLayout={e => {
                          const { x, width: w } = e.nativeEvent.layout;
                          idxTabLayouts.current[label] = { x, width: w };
                          if (i === cycleIndex) moveIdxBar(i, false);
                        }}
                        hitSlop={8}
                        style={styles.tab}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Show ${label}`}
                      >
                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    </React.Fragment>
                  );
                })}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.tabBar, { width: idxBarW, transform: [{ translateX: idxBarX }] }]}
                />
              </ScrollView>
            </View>
          )}

          {/* The list — swipes drag the neighbouring category page in. */}
          <View style={styles.listArea} {...swipePan.panHandlers}>
            {isSwiping && (
              <Animated.View
                key="swipe-prev"
                pointerEvents="none"
                style={[styles.swipePage, { left: -width, transform: [{ translateX: dragX }] }]}
              >
                {renderPage(cycle[(cycleIndex - 1 + cycle.length) % cycle.length], false)}
              </Animated.View>
            )}

            <Animated.View
              key="swipe-cur"
              style={[styles.swipePage, { transform: [{ translateX: dragX }] }]}
            >
              {renderPage(selectedCategory, true)}
            </Animated.View>

            {isSwiping && (
              <Animated.View
                key="swipe-next"
                pointerEvents="none"
                style={[styles.swipePage, { left: width, transform: [{ translateX: dragX }] }]}
              >
                {renderPage(cycle[(cycleIndex + 1) % cycle.length], false)}
              </Animated.View>
            )}
          </View>
        </>
      )}

      {mode !== 'custom' && (
        <View style={styles.searchRow}>
          <Svg width={15} height={15} viewBox="0 0 15 15">
            <Circle cx={6.3} cy={6.3} r={4.6} stroke={COLORS.inkFaint} strokeWidth={1.4} fill="none" />
            <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={COLORS.inkFaint} strokeWidth={1.4} strokeLinecap="round" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search study decks…"
            placeholderTextColor={COLORS.inkFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Text style={styles.searchClear}>CLEAR</Text>
            </Pressable>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// One deck row. Each row owns its scale `Animated.Value`, created fresh on
// mount — so when a favorite toggle reorders the list and remounts this row
// under a new section, it starts at rest. Sharing one value across remounts
// (e.g. a parent-held map) leaves the native transform clinging to the old
// node and the row stuck at the grown size, so we deliberately don't.
//
// Holding grows the row steadily over the long-press window (feedback that
// something's coming); `onLongPress` then commits the favorite toggle. Released
// early, the swell springs back. `isFirstInGroup` drops the top divider so each
// section's first row sits flush under its header.
function DeckRow({
  deck,
  isFirstInGroup,
  isFavorite,
  mode,
  isSearching,
  searchQuery,
  searchMatches,
  onTap,
  onToggleFavorite,
}: {
  deck: StudentDeck;
  isFirstInGroup: boolean;
  isFavorite: boolean;
  mode: Mode;
  isSearching: boolean;
  searchQuery: string;
  searchMatches: StudyDeckSearchMatch[];
  onTap: (deck: StudentDeck) => void;
  onToggleFavorite: (deck: StudentDeck) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const grow = () =>
    Animated.timing(scale, {
      toValue: 1.08,
      duration: LONG_PRESS_MS,
      useNativeDriver: true,
    }).start();
  const settle = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => onTap(deck)}
        onPressIn={grow}
        onPressOut={settle}
        onLongPress={() => onToggleFavorite(deck)}
        delayLongPress={LONG_PRESS_MS}
        style={({ pressed }) => [
          styles.row,
          !isFirstInGroup && styles.rowDivider,
          pressed && styles.rowPressed,
        ]}
      >
        {isFavorite && (
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            style={styles.favoriteStar}
            accessibilityLabel="Favorite"
          >
            <Path
              d="M12 1.5 l3.09 6.91 7.41.57 -5.71 4.83 1.85 7.19 -6.64-4.13 -6.64 4.13 1.85-7.19 -5.71-4.83 7.41-.57 z"
              fill={COLORS.amber}
            />
          </Svg>
        )}

        <Text style={[styles.deckTitle, isFavorite && styles.deckTitleFavorite]}>
          {deck.title}
        </Text>

        {isSearching ? (
          <SearchMatchList matches={searchMatches} query={searchQuery} />
        ) : !!deck.description ? (
          <Text style={styles.deckDescription} numberOfLines={2}>
            {deck.description}
          </Text>
        ) : null}

        {!isSearching && (
          <DeckStats
            key={`${deck.masteredCards}-${deck.learningCards}-${deck.weakCards}-${deck.cardCount}`}
            deck={deck}
            mode={mode}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

function SearchMatchList({ matches, query }: { matches: StudyDeckSearchMatch[]; query: string }) {
  const visibleMatches = mergeSearchMatches(matches).filter(match => match.itemName);
  if (visibleMatches.length === 0) return null;

  return (
    <View style={styles.searchMatchList}>
      {visibleMatches.map((match, index) => {
        const titleMatches = textContainsQuery(match.itemName, query);
        const detailLines = titleMatches ? [] : match.details;

        return (
          <View key={`${match.itemName}-${index}`} style={styles.searchMatchItem}>
            <Svg
              width={13}
              height={13}
              viewBox="0 0 15 15"
              style={styles.searchMatchIcon}
            >
              <Circle cx={6.3} cy={6.3} r={4.6} stroke={COLORS.amber} strokeWidth={1.4} fill="none" />
              <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={COLORS.amber} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <View style={styles.searchMatchCopy}>
              <HighlightedMatchText text={match.itemName} query={query} />
              {detailLines.map((detail, detailIndex) => (
                <HighlightedMatchDetail
                  key={`${detail.field}-${detail.value}-${detailIndex}`}
                  detail={detail}
                  query={query}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function textContainsQuery(text: string, query: string) {
  const q = query.trim().toLowerCase();
  return q.length > 0 && text.toLowerCase().includes(q);
}

function formatSearchFieldLabel(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function HighlightedMatchDetail({
  detail,
  query,
}: {
  detail: StudyDeckSearchMatchDetail;
  query: string;
}) {
  return (
    <HighlightedMatchText
      text={`${detail.value} (${formatSearchFieldLabel(detail.field)})`}
      query={query}
      variant="detail"
    />
  );
}

function HighlightedMatchText({
  text,
  query,
  variant = 'title',
}: {
  text: string;
  query: string;
  variant?: 'title' | 'detail';
}) {
  const textStyle = [
    styles.searchMatchText,
    variant === 'detail' ? styles.searchMatchDetailText : undefined,
  ];
  const q = query.trim().toLowerCase();
  if (!q) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    const index = lower.indexOf(q, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), isMatch: false });
    }
    parts.push({ text: text.slice(index, index + q.length), isMatch: true });
    cursor = index + q.length;
  }

  return (
    <Text style={textStyle}>
      {parts.map((part, index) => (
        <Text
          key={`${part.text}-${index}`}
          style={part.isMatch ? styles.searchMatchTextAmber : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function CustomDeckRow({
  deck,
  isFirstInGroup,
  disabled,
  onTap,
  onDelete,
}: {
  deck: CustomStudyDeck;
  isFirstInGroup: boolean;
  disabled: boolean;
  onTap: (deck: CustomStudyDeck) => void;
  onDelete: (deck: CustomStudyDeck) => void;
}) {
  const counts = getCustomDeckCounts(deck);
  const detail =
    counts.cards > 0 && counts.reference > 0
      ? `${counts.cards} cards / ${counts.reference} reference`
      : counts.cards > 0
      ? `${counts.cards} cards`
      : `${counts.reference} reference`;

  return (
    <Pressable
      onPress={() => onTap(deck)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        !isFirstInGroup && styles.rowDivider,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <Text style={styles.deckTitle}>{deck.title}</Text>
      <Text style={styles.deckDescription} numberOfLines={2}>
        {detail}
      </Text>
      <View style={styles.customRowFooter}>
        <Text style={styles.customRowMeta}>
          Local only / not logged
        </Text>
        <Pressable
          onPress={event => {
            event.stopPropagation();
            onDelete(deck);
          }}
          hitSlop={10}
        >
          <Text style={styles.customDelete}>DELETE</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// The stats line shows three mastery counts in `recommended` and a single
// card count in `full`/`browse`. Switching modes plays a left-anchored reveal:
// the line's right edge slides between the long form's "Weak" tip and the
// short form's "Cards" tip, while the two forms crossfade. Both forms are
// stacked left-aligned inside a clip whose width animates between their two
// natural widths — so the right edge is the only thing that travels.
//
// Those two widths (and the line height for the absolutely-stacked forms) have
// to be measured first; until then we render the active form at natural size,
// with an invisible pass laying out both forms to capture their dimensions.
// The row is keyed on its counts upstream, so a study session that changes a
// figure remounts this and re-measures.
function DeckStats({ deck, mode }: { deck: StudentDeck; mode: Mode }) {
  const fullyMastered = deck.weakCards === 0 && deck.learningCards === 0;
  const [dims, setDims] = useState<{
    recW: number;
    compactW: number;
    h: number;
  } | null>(null);
  const width = useRef(new Animated.Value(0)).current;
  // 1 = recommended form fully shown, 0 = compact form fully shown.
  const recShown = useRef(
    new Animated.Value(mode === 'recommended' ? 1 : 0),
  ).current;
  const measured = useRef<{ recW?: number; compactW?: number; h?: number }>({});

  const renderRec = () => (
    <>
      <Stat label="Mastered" value={deck.masteredCards} />
      <Stat label="Learning" value={deck.learningCards} />
      <Stat label="Weak" value={deck.weakCards} weak />
    </>
  );
  const renderCompact = () => <Stat label="Cards" value={deck.cardCount} />;

  const finishMeasure = () => {
    const m = measured.current;
    if (m.recW == null || m.compactW == null || m.h == null) return;
    // Seat the clip at its resting width before the clipped layer first paints.
    width.setValue(mode === 'recommended' ? m.recW : m.compactW);
    setDims({ recW: m.recW, compactW: m.compactW, h: m.h });
  };

  // Slide the right edge to the new form's tip and crossfade the figures.
  useEffect(() => {
    if (!dims) return;
    const isRec = mode === 'recommended';
    Animated.parallel([
      Animated.timing(width, {
        toValue: isRec ? dims.recW : dims.compactW,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(recShown, {
        toValue: isRec ? 1 : 0,
        // Hold the old form while the edge starts moving, then crossfade in the
        // back half of the slide so the swap reads as "becomes its new form at
        // the tip" rather than ghosting both at the fixed left edge.
        delay: 110,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [mode, dims, width, recShown]);

  const compactShown = recShown.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.statsRow}>
      {dims ? (
        <Animated.View style={[styles.statsClip, { width, height: dims.h }]}>
          <Animated.View
            style={[styles.statGroup, styles.statsForm, { opacity: recShown }]}
          >
            {renderRec()}
          </Animated.View>
          <Animated.View
            style={[styles.statGroup, styles.statsForm, { opacity: compactShown }]}
          >
            {renderCompact()}
          </Animated.View>
        </Animated.View>
      ) : (
        <View>
          <View style={styles.statGroup}>
            {mode === 'recommended' ? renderRec() : renderCompact()}
          </View>
          <View style={styles.statsMeasure} pointerEvents="none">
            <View
              style={styles.statGroup}
              onLayout={e => {
                measured.current.recW = e.nativeEvent.layout.width;
                measured.current.h = e.nativeEvent.layout.height;
                finishMeasure();
              }}
            >
              {renderRec()}
            </View>
            <View
              style={styles.statGroup}
              onLayout={e => {
                measured.current.compactW = e.nativeEvent.layout.width;
                finishMeasure();
              }}
            >
              {renderCompact()}
            </View>
          </View>
        </View>
      )}
      {fullyMastered && <Text style={styles.allMastered}>All mastered</Text>}
    </View>
  );
}

// When the `weak` count is non-zero, both its figure and label ring red —
// the "needs attention" signal. Any count of 0 drops the figure to inkMute
// so the row reads quiet; every non-red label sits faint (inkFaint).
function Stat({
  label,
  value,
  weak,
}: {
  label: string;
  value: number;
  weak?: boolean;
}) {
  const isRed = !!weak && value > 0;
  const isZero = value === 0;
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statFigure,
          isZero && styles.statFigureMuted,
          isRed && styles.statFigureRed,
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, isRed && styles.statLabelRed]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },

  // ── Masthead ───────────────────────────────────────────────
  masthead: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 26,
  },
  eyebrow: {
    color: COLORS.amber,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  mastheadTitle: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 44,
    color: COLORS.onDark,
    letterSpacing: -1.1,
    lineHeight: 44,
  },

  toggleBar: {
    marginTop: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
  },
  // Inner row with no padding so the bar's translateX shares the labels'
  // coordinate origin — mirrors the Reference tab's Index strip.
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  toggleItem: {
    marginRight: 22,
    alignItems: 'center',
  },
  toggleLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: COLORS.onDarkMuted,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingBottom: 11,
  },
  toggleLabelActive: { color: COLORS.paper },
  // Slides + resizes under the active mode, flush with the hairline.
  toggleBarUnderline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 1.5,
    backgroundColor: COLORS.amber,
  },

  // ── Body ───────────────────────────────────────────────────
  body: { flex: 1, backgroundColor: COLORS.paper },
  bodyContent: { paddingBottom: 32 },
  customContent: {
    paddingBottom: 32,
  },
  createCustomButton: {
    marginHorizontal: 24,
    marginTop: 22,
    marginBottom: 4,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.ink,
    alignItems: 'center',
  },
  createCustomLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: COLORS.ink,
  },
  customLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },

  // ── Search row ─────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    paddingHorizontal: 26,
    paddingTop: 14,
    paddingBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    padding: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.ink,
  },
  searchClear: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.inkFaint,
  },

  // ── Index strip ────────────────────────────────────────────
  // Twin of the Reference tab's Index strip — category tabs on paper with an
  // amber underline sliding beneath the active one, over a full-width ink rule.
  indexStrip: {
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.paper,
  },
  indexRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: COLORS.ink,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    paddingBottom: 12,
  },
  tabLabel: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 16,
    color: COLORS.inkMute,
  },
  tabLabelActive: {
    color: COLORS.ink,
  },
  tabDot: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 16,
    color: COLORS.inkFaint,
    marginHorizontal: 11,
    paddingBottom: 12,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    backgroundColor: COLORS.amber,
  },

  // ── List area ──────────────────────────────────────────────
  listArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // Each swipe page fills the list area; neighbours are offset one full width
  // to the side and slid in by the gesture's translateX.
  swipePage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
  },

  // ── Deck row ───────────────────────────────────────────────
  row: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    position: 'relative',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  rowPressed: { opacity: 0.6 },
  rowDisabled: { opacity: 0.45 },

  favoriteStar: {
    position: 'absolute',
    top: 20,
    right: 22,
  },

  // Section header — mirrors the Reference tab's Glossary letter headers
  // (large serif word + monospace count badge on the baseline).
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  sectionGlyph: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    color: COLORS.ink,
    marginRight: 10,
  },
  sectionCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  sectionPlaceholder: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.inkFaint,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 8,
  },

  deckTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: COLORS.ink,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  deckTitleFavorite: {
    paddingRight: 28, // leaves room for the star
  },

  deckDescription: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMute,
    marginTop: 8,
  },
  searchMatchList: {
    marginTop: 10,
    gap: 7,
  },
  searchMatchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchMatchIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  searchMatchCopy: {
    flex: 1,
  },
  searchMatchText: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMute,
  },
  searchMatchDetailText: {
    marginTop: 2,
    color: COLORS.inkFaint,
  },
  searchMatchTextAmber: {
    color: COLORS.amber,
  },
  customRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  customRowMeta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
  },
  customDelete: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.3,
    color: COLORS.red,
  },

  // ── Stats row ──────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  // Holds the mastery/card figures; the gap that used to sit on statsRow lives
  // here now so "All mastered" can still pin right of it.
  statGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 18,
  },
  // Window onto the stacked forms; its animated width is the sliding right edge.
  statsClip: { overflow: 'hidden' },
  // Both forms share the top-left origin so only the right edge ever moves.
  statsForm: { position: 'absolute', left: 0, top: 0 },
  // Off-paint layout pass used only to capture both forms' natural sizes.
  // alignItems flex-start is load-bearing: this column would otherwise stretch
  // both forms to the wider one's width, making the two measurements equal and
  // leaving the reveal with no width to animate.
  statsMeasure: { position: 'absolute', left: 0, top: 0, opacity: 0, alignItems: 'flex-start' },
  stat: { flexDirection: 'row', alignItems: 'baseline' },
  statFigure: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: COLORS.ink,
    letterSpacing: -0.18,
    marginRight: 6,
  },
  statFigureMuted: { color: COLORS.inkMute },
  statFigureRed: { color: COLORS.red },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: COLORS.inkFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  statLabelRed: { color: COLORS.red },

  allMastered: {
    fontFamily: 'Inter_700Bold',
    marginLeft: 'auto',
    fontSize: 9,
    color: COLORS.inkFaint,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Empty / loading states ─────────────────────────────────
  stateBlock: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 64,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMute,
  },
});
