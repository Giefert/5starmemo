import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { StudyCardData } from '../types/shared';
import { StudyCard, LinkedTerm } from '../components/StudyCard';
import { SwipeableCard } from '../components/SwipeableCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';

const COLORS = {
  ink: '#14120F',
  bgHair: '#28251F',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
};

interface BrowseScreenProps {
  deckId: string;
  deckTitle: string;
  onExit: () => void;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({ deckId, deckTitle, onExit }) => {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<StudyCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<StudyCardData | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [linkedTerms, setLinkedTerms] = useState<LinkedTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<LinkedTerm | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getDeckForStudy(deckId);
      setCards(data.cards);
    } catch (error) {
      console.error('Failed to load cards for browsing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCard) {
      apiService.getTermsForCard(selectedCard.card.id)
        .then(setLinkedTerms)
        .catch(() => setLinkedTerms([]));
    } else {
      setLinkedTerms([]);
    }
  }, [selectedCard]);

  const handleSelectCard = (card: StudyCardData) => {
    setSelectedCard(card);
    setIsFlipped(false);
  };

  const handleBackToList = () => {
    setSelectedCard(null);
    setIsFlipped(false);
  };

  const handleSwipe = () => {
    // SwipeableCard only fires this for the active direction:
    // left while on the question side, right while on the answer side.
    setIsFlipped((flipped) => !flipped);
  };

  // Card detail view — mirrors the study session layout (edge-to-edge card,
  // ink masthead, ink/paper flip affordances).
  if (selectedCard) {
    return (
      <View style={styles.studyContainer}>
        {/* Masthead — ink ground */}
        <View style={[styles.masthead, { paddingTop: insets.top + 4 }]}>
          <View style={styles.mastheadRow}>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleBackToList}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.exitIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.mastheadTitle} numberOfLines={1}>
              {selectedCard.card.restaurantData?.itemName || 'Card'}
            </Text>
          </View>
        </View>

        <SwipeableCard onSwipe={handleSwipe} allowedDirection={isFlipped ? 'right' : 'left'}>
          <View style={styles.cardArea}>
            <StudyCard
              cardData={selectedCard}
              isFlipped={isFlipped}
              linkedTerms={linkedTerms}
              onTermPress={setSelectedTerm}
            />
          </View>

          {isFlipped ? (
            <View style={[styles.gradingZonePaper, { paddingBottom: insets.bottom + 4 }]}>
              <Text style={styles.swipeHintPaper}>Swipe right for question</Text>
            </View>
          ) : (
            <View style={[styles.gradingZoneInk, { paddingBottom: insets.bottom + 4 }]}>
              <TouchableOpacity
                style={styles.showAnswerButton}
                onPress={() => setIsFlipped(true)}
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
      </View>
    );
  }

  // Card list view
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{deckTitle}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No cards in this deck</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.card.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const imageUrl = item.card.imageUrl;
            return (
              <TouchableOpacity
                style={styles.cardItem}
                onPress={() => handleSelectCard(item)}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.thumbnail} contentFit="contain" />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Text style={styles.thumbnailPlaceholderText}>No img</Text>
                  </View>
                )}
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.card.restaurantData?.itemName || 'Untitled Card'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 70,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 10,
    color: '#999',
  },
  cardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  // ── Card detail view — study session layout ──────────────────
  studyContainer: {
    flex: 1,
    backgroundColor: COLORS.ink,
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
    fontSize: 22,
    color: COLORS.onDark,
    fontWeight: '300',
  },
  mastheadTitle: {
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
});
