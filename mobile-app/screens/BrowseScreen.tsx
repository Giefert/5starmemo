import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Defs, Pattern, Circle, Line } from 'react-native-svg';
import apiService from '../services/api';
import { StudyCardData, StudyDeckSearchMatch, StudyDeckSearchMatchDetail } from '../types/shared';
import { StudyCard, LinkedTerm } from '../components/StudyCard';
import { SwipeableCard } from '../components/SwipeableCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';
import { collectSearchFields } from '../utils/studySearch';

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
  red: '#D94B36',
};

function textContainsQuery(text: string, query: string) {
  const q = query.trim().toLowerCase();
  return q.length > 0 && text.toLowerCase().includes(q);
}

function formatSearchFieldLabel(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function mergeSearchMatches(matches: StudyDeckSearchMatch[]): StudyDeckSearchMatch[] {
  const merged = new Map<string, StudyDeckSearchMatch>();

  for (const match of matches) {
    const existing = merged.get(match.itemName) ?? { itemName: match.itemName, details: [] };
    for (const detail of match.details) {
      const exists = existing.details.some(
        existingDetail => existingDetail.field === detail.field && existingDetail.value === detail.value,
      );
      if (!exists) existing.details.push(detail);
    }
    merged.set(match.itemName, existing);
  }

  return [...merged.values()];
}

function getVisibleSearchDetails(
  match: StudyDeckSearchMatch | undefined,
  query: string,
): StudyDeckSearchMatchDetail[] {
  const q = query.trim().toLowerCase();
  if (!match || !q) return [];

  return match.details.filter(detail =>
    detail.field !== 'itemName' &&
    detail.value.toLowerCase().includes(q),
  );
}

function cardMatchesQuery(card: StudyCardData, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!card.card.restaurantData) return false;

  return collectSearchFields(card.card.restaurantData).some(field =>
    field.value.toLowerCase().includes(q),
  );
}

