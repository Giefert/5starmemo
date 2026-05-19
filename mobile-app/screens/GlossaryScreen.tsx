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
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import RenderHtml from 'react-native-render-html';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { GlossaryCategory, GlossaryTermSummary, GlossaryTerm, GlossarySection } from '../types/shared';
import { stripHtml, cleanHtml, customHTMLElementModels } from '../utils/html';
import GlossaryIndexSheet, { IndexSheetCategory } from '../components/GlossaryIndexSheet';

type ViewState = 'list' | 'detail';

// Carte tokens — shared verbatim with BulletinScreen / HomeScreen so the
// Reference tab reads as a sibling of Study and Bulletin.
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

export default function GlossaryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { restaurant } = useAuth();

  // Data state — both sections are preloaded once and cached, so switching
  // sub-tabs or typing a search never triggers a refetch that would briefly
  // render stale data and visibly reshuffle the list.
  const [cache, setCache] = useState<Record<GlossarySection, SectionData | null>>({
    glossary: null,
    encyclopedia: null,
  });
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // Section state
  const [activeSection, setActiveSection] = useState<GlossarySection>('glossary');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  // Encyclopedia-only: the category the list is narrowed to. `undefined`
  // shows every category. Cycled by swiping the paper area left/right.
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // UI state
  const [viewState, setViewState] = useState<ViewState>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  // Index dropdown (Encyclopedia only). `isFilterVisible` is reused as its
  // open/closed flag; `indexAnchorY` is the window-space Y it unfurls from.
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [indexAnchorY, setIndexAnchorY] = useState(0);

  // Encyclopedia category swipe — `dragX` tracks the in-progress horizontal
  // drag; `isSwiping` mounts the neighbouring category pages so they slide
  // in alongside the gesture instead of popping into place on release.
  const [isSwiping, setIsSwiping] = useState(false);
  const dragX = useRef(new Animated.Value(0)).current;

  const indexRowRef = useRef<View>(null);
  const listRef = useRef<SectionList<GlossaryTermSummary, TermSection>>(null);
  const lastJumpTarget = useRef<number | null>(null);
  const railHeight = useRef(0);
  const chevronAnim = useRef(new Animated.Value(0)).current;

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
    Animated.timing(chevronAnim, {
      toValue: isFilterVisible ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFilterVisible, chevronAnim]);

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

  const handleSectionChange = (newSection: GlossarySection) => {
    if (newSection === activeSection) return;
    setActiveSection(newSection);
    setSearchQuery('');
    setSelectedCategory(undefined);
    setIsFilterVisible(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

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
  // Encyclopedia chapters for a given category scope (`undefined` = all).
  // Pulled out of the `sections` memo so a swipe can prebuild the pages
  // adjacent to the current one and drag them in.
  const buildEncyclopediaSections = useCallback(
    (category: string | undefined): TermSection[] => {
      const scoped = category
        ? terms.filter(t => (t.categoryName || 'Other') === category)
        : terms;
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
    [terms, categories],
  );

  // Glossary: flat A–Z buckets. Encyclopedia: category chapters in the
  // server's category order, entries alphabetized within each.
  const sections = useMemo<TermSection[]>(() => {
    if (activeSection === 'glossary') {
      const buckets = new Map<string, GlossaryTermSummary[]>();
      for (const t of terms) {
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
    return buildEncyclopediaSections(selectedCategory);
  }, [terms, activeSection, selectedCategory, buildEncyclopediaSections]);

  // Letters that actually have entries — drives the rail's full/dim state.
  const presentLetters = useMemo(() => {
    const set = new Set<string>();
    if (activeSection === 'glossary') {
      for (const s of sections) set.add(s.title);
    }
    return set;
  }, [sections, activeSection]);

  // Categories for the Index sheet — every category, counted against the
  // currently-loaded (possibly filtered) term set.
  const sheetCategories = useMemo<IndexSheetCategory[]>(() => {
    const counts = new Map<string, number>();
    for (const t of terms) {
      const key = t.categoryName || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: counts.get(cat.name) || 0,
    }));
  }, [categories, terms]);

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

  // ── Encyclopedia category swipe ─────────────────────────────
  // Swiping the paper area left/right cycles through
  // [all entries → category 1 → … → category N] and wraps. The current
  // page and the page being swiped toward both translate with the finger.
  const categoryNames = useMemo(() => categories.map(c => c.name), [categories]);
  const cycle = useMemo<(string | undefined)[]>(
    () => [undefined, ...categoryNames],
    [categoryNames],
  );
  const cycleIndex = useMemo(() => {
    const i = cycle.indexOf(selectedCategory);
    return i < 0 ? 0 : i;
  }, [cycle, selectedCategory]);

  // The two pages adjacent to the current one, kept ready so a swipe can
  // drag the incoming category in rather than rebuilding mid-gesture.
  const prevSections = useMemo(
    () => buildEncyclopediaSections(cycle[(cycleIndex - 1 + cycle.length) % cycle.length]),
    [buildEncyclopediaSections, cycle, cycleIndex],
  );
  const nextSections = useMemo(
    () => buildEncyclopediaSections(cycle[(cycleIndex + 1) % cycle.length]),
    [buildEncyclopediaSections, cycle, cycleIndex],
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
        // Only claim clearly horizontal drags so vertical scrolling is untouched.
        onMoveShouldSetPanResponder: (_e, g) =>
          activeSection === 'encyclopedia' &&
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
    [activeSection, categoryNames.length, width, dragX, settleSwipe],
  );

  // After a committed swipe the new category renders while `dragX` still
  // holds the slide's end value; reset it before paint so the page that
  // just slid into centre stays put instead of jumping back.
  useLayoutEffect(() => {
    dragX.setValue(0);
  }, [selectedCategory, activeSection, dragX]);

  const handleSelectCategory = (categoryName: string) => {
    setIsFilterVisible(false);
    const target = sections.findIndex(s => s.title === categoryName);
    if (target >= 0) {
      // Let the sheet's dismissal settle before scrolling.
      setTimeout(() => scrollToSection(target), 200);
    }
  };

  // ── Renderers ───────────────────────────────────────────────
  const renderSectionHeader = ({ section }: { section: TermSection }) => {
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
    return (
      <View style={styles.catHeader}>
        <View style={styles.catRule} />
        <View style={styles.catRuleTip} />
        <View style={styles.catHeaderRow}>
          <Text style={styles.catName}>{section.title}</Text>
          <Text style={styles.catCount}>
            {section.count} {section.count === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
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
    const definition = stripHtml(item.definition);
    return (
      <Pressable
        onPress={() => handleTermPress(item.id)}
        style={({ pressed }) => [
          styles.termRow,
          !(isLastSection && isLastRow) && styles.termRowDivider,
          pressed && styles.termRowPressed,
        ]}
      >
        {activeSection === 'glossary' && !!item.categoryName && (
          <Text style={styles.termEyebrow}>{item.categoryName}</Text>
        )}
        <Text style={styles.termName}>{item.term}</Text>
        {!!definition && (
          <Text style={styles.termDefinition} numberOfLines={2}>
            {definition}
          </Text>
        )}
        {item.linkedCardCount > 0 && (
          <Text style={styles.termMeta}>
            {item.linkedCardCount} linked card{item.linkedCardCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Pressable>
    );
  };

  // ── Detail view ─────────────────────────────────────────────
  if (viewState === 'detail') {
    return (
      <View style={styles.screen}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={handleBackToList} hitSlop={12}>
            <Text style={styles.backLink}>← Back</Text>
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
  const renderPage = (pageSections: TermSection[], current: boolean) => {
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
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={activeSection === 'encyclopedia'}
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
        <Text style={styles.titleHeadline}>Reference.</Text>
      </View>

      {/* Sub-tab strip */}
      <View style={styles.subtabStrip}>
        {(['glossary', 'encyclopedia'] as GlossarySection[]).map(section => {
          const active = activeSection === section;
          return (
            <Pressable
              key={section}
              onPress={() => handleSectionChange(section)}
              hitSlop={8}
              style={styles.subtab}
            >
              <Text style={[styles.subtabLabel, active && styles.subtabLabelActive]}>
                {section === 'glossary' ? 'Glossary' : 'Encyclopedia'}
              </Text>
              <View style={[styles.subtabUnderline, active && styles.subtabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      {/* Index trigger row — Encyclopedia only */}
      {activeSection === 'encyclopedia' && sheetCategories.length > 0 && (
        <Pressable
          ref={indexRowRef}
          style={styles.indexRow}
          onPress={() => {
            if (isFilterVisible) {
              setIsFilterVisible(false);
              return;
            }
            // Measure the row so the dropdown unfurls from its top edge.
            indexRowRef.current?.measureInWindow((_x, y) => {
              setIndexAnchorY(y);
              setIsFilterVisible(true);
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Open category index"
        >
          <Text style={[styles.indexEyebrow, isFilterVisible && styles.indexEyebrowOpen]}>
            INDEX
          </Text>
          <Text style={styles.indexHint} numberOfLines={1}>
            {sheetCategories.map((c, i) => (
              <Text key={c.id}>
                {i > 0 ? '  ·  ' : ''}
                <Text style={c.name === selectedCategory ? styles.indexHintActive : null}>
                  {c.name}
                </Text>
              </Text>
            ))}
          </Text>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: chevronAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <Svg width={11} height={7} viewBox="0 0 11 7">
              <Path
                d="M1 1 L5.5 5.5 L10 1"
                stroke={isFilterVisible ? COLORS.amber : COLORS.ink}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        </Pressable>
      )}

      {/* The list — encyclopedia swipes drag the neighbouring category in */}
      <View style={styles.listArea} {...swipePan.panHandlers}>
        {isSwiping && (
          <Animated.View
            key="swipe-prev"
            pointerEvents="none"
            style={[styles.swipePage, { left: -width, transform: [{ translateX: dragX }] }]}
          >
            {renderPage(prevSections, false)}
          </Animated.View>
        )}

        <Animated.View
          key="swipe-cur"
          style={[styles.swipePage, { transform: [{ translateX: dragX }] }]}
        >
          {renderPage(sections, true)}
        </Animated.View>

        {isSwiping && (
          <Animated.View
            key="swipe-next"
            pointerEvents="none"
            style={[styles.swipePage, { left: width, transform: [{ translateX: dragX }] }]}
          >
            {renderPage(nextSections, false)}
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

      <GlossaryIndexSheet
        visible={isFilterVisible && activeSection === 'encyclopedia'}
        anchorY={indexAnchorY}
        categories={sheetCategories}
        countNoun={searchQuery ? 'matches' : 'entries'}
        onClose={() => setIsFilterVisible(false)}
        onSelect={handleSelectCategory}
      />
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
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
  subtabUnderline: {
    height: 1.5,
    width: '100%',
    backgroundColor: 'transparent',
    marginTop: -1.5,
  },
  subtabUnderlineActive: {
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

  // ── Index trigger row ──────────────────────────────────────
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  indexEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.ink,
    marginRight: 12,
  },
  indexEyebrowOpen: {
    color: COLORS.amber,
  },
  indexHint: {
    flex: 1,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 13,
    color: COLORS.inkMute,
    marginRight: 12,
  },
  indexHintActive: {
    color: COLORS.ink,
  },

  // ── List area ──────────────────────────────────────────────
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
  letterCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    fontVariant: ['tabular-nums'],
  },

  // Encyclopedia category header
  catHeader: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  catRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.ink,
  },
  catRuleTip: {
    position: 'absolute',
    top: 0,
    left: 26,
    width: 60,
    height: 2,
    backgroundColor: COLORS.amber,
  },
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  catName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 26,
    letterSpacing: -0.52,
    color: COLORS.ink,
  },
  catCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: COLORS.inkMute,
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
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMute,
    marginTop: 8,
  },
  termMeta: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
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
    paddingHorizontal: 26,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  backLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
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
