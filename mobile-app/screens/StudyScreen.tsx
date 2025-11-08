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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading study session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.noCardsText}>No cards available for study</Text>
          <TouchableOpacity style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>

        {deckTitle && (
          <Text style={styles.deckTitle}>{deckTitle}</Text>
        )}

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.percentage}%` }
            ]}
          />
        </View>
      </View>

      {/* Study Card */}
      <View style={styles.cardContainer}>
        <StudyCard
          cardData={currentCard}
          isFlipped={isFlipped}
        />
      </View>

      {/* Rating Buttons / Show Answer */}
      <View style={styles.ratingContainer}>
        {showRatingButtons ? (
          <RatingButtons
            onRating={handleRating}
            disabled={isSubmitting}
          />
        ) : (
          <TouchableOpacity
            style={styles.showAnswerButton}
            onPress={handleCardFlip}
            activeOpacity={0.7}
          >
            <Text style={styles.showAnswerText}>SHOW ANSWER</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 10,
  },
  exitButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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