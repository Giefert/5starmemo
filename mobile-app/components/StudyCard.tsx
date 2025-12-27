import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { StudyCardData, isMakiCard } from '../types/shared';
import { adjustUrlForPlatform } from '../utils/imageUrl';

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
  onFlip?: () => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped, onFlip }) => {
  const { card } = cardData;

  // Get image URL from card and adjust for platform (Android emulator needs 10.0.2.2)
  const imageUrl = adjustUrlForPlatform(card.imageUrl);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => onFlip?.()}
      activeOpacity={0.7}
    >
      {/* 1. Title Section - Always at top with padding */}
      <View style={styles.contentPadding}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainTitle}>
            {card.restaurantData?.itemName}
          </Text>
        </View>
        <View style={styles.divider} />
      </View>

      {/* 2. Image or Details - Fills remaining space */}
      {!isFlipped ? (
        // Image goes to bottom edge when not flipped
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
      ) : (
        // Details with padding when flipped - min height matches image square
        card.restaurantData && (
          <View style={styles.detailsMinHeight}>
            <View style={styles.contentPadding}>
              <View style={styles.detailsContainer}>
            {/* Food/Beverage fields (not shown for maki) */}
            {!isMakiCard(card.restaurantData) && (
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
                {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
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
            )}

            {/* Maki-specific fields */}
            {isMakiCard(card.restaurantData) && (
              <>
                {card.restaurantData.topping && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TOPPING</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.topping}
                    </Text>
                  </View>
                )}

                {card.restaurantData.base && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>BASE</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.base}
                    </Text>
                  </View>
                )}

                {card.restaurantData.sauce && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SAUCE</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.sauce}
                    </Text>
                  </View>
                )}

                {card.restaurantData.paper && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PAPER</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.paper}
                    </Text>
                  </View>
                )}

                {card.restaurantData.gluten && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>GLUTEN</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.gluten === 'yes' ? 'Yes' :
                       card.restaurantData.gluten === 'no' ? 'No' :
                       'Optional'}
                    </Text>
                  </View>
                )}
              </>
            )}
            </View>
            </View>
          </View>
        )
      )}
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
    maxHeight: '100%', // Prevents overlap with rating buttons below
  },
  // The Reserved Square
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1, // Forces a perfect square
    backgroundColor: '#F0F0F0', // Placeholder color
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsMinHeight: {
    width: '100%',
    aspectRatio: 1, // Minimum height matches image square, grows if content is taller
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