interface BrowseScreenProps {
  deckId: string;
  deckTitle: string;
  onExit: () => void;
  backLabel?: string;
  searchQuery?: string;
  searchMatches?: StudyDeckSearchMatch[];
  onSearchQueryChange?: (query: string) => void;
  // When set, open straight to this card's detail view instead of the deck
  // list — used by the bulletin, where tapping a card item opens the card
  // itself. Backing out then returns to the caller, skipping the list.
  initialCardId?: string;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  deckId,
  deckTitle,
  onExit,
  backLabel = 'Back',
  searchQuery = '',
  searchMatches = [],
  onSearchQueryChange,
  initialCardId,
}) => {
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
          setIsFlipped(true);
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
    setIsFlipped(true);
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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const canEditSearch = typeof onSearchQueryChange === 'function';
  const selectedCardSearchMiss =
    !!selectedCard && normalizedSearch.length > 0 && !cardMatchesQuery(selectedCard, searchQuery);
  const renderBrowseSearchBar = (variant: 'paper' | 'ink') => canEditSearch ? (
    <BrowseSearchBar
      query={searchQuery}
      onChangeQuery={onSearchQueryChange!}
      isMismatch={selectedCardSearchMiss}
      variant={variant}
      bottomInset={insets.bottom}
    />
  ) : null;

  // Card detail view — mirrors the study session layout (edge-to-edge card,
  // ink masthead, ink/paper flip affordances).
  if (selectedCard) {
    return (
      <KeyboardAvoidingView
        style={styles.studyContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Masthead — ink ground, shared back affordance with the list ribbon */}
        <View style={[styles.masthead, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.ribbonBack}
            onPress={handleCardBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
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
            <Text style={styles.ribbonBackText} numberOfLines={1}>
              Browse
            </Text>
          </TouchableOpacity>
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
                  searchQuery={searchQuery}
                />
              </View>
              <View style={[styles.gradingZoneInk, !canEditSearch && { paddingBottom: insets.bottom + 4 }]}>
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
                {renderBrowseSearchBar('ink')}
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
                  searchQuery={searchQuery}
                />
              </View>
              <View style={[styles.gradingZonePaper, !canEditSearch && { paddingBottom: insets.bottom + 4 }]}>
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
                {renderBrowseSearchBar('paper')}
              </View>
            </View>
          }
        />

        <GlossaryTermModal
          term={selectedTerm}
          onDismiss={() => setSelectedTerm(null)}
        />
      </KeyboardAvoidingView>
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
  const searchMatchByItemName = new Map(
    mergeSearchMatches(searchMatches).map(match => [match.itemName, match]),
  );
  const deckTitleMatches = textContainsQuery(deckTitle, searchQuery);
  const hasCardSearchMatches = searchMatchByItemName.size > 0;
  const hasActiveSearch = normalizedSearch.length > 0;
  const isSearchFiltered = normalizedSearch.length > 0 && hasCardSearchMatches;
  const visibleCards = isSearchFiltered
    ? cards.filter(card => searchMatchByItemName.has(card.card.restaurantData?.itemName || ''))
    : !hasActiveSearch || deckTitleMatches
      ? cards
      : [];
  const count = visibleCards.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={styles.titleEyebrow}>
          {isSearchFiltered ? 'Matching cards' : 'Browsing the deck'}
        </Text>
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
      ) : visibleCards.length === 0 ? (
        <View style={[styles.body, styles.centerContainer]}>
          <Text style={styles.emptyText}>
            {hasActiveSearch && !deckTitleMatches ? 'No matching cards in this deck' : 'No cards in this deck'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.body}
          data={visibleCards}
          keyExtractor={(item) => item.card.id}
          contentContainerStyle={[styles.itemsList, { paddingBottom: insets.bottom + 16 }]}
          renderItem={({ item, index }) => (
            <CardRow
              card={item}
              isLast={index === visibleCards.length - 1}
              searchQuery={searchQuery}
              searchMatch={searchMatchByItemName.get(item.card.restaurantData?.itemName || '')}
              onPress={() => handleSelectCard(item)}
            />
          )}
        />
      )}

      {renderBrowseSearchBar('paper')}
    </KeyboardAvoidingView>
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
  searchQuery,
  searchMatch,
  onPress,
}: {
  card: StudyCardData;
  isLast: boolean;
  searchQuery: string;
  searchMatch?: StudyDeckSearchMatch;
  onPress: () => void;
}) {
  const imageUrl = card.card.imageUrl;
  const name = card.card.restaurantData?.itemName || 'Untitled Card';
  const searchDetails = getVisibleSearchDetails(searchMatch, searchQuery);

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
        <HighlightedText
          text={name}
          query={searchQuery}
          textStyle={styles.itemName}
          numberOfLines={2}
        />
        {searchDetails.map((detail, index) => (
          <HighlightedText
            key={`${detail.field}-${detail.value}-${index}`}
            text={`${detail.value} (${formatSearchFieldLabel(detail.field)})`}
            query={searchQuery}
            textStyle={styles.itemSearchDetail}
            numberOfLines={2}
          />
        ))}
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

function HighlightedText({
  text,
  query,
  textStyle,
  numberOfLines,
}: {
  text: string;
  query: string;
  textStyle: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const q = query.trim().toLowerCase();
  if (!q || !textContainsQuery(text, query)) {
    return (
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  const lower = text.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(q, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), isMatch: false });
    }
    parts.push({ text: text.slice(index, index + q.length), isMatch: true });
    cursor = index + q.length;
  }

  return (
    <Text style={textStyle} numberOfLines={numberOfLines}>
      {parts.map((part, index) => (
        <Text
          key={`${part.text}-${index}`}
          style={part.isMatch ? styles.itemSearchAmber : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function BrowseSearchBar({
  query,
  onChangeQuery,
  isMismatch,
  variant,
  bottomInset,
}: {
  query: string;
  onChangeQuery: (query: string) => void;
  isMismatch: boolean;
  variant: 'paper' | 'ink';
  bottomInset: number;
}) {
  const isInk = variant === 'ink';
  const iconColor = isMismatch ? COLORS.red : isInk ? COLORS.onDarkMute : COLORS.inkFaint;

  return (
    <View
      style={[
        styles.searchRow,
        isInk ? styles.searchRowInk : styles.searchRowPaper,
        { paddingBottom: bottomInset + 10 },
      ]}
    >
      <Svg width={15} height={15} viewBox="0 0 15 15">
        <Circle cx={6.3} cy={6.3} r={4.6} stroke={iconColor} strokeWidth={1.4} fill="none" />
        <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={iconColor} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
      <TextInput
        style={[
          styles.searchInput,
          isInk ? styles.searchInputInk : styles.searchInputPaper,
          isMismatch && styles.searchInputMismatch,
        ]}
        placeholder="Search this deck..."
        placeholderTextColor={isInk ? COLORS.onDarkMute : COLORS.inkFaint}
        value={query}
        onChangeText={onChangeQuery}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.length > 0 && (
        <Pressable onPress={() => onChangeQuery('')} hitSlop={10}>
          <Text style={styles.searchClear}>CLEAR</Text>
        </Pressable>
      )}
    </View>
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
  itemSearchDetail: {
    color: COLORS.inkMute,
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4,
  },
  itemSearchAmber: {
    color: COLORS.amber,
  },
  itemChevron: {
    flexShrink: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  searchRowPaper: {
    backgroundColor: COLORS.paper,
    borderTopColor: COLORS.paperHair,
  },
  searchRowInk: {
    backgroundColor: COLORS.ink,
    borderTopColor: COLORS.bgHair,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    paddingVertical: 4,
  },
  searchInputPaper: {
    color: COLORS.ink,
  },
  searchInputInk: {
    color: COLORS.onDark,
  },
  searchInputMismatch: {
    color: COLORS.red,
  },
  searchClear: {
    color: COLORS.amber,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.6,
  },

  // ── Card detail view — study session layout ──────────────────
  studyContainer: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  masthead: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 22,
    paddingBottom: 16,
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
