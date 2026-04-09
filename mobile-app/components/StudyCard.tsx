import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
  StudyCardData,
  isMakiCard,
  isSakeCard,
  isWineCard,
  isBeerCard,
  isCocktailCard,
  isSpiritCard,
  isSauceCard,
  isFishCard
} from '../types/shared';
import { adjustUrlForPlatform } from '../utils/imageUrl';

export interface LinkedTerm {
  id: string;
  term: string;
  definition: string;
}

interface StudyCardProps {
  cardData: StudyCardData;
  isFlipped: boolean;
  linkedTerms?: LinkedTerm[];
  onTermPress?: (term: LinkedTerm) => void;
}

// Helper to render text with *highlighted* terms
const HighlightedText: React.FC<{ text: string; style: any; key?: React.Key }> = ({ text, style }) => {
  const parts = text.split(/\*(.*?)\*/g);
  if (parts.length === 1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={styles.highlight}>{part}</Text>
          : part
      )}
    </Text>
  );
};

// Helper to render text with linked glossary terms as tappable + highlighted
const LinkedText: React.FC<{
  text: string;
  style: any;
  linkedTerms?: LinkedTerm[];
  onTermPress?: (term: LinkedTerm) => void;
}> = ({ text, style, linkedTerms, onTermPress }) => {
  if (!linkedTerms || linkedTerms.length === 0 || !onTermPress) {
    return <HighlightedText text={text} style={style} />;
  }

  // Strip asterisks for matching, but we need to preserve highlight rendering
  const plainText = text.replace(/\*/g, '');

  // Build segments: find all linked term occurrences (case-insensitive)
  type Segment = { text: string; term?: LinkedTerm };
  const segments: Segment[] = [];
  let remaining = plainText;

  while (remaining.length > 0) {
    let earliestIdx = remaining.length;
    let matchedTerm: LinkedTerm | null = null;
    let matchedLength = 0;

    for (const lt of linkedTerms) {
      const idx = remaining.toLowerCase().indexOf(lt.term.toLowerCase());
      if (idx !== -1 && idx < earliestIdx) {
        earliestIdx = idx;
        matchedTerm = lt;
        matchedLength = lt.term.length;
      }
    }

    if (!matchedTerm) {
      segments.push({ text: remaining });
      break;
    }

    if (earliestIdx > 0) {
      segments.push({ text: remaining.substring(0, earliestIdx) });
    }
    segments.push({ text: remaining.substring(earliestIdx, earliestIdx + matchedLength), term: matchedTerm });
    remaining = remaining.substring(earliestIdx + matchedLength);
  }

  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.term ? (
          <Text
            key={i}
            style={styles.linkedTerm}
            onPress={() => onTermPress(seg.term!)}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  );
};

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

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped, linkedTerms, onTermPress }) => {
  const { card } = cardData;

  // Get image URL from card and adjust for platform (Android emulator needs 10.0.2.2)
  const imageUrl = adjustUrlForPlatform(card.imageUrl);

  return (
    <View
      style={styles.cardContainer}
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
              resizeMode="contain"
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
            <View style={styles.detailsScroll}>
            <View style={styles.contentPadding}>
              <View style={styles.detailsContainer}>
            {/* Sake-specific fields */}
            {isSakeCard(card.restaurantData) && (
              <>
                {/* Classification */}
                {card.restaurantData.classification && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>CLASSIFICATION</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.classification} style={styles.valueText} />
                  </View>
                )}

                {/* Tasting Notes */}
                {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTING NOTES</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.tastingNotes.join(', ')} style={styles.valueText} />
                  </View>
                )}

                {/* Rice Variety */}
                {card.restaurantData.riceVariety && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>RICE VARIETY</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.riceVariety} style={styles.valueText} />
                  </View>
                )}

                {/* Region/Origin */}
                {card.restaurantData.region && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>REGION/ORIGIN</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.region} style={styles.valueText} />
                  </View>
                )}

                {/* Producer */}
                {card.restaurantData.producer && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PRODUCER</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.producer} style={styles.valueText} />
                  </View>
                )}

                {/* Vintage */}
                {card.restaurantData.vintage && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>VINTAGE</Text>
                    <Text style={styles.valueText}>{card.restaurantData.vintage}</Text>
                  </View>
                )}

                {/* Serving Temperature */}
                {card.restaurantData.servingTemp && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SERVING TEMPERATURE</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.servingTemp} style={styles.valueText} />
                  </View>
                )}

                {/* Food Pairings */}
                {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>FOOD PAIRINGS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.foodPairings.map((pairing, i) => (
                        <HighlightedText key={i} text={`• ${pairing}`} style={styles.ingredientItem} />
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
                        <HighlightedText key={i} text={`• ${ing}`} style={styles.ingredientItem} />
                      ))}
                    </View>
                  </View>
                )}

                {/* Allergens */}
                {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                  <View style={styles.allergenContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.allergenText}>
                      Contains: <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.allergens.join(', ')} style={styles.allergenBold} />
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
                {/* Tasting Notes - FIRST */}
                {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTING NOTES</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.tastingNotes.join(', ')} style={styles.valueText} />
                  </View>
                )}

                {/* Appellation & Vintage Row - SECOND */}
                {(card.restaurantData.appellation || card.restaurantData.vintage) && (
                  <View style={styles.rowContainer}>
                    {/* Appellation - Left */}
                    {card.restaurantData.appellation && (
                      <View style={styles.columnBlock}>
                        <Text style={styles.label}>APPELLATION</Text>
                        <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.appellation} style={styles.valueText} />
                      </View>
                    )}

                    {/* Vintage - Right */}
                    {card.restaurantData.vintage && (
                      <View style={styles.columnBlock}>
                        <Text style={styles.label}>VINTAGE</Text>
                        <Text style={styles.valueText}>{card.restaurantData.vintage}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Grape Varieties - THIRD */}
                {card.restaurantData.grapeVarieties && card.restaurantData.grapeVarieties.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>GRAPE VARIETIES</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.grapeVarieties.join(', ')} style={styles.valueText} />
                  </View>
                )}

                {/* Region - FOURTH */}
                {card.restaurantData.region && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>REGION</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.region} style={styles.valueText} />
                  </View>
                )}

                {/* Producer - FIFTH */}
                {card.restaurantData.producer && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PRODUCER</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.producer} style={styles.valueText} />
                  </View>
                )}

                {/* Serving Temperature */}
                {card.restaurantData.servingTemp && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SERVING TEMPERATURE</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.servingTemp} style={styles.valueText} />
                  </View>
                )}

                {/* Ingredients */}
                {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>INGREDIENTS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.ingredients.map((ing, i) => (
                        <HighlightedText key={i} text={`• ${ing}`} style={styles.ingredientItem} />
                      ))}
                    </View>
                  </View>
                )}

                {/* Allergens */}
                {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                  <View style={styles.allergenContainer}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.allergenText}>
                      Contains: <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.allergens.join(', ')} style={styles.allergenBold} />
                    </Text>
                  </View>
                )}

                {/* Food Pairings */}
                {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>FOOD PAIRINGS</Text>
                    <View style={styles.ingredientList}>
                      {card.restaurantData.foodPairings.map((pairing, i) => (
                        <HighlightedText key={i} text={`• ${pairing}`} style={styles.ingredientItem} />
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
                        <HighlightedText key={i} text={alc} style={styles.ingredientItem} />
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
                        <HighlightedText key={i} text={item} style={styles.ingredientItem} />
                      ))}
                    </View>
                  </View>
                )}

                {/* Garnish */}
                {card.restaurantData.garnish && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>GARNISH</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.garnish} style={styles.valueText} />
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
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.topping} style={styles.valueText} />
                  </View>
                )}

                {card.restaurantData.base && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>BASE</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.base} style={styles.valueText} />
                  </View>
                )}

                {card.restaurantData.sauce && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>SAUCE</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.sauce} style={styles.valueText} />
                  </View>
                )}

                {card.restaurantData.paper && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>PAPER</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.paper} style={styles.valueText} />
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
                        <HighlightedText key={i} text={ing} style={styles.ingredientItem} />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Fish-specific fields */}
            {isFishCard(card.restaurantData) && (
              <>
                {card.restaurantData.taste && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>TASTE</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.taste} style={styles.valueText} />
                  </View>
                )}
                {card.restaurantData.country && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>COUNTRY</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.country} style={styles.valueText} />
                  </View>
                )}
              </>
            )}
            </View>
            </View>
            </View>

            {/* Wine Characteristic Meters - Pinned to bottom of card */}
            {isWineCard(card.restaurantData) &&
              (card.restaurantData.bodyLevel ||
                card.restaurantData.sweetnessLevel ||
                card.restaurantData.acidityLevel ||
                card.restaurantData.tanninLevel) && (
                <View style={styles.meterBottomWrapper}>
                  <View style={styles.meterSection}>
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
                    {card.restaurantData.bodyLevel && (
                      <WineMeterBar
                        level={card.restaurantData.bodyLevel}
                        leftLabel="Light"
                        rightLabel="Bold"
                      />
                    )}
                    {card.restaurantData.tanninLevel && (
                      <WineMeterBar
                        level={card.restaurantData.tanninLevel}
                        leftLabel="Smooth"
                        rightLabel="Tannic"
                      />
                    )}
                  </View>
                </View>
              )}
          </View>
        )
      )}
    </View>
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
    flexDirection: 'column',
  },
  detailsScroll: {
    flex: 1, // Take up available space, pushing meters to the bottom
  },
  meterBottomWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
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
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 0,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meterEndLabel: {
    fontSize: 11,
    color: '#6B7280',
    width: 46,
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
  highlight: {
    backgroundColor: '#FDE68A',
  },
  linkedTerm: {
    textDecorationLine: 'underline',
    textDecorationColor: '#9CA3AF',
    color: '#374151',
  },
});
