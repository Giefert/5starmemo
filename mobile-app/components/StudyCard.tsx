import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import {
  StudyCardData,
  isMakiCard,
  isSakeCard,
  isWineCard,
  isBeerCard,
  isCocktailCard,
  isSpiritCard,
  isSauceCard
} from '../types/shared';
import { adjustUrlForPlatform } from '../utils/imageUrl';

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
  onFlip?: () => void;
}

// Helper component to render wine characteristic meter bars
const WineMeterBar: React.FC<{
  level: number;
  leftLabel: string;
  rightLabel: string;
}> = ({ level, leftLabel, rightLabel }) => {
  return (
    <View style={styles.meterRow}>
      <Text style={styles.meterEndLabel}>{leftLabel}</Text>
      <View style={styles.meterBarContainer}>
        {[1, 2, 3, 4, 5].map((position) => (
          <View
            key={position}
            style={[
              styles.meterSegment,
              position === level && styles.meterSegmentFilled
            ]}
          />
        ))}
      </View>
      <Text style={styles.meterEndLabel}>{rightLabel}</Text>
    </View>
  );
};

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
            {/* Sake-specific fields */}
            {isSakeCard(card.restaurantData) && (
              <>
                {/* Region/Origin */}
                {card.restaurantData.region && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>REGION/ORIGIN</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.region}
                    </Text>
                  </View>
                )}

                {/* Producer */}
                {card.restaurantData.producer && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PRODUCER</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.producer}
                    </Text>
                  </View>
                )}

                {/* Rice Variety */}
                {card.restaurantData.riceVariety && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>RICE VARIETY</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.riceVariety}
                    </Text>
                  </View>
                )}

                {/* Vintage */}
                {card.restaurantData.vintage && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>VINTAGE</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.vintage}
                    </Text>
                  </View>
                )}

                {/* Tasting Notes */}
                {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTING NOTES</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.tastingNotes.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Serving Temperature */}
                {card.restaurantData.servingTemp && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SERVING TEMPERATURE</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.servingTemp}
                    </Text>
                  </View>
                )}

                {/* Food Pairings */}
                {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>FOOD PAIRINGS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.foodPairings.map((pairing, i) => (
                        <Text key={i} style={styles.ingredientItem}>• {pairing}</Text>
                      ))}
                    </View>
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

                {/* Allergens */}
                {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                  <View style={styles.allergenContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.allergenText}>
                      Contains: <Text style={styles.allergenBold}>{card.restaurantData.allergens.join(', ')}</Text>
                    </Text>
                  </View>
                )}

                {/* ABV */}
                {card.restaurantData.abv !== undefined && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ABV</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.abv}%
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Wine-specific fields */}
            {isWineCard(card.restaurantData) && (
              <>
                {/* Appellation & Vintage Row - FIRST */}
                {(card.restaurantData.appellation || card.restaurantData.vintage) && (
                  <View style={styles.rowContainer}>
                    {/* Appellation - Left */}
                    {card.restaurantData.appellation && (
                      <View style={styles.columnBlock}>
                        <Text style={styles.label}>APPELLATION</Text>
                        <Text style={styles.valueText}>
                          {card.restaurantData.appellation}
                        </Text>
                      </View>
                    )}

                    {/* Vintage - Right */}
                    {card.restaurantData.vintage && (
                      <View style={styles.columnBlock}>
                        <Text style={styles.label}>VINTAGE</Text>
                        <Text style={styles.valueText}>
                          {card.restaurantData.vintage}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Grape Varieties - SECOND */}
                {card.restaurantData.grapeVarieties && card.restaurantData.grapeVarieties.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>GRAPE VARIETIES</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.grapeVarieties.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Tasting Notes - THIRD */}
                {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTING NOTES</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.tastingNotes.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Region - FOURTH */}
                {card.restaurantData.region && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>REGION</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.region}
                    </Text>
                  </View>
                )}

                {/* Producer - FIFTH */}
                {card.restaurantData.producer && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PRODUCER</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.producer}
                    </Text>
                  </View>
                )}

                {/* Serving Temperature */}
                {card.restaurantData.servingTemp && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SERVING TEMPERATURE</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.servingTemp}
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

                {/* Allergens */}
                {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                  <View style={styles.allergenContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.allergenText}>
                      Contains: <Text style={styles.allergenBold}>{card.restaurantData.allergens.join(', ')}</Text>
                    </Text>
                  </View>
                )}

                {/* Food Pairings */}
                {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>FOOD PAIRINGS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.foodPairings.map((pairing, i) => (
                        <Text key={i} style={styles.ingredientItem}>• {pairing}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* ABV */}
                {card.restaurantData.abv !== undefined && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ABV</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.abv}%
                    </Text>
                  </View>
                )}

                {/* Wine Characteristic Meters - At the very bottom */}
                {(card.restaurantData.bodyLevel ||
                  card.restaurantData.sweetnessLevel ||
                  card.restaurantData.acidityLevel) && (
                  <View style={styles.meterSection}>
                    {card.restaurantData.bodyLevel && (
                      <WineMeterBar
                        level={card.restaurantData.bodyLevel}
                        leftLabel="Light"
                        rightLabel="Bold"
                      />
                    )}
                    {card.restaurantData.sweetnessLevel && (
                      <WineMeterBar
                        level={card.restaurantData.sweetnessLevel}
                        leftLabel="Dry"
                        rightLabel="Sweet"
                      />
                    )}
                    {card.restaurantData.acidityLevel && (
                      <WineMeterBar
                        level={card.restaurantData.acidityLevel}
                        leftLabel="Soft"
                        rightLabel="Acidic"
                      />
                    )}
                  </View>
                )}
              </>
            )}

            {/* Beer-specific fields */}
            {isBeerCard(card.restaurantData) && (
              <>
                {/* ABV */}
                {card.restaurantData.abv !== undefined && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ABV</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.abv}%
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Cocktail-specific fields */}
            {isCocktailCard(card.restaurantData) && (
              <>
                {/* Alcohol */}
                {card.restaurantData.alcohol && card.restaurantData.alcohol.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ALCOHOL</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.alcohol.map((alc, i) => (
                        <Text key={i} style={styles.ingredientItem}>{alc}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Other Ingredients */}
                {card.restaurantData.other && card.restaurantData.other.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>OTHER INGREDIENTS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.other.map((item, i) => (
                        <Text key={i} style={styles.ingredientItem}>{item}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* ABV */}
                {card.restaurantData.abv !== undefined && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ABV</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.abv}%
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Spirit-specific fields */}
            {isSpiritCard(card.restaurantData) && (
              <>
                {/* ABV */}
                {card.restaurantData.abv !== undefined && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>ABV</Text>
                    <Text style={styles.valueText}>
                      {card.restaurantData.abv}%
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

            {/* Sauce-specific fields */}
            {isSauceCard(card.restaurantData) && (
              <>
                {/* Ingredients */}
                {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>INGREDIENTS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.ingredients.map((ing, i) => (
                        <Text key={i} style={styles.ingredientItem}>{ing}</Text>
                      ))}
                    </View>
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
    flex: 1, // Expand to fill cardArea
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
  // Image container - expands to fill available space
  imagePlaceholder: {
    flex: 1, // Grow to fill remaining space after title
    width: '100%',
    backgroundColor: '#F0F0F0', // Placeholder color
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsMinHeight: {
    flex: 1, // Grow to fill remaining space after title
    width: '100%',
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 20, // Clean spacing between sections
  },
  detailBlock: {
    marginBottom: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  columnBlock: {
    flex: 1,
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
  },
  // Wine Meter Styles
  meterSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterEndLabel: {
    fontSize: 10,
    color: '#6B7280',
    minWidth: 32,
  },
  meterBarContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    gap: 2,
  },
  meterSegment: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  meterSegmentFilled: {
    backgroundColor: '#9CA3AF',
  },
});
