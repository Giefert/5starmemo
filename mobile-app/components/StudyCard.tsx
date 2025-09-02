import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { StudyCardData } from '../types/shared';

interface StudyCardProps {
  cardData: StudyCardData;
  onFlip?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

// Function to construct proper image URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Get web-api URL based on platform (images are served by web-api on port 3001)
  let webApiUrl;
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      webApiUrl = 'http://localhost:3001';
    } else if (Platform.OS === 'android') {
      webApiUrl = 'http://10.0.2.2:3001';
    } else {
      webApiUrl = 'http://localhost:3001';
    }
  } else {
    webApiUrl = 'http://localhost:3001'; // Production would use actual domain
  }
  
  return `${webApiUrl}${imagePath}`;
};

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, onFlip }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    onFlip?.();
  };

  const { card } = cardData;

  // Get category-specific colors
  const getCategoryStyles = () => {
    if (!card.restaurantData) return {};
    
    switch (card.restaurantData.category) {
      case 'food':
        return { backgroundColor: '#f8fff4', borderLeftColor: '#4CAF50', borderLeftWidth: 4 };
      case 'wine':
        return { backgroundColor: '#faf5ff', borderLeftColor: '#9C27B0', borderLeftWidth: 4 };
      case 'beer':
        return { backgroundColor: '#fffbf0', borderLeftColor: '#FF9800', borderLeftWidth: 4 };
      case 'cocktail':
        return { backgroundColor: '#fdf2f8', borderLeftColor: '#E91E63', borderLeftWidth: 4 };
      case 'spirit':
        return { backgroundColor: '#fff7ed', borderLeftColor: '#F57C00', borderLeftWidth: 4 };
      case 'non-alcoholic':
        return { backgroundColor: '#f0f9ff', borderLeftColor: '#2196F3', borderLeftWidth: 4 };
      default:
        return {};
    }
  };

  const categoryStyles = getCategoryStyles();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.card, categoryStyles]} 
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
                source={{ uri: getImageUrl(card.imageUrl) }} 
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Card Content */}
          <View style={styles.textContainer}>
            {!isFlipped ? (
              // Front of card - Show item name and category for restaurant cards
              <View style={styles.cardSide}>
                {card.restaurantData ? (
                  <>
                    <Text style={styles.sideLabel}>
                      {card.restaurantData.category.toUpperCase()}
                    </Text>
                    <Text style={styles.cardText}>{card.restaurantData.itemName}</Text>
                    {card.restaurantData.region && (
                      <Text style={styles.subtitleText}>from {card.restaurantData.region}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.sideLabel}>Front</Text>
                    <Text style={styles.cardText}>{card.front}</Text>
                  </>
                )}
              </View>
            ) : (
              // Back of card - Show structured restaurant data or plain back
              <View style={styles.cardSide}>
                {card.restaurantData ? (
                  <View style={styles.restaurantDetails}>
                    <Text style={styles.sideLabel}>Details</Text>
                    
                    {/* Description */}
                    <Text style={styles.descriptionText}>{card.restaurantData.description}</Text>
                    
                    {/* Key Details */}
                    <View style={styles.detailsGrid}>
                      {card.restaurantData.ingredients && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Ingredients:</Text>
                          <Text style={styles.detailValue}>
                            {card.restaurantData.ingredients.join(', ')}
                          </Text>
                        </View>
                      )}
                      
                      {card.restaurantData.abv && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>ABV:</Text>
                          <Text style={styles.detailValue}>{card.restaurantData.abv}%</Text>
                        </View>
                      )}
                      
                      {card.restaurantData.vintage && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Vintage:</Text>
                          <Text style={styles.detailValue}>{card.restaurantData.vintage}</Text>
                        </View>
                      )}
                      
                      {card.restaurantData.grapeVarieties && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Grapes:</Text>
                          <Text style={styles.detailValue}>
                            {card.restaurantData.grapeVarieties.join(', ')}
                          </Text>
                        </View>
                      )}
                      
                      {card.restaurantData.tastingNotes && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tasting Notes:</Text>
                          <Text style={styles.detailValue}>
                            {card.restaurantData.tastingNotes.join(', ')}
                          </Text>
                        </View>
                      )}
                      
                      {card.restaurantData.foodPairings && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Pairs with:</Text>
                          <Text style={styles.detailValue}>
                            {card.restaurantData.foodPairings.join(', ')}
                          </Text>
                        </View>
                      )}
                      
                      {card.restaurantData.allergens && (
                        <View style={[styles.detailRow, styles.allergensRow]}>
                          <Text style={styles.detailLabel}>⚠️ Allergens:</Text>
                          <Text style={styles.allergensText}>
                            {card.restaurantData.allergens.join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {card.restaurantData.specialNotes && (
                      <View style={styles.specialNotesContainer}>
                        <Text style={styles.specialNotesText}>
                          💡 {card.restaurantData.specialNotes}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <Text style={styles.sideLabel}>Back</Text>
                    <Text style={styles.cardText}>{card.back}</Text>
                  </>
                )}
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
  // Restaurant card specific styles
  subtitleText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  restaurantDetails: {
    alignItems: 'stretch',
    width: '100%',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsGrid: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 12,
    color: '#1a1a1a',
    flex: 1,
  },
  allergensRow: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  allergensText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    flex: 1,
  },
  specialNotesContainer: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  specialNotesText: {
    fontSize: 12,
    color: '#1565C0',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});