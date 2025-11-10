import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { StudyCardData } from '../types/shared';

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
}

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

              {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ingredients:</Text>
                  <View style={styles.ingredientsList}>
                    {card.restaurantData.ingredients.map((ingredient, index) => (
                      <Text key={index} style={styles.ingredientText}>
                        {ingredient}
                      </Text>
                    ))}
                  </View>
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
    paddingHorizontal: 20,
    paddingTop: 40,
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
  ingredientsList: {
    flex: 1,
  },
  ingredientText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 2,
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
});