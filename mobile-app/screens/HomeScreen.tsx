import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { StudentDeck } from '../types/shared';
import apiService from '../services/api';
import { StudyScreen } from './StudyScreen';
import { StudyCompletedScreen } from './StudyCompletedScreen';
import { BrowseScreen } from './BrowseScreen';

type ScreenState = 'home' | 'study' | 'completed' | 'browse';
type Mode = 'recommended' | 'full' | 'browse';

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

const MODE_LABELS: Array<'Recommended' | 'Full' | 'Browse'> = [
  'Recommended',
  'Full',
  'Browse',
];

// MODE_VALUES lines up index-for-index with MODE_LABELS so the segmented
// toggle can be labelled without forking the existing `mode` state.
const MODE_VALUES = ['recommended', 'full', 'browse'] as const;

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [decks, setDecks] = useState<StudentDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [mode, setMode] = useState<Mode>('recommended');
  const [selectedDeck, setSelectedDeck] = useState<StudentDeck | null>(null);
  const [studyStats, setStudyStats] = useState<{
    studied: number;
    correct: number;
    total: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { logout, restaurant } = useAuth();

  // Mode toggle underline — the amber bar slides beneath the active mode and
  // resizes to its label, matching the Reference tab's Index strip. `barX`/
  // `barW` drive the slide; `toggleLayouts` caches each label's measured x/
  // width, keyed by mode value, so the bar can be placed without a re-measure.
  const barX = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(0)).current;
  const toggleLayouts = useRef<Record<string, { x: number; width: number }>>({});

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

  useEffect(() => {
    loadData();
  }, []);

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
    if (mode === 'browse') {
      handleBrowseDeck(deck);
    } else {
      handleStartStudy(deck);
    }
  };

  const handleStartStudy = (deck: StudentDeck) => {
    setSelectedDeck(deck);
    setScreenState('study');
  };

  const handleBrowseDeck = (deck: StudentDeck) => {
    setSelectedDeck(deck);
    setScreenState('browse');
  };

  const handleStudyComplete = (stats: {
    studied: number;
    correct: number;
    total: number;
  }) => {
    setStudyStats(stats);
    setScreenState('completed');
    // Refresh stats after study session
    loadData();
  };

  const handleBackToHome = () => {
    setScreenState('home');
    setSelectedDeck(null);
    setStudyStats(null);
    // Refresh data when returning to home
    loadData();
  };

  // Render different screens based on state
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
        deckTitle={selectedDeck?.title}
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
      />
    );
  }

  return (
    <View style={styles.screen}>
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
        {isLoading && decks.length === 0 ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        ) : decks.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.emptyTitle}>Nothing on the shelf yet.</Text>
            <Text style={styles.emptyBody}>
              Decks the team publishes will show up here.
            </Text>
          </View>
        ) : (
          decks.map((deck, i) => {
            return (
              <Pressable
                key={deck.id}
                onPress={() => handleDeckTap(deck)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                {deck.isFeatured && (
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    style={styles.featuredStar}
                    accessibilityLabel="Featured"
                  >
                    <Path
                      d="M12 1.5 l3.09 6.91 7.41.57 -5.71 4.83 1.85 7.19 -6.64-4.13 -6.64 4.13 1.85-7.19 -5.71-4.83 7.41-.57 z"
                      fill={COLORS.amber}
                    />
                  </Svg>
                )}

                <Text
                  style={[styles.deckTitle, deck.isFeatured && styles.deckTitleFeatured]}
                >
                  {deck.title}
                </Text>

                {!!deck.description && (
                  <Text style={styles.deckDescription} numberOfLines={2}>
                    {deck.description}
                  </Text>
                )}

                <DeckStats
                  key={`${deck.masteredCards}-${deck.learningCards}-${deck.weakCards}-${deck.cardCount}`}
                  deck={deck}
                  mode={mode}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

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

  featuredStar: {
    position: 'absolute',
    top: 20,
    right: 22,
  },

  deckTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: COLORS.ink,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  deckTitleFeatured: {
    paddingRight: 28, // leaves room for the star
  },

  deckDescription: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMute,
    marginTop: 8,
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