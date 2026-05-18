import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studySessionManager } from '../services/StudySessionManager';
import { StudyCard, LinkedTerm } from '../components/StudyCard';
import { SwipeableCard } from '../components/SwipeableCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';
import { RatingButtons } from '../components/RatingButtons';
import apiService from '../services/api';
import { StudyCardData } from '../types/shared';

import { CurationKind } from '../types/shared';
import { DeckStudyMode } from '../services/StudySessionManager';

const COLORS = {
  ink: '#14120F',
  inkSoft: '#1C1A16',
  bgHair: '#28251F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

type StudyTarget =
  | { kind: 'deck'; deckId: string; deckTitle?: string; mode?: DeckStudyMode }
  | { kind: 'curation'; curationKind: CurationKind; title: string };

interface StudyScreenProps {
  target: StudyTarget;
  onComplete: (stats: {
    studied: number;
    correct: number;
    total: number;
  }) => void;
  onExit: () => void;
}

export const StudyScreen: React.FC<StudyScreenProps> = ({
  target,
  onComplete,
  onExit
}) => {
  const insets = useSafeAreaInsets()
  // Full-deck sessions browse the entire deck — there's no recall to grade,
  // so they advance with a plain "Next" rather than rating buttons.
  const isGraded = !(target.kind === 'deck' && target.mode === 'full');
  const headerTitle = target.kind === 'deck' ? target.deckTitle : target.title;
  const targetKey = target.kind === 'deck' ? target.deckId : target.curationKind;
  const [currentCard, setCurrentCard] = useState<StudyCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [linkedTerms, setLinkedTerms] = useState<LinkedTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<LinkedTerm | null>(null);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    studied: 0,
    correct: 0,
    percentage: 0,
    unitStartIndices: [] as number[],
  });

  useEffect(() => {
    startStudySession();

    return () => {
      // Clean up session on unmount
      studySessionManager.reset();
    };
  }, [targetKey]);

  useEffect(() => {
    if (currentCard) {
      apiService.getTermsForCard(currentCard.card.id)
        .then(setLinkedTerms)
        .catch(() => setLinkedTerms([]));
    } else {
      setLinkedTerms([]);
    }
  }, [currentCard]);

  const startStudySession = async () => {
    try {
      setIsLoading(true);
      await studySessionManager.startSession(target);
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

  const handleSwipe = () => {
    // SwipeableCard only fires this for the active direction:
    // left while on the question side, right while on the answer side.
    if (!isFlipped) {
      handleCardFlip();
    } else {
      setIsFlipped(false);
    }
  };

  const handleCardFlip = () => {
    setIsFlipped(true);
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

  const handleNext = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await studySessionManager.advance();
      updateCurrentState();
    } catch (error) {
      Alert.alert('Error', `Failed to advance: ${error}`);
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.amber} />
        <Text style={styles.loadingText}>Loading study session…</Text>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.noCardsText}>No cards available for study</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={styles.noCardsExit}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Session masthead — ink ground */}
      <View style={[styles.masthead, { paddingTop: insets.top + 4 }]}>
        <View style={styles.mastheadRow}>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.exitIcon}>✕</Text>
          </TouchableOpacity>

          {headerTitle && (
            <Text style={styles.deckTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
          )}

          <Text style={styles.counter}>
            <Text style={styles.counterCurrent}>{progress.current}</Text>
            <Text style={styles.counterSlash}> / </Text>
            <Text>{progress.total}</Text>
          </Text>
        </View>

        {/* Progress rule */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.max(2, progress.percentage)}%` }]} />
          {progress.total > 0 && progress.unitStartIndices.slice(1).map((startIdx) => {
            const passed = startIdx / progress.total <= progress.percentage / 100;
            return (
              <View
                key={startIdx}
                style={[
                  styles.progressMarker,
                  { left: `${(startIdx / progress.total) * 100}%` },
                  passed && styles.progressMarkerPassed,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Main card zone — card and grading zone slide together */}
      <SwipeableCard onSwipe={handleSwipe} allowedDirection={isFlipped ? 'right' : 'left'}>
        <View style={styles.cardArea}>
          <StudyCard
            cardData={currentCard}
            isFlipped={isFlipped}
            linkedTerms={linkedTerms}
            onTermPress={setSelectedTerm}
          />
        </View>

        {/* Bottom grading zone — slides away with the card */}
        {isFlipped ? (
          <View style={[styles.gradingZonePaper, { paddingBottom: insets.bottom + 4 }]}>
            {isGraded ? (
              <RatingButtons
                onRating={handleRating}
                disabled={isSubmitting}
              />
            ) : (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={[styles.nextButtonText, isSubmitting && styles.nextButtonTextDisabled]}>
                  Next Card
                </Text>
                {!isSubmitting && <View style={styles.nextButtonMarker} />}
              </TouchableOpacity>
            )}
            <Text style={styles.swipeHintPaper}>Swipe right for question</Text>
          </View>
        ) : (
          <View style={[styles.gradingZoneInk, { paddingBottom: insets.bottom + 4 }]}>
            <TouchableOpacity
              style={styles.showAnswerButton}
              onPress={handleCardFlip}
              activeOpacity={0.7}
            >
              <Text style={styles.showAnswerText}>Swipe left to reveal · or tap</Text>
            </TouchableOpacity>
          </View>
        )}
      </SwipeableCard>

      <GlossaryTermModal
        term={selectedTerm}
        onDismiss={() => setSelectedTerm(null)}
      />

      {/* Loading overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.amber} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  masthead: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  exitButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    zIndex: 10,
  },
  exitIcon: {
    fontSize: 20,
    color: COLORS.onDark,
    fontWeight: '300',
  },
  deckTitle: {
    position: 'absolute',
    left: 28,
    right: 28,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onDarkMute,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
  counter: {
    marginLeft: 'auto',
    fontFamily: 'Georgia',
    fontSize: 13,
    color: COLORS.onDarkMute,
  },
  counterCurrent: {
    color: COLORS.onDark,
  },
  counterSlash: {
    color: COLORS.onDarkMute,
  },
  progressBar: {
    height: 2,
    marginTop: 10,
    backgroundColor: COLORS.bgHair,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.amber,
  },
  progressMarker: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 1,
    backgroundColor: COLORS.onDarkMute,
  },
  progressMarkerPassed: {
    backgroundColor: COLORS.ink,
  },
  cardArea: {
    flex: 1,
  },
  gradingZoneInk: {
    backgroundColor: COLORS.ink,
    paddingTop: 4,
  },
  gradingZonePaper: {
    backgroundColor: COLORS.paper,
  },
  showAnswerButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButton: {
    paddingTop: 22,
    paddingBottom: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  nextButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ink,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  nextButtonTextDisabled: {
    color: COLORS.inkFaint,
  },
  nextButtonMarker: {
    marginTop: 8,
    width: 8,
    height: 8,
    backgroundColor: COLORS.inkFaint,
  },
  showAnswerText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onDarkMute,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  swipeHintPaper: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkFaint,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.onDarkMute,
  },
  noCardsText: {
    fontSize: 17,
    color: COLORS.onDark,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  noCardsExit: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.amber,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 18, 15, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
