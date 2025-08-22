import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { StudyCardData } from '../types/shared';

interface StudyCardProps {
  cardData: StudyCardData;
  onFlip?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, onFlip }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    onFlip?.();
  };

  const { card } = cardData;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={handleFlip}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {/* Card State Indicator */}
          <View style={styles.stateIndicator}>
            <View style={[
              styles.stateBadge, 
              cardData.isNew ? styles.stateNew :
              cardData.fsrsData.state === 'learning' ? styles.stateLearning :
              cardData.fsrsData.state === 'review' ? styles.stateReview :
              styles.stateRelearning
            ]}>
              <Text style={styles.stateText}>
                {cardData.isNew ? 'NEW' : cardData.fsrsData.state.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Card Image */}
          {card.imageUrl && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: card.imageUrl }} 
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Card Content */}
          <View style={styles.textContainer}>
            {!isFlipped ? (
              // Front of card
              <View style={styles.cardSide}>
                <Text style={styles.sideLabel}>Front</Text>
                <Text style={styles.cardText}>{card.front}</Text>
              </View>
            ) : (
              // Back of card
              <View style={styles.cardSide}>
                <Text style={styles.sideLabel}>Back</Text>
                <Text style={styles.cardText}>{card.back}</Text>
              </View>
            )}
          </View>

          {/* Flip Instruction */}
          <View style={styles.flipHint}>
            <Text style={styles.flipHintText}>
              {!isFlipped ? 'Tap to reveal answer' : 'Tap to see question'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: screenWidth - 40,
    minHeight: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  stateIndicator: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateNew: {
    backgroundColor: '#007AFF',
  },
  stateLearning: {
    backgroundColor: '#FF9500',
  },
  stateReview: {
    backgroundColor: '#34C759',
  },
  stateRelearning: {
    backgroundColor: '#FF3B30',
  },
  stateText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardSide: {
    alignItems: 'center',
  },
  sideLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    fontSize: 20,
    lineHeight: 28,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '400',
  },
  flipHint: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  flipHintText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});