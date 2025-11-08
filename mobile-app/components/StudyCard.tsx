import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { StudyCardData } from '../types/shared';

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
}

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

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped }) => {
  const { card } = cardData;

  return (
    <View style={styles.container}>
      {/* Question/Front - Always visible */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          {card.restaurantData ? card.restaurantData.itemName : card.front}
        </Text>
      </View>

      {/* Answer/Back - Only visible when flipped */}
      {isFlipped && (
        <View style={styles.answerContainer}>
          {/* Card Image - Only show on answer side */}
          {card.imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: getImageUrl(card.imageUrl) }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Answer Details */}
          {card.restaurantData ? (
            <View style={styles.detailsContainer}>
              {card.restaurantData.tastingNotes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tasting Notes:</Text>
                  <Text style={styles.detailValue}>
                    {card.restaurantData.tastingNotes.join(', ')}
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

              {card.restaurantData.ingredients && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ingredients:</Text>
                  <Text style={styles.detailValue}>
                    {card.restaurantData.ingredients.join(', ')}
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

              {card.restaurantData.specialNotes && (
                <View style={styles.specialNotesContainer}>
                  <Text style={styles.specialNotesText}>
                    💡 {card.restaurantData.specialNotes}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.answerText}>{card.back}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  questionText: {
    fontSize: 28,
    lineHeight: 36,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '600',
  },
  answerContainer: {
    marginTop: 20,
  },
  answerText: {
    fontSize: 20,
    lineHeight: 28,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  detailsContainer: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 100,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  allergensRow: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  allergensText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    flex: 1,
  },
  specialNotesContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  specialNotesText: {
    fontSize: 14,
    color: '#1565C0',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});