import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { StudyCardData } from '../types/shared';
import { StudyCard, LinkedTerm } from '../components/StudyCard';
import { SwipeableCard } from '../components/SwipeableCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';
import { adjustUrlForPlatform } from '../utils/imageUrl';

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

  // Card detail view
  if (selectedCard) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedCard.card.restaurantData?.itemName || 'Card'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.cardDetailArea}>
          <SwipeableCard onSwipe={() => setIsFlipped(!isFlipped)}>
            <StudyCard
              cardData={selectedCard}
              isFlipped={isFlipped}
              linkedTerms={linkedTerms}
              onTermPress={setSelectedTerm}
            />
          </SwipeableCard>
        </View>
        <Text style={styles.swipeHintText}>SWIPE TO FLIP CARD</Text>
        <GlossaryTermModal
          term={selectedTerm}
          onDismiss={() => setSelectedTerm(null)}
        />
        <View style={{ height: insets.bottom + 16 }} />
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
            const imageUrl = adjustUrlForPlatform(item.card.imageUrl);
            return (
              <TouchableOpacity
                style={styles.cardItem}
                onPress={() => handleSelectCard(item)}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="contain" />
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
  cardDetailArea: {
    flex: 1,
    padding: 16,
  },
  swipeHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
});
