import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
  isFishCard,
  formatSeasonality,
  isMonthInSeason,
  isDietaryCard,
  isStartersCard,
  isSashimiCard
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
  searchQuery?: string;
}

const SearchHighlightContext = React.createContext('');

function renderSearchRuns(text: string, query: string, keyPrefix: string, baseStyle?: any) {
  if (!text) return null;

  const q = query.trim().toLowerCase();
  if (!q || !text.toLowerCase().includes(q)) {
    return baseStyle ? <Text key={`${keyPrefix}-plain`} style={baseStyle}>{text}</Text> : text;
  }

  const nodes: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  let cursor = 0;
  let partIndex = 0;

  const pushSegment = (segment: string, isMatch: boolean) => {
    if (!segment) return;
    const segmentStyle = isMatch
      ? [baseStyle, styles.searchHighlight]
      : baseStyle;
    nodes.push(
      <Text key={`${keyPrefix}-${partIndex}`} style={segmentStyle}>
        {segment}
      </Text>
    );
    partIndex += 1;
  };

  while (cursor < text.length) {
    const index = lower.indexOf(q, cursor);
    if (index === -1) {
      pushSegment(text.slice(cursor), false);
      break;
    }
    if (index > cursor) {
      pushSegment(text.slice(cursor, index), false);
    }
    pushSegment(text.slice(index, index + q.length), true);
    cursor = index + q.length;
  }

  return nodes;
}

// Helper to render text with *highlighted* terms. An optional run-in label is
// rendered as an inline kicker leading the text so the label and value flow and
// wrap as a single block (RN has no float, so the label must live inside the Text).
const HighlightedText: React.FC<{
  text: string;
  style: any;
  leadingLabel?: string;
  leadingLabelStyle?: any;
  key?: React.Key;
}> = ({ text, style, leadingLabel, leadingLabelStyle }) => {
  const searchQuery = React.useContext(SearchHighlightContext);
  const lead = leadingLabel ? <Text style={leadingLabelStyle ?? styles.runInLabel}>{`${leadingLabel}  `}</Text> : null;
  const parts = text.split(/\*(.*?)\*/g);
  return (
    <Text style={style}>
      {lead}
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {renderSearchRuns(part, searchQuery, `m${i}`, i % 2 === 1 ? styles.highlight : undefined)}
        </React.Fragment>
      ))}
    </Text>
  );
};

// Helper to render text with both *highlighted* terms and tappable glossary links.
// Glossary matching runs on plain text, but the *...* highlight markup is preserved
// and re-applied so the two never cancel each other out. An optional run-in label is
// rendered as an inline kicker leading the text.
const LinkedText: React.FC<{
  text: string;
  style: any;
  leadingLabel?: string;
  linkedTerms?: LinkedTerm[];
  onTermPress?: (term: LinkedTerm) => void;
}> = ({ text, style, leadingLabel, linkedTerms, onTermPress }) => {
  const searchQuery = React.useContext(SearchHighlightContext);

  if (!linkedTerms || linkedTerms.length === 0 || !onTermPress) {
    return <HighlightedText text={text} style={style} leadingLabel={leadingLabel} />;
  }

  const lead = leadingLabel ? <Text style={styles.runInLabel}>{`${leadingLabel}  `}</Text> : null;

  // Strip the *...* markup into plain text plus the character ranges it covered.
  const parts = text.split(/\*(.*?)\*/g);
  let plain = '';
  const highlightRanges: Array<[number, number]> = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const start = plain.length;
      plain += part;
      highlightRanges.push([start, plain.length]);
    } else {
      plain += part;
    }
  });

  const isHighlighted = (idx: number) =>
    highlightRanges.some(([s, e]) => idx >= s && idx < e);

  // Split a [start, end) slice of `plain` into runs of consistent highlight state,
  // wrapping highlighted runs so they keep their background even inside a link.
  const renderRuns = (start: number, end: number, keyPrefix: string) => {
    const runs: React.ReactNode[] = [];
    let i = start;
    while (i < end) {
      const hl = isHighlighted(i);
      let j = i;
      while (j < end && isHighlighted(j) === hl) j++;
      const chunk = plain.substring(i, j);
      const rendered = renderSearchRuns(chunk, searchQuery, `${keyPrefix}-${i}`, hl ? styles.highlight : undefined);
      if (Array.isArray(rendered)) {
        runs.push(...rendered);
      } else if (rendered) {
        runs.push(rendered);
      }
      i = j;
    }
    return runs;
  };

  // Build segments: find all linked term occurrences (case-insensitive) over plain text.
  type Segment = { start: number; end: number; term?: LinkedTerm };
  const segments: Segment[] = [];
  let cursor = 0;
  const lowerPlain = plain.toLowerCase();

  while (cursor < plain.length) {
    let earliestIdx = plain.length;
    let matchedTerm: LinkedTerm | null = null;
    let matchedLength = 0;

    for (const lt of linkedTerms) {
      const idx = lowerPlain.indexOf(lt.term.toLowerCase(), cursor);
      if (idx !== -1 && idx < earliestIdx) {
        earliestIdx = idx;
        matchedTerm = lt;
        matchedLength = lt.term.length;
      }
    }

    if (!matchedTerm) {
      segments.push({ start: cursor, end: plain.length });
      break;
    }

    if (earliestIdx > cursor) {
      segments.push({ start: cursor, end: earliestIdx });
    }
    segments.push({ start: earliestIdx, end: earliestIdx + matchedLength, term: matchedTerm });
    cursor = earliestIdx + matchedLength;
  }

  return (
    <Text style={style}>
      {lead}
      {segments.map((seg, i) =>
        seg.term ? (
          <Text
            key={i}
            style={styles.linkedTerm}
            onPress={() => onTermPress(seg.term!)}
          >
            {renderRuns(seg.start, seg.end, `t${i}`)}
          </Text>
        ) : (
          <Text key={i}>{renderRuns(seg.start, seg.end, `p${i}`)}</Text>
        )
      )}
    </Text>
  );
};

