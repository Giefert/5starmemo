import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studySessionManager } from '../services/StudySessionManager';
import { StudyCard } from '../components/StudyCard';
import { RatingButtons } from '../components/RatingButtons';
import { StudyCardData } from '../types/shared';

interface StudyScreenProps {
  deckId: string;
  deckTitle?: string;
  onComplete: (stats: {
    studied: number;
    correct: number;
    total: number;
  }) => void;
  onExit: () => void;
}

export const StudyScreen: React.FC<StudyScreenProps> = ({
  deckId,
  deckTitle,
  onComplete,
  onExit
}) => {
  const insets = useSafeAreaInsets()
  const [currentCard, setCurrentCard] = useState<StudyCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRatingButtons, setShowRatingButtons] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    studied: 0,
    correct: 0,
    percentage: 0,
  });

  useEffect(() => {
    startStudySession();
    
    return () => {
      // Clean up session on unmount
      studySessionManager.reset();
    };
  }, [deckId]);

  const startStudySession = async () => {
    try {
      setIsLoading(true);
      await studySessionManager.startSession(deckId, deckTitle);
      updateCurrentState();
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to start study session: ${error}`,
        [{ text: 'OK', onPress: onExit }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentState = () => {
    const card = studySessionManager.getCurrentCard();
    const progressInfo = studySessionManager.getProgress();

    setCurrentCard(card);
    setProgress(progressInfo);
    setShowRatingButtons(false);
    setIsFlipped(false);

    // Check if session is complete
    if (studySessionManager.isSessionComplete()) {
      onComplete({
        studied: progressInfo.studied,
        correct: progressInfo.correct,
        total: progressInfo.total,
      });
    }
  };

  const handleCardFlip = () => {
    // Flip the card and show rating buttons
    setIsFlipped(true);
    setShowRatingButtons(true);
  };

  const handleCardToggle = () => {
    // Toggle between question and answer sides
    // Only allow after initial answer reveal (rating buttons visible)
    if (showRatingButtons) {
      setIsFlipped(prev => !prev);
    }
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await studySessionManager.submitRating(rating);
      updateCurrentState();
    } catch (error) {
      Alert.alert('Error', `Failed to submit rating: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Study Session',
      'Are you sure you want to exit? Your progress will be saved.',
      [
        { text: 'Continue Studying', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive', 
          onPress: () => {
            studySessionManager.reset();
            onExit();
          }
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading study session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.noCardsText}>No cards available for study</Text>
          <TouchableOpacity style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Zone */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
            <Text style={styles.exitIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            {deckTitle && (
              <Text style={styles.deckTitle}>{deckTitle}</Text>
            )}
            {/* Slimmer, Blue Focus Progress Bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(5, progress.percentage)}%` }]} />
            </View>
          </View>
        </View>

        {/* Main Card Zone */}
        <View style={styles.cardArea}>
          <StudyCard
            cardData={currentCard}
            isFlipped={isFlipped}
            onFlip={handleCardToggle}
          />
        </View>

        {/* Bottom Grading Zone */}
        {showRatingButtons ? (
          <View style={styles.gradingZone}>
            <RatingButtons
              onRating={handleRating}
              disabled={isSubmitting}
            />
          </View>
        ) : (
          <View style={styles.gradingZone}>
            <TouchableOpacity
              style={styles.showAnswerButton}
              onPress={handleCardFlip}
              activeOpacity={0.7}
            >
              <Text style={styles.showAnswerText}>SHOW ANSWER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Overlay */}
        {isSubmitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6F2', // Warm Off-White Canvas
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  exitButton: {
    position: 'absolute',
    top: -10,
    left: 12,
    padding: 8,
    zIndex: 10,
  },
  exitIcon: {
    fontSize: 24,
    color: '#2D2D2D', // Charcoal
    fontWeight: '300',
  },
  progressContainer: {
    width: '100%',
  },
  deckTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4, // Slimmer profile
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2', // Focus Blue
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16, // Breathing room for the card
    paddingBottom: 20,
  },
  gradingZone: {
    paddingBottom: 20,
  },
  showAnswerButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  showAnswerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  noCardsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});