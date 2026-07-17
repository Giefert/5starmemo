import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { G, Path, Rect, Defs, Pattern, LinearGradient, Stop, Line } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  BulletinPayload,
  CurationKind,
  formatSeasonality,
  isMonthInSeason,
  MONTH_NAMES,
  RestaurantCurationItem,
} from '../types/shared';
import { BrowseScreen } from './BrowseScreen';

// The accordion's expand/collapse rides on LayoutAnimation; Android needs it
// turned on explicitly (iOS has it on by default).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  ink: '#14120F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMuted: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

// The curation sections, in fixed reading order. Each renders as a
// heading with its items listed directly underneath on the main page.
const SECTIONS: { kind: CurationKind; label: string }[] = [
  { kind: 'new_item', label: 'New items' },
  { kind: 'featured', label: 'Featured' },
  { kind: 'specials', label: 'Specials' },
  { kind: 'in_season', label: 'In season' },
  { kind: 'recently_modified', label: 'Recently modified' },
];

// The announcement zone caps here; longer notices scroll internally behind
// a paper-edge fade.
const ANNOUNCE_MAX_H = 170;

type ScreenState = 'home' | 'browse';

export default function BulletinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [data, setData] = useState<BulletinPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [selectedDeck, setSelectedDeck] = useState<{ id: string; title: string; cardId?: string } | null>(null);
  // Accordion: at most one category open at a time. Tapping the open one closes it.
  const [openSection, setOpenSection] = useState<CurationKind | null>(null);
  // On first load, prefer In season so the Bulletin opens on what's timely.
  // Fall back to the first populated category when no seasonal items exist.
  // One-shot — refreshes and the reader's own taps thereafter own the state.
  const didInitOpen = useRef(false);

  const loadBulletin = useCallback(async () => {
    try {
      const payload = await apiService.getBulletin();
      setData(payload);
      if (!didInitOpen.current) {
        didInitOpen.current = true;
        const defaultSection = (payload.curations.in_season ?? []).length > 0
          ? SECTIONS.find((section) => section.kind === 'in_season')
          : SECTIONS.find(
              (section) => (payload.curations[section.kind] ?? []).length > 0,
            );
        if (defaultSection) setOpenSection(defaultSection.kind);
      }
      setError('');
    } catch (err: any) {
      if (err?.name === 'AuthenticationError') {
        logout();
        return;
      }
      setError(err?.message || 'Failed to load bulletin');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    loadBulletin();
  }, [loadBulletin]);

  // The masthead is dark behind the status bar — keep its text light while
  // this tab is focused.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
    }, []),
  );

  // Hide the tab bar only on the Browse-mode card screen. The section browse
  // list keeps the bar. `display: 'none'` is the flag CarteTabBar reads.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: screenState === 'browse' ? { display: 'none' } : undefined,
    });
  }, [screenState, navigation]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBulletin();
  };

  const handleToggleSection = (kind: CurationKind) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((current) => (current === kind ? null : kind));
  };

  // A curation item routes into the Browse-mode card screen for its deck.
  // A deck item opens that deck's card list; a card item opens straight to
  // the card itself, browsed in place rather than as one row in a list.
  const handleOpenItem = (item: RestaurantCurationItem) => {
    const deckId = item.targetType === 'deck' ? item.targetId : item.deckId;
    const title = item.targetType === 'deck' ? item.name : item.deckTitle ?? '';
    if (!deckId) return;
    const cardId = item.targetType === 'card' ? item.targetId : undefined;
    setSelectedDeck({ id: deckId, title, cardId });
    setScreenState('browse');
  };

  if (screenState === 'browse' && selectedDeck) {
    return (
      <BrowseScreen
        deckId={selectedDeck.id}
        deckTitle={selectedDeck.title}
        initialCardId={selectedDeck.cardId}
        onExit={() => setScreenState('home')}
        backLabel="Bulletin"
      />
    );
  }

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.amber} />
        <Text style={styles.loadingText}>Loading the bulletin…</Text>
      </View>
    );
  }

  const restaurantName = data?.restaurant.name ?? '';
  const announcements = data?.restaurant.announcements ?? [];
  const sectionsWithItems = SECTIONS.filter(
    (s) => (data?.curations[s.kind] ?? []).length > 0,
  );
  return (
    <View style={styles.container}>
      {/* Dark masthead — the announcement zone and nothing else. */}
      <View
        style={[
          styles.masthead,
          { paddingTop: insets.top + 14 },
          announcements.length > 0 ? styles.mastheadAnnounce : styles.mastheadBare,
        ]}
      >
        <Text style={styles.eyebrow}>{restaurantName}</Text>
        <Text style={styles.headline}>Bulletin.</Text>
        {announcements.length > 0 && <AnnouncementZone announcements={announcements} />}
      </View>

      {/* Paper content band — each category and its items, listed in full. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.inkMute}
          />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sections}>
          {sectionsWithItems.map((section, sectionIndex) => {
            const items = data?.curations[section.kind] ?? [];
            const itemCount = section.kind === 'in_season'
              ? items.filter((item) => isMonthInSeason(
                  item.seasonStartMonth,
                  item.seasonEndMonth,
                )).length
              : items.length;
            const isOpen = openSection === section.kind;
            const isLastBlock = sectionIndex === sectionsWithItems.length - 1;
            return (
              <View
                key={section.kind}
                style={!isLastBlock ? styles.categoryDivider : undefined}
              >
                <TouchableOpacity
                  style={styles.categoryHeading}
                  onPress={() => handleToggleSection(section.kind)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryTitle}>{section.label}</Text>
                  <Text style={styles.categoryCount}>{itemCount}</Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.categoryItems}>
                    {section.kind === 'in_season' ? (
                      <SeasonTimeline items={items} onPress={handleOpenItem} />
                    ) : (
                      items.map((item, i) => (
                        <ItemRow
                          key={`${item.targetType}:${item.targetId}`}
                          item={item}
                          isLast={i === items.length - 1}
                          onPress={() => handleOpenItem(item)}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sign-off flourish ────────────────────────────────────────
// The mark that closes a notice — a calligraphic integral sign: one stroke
// that sweeps on a diagonal through the centre and rolls into a spiral eye at
// each end, with two short strokes through the middle. The right half is the
// left rotated 180°, giving the integral's point symmetry. Each eye is a log
// spiral (radius shrinking each turn) attached so its tangent matches the
// spine and wound to continue that curve rather than inflect against it. Built
// once from these params.
const INTEGRAL_PATH = (() => {
  // Diagonal spine from A to -A (cubic control c1; c2 = -c1).
  const A = [-30, -11], c1 = [-12, -7];
  const rOuter = 13, rInner = 1.6, turns = 1.3, dir = -1, steps = 48;
  const sweep = turns * 2 * Math.PI;
  const sp: number[][] = []; // canonical spiral: eye at origin, outer at (rOuter, 0)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = dir * sweep * t;
    const r = rOuter * Math.pow(rInner / rOuter, t);
    sp.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  // Rotate the spiral so its outer end runs along the spine's tangent at A,
  // then slide its outer point onto A — a seamless, inflection-free join.
  const ang = (v: number[]) => Math.atan2(v[1], v[0]);
  const a = ang([c1[0] - A[0], c1[1] - A[1]]) - ang([sp[0][0] - sp[1][0], sp[0][1] - sp[1][1]]);
  const cos = Math.cos(a), sin = Math.sin(a);
  const place = ([x, y]: number[]) => [x * cos - y * sin, x * sin + y * cos];
  const p0 = place(sp[0]);
  const ox = A[0] - p0[0], oy = A[1] - p0[1];
  const left = sp.map((p) => { const q = place(p); return [q[0] + ox, q[1] + oy]; });
  const fmt = (p: number[]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const toTip = [...left].reverse(); // left tip → outer (A)
  const right = left.map(([x, y]) => [-x, -y]); // right outer (−A) → tip
  let d = `M ${fmt(toTip[0])}`;
  for (let i = 1; i < toTip.length; i++) d += ` L ${fmt(toTip[i])}`;
  d += ` C ${fmt(c1)} ${fmt([-c1[0], -c1[1]])} ${fmt(right[0])}`; // spine across the centre
  for (let i = 1; i < right.length; i++) d += ` L ${fmt(right[i])}`;
  return d;
})();

function Flourish({ width = 84, color = COLORS.onDark }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={(width * 28) / 96} viewBox="-48 -14 96 28">
      <G fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d={INTEGRAL_PATH} />
        <Line x1={-6} y1={-9} x2={-6} y2={9} />
        <Line x1={6} y1={-9} x2={6} y2={9} />
      </G>
    </Svg>
  );
}

// ── Announcement zone ────────────────────────────────────────
// Adaptive: short notices size to content; anything past ANNOUNCE_MAX_H
// caps and scrolls internally with a fade at the bottom edge. Height is
// measured from the natural layout of the paragraph block.
function AnnouncementZone({ announcements }: { announcements: string[] }) {
  const [needsScroll, setNeedsScroll] = useState(false);

  const onMeasure = (e: LayoutChangeEvent) => {
    const tall = e.nativeEvent.layout.height > ANNOUNCE_MAX_H + 4;
    if (tall !== needsScroll) setNeedsScroll(tall);
  };

  const paragraphs = (
    <View style={styles.announceTextColumn} onLayout={onMeasure}>
      {announcements.map((p, i) => (
        <Text
          key={i}
          style={[
            styles.announceParagraph,
            i === 0 ? styles.announceLead : styles.announceRest,
          ]}
        >
          {p}
        </Text>
      ))}
    </View>
  );

  return (
    // Short notices shrink the zone to the text's width and centre it, so the
    // closing quote hugs the end of the text rather than the screen edge. Tall,
    // scrolling notices already fill the width, so they stay full-width.
    <View style={[styles.announceZone, !needsScroll && styles.announceZoneFit]}>
      {/* Title-font quotes hang at the zone edges and straddle the notice's
          top-left / bottom-right corners; the flourish signs it off. */}
      <Text style={styles.quoteOpen}>“</Text>
      {needsScroll ? (
        <View style={{ maxHeight: ANNOUNCE_MAX_H }}>
          <ScrollView showsVerticalScrollIndicator={false}>{paragraphs}</ScrollView>
          <Svg style={styles.announceFade} width="100%" height={22}>
            <Defs>
              <LinearGradient id="announceFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLORS.ink} stopOpacity={0} />
                <Stop offset="1" stopColor={COLORS.ink} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#announceFade)" />
          </Svg>
        </View>
      ) : (
        paragraphs
      )}
      <Text style={styles.quoteClose}>”</Text>
      <View style={styles.announceFlourish}>
        <Flourish color={COLORS.onDarkMuted} />
      </View>
    </View>
  );
}