// A single-value text field: the label is a run-in kicker leading the value,
// which flows after it and wraps full-width below — no empty left column.
const DetailField: React.FC<{
  label: string;
  text: string;
  linkedTerms?: LinkedTerm[];
  onTermPress?: (term: LinkedTerm) => void;
}> = ({ label, text, linkedTerms, onTermPress }) => (
  <View style={styles.detailBlock}>
    <LinkedText
      leadingLabel={label}
      text={text}
      style={styles.valueText}
      linkedTerms={linkedTerms}
      onTermPress={onTermPress}
    />
  </View>
);

// A multi-item field: a run-in kicker reads poorly on a vertical list, so the
// label sits above a full-width list of items instead.
const ListField: React.FC<{ label: string; items: string[]; bulleted?: boolean }> = ({ label, items, bulleted = true }) => (
  <View style={styles.detailBlock}>
    <Text style={styles.listLabel}>{label}</Text>
    {items.map((item, i) => (
      <HighlightedText key={i} text={bulleted ? `• ${item}` : item} style={styles.ingredientItem} />
    ))}
  </View>
);

// Allergens — run-in red kicker + red joined value.
const AllergenField: React.FC<{ allergens: string[] }> = ({ allergens }) => (
  <View style={styles.detailBlock}>
    <HighlightedText
      leadingLabel="ALLERGENS"
      leadingLabelStyle={styles.allergenLabelInline}
      text={allergens.join(' · ')}
      style={styles.allergenValue}
    />
  </View>
);

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

