import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { StudyStats, Deck } from '../types/shared';
import apiService from '../services/api';
import { StudyScreen } from './StudyScreen';
import { StudyCompletedScreen } from './StudyCompletedScreen';

type ScreenState = 'home' | 'study' | 'completed';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets()
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [studyStats, setStudyStats] = useState<{
    studied: number;
    correct: number;
    total: number;
  } | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading study data...');
      const [statsData, decksData] = await Promise.all([
        apiService.getStudyStats(),
        apiService.getAvailableDecks(),
      ]);
      console.log('Data loaded successfully:', { statsData, decksData });
      setStats(statsData);
      setDecks(decksData);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Connection Error',
        `Failed to load study data. Please check your internet connection.\n\nError: ${errorMessage}`,
        [
          { text: 'Retry', onPress: () => loadData() },
          { text: 'Continue Offline', onPress: () => {
            // Set empty data for offline mode
            setStats({ totalCards: 0, studiedToday: 0, averageScore: 0 });
            setDecks([]);
            setIsLoading(false);
          }}
        ]
      );
      return; // Don't execute finally block
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleStartStudy = (deck: Deck) => {
    setSelectedDeck(deck);
    setScreenState('study');
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
        deckId={selectedDeck.id}
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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your study data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>Hello, {user?.username}!</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.dailyStats.studied}</Text>
              <Text style={styles.statLabel}>Cards Studied</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.dailyStats.correct}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.newCards}</Text>
              <Text style={styles.statLabel}>New Cards</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.reviewCards}</Text>
              <Text style={styles.statLabel}>Review Cards</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.decksContainer}>
        <Text style={styles.sectionTitle}>Available Decks</Text>
        {decks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No decks available yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Ask your instructor to create some study decks!
            </Text>
          </View>
        ) : (
          decks.map((deck) => (
            <TouchableOpacity 
              key={deck.id} 
              style={styles.deckCard}
              onPress={() => handleStartStudy(deck)}
            >
              <View style={styles.deckInfo}>
                <Text style={styles.deckTitle}>{deck.title}</Text>
                {deck.description && (
                  <Text style={styles.deckDescription}>{deck.description}</Text>
                )}
                <Text style={styles.deckStats}>
                  {deck.cardCount || 0} cards • {deck.newCards || 0} new • {deck.reviewCards || 0} review
                </Text>
              </View>
              <View style={styles.studyButton}>
                <Text style={styles.studyButtonText}>Study</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  decksContainer: {
    padding: 20,
    paddingTop: 0,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  deckCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  deckDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deckStats: {
    fontSize: 12,
    color: '#999',
  },
  studyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  studyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});