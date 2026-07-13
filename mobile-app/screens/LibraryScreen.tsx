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
  SectionList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
  PanResponder,
  Animated,
  Easing,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import RenderHtml from 'react-native-render-html';
import * as Haptics from 'expo-haptics';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  DeckType,
  GlossaryCategory,
  GlossaryTermSummary,
  GlossaryTerm,
  GlossarySection,
  StudentDeck,
  StudyDeckSearchMatch,
} from '../types/shared';
import { stripHtml, cleanHtml, customHTMLElementModels } from '../utils/html';
import { loadFavorites, saveFavorites } from '../utils/favorites';
import { useDeckSearch } from '../hooks/useDeckSearch';
import { DeckRow } from '../components/DeckRow';
import { BrowseScreen } from './BrowseScreen';
import { describeLoadError } from '../utils/loadErrorMessages';

type ViewState = 'list' | 'detail';
type LibraryTab = 'browse' | GlossarySection;

// Carte tokens — shared verbatim with BulletinScreen / HomeScreen so the
// Library tab reads as a sibling of Study and Bulletin.
const COLORS = {
  ink: '#14120F',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  paperSoft: '#FBF7EC',
  paperHair: '#D8CFB8',
  paperHairLt: '#E6DFCB',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIBRARY_TABS: Array<{ key: LibraryTab; label: string }> = [
  { key: 'browse', label: 'Browse' },
  { key: 'glossary', label: 'Glossary' },
  { key: 'encyclopedia', label: 'Encyclopedia' },
];
const CATEGORY_ORDER: { type: DeckType; label: string }[] = [
  { type: 'food', label: 'Food' },
  { type: 'bar', label: 'Bar' },
  { type: 'other', label: 'Other' },
];

interface TermSection {
  key: string;
  title: string;
  count: number;
  data: GlossaryTermSummary[];
}

interface SectionData {
  categories: GlossaryCategory[];
  terms: GlossaryTermSummary[];
}

const byTerm = (a: GlossaryTermSummary, b: GlossaryTermSummary) =>
  a.term.localeCompare(b.term, undefined, { sensitivity: 'base' });

// First letter of a term, normalized to A–Z; anything else buckets under '#'.
function firstLetter(term: string): string {
  const c = (term.trim()[0] || '#').toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { restaurant, logout } = useAuth();

  // Data state — both sections are preloaded once and cached, so switching
  // sub-tabs or typing a search never triggers a refetch that would briefly
  // render stale data and visibly reshuffle the list.
  const [cache, setCache] = useState<Record<GlossarySection, SectionData | null>>({
    glossary: null,
    encyclopedia: null,
  });
  const [browseDecks, setBrowseDecks] = useState<StudentDeck[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [selectedBrowseDeck, setSelectedBrowseDeck] = useState<StudentDeck | null>(null);

  // Section state
  const [activeTab, setActiveTab] = useState<LibraryTab>('browse');
  const [activeSection, setActiveSection] = useState<GlossarySection>('glossary');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  // The category the list is narrowed to, in either section. `undefined`
  // shows every category. Set by the Index strip or by swiping the paper.
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // UI state
  const [viewState, setViewState] = useState<ViewState>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBrowseLoading, setIsBrowseLoading] = useState(true);
  const [isBrowseRefreshing, setIsBrowseRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [browseError, setBrowseError] = useState('');
  // Encyclopedia category swipe — `dragX` tracks the in-progress horizontal
  // drag; `isSwiping` mounts the neighbouring category pages so they slide
  // in alongside the gesture instead of popping into place on release.
  const [isSwiping, setIsSwiping] = useState(false);
  const dragX = useRef(new Animated.Value(0)).current;

  const listRef = useRef<SectionList<GlossaryTermSummary, TermSection>>(null);
  const lastJumpTarget = useRef<number | null>(null);
  const railHeight = useRef(0);

  // Index filter underline — the amber bar slides under the active category
  // tab and resizes to its label. `tabLayouts` caches each tab's measured
  // x/width so the bar can be placed without a re-measure. Keyed by label
  // (the tab's React key), not index: switching sections reuses the shared
  // 'Index' tab without re-firing its onLayout, so an index-keyed cache would
  // go stale and strand the bar. By label the cache survives the switch.
  const barX = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  // Sub-tab underline — the same amber bar treatment as the Index strip,
  // sliding beneath the active Library tab and resizing to its label.
  const subBarX = useRef(new Animated.Value(0)).current;
  const subBarW = useRef(new Animated.Value(0)).current;
  const subtabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const {
    searchQuery: browseSearchQuery,
    setSearchQuery: setBrowseSearchQuery,
    isSearchLoading: isBrowseSearchLoading,
    isSearchingDecks: isSearchingBrowseDecks,
    visibleSearchResult: browseVisibleSearchResult,
    filteredDecks: filteredBrowseDecks,
    invalidateCardSearchCache: invalidateBrowseCardSearchCache,
  } = useDeckSearch(browseDecks);

  // Preload both sections once when the screen mounts.
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The masthead is dark behind the status bar — keep its text light.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
    }, []),
  );

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selectedBrowseDeck ? { display: 'none' } : undefined,
    });
  }, [navigation, selectedBrowseDeck]);

  const loadData = useCallback(async () => {
    try {
      if (!isRefreshing) setIsLoading(true);

      const [glossaryCats, glossaryTerms, encyclopediaCats, encyclopediaTerms] =
        await Promise.all([
          apiService.getGlossaryCategories('glossary'),
          apiService.getGlossaryTerms({ section: 'glossary', limit: 100 }),
          apiService.getGlossaryCategories('encyclopedia'),
          apiService.getGlossaryTerms({ section: 'encyclopedia', limit: 100 }),
        ]);

      setCache({
        glossary: { categories: glossaryCats, terms: glossaryTerms.terms },
        encyclopedia: { categories: encyclopediaCats, terms: encyclopediaTerms.terms },
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load glossary');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loadBrowseDecks = useCallback(async (refreshing = false) => {
    try {
      if (!refreshing) setIsBrowseLoading(true);
      const decksData = await apiService.getAvailableDecks();
      setBrowseDecks(decksData);
      invalidateBrowseCardSearchCache();
      setBrowseError('');
    } catch (err) {
      if (err instanceof Error && err.name === 'AuthenticationError') {
        logout();
        return;
      }

      const { message } = describeLoadError(err);
      setBrowseError(message);
    } finally {
      setIsBrowseLoading(false);
      setIsBrowseRefreshing(false);
    }
  }, [invalidateBrowseCardSearchCache, logout]);

  useEffect(() => {
    loadBrowseDecks();
  }, [loadBrowseDecks]);

  const handleSectionChange = (newSection: GlossarySection) => {
    if (newSection === activeSection) return;
    setActiveSection(newSection);
    setSearchQuery('');
    setSelectedCategory(undefined);
  };

  const handleLibraryTabChange = (newTab: LibraryTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (newTab !== 'browse') {
      handleSectionChange(newTab);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleBrowseRefresh = useCallback(() => {
    setIsBrowseRefreshing(true);
    loadBrowseDecks(true);
  }, [loadBrowseDecks]);

  const handleTermPress = async (termId: string) => {
    setIsLoadingDetail(true);
    setViewState('detail');
    try {
      const term = await apiService.getGlossaryTerm(termId);
      setSelectedTerm(term);
    } catch (err: any) {
      setError(err.message || 'Failed to load term details');
      setViewState('list');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedTerm(null);
  };

  // ── Derived data ────────────────────────────────────────────
  const sectionData = cache[activeSection];
  const categories = sectionData?.categories ?? [];

  // Search runs client-side over the cached term list. The screen only ever
  // loads the first 100 terms per section, so there is nothing off-screen to
  // miss, and filtering in memory keeps tab and search changes instant.
  const terms = useMemo<GlossaryTermSummary[]>(() => {
    const all = sectionData?.terms ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      t =>
        t.term.toLowerCase().includes(q) ||
        stripHtml(t.definition).toLowerCase().includes(q),
    );
  }, [sectionData, searchQuery]);

  // ── Section assembly ────────────────────────────────────────
  // Build the page for a given category scope (`undefined` = every category).
  // Glossary scopes to a category then buckets A–Z; Encyclopedia lays the
  // scope out as category chapters in the server's order. Pulled out of the
  // `sections` memo so a swipe can prebuild the adjacent pages and drag
  // them in rather than rebuilding mid-gesture.
  const buildSections = useCallback(
    (category: string | undefined): TermSection[] => {
      const scoped = category
        ? terms.filter(t => (t.categoryName || 'Other') === category)
        : terms;

      if (activeSection === 'glossary') {
        const buckets = new Map<string, GlossaryTermSummary[]>();
        for (const t of scoped) {
          const key = firstLetter(t.term);
          const arr = buckets.get(key);
          if (arr) arr.push(t);
          else buckets.set(key, [t]);
        }
        return [...buckets.keys()]
          .sort()
          .map(key => {
            const data = buckets.get(key)!.slice().sort(byTerm);
            return { key, title: key, count: data.length, data };
          });
      }

      const buckets = new Map<string, GlossaryTermSummary[]>();
      for (const t of scoped) {
        const key = t.categoryName || 'Other';
        const arr = buckets.get(key);
        if (arr) arr.push(t);
        else buckets.set(key, [t]);
      }
      const ordered: TermSection[] = [];
      for (const cat of categories) {
        const data = buckets.get(cat.name);
        if (data) {
          ordered.push({
            key: cat.id,
            title: cat.name,
            count: data.length,
            data: data.slice().sort(byTerm),
          });
          buckets.delete(cat.name);
        }
      }
      // Anything not matched to a known category (incl. 'Other') trails.
      for (const [key, data] of buckets) {
        ordered.push({ key, title: key, count: data.length, data: data.slice().sort(byTerm) });
      }
      return ordered;
    },
    [terms, categories, activeSection],
  );

  const sections = useMemo<TermSection[]>(
    () => buildSections(selectedCategory),
    [buildSections, selectedCategory],
  );

  // Letters that actually have entries — drives the rail's full/dim state.
  const presentLetters = useMemo(() => {
    const set = new Set<string>();
    if (activeSection === 'glossary') {
      for (const s of sections) set.add(s.title);
    }
    return set;
  }, [sections, activeSection]);

  const scrollToSection = useCallback((sectionIndex: number) => {
    if (sectionIndex < 0 || sectionIndex >= sections.length) return;
    lastJumpTarget.current = sectionIndex;
    listRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated: true,
    });
  }, [sections.length]);

  // ── A–Z rail scrubbing ──────────────────────────────────────
  const jumpToTouch = useCallback((locationY: number) => {
    const h = railHeight.current || 1;
    const ratio = Math.min(Math.max(locationY / h, 0), 0.9999);
    const letter = ALPHABET[Math.floor(ratio * ALPHABET.length)];
    // First section at or after the scrubbed letter.
    let target = sections.findIndex(s => s.title >= letter);
    if (target === -1) target = sections.length - 1;
    scrollToSection(target);
  }, [sections, scrollToSection]);

  const railPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => jumpToTouch(e.nativeEvent.locationY),
        onPanResponderMove: e => jumpToTouch(e.nativeEvent.locationY),
      }),
    [jumpToTouch],
  );

  // ── Category swipe ──────────────────────────────────────────
  // Swiping the paper area left/right cycles through
  // [all entries → category 1 → … → category N] and wraps. The current
  // page and the page being swiped toward both translate with the finger.
  // Works in both sections; in the Glossary each page keeps its A–Z rail.
  const categoryNames = useMemo(() => categories.map(c => c.name), [categories]);
  const cycle = useMemo<(string | undefined)[]>(
    () => [undefined, ...categoryNames],
    [categoryNames],
  );
  const cycleIndex = useMemo(() => {
    const i = cycle.indexOf(selectedCategory);
    return i < 0 ? 0 : i;
  }, [cycle, selectedCategory]);

  // Slide the sub-tab underline to the active Library tab. Placed without
  // animation on first layout, animated thereafter — mirrors moveBar below.
  const moveSubBar = useCallback(
    (tab: LibraryTab, animate: boolean) => {
      const l = subtabLayouts.current[tab];
      if (!l) return;
      if (animate) {
        Animated.parallel([
          Animated.timing(subBarX, {
            toValue: l.x,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(subBarW, {
            toValue: l.width,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        subBarX.setValue(l.x);
        subBarW.setValue(l.width);
      }
    },
    [subBarX, subBarW],
  );

  useEffect(() => {
    moveSubBar(activeTab, true);
  }, [activeTab, moveSubBar]);

  // Drive the amber underline to a tab. Called without animation the first
  // time a tab reports its layout (so the bar lands in place), and animated
  // thereafter whenever the active filter changes — by tap or by swipe.
  const moveBar = useCallback(
    (index: number, animate: boolean) => {
      const l = tabLayouts.current[cycle[index] ?? 'Index'];
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
    [barX, barW, cycle],
  );

  useEffect(() => {
    moveBar(cycleIndex, true);
  }, [cycleIndex, moveBar]);

  // The two pages adjacent to the current one, kept ready so a swipe can
  // drag the incoming category in rather than rebuilding mid-gesture.
  const prevSections = useMemo(
    () => buildSections(cycle[(cycleIndex - 1 + cycle.length) % cycle.length]),
    [buildSections, cycle, cycleIndex],
  );
  const nextSections = useMemo(
    () => buildSections(cycle[(cycleIndex + 1) % cycle.length]),
    [buildSections, cycle, cycleIndex],
  );

  // Snap the drag to rest: dir +1 advances a category, -1 goes back, 0
  // returns to the current page. For a committed move the page swap is
  // applied only once the slide has carried the target page to centre.
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
        // Only claim clearly horizontal drags so vertical scrolling — and the
        // Glossary's vertical A–Z rail scrub — stay untouched.
        onMoveShouldSetPanResponder: (_e, g) =>
          categoryNames.length > 0 &&
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
    [categoryNames.length, width, dragX, settleSwipe],
  );

  // After a committed swipe the new category renders while `dragX` still
  // holds the slide's end value; reset it before paint so the page that
  // just slid into centre stays put instead of jumping back.
  useLayoutEffect(() => {
    dragX.setValue(0);
  }, [selectedCategory, activeSection, dragX]);

  // ── Renderers ───────────────────────────────────────────────
  // Glossary keeps its A–Z letter headers. The Encyclopedia draws a chapter
  // header — category name + entry count — only on the "all categories" page
  // (Index default); a page scoped to one category is named by the Index
  // strip's amber underline instead, so it gets no header. Bound to the
  // page's own category, not the centre page's, so a swipe shows the right
  // header as the neighbour slides in rather than popping it on settle.
  const makeRenderSectionHeader =
    (pageCategory: string | undefined) =>
    ({ section }: { section: TermSection }) => {
      if (activeSection === 'glossary') {
        return (
          <View style={styles.letterHeader}>
            <Text style={styles.letterGlyph}>{section.title}</Text>
            <Text style={styles.letterCount}>
              {section.count} {section.count === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        );
      }
      if (pageCategory) return null;
      return (
        <View style={styles.letterHeader}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {section.title}
          </Text>
          <Text style={styles.letterCount}>
            {section.count} {section.count === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      );
    };

  // Bound to a specific page's section list so the trailing divider is
  // suppressed against that page's own last row, not the centre page's.
  const makeRenderItem = (pageSections: TermSection[]) => ({
    item,
    index,
    section,
  }: {
    item: GlossaryTermSummary;
    index: number;
    section: TermSection;
  }) => {
    const isLastSection = section.key === pageSections[pageSections.length - 1]?.key;
    const isLastRow = index === section.data.length - 1;
    // The Glossary lists terms bare; only the Encyclopedia previews the entry.
    const definitionLines =
      activeSection === 'encyclopedia'
        ? stripHtml(item.definition).split('\n').filter(Boolean).slice(0, 2)
        : [];
    return (
      <Pressable
        onPress={() => handleTermPress(item.id)}
        style={({ pressed }) => [
          styles.termRow,
          !(isLastSection && isLastRow) && styles.termRowDivider,
          pressed && styles.termRowPressed,
        ]}
      >
        {activeSection === 'glossary' && !selectedCategory && !!item.categoryName && (
          <Text style={styles.termEyebrow}>{item.categoryName}</Text>
        )}
        <Text style={styles.termName}>{item.term}</Text>
        {definitionLines.length > 0 && (
          <View style={styles.termDefinition}>
            {definitionLines.map((line, i) => (
              <Text key={i} style={styles.termDefinitionLine} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  if (selectedBrowseDeck) {
    return (
      <BrowseScreen
        deckId={selectedBrowseDeck.id}
        deckTitle={selectedBrowseDeck.title}
        onExit={() => setSelectedBrowseDeck(null)}
        backLabel="Library"
        searchQuery={browseSearchQuery}
        searchMatches={browseVisibleSearchResult?.matchesByDeckId[selectedBrowseDeck.id] ?? []}
        onSearchQueryChange={setBrowseSearchQuery}
      />
    );
  }

  // ── Detail view ─────────────────────────────────────────────
  if (viewState === 'detail') {
    return (
      <View style={styles.screen}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={handleBackToList} hitSlop={12} style={styles.backRow}>
            <Svg width={9} height={14} viewBox="0 0 9 14">
              <Path
                d="M7 1L2 7l5 6"
                fill="none"
                stroke={COLORS.onDarkMute}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.backLink}>
              {activeSection === 'encyclopedia' ? 'Encyclopedia' : 'Glossary'}
            </Text>
          </Pressable>
        </View>

        {isLoadingDetail ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        ) : selectedTerm ? (
          <ScrollView
            style={styles.detailBody}
            contentContainerStyle={{ padding: 26, paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            {selectedTerm.category && (
              <Text style={styles.detailEyebrow}>{selectedTerm.category.name}</Text>
            )}
            <Text style={styles.detailTerm}>{selectedTerm.term}</Text>
            <View style={styles.detailRule} />

            <RenderHtml
              contentWidth={width - 52}
              source={{ html: cleanHtml(selectedTerm.definition) }}
              baseStyle={styles.detailDefinition}
              enableExperimentalMarginCollapsing={true}
              customHTMLElementModels={customHTMLElementModels}
              tagsStyles={{
                p: { marginVertical: 4 },
                ul: { marginVertical: 8, paddingLeft: 0 },
                li: { marginVertical: 0, paddingVertical: 2 },
                strong: { fontFamily: 'Inter_700Bold' },
                em: { fontStyle: 'italic' },
                u: { textDecorationLine: 'underline' },
                // Headings render in the display serif so the entry reads
                // editorial, not like a web page.
                h1: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, marginVertical: 8, lineHeight: 32, color: COLORS.ink },
                h2: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, marginVertical: 6, lineHeight: 28, color: COLORS.ink },
                h3: { fontFamily: 'Fraunces_500Medium', fontSize: 19, marginVertical: 4, lineHeight: 26, color: COLORS.ink },
              }}
              classesStyles={{
                'font-large': { fontSize: 19 },
                'font-larger': { fontSize: 23 },
                'font-largest': { fontSize: 30 },
              }}
              renderersProps={{
                ul: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
                ol: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
              }}
            />

            {selectedTerm.linkedCards && selectedTerm.linkedCards.length > 0 && (
              <View style={styles.linkedSection}>
                <Text style={styles.linkedEyebrow}>
                  Related cards · {selectedTerm.linkedCards.length}
                </Text>
                {selectedTerm.linkedCards.map(link => (
                  <View key={link.id} style={styles.linkedRow}>
                    <Text style={styles.linkedName}>
                      {link.card?.restaurantData?.itemName || 'Unknown Card'}
                    </Text>
                    {link.matchField && (
                      <Text style={styles.linkedMeta}>matched on {link.matchField}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  // ── List view ───────────────────────────────────────────────
  const placeholder =
    activeSection === 'encyclopedia' ? 'Search the encyclopedia…' : 'Search the glossary…';

  const renderListState = () => {
    if (error) {
      return (
        <View style={styles.stateBlock}>
          <Text style={styles.stateEyebrow}>Something went wrong</Text>
          <Text style={styles.stateLine}>{error}</Text>
          <Pressable onPress={loadData} hitSlop={8}>
            <Text style={styles.retryLink}>Tap to retry</Text>
          </Pressable>
        </View>
      );
    }
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={COLORS.inkMute} />
        </View>
      );
    }
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.stateEyebrow}>Nothing to show</Text>
        <Text style={styles.stateLine}>
          {searchQuery
            ? `No matches for “${searchQuery}”.`
            : activeSection === 'encyclopedia'
            ? 'The encyclopedia is empty for now — check back later.'
            : 'The glossary is empty for now — check back later.'}
        </Text>
      </View>
    );
  };

  // One swipe page. `current` wires the centre page to the list ref and the
  // pull-to-refresh / scroll-failure handlers; neighbour pages are transient
  // and only there to slide in alongside the gesture.
  const renderPage = (
    pageSections: TermSection[],
    current: boolean,
    pageCategory: string | undefined,
  ) => {
    if (pageSections.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
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
          {renderListState()}
        </ScrollView>
      );
    }
    return (
      <SectionList
        ref={current ? listRef : undefined}
        sections={pageSections}
        keyExtractor={item => item.id}
        renderItem={makeRenderItem(pageSections)}
        renderSectionHeader={makeRenderSectionHeader(pageCategory)}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        onScrollToIndexFailed={
          current
            ? () => {
                const target = lastJumpTarget.current;
                if (target == null) return;
                setTimeout(() => {
                  listRef.current?.scrollToLocation({
                    sectionIndex: target,
                    itemIndex: 0,
                    viewPosition: 0,
                    animated: true,
                  });
                }, 120);
              }
            : undefined
        }
        refreshControl={
          current ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.inkMute}
            />
          ) : undefined
        }
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dark masthead — sibling of the Bulletin masthead. */}
      <View style={[styles.titleBlock, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.titleEyebrow}>{restaurant?.name ?? ''}</Text>
        <Text style={styles.titleHeadline}>Library.</Text>
      </View>

      {/* Sub-tab strip — amber underline slides between Library modes. */}
      <View style={styles.subtabStrip}>
        <View style={styles.subtabRow}>
          {LIBRARY_TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleLibraryTabChange(tab.key)}
                onLayout={e => {
                  const { x, width: w } = e.nativeEvent.layout;
                  subtabLayouts.current[tab.key] = { x, width: w };
                  if (tab.key === activeTab) moveSubBar(tab.key, false);
                }}
                hitSlop={8}
                style={styles.subtab}
              >
                <Text style={[styles.subtabLabel, active && styles.subtabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
          <Animated.View
            pointerEvents="none"
            style={[styles.subtabBar, { width: subBarW, transform: [{ translateX: subBarX }] }]}
          />
        </View>
      </View>

      {activeTab === 'browse' ? (
        <LibraryBrowsePane
          decks={browseDecks}
          filteredDecks={filteredBrowseDecks}
          isLoading={isBrowseLoading}
          isRefreshing={isBrowseRefreshing}
          error={browseError}
          searchQuery={browseSearchQuery}
          isSearchLoading={isBrowseSearchLoading}
          isSearchingDecks={isSearchingBrowseDecks}
          visibleSearchResult={browseVisibleSearchResult}
          onSearchQueryChange={setBrowseSearchQuery}
          onRefresh={handleBrowseRefresh}
          onRetry={() => loadBrowseDecks()}
          onDeckPress={setSelectedBrowseDeck}
        />
      ) : (
        <>
          {/* Index filter strip — both sections. Tapping a category narrows the
              list; the amber underline slides beneath the active tab and resizes
              to its label. The full-width ink rule is the divider's old look,
              now anchored here instead of repeated down the list. */}
          {categoryNames.length > 0 && (
            <View style={styles.indexStrip}>
              {/* Static ink rule, behind the tabs, so the amber bar draws over it. */}
              <View style={styles.indexRule} pointerEvents="none" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
                keyboardShouldPersistTaps="handled"
              >
                {cycle.map((cat, i) => {
                  const label = cat ?? 'Index';
                  const active = i === cycleIndex;
                  return (
                    <React.Fragment key={label}>
                      {i > 0 && <Text style={styles.tabDot}>·</Text>}
                      <Pressable
                        onPress={() => setSelectedCategory(cat)}
                        onLayout={e => {
                          const { x, width: w } = e.nativeEvent.layout;
                          tabLayouts.current[label] = { x, width: w };
                          if (i === cycleIndex) moveBar(i, false);
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
                  style={[styles.tabBar, { width: barW, transform: [{ translateX: barX }] }]}
                />
              </ScrollView>
            </View>
          )}

          {/* The list — swipes drag the neighbouring category in */}
          <View style={styles.listArea} {...swipePan.panHandlers}>
            {isSwiping && (
              <Animated.View
                key="swipe-prev"
                pointerEvents="none"
                style={[styles.swipePage, { left: -width, transform: [{ translateX: dragX }] }]}
              >
                {renderPage(prevSections, false, cycle[(cycleIndex - 1 + cycle.length) % cycle.length])}
              </Animated.View>
            )}

            <Animated.View
              key="swipe-cur"
              style={[styles.swipePage, { transform: [{ translateX: dragX }] }]}
            >
              {renderPage(sections, true, selectedCategory)}
            </Animated.View>

            {isSwiping && (
              <Animated.View
                key="swipe-next"
                pointerEvents="none"
                style={[styles.swipePage, { left: width, transform: [{ translateX: dragX }] }]}
              >
                {renderPage(nextSections, false, cycle[(cycleIndex + 1) % cycle.length])}
              </Animated.View>
            )}

            {/* A–Z rail — Glossary only */}
            {activeSection === 'glossary' && sections.length > 0 && (
              <View
                style={styles.rail}
                onLayout={e => {
                  railHeight.current = e.nativeEvent.layout.height;
                }}
                {...railPan.panHandlers}
              >
                {ALPHABET.map(letter => {
                  const present = presentLetters.has(letter);
                  return (
                    <Text
                      key={letter}
                      accessibilityLabel={`Jump to letter ${letter}`}
                      style={[styles.railLetter, !present && styles.railLetterDim]}
                    >
                      {letter}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>

          {/* Search row — pinned to the bottom of the page */}
          <View style={styles.searchRow}>
            <Svg width={15} height={15} viewBox="0 0 15 15">
              <Circle cx={6.3} cy={6.3} r={4.6} stroke={COLORS.inkFaint} strokeWidth={1.4} fill="none" />
              <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={COLORS.inkFaint} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder}
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
        </>
      )}
    </KeyboardAvoidingView>
  );
}

interface LibraryBrowsePaneProps {
  decks: StudentDeck[];
  filteredDecks: StudentDeck[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  searchQuery: string;
  isSearchLoading: boolean;
  isSearchingDecks: boolean;
  visibleSearchResult: { matchesByDeckId: Record<string, StudyDeckSearchMatch[]> } | null;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  onRetry: () => void;
  onDeckPress: (deck: StudentDeck) => void;
}

function LibraryBrowsePane({
  decks,
  filteredDecks,
  isLoading,
  isRefreshing,
  error,
  searchQuery,
  isSearchLoading,
  isSearchingDecks,
  visibleSearchResult,
  onSearchQueryChange,
  onRefresh,
  onRetry,
  onDeckPress,
}: LibraryBrowsePaneProps) {
  const { width } = useWindowDimensions();
  const { restaurant } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [isSwiping, setIsSwiping] = useState(false);
  const dragX = useRef(new Animated.Value(0)).current;
  const barX = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    if (!restaurant?.id) {
      setFavoriteIds([]);
      return;
    }
    loadFavorites(restaurant.id).then(setFavoriteIds);
  }, [restaurant?.id]);

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter(c => decks.some(d => d.deckType === c.type)),
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

  const moveBar = useCallback(
    (index: number, animate: boolean) => {
      const l = tabLayouts.current[cycle[index] ?? 'Decks'];
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
    [barX, barW, cycle],
  );

  useEffect(() => {
    moveBar(cycleIndex, true);
  }, [cycleIndex, moveBar]);

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
        onMoveShouldSetPanResponder: (_e, g) =>
          cycle.length > 1 &&
          Math.abs(g.dx) > 14 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: () => {
          dragX.stopAnimation();
          setIsSwiping(true);
        },
        onPanResponderMove: (_e, g) =>
          dragX.setValue(Math.max(-width, Math.min(width, g.dx))),
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

  useLayoutEffect(() => {
    dragX.setValue(0);
  }, [selectedCategory, dragX]);

  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteDecks = useMemo(
    () => filteredDecks.filter(d => favSet.has(d.id)),
    [filteredDecks, favSet],
  );
  const restDecks = useMemo(
    () => filteredDecks.filter(d => !favSet.has(d.id)),
    [filteredDecks, favSet],
  );
  const getSearchMatches = (deck: StudentDeck) =>
    visibleSearchResult?.matchesByDeckId[deck.id] ?? [];

  const toggleFavorite = useCallback((deck: StudentDeck) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavoriteIds(prev => {
      const next = prev.includes(deck.id)
        ? prev.filter(id => id !== deck.id)
        : [...prev, deck.id];
      if (restaurant?.id) saveFavorites(restaurant.id, next);
      return next;
    });
  }, [restaurant?.id]);

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

  const renderSection = (
    title: string,
    sectionDecks: StudentDeck[],
    emptyText?: string,
  ) =>
    sectionDecks.length > 0 ? (
      <View key={title}>
        <View style={styles.browseSectionHeader}>
          <Text style={styles.browseSectionTitle}>{title}</Text>
          <Text style={styles.browseSectionCount}>{sectionDecks.length}</Text>
        </View>
        {sectionDecks.map((deck, i) => (
          <DeckRow
            key={deck.id}
            deck={deck}
            isFirstInGroup={i === 0}
            isFavorite={favSet.has(deck.id)}
            mode="browse"
            isSearching={isSearchingDecks}
            searchQuery={searchQuery}
            searchMatches={getSearchMatches(deck)}
            onTap={onDeckPress}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </View>
    ) : emptyText ? (
      <View key={title}>
        <View style={styles.browseSectionHeader}>
          <Text style={styles.browseSectionTitle}>{title}</Text>
        </View>
        <Text style={styles.browsePlaceholder}>{emptyText}</Text>
      </View>
    ) : null;

  const renderPageContent = (category: string | undefined) => {
    if (error) {
      return (
        <View style={styles.stateBlock}>
          <Text style={styles.stateEyebrow}>Something went wrong</Text>
          <Text style={styles.stateLine}>{error}</Text>
          <Pressable onPress={onRetry} hitSlop={8}>
            <Text style={styles.retryLink}>Tap to retry</Text>
          </Pressable>
        </View>
      );
    }

    if (isSearchingDecks && filteredDecks.length === 0) {
      return isSearchLoading ? renderSearchLoading() : renderSearchEmpty();
    }

    if (category === undefined) {
      return (
        <>
          {renderSection(
            'Favorites',
            favoriteDecks,
            isSearchingDecks ? undefined : 'Hold a deck to add it to favorites.',
          )}
          {presentCategories.map(c =>
            renderSection(c.label, restDecks.filter(d => d.deckType === c.type)),
          )}
        </>
      );
    }

    if (category === 'Favorites') {
      if (favoriteDecks.length === 0) {
        if (isSearchingDecks && isSearchLoading) return renderSearchLoading();
        return (
          <Text style={styles.browsePlaceholder}>
            {isSearchingDecks
              ? 'No favorite decks match that search.'
              : 'Hold a deck to add it to favorites.'}
          </Text>
        );
      }
      return favoriteDecks.map((deck, i) => (
        <DeckRow
          key={deck.id}
          deck={deck}
          isFirstInGroup={i === 0}
          isFavorite
          mode="browse"
          isSearching={isSearchingDecks}
          searchQuery={searchQuery}
          searchMatches={getSearchMatches(deck)}
          onTap={onDeckPress}
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
        mode="browse"
        isSearching={isSearchingDecks}
        searchQuery={searchQuery}
        searchMatches={getSearchMatches(deck)}
        onTap={onDeckPress}
        onToggleFavorite={toggleFavorite}
      />
    ));
  };

  const renderPage = (category: string | undefined, current: boolean) => (
    <ScrollView
      style={styles.browseBody}
      contentContainerStyle={styles.browseBodyContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        current ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.inkMute}
          />
        ) : undefined
      }
    >
      {renderPageContent(category)}
    </ScrollView>
  );

  const renderSearchRow = () => (
    <View style={styles.searchRow}>
      <Svg width={15} height={15} viewBox="0 0 15 15">
        <Circle cx={6.3} cy={6.3} r={4.6} stroke={COLORS.inkFaint} strokeWidth={1.4} fill="none" />
        <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={COLORS.inkFaint} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
      <TextInput
        style={styles.searchInput}
        placeholder="Search card decks…"
        placeholderTextColor={COLORS.inkFaint}
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchQuery.length > 0 && (
        <Pressable onPress={() => onSearchQueryChange('')} hitSlop={10}>
          <Text style={styles.searchClear}>CLEAR</Text>
        </Pressable>
      )}
    </View>
  );

  if (isLoading && decks.length === 0) {
    return (
      <>
        <View style={styles.browseBody}>
          <View style={styles.stateBlock}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        </View>
        {renderSearchRow()}
      </>
    );
  }

  if (decks.length === 0 && !error) {
    return (
      <>
        <ScrollView
          style={styles.browseBody}
          contentContainerStyle={styles.browseBodyContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.inkMute}
            />
          }
        >
          <View style={styles.stateBlock}>
            <Text style={styles.emptyTitle}>Nothing on the shelf yet.</Text>
            <Text style={styles.emptyBody}>Decks the team publishes will show up here.</Text>
          </View>
        </ScrollView>
        {renderSearchRow()}
      </>
    );
  }

  return (
    <>
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
                      tabLayouts.current[label] = { x, width: w };
                      if (i === cycleIndex) moveBar(i, false);
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
              style={[styles.tabBar, { width: barW, transform: [{ translateX: barX }] }]}
            />
          </ScrollView>
        </View>
      )}

      <View style={styles.listArea} {...swipePan.panHandlers}>
        {isSwiping && (
          <Animated.View
            key="browse-swipe-prev"
            pointerEvents="none"
            style={[styles.swipePage, { left: -width, transform: [{ translateX: dragX }] }]}
          >
            {renderPage(cycle[(cycleIndex - 1 + cycle.length) % cycle.length], false)}
          </Animated.View>
        )}

        <Animated.View
          key="browse-swipe-cur"
          style={[styles.swipePage, { transform: [{ translateX: dragX }] }]}
        >
          {renderPage(selectedCategory, true)}
        </Animated.View>

        {isSwiping && (
          <Animated.View
            key="browse-swipe-next"
            pointerEvents="none"
            style={[styles.swipePage, { left: width, transform: [{ translateX: dragX }] }]}
          >
            {renderPage(cycle[(cycleIndex + 1) % cycle.length], false)}
          </Animated.View>
        )}
      </View>

      {renderSearchRow()}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },

  // ── Dark masthead ──────────────────────────────────────────
  titleBlock: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
    paddingBottom: 22,
  },
  titleEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.amber,
    marginBottom: 6,
  },
  titleHeadline: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: COLORS.onDark,
  },

  // ── Sub-tab strip ──────────────────────────────────────────
  subtabStrip: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
  },
  // Inner row with no padding so the bar's translateX shares the tabs'
  // coordinate origin — same arrangement as the Index strip's tabsRow.
  subtabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  subtab: {
    marginRight: 22,
    alignItems: 'center',
  },
  subtabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: COLORS.onDarkMute,
    paddingBottom: 11,
  },
  subtabLabelActive: {
    color: COLORS.onDark,
  },
  // Slides + resizes under the active section tab, flush with the hairline.
  subtabBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 1.5,
    backgroundColor: COLORS.amber,
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

  // ── Index filter strip ─────────────────────────────────────
  indexStrip: {
    paddingTop: 16,
    paddingHorizontal: 26,
    backgroundColor: COLORS.paper,
  },
  // Full-width ink rule along the strip's base — the encyclopedia divider's
  // old line, drawn once here. The amber tab bar slides over it.
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
  // Serif middle-dot between categories, echoing the old index hint.
  tabDot: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 16,
    color: COLORS.inkFaint,
    marginHorizontal: 11,
    paddingBottom: 12,
  },
  // Slides + resizes under the active tab, overlapping the ink rule.
  tabBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    backgroundColor: COLORS.amber,
  },

  // ── List area ──────────────────────────────────────────────
  browseBody: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  browseBodyContent: {
    paddingBottom: 32,
  },
  listArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // Each swipe page fills the list area; neighbours are offset one full
  // width to the side and slid in by the gesture's translateX.
  swipePage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
  },

  browseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHairLt,
  },
  browseSectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    color: COLORS.ink,
    marginRight: 10,
  },
  browseSectionCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  browsePlaceholder: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.inkFaint,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Glossary letter header
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHairLt,
  },
  letterGlyph: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    color: COLORS.ink,
    marginRight: 10,
  },
  // Encyclopedia chapter header — same size as the Glossary letter glyph;
  // shrinks and truncates so a long category name doesn't push the count off.
  categoryName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    color: COLORS.ink,
    marginRight: 10,
    flexShrink: 1,
  },
  letterCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    fontVariant: ['tabular-nums'],
  },

  // Term row
  termRow: {
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 18,
  },
  termRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  termRowPressed: {
    opacity: 0.55,
  },
  termEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
    marginBottom: 6,
  },
  termName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    letterSpacing: -0.33,
    lineHeight: 24,
    color: COLORS.ink,
  },
  termDefinition: {
    marginTop: 8,
  },
  termDefinitionLine: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMute,
  },

  // ── A–Z rail ───────────────────────────────────────────────
  rail: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    right: 2,
    width: 22,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  railLetter: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: COLORS.ink,
  },
  railLetterDim: {
    color: COLORS.inkFaint,
    opacity: 0.55,
  },

  // ── State blocks (loading / empty / error) ─────────────────
  stateBlock: {
    paddingHorizontal: 26,
    paddingTop: 56,
    paddingBottom: 56,
    alignItems: 'flex-start',
  },
  stateEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.amber,
    marginBottom: 8,
  },
  stateLine: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.inkMute,
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
  retryLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.ink,
    marginTop: 14,
  },

  // ── Detail view ────────────────────────────────────────────
  detailHeader: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
  },
  backLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.onDarkMute,
  },
  detailBody: {
    flex: 1,
  },
  detailEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
    marginBottom: 8,
  },
  detailTerm: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: COLORS.ink,
  },
  detailRule: {
    height: 1,
    backgroundColor: COLORS.paperHair,
    marginTop: 18,
    marginBottom: 20,
  },
  detailDefinition: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 25,
    color: COLORS.ink,
  },
  linkedSection: {
    marginTop: 28,
    borderTopWidth: 2,
    borderTopColor: COLORS.ink,
    paddingTop: 16,
  },
  linkedEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
    marginBottom: 4,
  },
  linkedRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  linkedName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 18,
    letterSpacing: -0.28,
    color: COLORS.ink,
  },
  linkedMeta: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    marginTop: 4,
  },
});
