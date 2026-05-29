import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Defs, Pattern } from 'react-native-svg';
import apiService from '../services/api';
import { StudyCardData } from '../types/shared';
import { StudyCard, LinkedTerm } from '../components/StudyCard';
import { SwipeableCard } from '../components/SwipeableCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';

const COLORS = {
  ink: '#14120F',
  bgHair: '#28251F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
};

interface BrowseScreenProps {
  deckId: string;
  deckTitle: string;
  onExit: () => void;
  backLabel?: string;
  // When set, open straight to this card's detail view instead of the deck
  // list — used by the bulletin, where tapping a card item opens the card
  // itself. Backing out then returns to the caller, skipping the list.
  initialCardId?: string;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({ deckId, deckTitle, onExit, backLabel = 'Back', initialCardId }) => {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<StudyCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<StudyCardData | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [linkedTerms, setLinkedTerms] = useState<LinkedTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<LinkedTerm | null>(null);
  // True while the visible card was opened directly (via initialCardId) with
  // no list in between, so its back arrow exits rather than dropping to a list.
  const [openedDirectly, setOpenedDirectly] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getDeckForStudy(deckId);
      // Browse is an index of the deck, so list items alphabetically by the
      // same name the row renders. (The shared study endpoint orders by FSRS
      // urgency for study sessions; that ordering is wrong for browsing.)
      const sorted = [...data.cards].sort((a, b) =>
        (a.card.restaurantData?.itemName || '').localeCompare(
          b.card.restaurantData?.itemName || '',
          undefined,
          { sensitivity: 'base' }
        )
      );
      setCards(sorted);
      if (initialCardId) {
        const match = data.cards.find((c) => c.card.id === initialCardId);
        if (match) {
          setSelectedCard(match);
          setIsFlipped(false);
          setOpenedDirectly(true);
        }
      }
    } catch (error) {
      console.error('Failed to load cards for browsing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCard) {
      apiService.getTermsForCard(selectedCard.card.id)
        .then(setLinkedTerms)
        .catch(() => setLinkedTerms([]));
    } else {
      setLinkedTerms([]);
    }
  }, [selectedCard]);

  const handleSelectCard = (card: StudyCardData) => {
    setSelectedCard(card);
    setIsFlipped(false);
    setOpenedDirectly(false);
  };

  // A card opened directly from the bulletin has no list behind it, so backing
  // out leaves Browse entirely; one reached via the list returns to the list.
  const handleCardBack = () => {
    if (openedDirectly) {
      onExit();
      return;
    }
    setSelectedCard(null);
    setIsFlipped(false);
  };

  // Card detail view — mirrors the study session layout (edge-to-edge card,
  // ink masthead, ink/paper flip affordances).
  if (selectedCard) {
    return (
      <View style={styles.studyContainer}>
        {/* Masthead — ink ground */}
        <View style={[styles.masthead, { paddingTop: insets.top + 4 }]}>
          <View style={styles.mastheadRow}>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleCardBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.exitIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.mastheadTitle} numberOfLines={1}>
              {deckTitle}
            </Text>
          </View>
        </View>

        <SwipeableCard
          key={selectedCard.card.id}
          isFlipped={isFlipped}
          onFlippedChange={setIsFlipped}
          front={
            <View style={styles.face}>
              <View style={styles.cardArea}>
                <StudyCard
                  cardData={selectedCard}
                  isFlipped={false}
                  linkedTerms={linkedTerms}
                  onTermPress={setSelectedTerm}
                />
              </View>
              <View style={[styles.gradingZoneInk, { paddingBottom: insets.bottom + 4 }]}>
                <TouchableOpacity
                  style={styles.showAnswerButton}
                  onPress={() => setIsFlipped(true)}
                  activeOpacity={0.7}
                >
                  <Svg width={44} height={10} viewBox="0 0 44 10">
                    <Path
                      d="M 1 5 L 43 5 M 35 1 L 43 5 L 35 9"
                      stroke={COLORS.onDarkMute}
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          }
          back={
            <View style={styles.backFace}>
              <View style={styles.cardArea}>
                <StudyCard
                  cardData={selectedCard}
                  isFlipped={true}
                  linkedTerms={linkedTerms}
                  onTermPress={setSelectedTerm}
                />
              </View>
              <View style={[styles.gradingZonePaper, { paddingBottom: insets.bottom + 4 }]}>
                <TouchableOpacity
                  style={styles.swipeHintTap}
                  onPress={() => setIsFlipped(false)}
                  activeOpacity={0.7}
                >
                  <Svg width={44} height={10} viewBox="0 0 44 10">
                    <Path
                      d="M 43 5 L 1 5 M 9 1 L 1 5 L 9 9"
                      stroke={COLORS.inkFaint}
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          }
        />

        <GlossaryTermModal
          term={selectedTerm}
          onDismiss={() => setSelectedTerm(null)}
        />
      </View>
    );
  }

  // Opening a card directly from the bulletin: hold on a neutral ink loading
  // screen while the deck loads, so the list chrome never flashes before the
  // card's detail view resolves.
  if (initialCardId && isLoading && !selectedCard) {
    return (
      <View style={[styles.studyContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.amber} />
      </View>
    );
  }

  // Card list view — Carte browse list, shared shape with the Bulletin tab's
  // section browse list: dark back ribbon, paper title block, item rows.
  const count = cards.length;

  return (
    <View style={styles.container}>
      {/* Dark back ribbon. */}
      <View style={[styles.ribbon, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.ribbonBack} onPress={onExit} activeOpacity={0.7}>
          <Svg width={9} height={14} viewBox="0 0 9 14">
            <Path
              d="M7 1L2 7l5 6"
              fill="none"
              stroke={COLORS.onDarkMute}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.ribbonBackText}>{backLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Paper title block. */}
      <View style={styles.titleBlock}>
        <Text style={styles.titleEyebrow}>Browsing the deck</Text>
        <View style={styles.titleRow}>
          <Text style={styles.titleName}>{deckTitle}</Text>
          <Text style={styles.titleCount}>
            {count} {count === 1 ? 'card' : 'cards'}
          </Text>
        </View>
      </View>

      {/* Cards list. */}
      {isLoading ? (
        <View style={[styles.body, styles.centerContainer]}>
          <ActivityIndicator size="large" color={COLORS.amber} />
        </View>
      ) : cards.length === 0 ? (
        <View style={[styles.body, styles.centerContainer]}>
          <Text style={styles.emptyText}>No cards in this deck</Text>
        </View>
      ) : (
        <FlatList
          style={styles.body}
          data={cards}
          keyExtractor={(item) => item.card.id}
          contentContainerStyle={[styles.itemsList, { paddingBottom: insets.bottom + 16 }]}
          renderItem={({ item, index }) => (
            <CardRow
              card={item}
              isLast={index === cards.length - 1}
              onPress={() => handleSelectCard(item)}
            />
          )}
        />
      )}
    </View>
  );
};