export const StudyCard: React.FC<StudyCardProps> = ({ cardData, isFlipped, linkedTerms, onTermPress, searchQuery = '' }) => {
  const { card } = cardData;

  const imageUrl = card.imageUrl;
  const itemName = card.restaurantData?.itemName;

  if (!isFlipped) {
    // ── Front (question) — ink ground ──────────────────────────
    return (
      <SearchHighlightContext.Provider value={searchQuery}>
        <View style={[styles.cardContainer, styles.cardFront]}>
          <View style={styles.frontHeader}>
            <Text style={styles.eyebrow}>Describe</Text>
            <HighlightedText text={itemName || ''} style={styles.frontTitle} />
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
      </SearchHighlightContext.Provider>
    );
  }

  // ── Back (answer) — warm paper ground ────────────────────────
  return (
    <SearchHighlightContext.Provider value={searchQuery}>
      <View style={[styles.cardContainer, styles.cardBack]}>
        <View style={styles.backHeader}>
          <Text style={[styles.eyebrow, styles.eyebrowBack]}>{card.restaurantData?.price || '$-'}</Text>
          <HighlightedText text={itemName || ''} style={styles.backTitle} />
        </View>

        {card.restaurantData && (
          <>
            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator>
            <View style={styles.backBody}>
              <View style={styles.detailsContainer}>
                {/* Sake-specific fields */}
                {isSakeCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.classification && (
                      <DetailField label="CLASSIFICATION" text={card.restaurantData.classification} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                      <DetailField label="TASTING NOTES" text={card.restaurantData.tastingNotes.join(', ')} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.riceVariety && (
                      <DetailField label="RICE VARIETY" text={card.restaurantData.riceVariety} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.region && (
                      <DetailField label="REGION/ORIGIN" text={card.restaurantData.region} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.producer && (
                      <DetailField label="PRODUCER" text={card.restaurantData.producer} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.vintage && (
                      <DetailField label="VINTAGE" text={String(card.restaurantData.vintage)} />
                    )}
                    {card.restaurantData.servingTemp && (
                      <DetailField label="SERVING TEMPERATURE" text={card.restaurantData.servingTemp} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                      <ListField label="FOOD PAIRINGS" items={card.restaurantData.foodPairings} />
                    )}
                    {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                      <ListField label="INGREDIENTS" items={card.restaurantData.ingredients} />
                    )}
                    {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                      <AllergenField allergens={card.restaurantData.allergens} />
                    )}
                    {card.restaurantData.abv !== undefined && (
                      <DetailField label="ABV" text={`${card.restaurantData.abv}%`} />
                    )}
                  </>
                )}

                {/* Wine-specific fields */}
                {isWineCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.tastingNotes && card.restaurantData.tastingNotes.length > 0 && (
                      <DetailField label="TASTING NOTES" text={card.restaurantData.tastingNotes.join(', ')} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.appellation && (
                      <DetailField label="APPELLATION" text={card.restaurantData.appellation} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.vintage && (
                      <DetailField label="VINTAGE" text={String(card.restaurantData.vintage)} />
                    )}
                    {card.restaurantData.grapeVarieties && card.restaurantData.grapeVarieties.length > 0 && (
                      <DetailField label="GRAPE VARIETIES" text={card.restaurantData.grapeVarieties.join(', ')} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.region && (
                      <DetailField label="REGION" text={card.restaurantData.region} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.producer && (
                      <DetailField label="PRODUCER" text={card.restaurantData.producer} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.servingTemp && (
                      <DetailField label="SERVING TEMPERATURE" text={card.restaurantData.servingTemp} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                      <ListField label="INGREDIENTS" items={card.restaurantData.ingredients} />
                    )}
                    {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                      <AllergenField allergens={card.restaurantData.allergens} />
                    )}
                    {card.restaurantData.foodPairings && card.restaurantData.foodPairings.length > 0 && (
                      <ListField label="FOOD PAIRINGS" items={card.restaurantData.foodPairings} />
                    )}
                    {card.restaurantData.abv !== undefined && (
                      <DetailField label="ABV" text={`${card.restaurantData.abv}%`} />
                    )}
                  </>
                )}

                {/* Beer-specific fields */}
                {isBeerCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.abv !== undefined && (
                      <DetailField label="ABV" text={`${card.restaurantData.abv}%`} />
                    )}
                  </>
                )}

                {/* Cocktail-specific fields */}
                {isCocktailCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.alcohol && card.restaurantData.alcohol.length > 0 && (
                      <ListField label="ALCOHOL" items={card.restaurantData.alcohol} bulleted={false} />
                    )}
                    {card.restaurantData.other && card.restaurantData.other.length > 0 && (
                      <ListField label="OTHER INGREDIENTS" items={card.restaurantData.other} bulleted={false} />
                    )}
                    {card.restaurantData.garnish && (
                      <DetailField label="GARNISH" text={card.restaurantData.garnish} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.abv !== undefined && (
                      <DetailField label="ABV" text={`${card.restaurantData.abv}%`} />
                    )}
                    {card.restaurantData.specialNotes && (
                      <ListField
                        label="SPECIAL NOTES"
                        items={card.restaurantData.specialNotes.split(',').map((n) => n.trim()).filter(Boolean)}
                        bulleted={false}
                      />
                    )}
                  </>
                )}

                {/* Spirit-specific fields */}
                {isSpiritCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.abv !== undefined && (
                      <DetailField label="ABV" text={`${card.restaurantData.abv}%`} />
                    )}
                  </>
                )}

                {/* Maki-specific fields */}
                {isMakiCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.topping && (
                      <DetailField label="TOPPING" text={card.restaurantData.topping} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.base && (
                      <DetailField label="BASE" text={card.restaurantData.base} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.sauce && (
                      <DetailField label="SAUCE" text={card.restaurantData.sauce} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.paper && (
                      <DetailField label="PAPER" text={card.restaurantData.paper} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.gluten && (
                      <DetailField
                        label="GLUTEN"
                        text={card.restaurantData.gluten === 'yes' ? 'Yes' :
                              card.restaurantData.gluten === 'no' ? 'No' :
                              'Optional'}
                      />
                    )}
                  </>
                )}

                {/* Sauce-specific fields */}
                {isSauceCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                      <ListField label="INGREDIENTS" items={card.restaurantData.ingredients} bulleted={false} />
                    )}
                  </>
                )}

                {/* Fish-specific fields */}
                {isFishCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.taste && (
                      <DetailField label="TASTE" text={card.restaurantData.taste} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.country && (
                      <DetailField label="COUNTRY" text={card.restaurantData.country} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {formatSeasonality(
                      card.restaurantData.seasonStartMonth,
                      card.restaurantData.seasonEndMonth
                    ) && (
                      <DetailField
                        label="SEASONALITY"
                        text={`${formatSeasonality(
                          card.restaurantData.seasonStartMonth,
                          card.restaurantData.seasonEndMonth
                        )}${isMonthInSeason(
                          card.restaurantData.seasonStartMonth,
                          card.restaurantData.seasonEndMonth
                        ) ? ' · In season now' : ''}`}
                      />
                    )}
                  </>
                )}

                {/* Dietary-specific fields */}
                {isDietaryCard(card.restaurantData) && (
                  <>
                    {card.restaurantData.starters && (
                      <DetailField label="STARTERS" text={card.restaurantData.starters} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.sashimi && (
                      <DetailField label="SASHIMI" text={card.restaurantData.sashimi} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.nigiri && (
                      <DetailField label="NIGIRI" text={card.restaurantData.nigiri} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                    {card.restaurantData.maki && (
                      <DetailField label="MAKI" text={card.restaurantData.maki} linkedTerms={linkedTerms} onTermPress={onTermPress} />
                    )}
                  </>
                )}

                {/* Starters / Sashimi-specific fields */}
                {(isStartersCard(card.restaurantData) || isSashimiCard(card.restaurantData)) && (
                  <>
                    {card.restaurantData.ingredients && card.restaurantData.ingredients.length > 0 && (
                      <ListField label="INGREDIENTS" items={card.restaurantData.ingredients} />
                    )}
                    {card.restaurantData.allergens && card.restaurantData.allergens.length > 0 && (
                      <AllergenField allergens={card.restaurantData.allergens} />
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Wine Characteristic Meters — scroll with the details */}
            {isWineCard(card.restaurantData) &&
              (card.restaurantData.bodyLevel ||
                card.restaurantData.sweetnessLevel ||
                card.restaurantData.acidityLevel ||
                card.restaurantData.tanninLevel) && (
                <View style={styles.meterWrapper}>
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
          </ScrollView>
          </>
        )}
      </View>
    </SearchHighlightContext.Provider>
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
  // Full-width block — the kicker runs in inline with the value (see runInLabel).
  detailBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  // Run-in kicker leading a value, rendered inline inside the value's Text.
  runInLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  // Label sitting above a bullet list.
  listLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 15,
    color: COLORS.ink,
    lineHeight: 23,
  },
  ingredientItem: {
    fontSize: 15,
    color: COLORS.ink,
    lineHeight: 24,
  },
  // ── Allergens — red small-caps run-in label + values, no emoji ─
  allergenLabelInline: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.red,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  allergenValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.red,
    lineHeight: 21,
  },
  // ── Wine meter — typographer's ruler ───────────────────────
  meterWrapper: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
  },
  meterHeading: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
    marginBottom: 8,
  },
  meterSection: {
    gap: 2,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
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
  searchHighlight: {
    color: COLORS.amber,
  },
  linkedTerm: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: COLORS.inkFaint,
    color: COLORS.inkMute,
  },
});
