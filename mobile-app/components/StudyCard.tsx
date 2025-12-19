import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { StudyCardData } from '../types/shared';

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
  onFlip?: () => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped, onFlip }) => {
  const { card } = cardData;

  // Placeholder for image logic.
  // Ideally, your cardData structure should eventually have an 'imageUrl' field.
  const imageUrl = card.restaurantData?.imageUrl;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => onFlip?.()}
      activeOpacity={0.7}
    >

      {/* 1. Reserved Square Image Space */}
      {!isFlipped && (
        <View style={styles.imagePlaceholder}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.emptyImageState}>
            <Text style={styles.emptyImageText}>No Image</Text>
          </View>
        )}
        </View>
      )}

      <View style={styles.contentPadding}>
        {/* 2. Question / Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.mainTitle}>
            {card.restaurantData ? card.restaurantData.itemName : card.front}
          </Text>
        </View>

        {/* 3. Divider */}
        <View style={styles.divider} />

        {/* 4. Answer / Details */}
        {isFlipped && (
          <View style={styles.detailsContainer}>
            {card.restaurantData ? (
              <>
                {/* Tasting Notes */}
                {card.restaurantData.tastingNotes && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTING NOTES</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.tastingNotes.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Ingredients */}
                {card.restaurantData.ingredients?.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>INGREDIENTS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.ingredients.map((ing, i) => (
                        <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Allergens - Redesigned as Integrated Warning */}
                {card.restaurantData.allergens && (
                  <View style={styles.allergenContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.allergenText}>
                      Contains: <Text style={styles.allergenBold}>{card.restaurantData.allergens.join(', ')}</Text>
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.backText}>{card.back}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Softer, modern corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, // Very subtle shadow
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden', // Ensures image stays within rounded corners
    width: '100%',
  },
  // The Reserved Square
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1, // Forces a perfect square
    backgroundColor: '#F0F0F0', // Placeholder color
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  emptyImageState: {
    opacity: 0.3,
  },
  emptyImageText: {
    color: '#999',
    fontWeight: '600',
  },
  contentPadding: {
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800', // Heavy weight for hierarchy
    color: '#2D2D2D', // Charcoal
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '40%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailsContainer: {
    gap: 20, // Clean spacing between sections
  },
  detailBlock: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF', // Muted gray for metadata
    marginBottom: 6,
    letterSpacing: 1, // Uppercase needs spacing
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  ingredientList: {
    marginTop: 2,
  },
  ingredientItem: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26, // Generous line height for scanning
  },
  // New Allergen Styling
  allergenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF8F1', // Very faint orange bg
    padding: 12,
    borderRadius: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  allergenText: {
    fontSize: 14,
    color: '#D97706', // Warm Amber
  },
  allergenBold: {
    fontWeight: '700',
  },
  backText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#4B5563',
  }
});