// ── Striped placeholder ──────────────────────────────────────
// The Carte "image goes here" device — a 45° repeating stripe between two
// near-transparent ink tints. Used when a card has no photo.
function StripePlaceholder({ size }: { size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <Pattern
          id="carteStripe"
          patternUnits="userSpaceOnUse"
          width={12}
          height={12}
          patternTransform="rotate(45)"
        >
          <Rect width={12} height={12} fill="rgba(20,18,15,0.025)" />
          <Rect width={6} height={12} fill="rgba(20,18,15,0.06)" />
        </Pattern>
      </Defs>
      <Rect width={size} height={size} fill="url(#carteStripe)" />
    </Svg>
  );
}

// ── Card row ─────────────────────────────────────────────────
// Item row: square thumbnail, card name, chevron. The whole row taps
// through to the card detail view.
function CardRow({
  card,
  isLast,
  onPress,
}: {
  card: StudyCardData;
  isLast: boolean;
  onPress: () => void;
}) {
  const imageUrl = card.card.imageUrl;
  const name = card.card.restaurantData?.itemName || 'Untitled Card';

  return (
    <TouchableOpacity
      style={[styles.itemRow, !isLast && styles.itemDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.thumb}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbImage} contentFit="contain" />
        ) : (
          <StripePlaceholder size={56} />
        )}
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemName} numberOfLines={2}>
          {name}
        </Text>
      </View>
      <Svg width={8} height={14} viewBox="0 0 8 14" style={styles.itemChevron}>
        <Path
          d="M1 1l5 6-5 6"
          fill="none"
          stroke={COLORS.inkFaint}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 15,
  },

  // ── Dark back ribbon ─────────────────────────────────────────
  ribbon: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  ribbonBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  ribbonBackText: {
    color: COLORS.onDarkMute,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },

  // ── Paper title block ────────────────────────────────────────
  titleBlock: {
    backgroundColor: COLORS.paper,
    paddingTop: 18,
    paddingHorizontal: 26,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  titleEyebrow: {
    color: COLORS.amber,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  titleName: {
    flexShrink: 1,
    color: COLORS.ink,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 36,
    letterSpacing: -0.79,
  },
  titleCount: {
    flexShrink: 0,
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 15,
  },

  // ── Item rows ────────────────────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  itemsList: {
    paddingHorizontal: 26,
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  thumb: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.paperHair,
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  itemChevron: {
    flexShrink: 0,
  },

  // ── Card detail view — study session layout ──────────────────
  studyContainer: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  masthead: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  exitButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    zIndex: 10,
  },
  exitIcon: {
    fontSize: 22,
    color: COLORS.onDark,
    fontWeight: '300',
  },
  mastheadTitle: {
    position: 'absolute',
    left: 28,
    right: 28,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onDarkMute,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
  face: {
    flex: 1,
  },
  backFace: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardArea: {
    flex: 1,
  },
  gradingZoneInk: {
    backgroundColor: COLORS.ink,
    paddingTop: 4,
  },
  gradingZonePaper: {
    backgroundColor: COLORS.paper,
  },
  showAnswerButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  swipeHintTap: {
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
  },
});
