import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    loadData();
  }, []);

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
          {MODE_LABELS.map((label, i) => {
            const value = MODE_VALUES[i];
            const active = mode === value;
            return (
              <Pressable
                key={value}
                onPress={() => setMode(value)}
                hitSlop={8}
                style={styles.toggleItem}
              >
                <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                  {label}
                </Text>
                <View
                  style={[styles.toggleUnderline, active && styles.toggleUnderlineActive]}
                />
              </Pressable>
            );
          })}
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
            const fullyMastered = deck.weakCards === 0 && deck.learningCards === 0;
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

                <View style={styles.statsRow}>
                  <Stat label="Mastered" value={deck.masteredCards} />
                  <Stat label="Learning" value={deck.learningCards} />
                  <Stat label="Weak" value={deck.weakCards} weak />
                  {fullyMastered && (
                    <Text style={styles.allMastered}>All mastered</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

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
    flexDirection: 'row',
    marginTop: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
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
  toggleUnderline: {
    height: 1.5,
    width: '100%',
    backgroundColor: 'transparent',
    marginTop: -1.5,
  },
  toggleUnderlineActive: { backgroundColor: COLORS.amber },

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
    gap: 18,
  },
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