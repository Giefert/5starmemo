import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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

const COLORS = {
  ink: '#14120F',
  inkSoft: '#1C1A16',
  bgHair: '#28251F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

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

// Wine characteristic meter — a typographer's ruler: a hairline rule with
// end-ticks and a solid ink tick marking the level (1–5).
const WineMeterBar: React.FC<{
  level: number;
  leftLabel: string;
  rightLabel: string;
}> = ({ level, leftLabel, rightLabel }) => {
  // Position the tick within the [0,1] track — 5 levels map to 10%…90%.
  const pos = ((Math.min(5, Math.max(1, level)) - 1) / 4) * 0.8 + 0.1;
  return (
    <View style={styles.meterRow}>
      <Text style={styles.meterEndLabel}>{leftLabel}</Text>
      <View style={styles.meterTrack}>
        <View style={styles.meterRule} />
        <View style={[styles.meterEndTick, { left: 0 }]} />
        <View style={[styles.meterEndTick, { right: 0 }]} />
        <View style={[styles.meterTick, { left: `${pos * 100}%` }]} />
      </View>
      <Text style={[styles.meterEndLabel, styles.meterEndLabelRight]}>{rightLabel}</Text>
    </View>
  );
};

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped, linkedTerms, onTermPress }) => {
  const { card } = cardData;

  const imageUrl = card.imageUrl;
  const itemName = card.restaurantData?.itemName;

  if (!isFlipped) {
    // ── Front (question) — ink ground ──────────────────────────
    return (
      <View style={[styles.cardContainer, styles.cardFront]}>
        <View style={styles.frontHeader}>
          <Text style={styles.eyebrow}>Question</Text>
          <Text style={styles.frontTitle}>{itemName}</Text>
        </View>
        <View style={styles.imageArea}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.cardImage}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.emptyImageText}>No Image</Text>
          )}
        </View>
      </View>
    );
  }

  // ── Back (answer) — warm paper ground ────────────────────────
  return (
    <View style={[styles.cardContainer, styles.cardBack]}>
      <View style={styles.backHeader}>
        <Text style={[styles.eyebrow, styles.eyebrowBack]}>Answer</Text>
        <Text style={styles.backTitle}>{itemName}</Text>
      </View>

      {card.restaurantData && (
        <>
          <View style={styles.detailsScroll}>
            <View style={styles.backBody}>
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
                  <View style={styles.allergenRow}>
                    <Text style={styles.allergenLabel}>ALLERGENS</Text>
                    <Text style={styles.allergenValue}>
                      {card.restaurantData.allergens.join(' · ')}
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

                {/* Appellation - SECOND */}
                {card.restaurantData.appellation && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>APPELLATION</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.appellation} style={styles.valueText} />
                  </View>
                )}

                {/* Vintage - THIRD */}
                {card.restaurantData.vintage && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>VINTAGE</Text>
                    <Text style={styles.valueText}>{card.restaurantData.vintage}</Text>
                  </View>
                )}

                {/* Grape Varieties */}
                {card.restaurantData.grapeVarieties && card.restaurantData.grapeVarieties.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>GRAPE VARIETIES</Text>
                    <LinkedText linkedTerms={linkedTerms} onTermPress={onTermPress} text={card.restaurantData.grapeVarieties.join(', ')} style={styles.valueText} />
                  </View>
                )}

                {/* Region */}
                {card.restaurantData.region && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.label}>REGION</Text>
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
                  <View style={styles.allergenRow}>
                    <Text style={styles.allergenLabel}>ALLERGENS</Text>
                    <Text style={styles.allergenValue}>
                      {card.restaurantData.allergens.join(' · ')}
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
                <Text style={styles.meterHeading}>ON THE PALATE</Text>
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
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    width: '100%',
  },
  cardFront: {
    backgroundColor: COLORS.ink,
  },
  cardBack: {
    backgroundColor: COLORS.paper,
  },
  // ── Front ──────────────────────────────────────────────────
  frontHeader: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  frontTitle: {
    fontFamily: 'Georgia',
    fontSize: 40,
    fontWeight: '500',
    color: COLORS.paper,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 44,
  },
  imageArea: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  emptyImageText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.onDarkMute,
  },
  // ── Shared eyebrow ─────────────────────────────────────────
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.amber,
    marginBottom: 12,
    textAlign: 'center',
  },
  eyebrowBack: {
    textAlign: 'left',
    marginBottom: 10,
  },
  // ── Back ───────────────────────────────────────────────────
  backHeader: {
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 14,
  },
  backTitle: {
    fontFamily: 'Georgia',
    fontSize: 30,
    fontWeight: '500',
    color: COLORS.ink,
    letterSpacing: -0.6,
    lineHeight: 33,
  },
  detailsScroll: {
    flex: 1,
  },
  backBody: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  detailsContainer: {
    gap: 0,
  },
  detailBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  label: {
    width: 100,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginRight: 16,
  },
  valueText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.ink,
    lineHeight: 23,
  },
  ingredientList: {
    flex: 1,
  },
  ingredientItem: {
    fontSize: 15,
    color: COLORS.ink,
    lineHeight: 24,
  },
  // ── Allergens — red small-caps label + values, no emoji ────
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  allergenLabel: {
    width: 100,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.red,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginRight: 16,
  },
  allergenValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.red,
    lineHeight: 21,
  },
  // ── Wine meter — typographer's ruler ───────────────────────
  meterBottomWrapper: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  meterHeading: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
    marginBottom: 10,
  },
  meterSection: {
    gap: 2,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  meterEndLabel: {
    fontSize: 10,
    color: COLORS.inkMute,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    width: 54,
  },
  meterEndLabelRight: {
    textAlign: 'right',
  },
  meterTrack: {
    flex: 1,
    height: 14,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  meterRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.paperHair,
  },
  meterEndTick: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: 1,
    backgroundColor: COLORS.paperHair,
  },
  meterTick: {
    position: 'absolute',
    top: 2,
    width: 8,
    height: 10,
    marginLeft: -4,
    backgroundColor: COLORS.ink,
  },
  // ── Inline markup ──────────────────────────────────────────
  highlight: {
    backgroundColor: 'rgba(232, 154, 43, 0.22)',
  },
  linkedTerm: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: COLORS.inkFaint,
    color: COLORS.inkMute,
  },
});
