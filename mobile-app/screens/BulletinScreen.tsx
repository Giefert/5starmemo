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
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { G, Path, Rect, Defs, Pattern, LinearGradient, Stop } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  BulletinPayload,
  CurationKind,
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

// The four curation sections, in fixed reading order. Each renders as a
// heading with its items listed directly underneath on the main page.
const SECTIONS: { kind: CurationKind; label: string }[] = [
  { kind: 'new_item', label: 'New items' },
  { kind: 'featured', label: 'Featured' },
  { kind: 'specials', label: 'Specials' },
  { kind: 'in_season', label: 'In season' },
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
  const [selectedDeck, setSelectedDeck] = useState<{ id: string; title: string } | null>(null);
  // Accordion: at most one category open at a time. Tapping the open one closes it.
  const [openSection, setOpenSection] = useState<CurationKind | null>(null);

  const loadBulletin = useCallback(async () => {
    try {
      const payload = await apiService.getBulletin();
      setData(payload);
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

  // A curation item routes into the existing Browse-mode card screen for its
  // deck — `targetId` is the deck for deck items, `deckId` for card items.
  const handleOpenItem = (item: RestaurantCurationItem) => {
    const deckId = item.targetType === 'deck' ? item.targetId : item.deckId;
    const title = item.targetType === 'deck' ? item.name : item.deckTitle ?? '';
    if (!deckId) return;
    setSelectedDeck({ id: deckId, title });
    setScreenState('browse');
  };

  if (screenState === 'browse' && selectedDeck) {
    return (
      <BrowseScreen
        deckId={selectedDeck.id}
        deckTitle={selectedDeck.title}
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
                  <View style={styles.categoryHeadingLeft}>
                    <Text style={styles.categoryTitle}>{section.label}</Text>
                    <Text style={styles.categoryCount}>{items.length}</Text>
                  </View>
                  <CategoryChevron open={isOpen} />
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.categoryItems}>
                    {items.map((item, i) => (
                      <ItemRow
                        key={`${item.targetType}:${item.targetId}`}
                        item={item}
                        isLast={i === items.length - 1}
                        onPress={() => handleOpenItem(item)}
                      />
                    ))}
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

// ── Category chevron ─────────────────────────────────────────
// The accordion's open/closed marker. Points right when closed and rotates
// to point down as its category expands.
function CategoryChevron({ open }: { open: boolean }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={9} height={14} viewBox="0 0 8 14">
        <Path
          d="M1 1l5 6-5 6"
          fill="none"
          stroke={COLORS.inkFaint}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

// ── Megaphone ────────────────────────────────────────────────
// The announcement-zone marker — a movie-set bullhorn, not a generic
// broadcast glyph. Filled paper, no stroke, rotated -45° so the bell
// points up and reads as "shouting".
function Megaphone({ size = 22, color = COLORS.paper }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <G rotation={-45} originX={10} originY={10} fill={color}>
        {/* Cone body — narrow mouthpiece on the left, flared bell on the right. */}
        <Path d="M3.5 8L13 5Q14.5 5 14.5 6L14.5 14Q14.5 15 13 15L3.5 12Z" />
        {/* Back cap. */}
        <Rect x={2} y={7.5} width={2} height={5} rx={0.7} />
        {/* Squared loop handle with a punched-out hole (evenodd). */}
        <Path
          fillRule="evenodd"
          d="M5 12H8Q8.5 12 8.5 12.5V15.5Q8.5 16 8 16H5Q4.5 16 4.5 15.5V12.5Q4.5 12 5 12ZM5.75 12.8H7.25V14.8H5.75Z"
        />
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
    <View onLayout={onMeasure}>
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
    <View style={styles.announceZone}>
      <View style={styles.announceRow}>
        <View style={styles.megaphoneWrap}>
          <Megaphone size={22} color={COLORS.paper} />
        </View>
        <View style={styles.announceTextWrap}>
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
        </View>
      </View>
      {/* Editorial end mark — closes the notice like a column break. */}
      <View style={styles.announceEndMark}>
        <View style={styles.announceEndDot} />
        <View style={styles.announceEndDot} />
        <View style={styles.announceEndDot} />
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
      <Svg width={8} height={14} viewBox="0 0 8 14" style={styles.itemChevron}>
        <Path
          d="M1 1l5 6-5 6"
          fill="none"
          stroke={COLORS.inkFaint}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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
  // Tighter with an announcement — the end-mark dots sit near the bottom edge.
  mastheadAnnounce: {
    paddingBottom: 8,
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
    marginTop: 14,
  },
  announceRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  announceEndMark: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginTop: 14,
  },
  announceEndDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.onDarkMuted,
  },
  megaphoneWrap: {
    flexShrink: 0,
    marginLeft: -2,
  },
  announceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  announceFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  announceParagraph: {
    color: COLORS.onDark,
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
  categoryHeadingLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexShrink: 1,
  },
  categoryTitle: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  categoryCount: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
  },
  // Sits between the heading and the next category's rule when expanded.
  categoryItems: {
    paddingBottom: 8,
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
  itemChevron: {
    flexShrink: 0,
  },
});