// ── Striped placeholder ──────────────────────────────────────
// The Carte "image goes here" device — a 45° repeating stripe between two
// near-transparent ink tints. Used when an item has no photo.
function StripePlaceholder({ size }: { size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <Pattern
          id="carteStripe"
          patternUnits="userSpaceOnUse"
          width={12}
          height={12}
          patternTransform="rotate(45)"
        >
          <Rect width={12} height={12} fill="rgba(20,18,15,0.025)" />
          <Rect width={6} height={12} fill="rgba(20,18,15,0.06)" />
        </Pattern>
      </Defs>
      <Rect width={size} height={size} fill="url(#carteStripe)" />
    </Svg>
  );
}

const TIMELINE_LABEL_WIDTH = 118;
const TIMELINE_HEADER_HEIGHT = 48;
const TIMELINE_ROW_HEIGHT = 66;

function SeasonTimeline({
  items,
  onPress,
}: {
  items: RestaurantCurationItem[];
  onPress: (item: RestaurantCurationItem) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const monthViewportWidth = Math.max(screenWidth - 52 - TIMELINE_LABEL_WIDTH, 1);
  const monthWidth = monthViewportWidth / 3;
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: MONTH_NAMES[date.getMonth()].slice(0, 3).toUpperCase(),
      isCurrent: offset === 0,
    };
  });

  return (
    <View style={styles.timelineShell}>
      <View style={styles.timelineLegend}>
        <View style={styles.timelineLegendKey}>
          <View style={styles.timelineLegendSwatch} />
          <Text style={styles.timelineLegendText}>Seasonal window</Text>
        </View>
        <Text style={styles.timelineSwipeHint}>Swipe months →</Text>
      </View>

      <View style={styles.timelineTable}>
        <View style={{ width: TIMELINE_LABEL_WIDTH }}>
          <View style={[styles.timelineCorner, { height: TIMELINE_HEADER_HEIGHT }]}>
            <Text style={styles.timelineCornerText}>Item</Text>
          </View>
          {items.map((item) => {
            const range = formatSeasonality(
              item.seasonStartMonth,
              item.seasonEndMonth,
            );
            return (
              <TouchableOpacity
                key={`${item.targetType}:${item.targetId}`}
                style={[styles.timelineLabelRow, { height: TIMELINE_ROW_HEIGHT }]}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.timelineItemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.timelineItemRange} numberOfLines={1}>
                  {range ?? 'Season not specified'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          horizontal
          nestedScrollEnabled
          style={{ width: monthViewportWidth }}
          contentContainerStyle={styles.timelineMonthsContent}
          showsHorizontalScrollIndicator
          snapToInterval={monthWidth}
          decelerationRate="fast"
        >
          <View>
            <View style={[styles.timelineMonthHeaderRow, { height: TIMELINE_HEADER_HEIGHT }]}>
              {months.map((month) => (
                <View
                  key={`${month.year}-${month.month}`}
                  style={[
                    styles.timelineMonthHeader,
                    month.isCurrent && styles.timelineCurrentHeader,
                    { width: monthWidth },
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineMonthName,
                      month.isCurrent && styles.timelineCurrentMonthName,
                    ]}
                  >
                    {month.label}
                  </Text>
                  <Text style={styles.timelineMonthYear}>
                    {month.isCurrent ? 'NOW' : month.year}
                  </Text>
                </View>
              ))}
            </View>

            {items.map((item) => (
              <View
                key={`${item.targetType}:${item.targetId}`}
                style={[styles.timelineGridRow, { height: TIMELINE_ROW_HEIGHT }]}
              >
                {months.map((month, monthIndex) => {
                  const active = isMonthInSeason(
                    item.seasonStartMonth,
                    item.seasonEndMonth,
                    month.month,
                  );
                  const previousActive = monthIndex > 0 && isMonthInSeason(
                    item.seasonStartMonth,
                    item.seasonEndMonth,
                    months[monthIndex - 1].month,
                  );
                  const nextActive = monthIndex < months.length - 1 && isMonthInSeason(
                    item.seasonStartMonth,
                    item.seasonEndMonth,
                    months[monthIndex + 1].month,
                  );
                  return (
                    <View
                      key={`${month.year}-${month.month}`}
                      style={[
                        styles.timelineCell,
                        month.isCurrent && styles.timelineCurrentCell,
                        { width: monthWidth },
                      ]}
                    >
                      {active && (
                        <View
                          style={[
                            styles.timelineSeasonBand,
                            !previousActive && styles.timelineSeasonBandStart,
                            !nextActive && styles.timelineSeasonBandEnd,
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function ItemRow({
  item,
  isLast,
  onPress,
}: {
  item: RestaurantCurationItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const deckLine = item.targetType === 'card' ? item.deckTitle : undefined;

  return (
    <TouchableOpacity
      style={[styles.itemRow, !isLast && styles.itemDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.thumb}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <StripePlaceholder size={56} />
        )}
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {deckLine ? (
          <Text style={styles.itemDeck} numberOfLines={1}>
            from {deckLine}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.onDarkMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },

  // ── Dark masthead ──────────────────────────────────────────
  masthead: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
  },
  mastheadBare: {
    paddingBottom: 18,
  },
  // With an announcement, leave room beneath the sign-off flourish.
  mastheadAnnounce: {
    paddingBottom: 16,
  },
  eyebrow: {
    color: COLORS.amber,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  headline: {
    color: COLORS.onDark,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1.1,
  },

  // ── Announcement zone ──────────────────────────────────────
  announceZone: {
    marginTop: 10,
  },
  // Shrink-to-content + centre: the zone sizes to the notice's natural width
  // (capped by the masthead), so the flex-end closing quote sits at the text's
  // end and a short notice rides in the middle rather than hugging the left.
  announceZoneFit: {
    alignSelf: 'center',
  },
  // Oversized opening quote, set in the Bulletin title face. The glyph sits
  // high in its em box, so a positive marginTop drops the whole line box down
  // until the bowl rests on the notice's first line; the matching extra-negative
  // marginBottom keeps the notice pulled up to the same Y, so only the glyph
  // moves. The glyph thus straddles the top-left corner, mirroring the closing
  // quote — which is pulled the other way (negative marginTop) at bottom-right.
  quoteOpen: {
    color: COLORS.onDarkMuted,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 54,
    lineHeight: 72,
    marginLeft: -2,
    marginTop: -3,
    marginBottom: -54,
  },
  // Closing quote, mirrored to the right edge to bracket the notice.
  quoteClose: {
    color: COLORS.onDarkMuted,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 54,
    lineHeight: 72,
    alignSelf: 'flex-end',
    marginRight: -2,
    marginTop: -27,
  },
  announceFlourish: {
    alignItems: 'center',
    // Pulls up under the closing quote, whose tall line box leaves slack below
    // the glyph, so the flourish sits close to the notice.
    marginTop: -34,
  },
  announceFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Notice text is inset on both sides so the corner quotes — pinned at the
  // zone edges — hang into the top-left / bottom-right corners and only kiss
  // the text rather than sitting wholly outside it.
  announceTextColumn: {
    paddingHorizontal: 26,
  },
  announceParagraph: {
    color: COLORS.onDarkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  announceLead: {
    fontFamily: 'Inter_500Medium',
  },
  announceRest: {
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },

  // ── Paper content band ─────────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  bodyContent: {
    flexGrow: 1,
  },
  errorBanner: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 26,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: COLORS.paper,
    fontSize: 13,
  },
  sections: {
    paddingHorizontal: 26,
    paddingTop: 4,
    paddingBottom: 24,
  },
  // Each category is an accordion row: a tappable heading and, when open, its
  // item rows. A hairline rule separates one category from the next.
  categoryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 18,
  },
  categoryTitle: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  categoryCount: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 24,
    marginRight: 16,
  },
  // Sits between the heading and the next category's rule when expanded.
  categoryItems: {
    paddingBottom: 8,
  },
  // ── In-season timeline ────────────────────────────────────
  timelineShell: {
    paddingBottom: 12,
  },
  timelineLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineLegendKey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineLegendSwatch: {
    width: 18,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
  },
  timelineLegendText: {
    color: COLORS.inkMute,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timelineSwipeHint: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 12,
  },
  timelineTable: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.paperHair,
    overflow: 'hidden',
  },
  timelineCorner: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.paperHair,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
    backgroundColor: 'rgba(20,18,15,0.035)',
  },
  timelineCornerText: {
    color: COLORS.inkMute,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timelineLabelRow: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.paperHair,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  timelineItemName: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 15,
    lineHeight: 17,
  },
  timelineItemRange: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 10,
    marginTop: 3,
  },
  timelineMonthsContent: {
    flexGrow: 0,
  },
  timelineMonthHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  timelineMonthHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.paperHair,
    backgroundColor: 'rgba(20,18,15,0.035)',
  },
  timelineCurrentHeader: {
    backgroundColor: 'rgba(232,154,43,0.16)',
  },
  timelineMonthName: {
    color: COLORS.inkMute,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  timelineCurrentMonthName: {
    color: COLORS.ink,
  },
  timelineMonthYear: {
    color: COLORS.inkFaint,
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  timelineGridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  timelineCell: {
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.paperHair,
  },
  timelineCurrentCell: {
    backgroundColor: 'rgba(232,154,43,0.055)',
  },
  timelineSeasonBand: {
    height: 14,
    backgroundColor: COLORS.amber,
  },
  timelineSeasonBandStart: {
    marginLeft: 6,
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  timelineSeasonBandEnd: {
    marginRight: 6,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
  // ── Item rows ──────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  thumb: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.paperHair,
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  itemDeck: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 13,
    marginTop: 4,
  },
});
