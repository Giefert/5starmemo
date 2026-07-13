import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import apiService from '../services/api';
import {
  GlossarySection,
  GlossaryTermSummary,
  StudyCardSearchResult,
} from '../types/shared';
import { CustomDeckDraft, CustomDeckItem, CustomDeckSource } from '../utils/customDecks';
import { stripHtml } from '../utils/html';

const COLORS = {
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  ink: '#14120F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  amber: '#E89A2B',
  red: '#D94B36',
};

const SOURCE_OPTIONS: Array<{ value: CustomDeckSource; label: string }> = [
  { value: 'cards', label: 'Cards' },
  { value: 'reference', label: 'Library' },
  { value: 'both', label: 'Both' },
];

function itemKey(item: CustomDeckItem): string {
  return item.kind === 'card' ? `card:${item.cardId}` : `reference:${item.termId}`;
}

function sourceAllowsItem(source: CustomDeckSource, item: CustomDeckItem): boolean {
  if (source === 'both') return true;
  if (source === 'cards') return item.kind === 'card';
  return item.kind === 'reference';
}

function cardResultToItem(result: StudyCardSearchResult): Extract<CustomDeckItem, { kind: 'card' }> {
  return {
    kind: 'card',
    cardId: result.cardId,
    deckId: result.deckId,
    deckTitle: result.deckTitle,
    title: result.itemName || result.cardData.card.restaurantData?.itemName || 'Untitled Card',
  };
}

function termToItem(term: GlossaryTermSummary): CustomDeckItem {
  return {
    kind: 'reference',
    termId: term.id,
    term: term.term,
    section: term.section,
    categoryId: term.categoryId,
    categoryName: term.categoryName,
    categoryColor: term.categoryColor,
  };
}

interface CustomDeckBuilderProps {
  onCancel: () => void;
  onSave: (draft: CustomDeckDraft) => void;
}

export const CustomDeckBuilder: React.FC<CustomDeckBuilderProps> = ({
  onCancel,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<CustomDeckSource>('both');
  const [query, setQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<CustomDeckItem[]>([]);
  const [cardResults, setCardResults] = useState<StudyCardSearchResult[]>([]);
  const [termResults, setTermResults] = useState<GlossaryTermSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const selectedKeys = useMemo(
    () => new Set(selectedItems.map(itemKey)),
    [selectedItems],
  );

  useEffect(() => {
    setSelectedItems(items => items.filter(item => sourceAllowsItem(source, item)));
  }, [source]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setCardResults([]);
      setTermResults([]);
      setIsSearching(false);
      setError('');
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError('');

    const timer = setTimeout(async () => {
      try {
        const nextCards =
          source === 'cards' || source === 'both'
            ? await apiService.searchStudyCards(q, 24)
            : [];

        let nextTerms: GlossaryTermSummary[] = [];
        if (source === 'reference' || source === 'both') {
          const sections: GlossarySection[] = ['glossary', 'encyclopedia'];
          const results = await Promise.all(
            sections.map(section =>
              apiService.getGlossaryTerms({ section, search: q, limit: 24 }),
            ),
          );
          nextTerms = results.flatMap(result => result.terms);
        }

        if (!cancelled) {
          setCardResults(nextCards);
          setTermResults(nextTerms);
        }
      } catch (searchError) {
        console.warn('Failed to search custom deck items:', searchError);
        if (!cancelled) {
          setCardResults([]);
          setTermResults([]);
          setError('Search failed. Try again.');
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, source]);

  const toggleItem = (item: CustomDeckItem) => {
    const key = itemKey(item);
    setSelectedItems(current =>
      current.some(existing => itemKey(existing) === key)
        ? current.filter(existing => itemKey(existing) !== key)
        : [...current, item],
    );
  };

  const canSave = title.trim().length > 0 && selectedItems.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title,
      source,
      items: selectedItems,
    });
  };

  const renderSelected = () => {
    if (selectedItems.length === 0) {
      return <Text style={styles.selectedEmpty}>No items selected.</Text>;
    }

    return selectedItems.map(item => (
      <Pressable
        key={itemKey(item)}
        onPress={() => toggleItem(item)}
        style={({ pressed }) => [styles.selectedRow, pressed && styles.rowPressed]}
      >
        <Text style={styles.selectedName} numberOfLines={1}>
          {item.kind === 'card' ? item.title : item.term}
        </Text>
        <Text style={styles.selectedMeta}>
          {item.kind === 'card'
            ? item.deckTitle
            : item.section === 'encyclopedia'
            ? 'Encyclopedia'
            : 'Glossary'}
        </Text>
        <Text style={styles.removeText}>REMOVE</Text>
      </Pressable>
    ));
  };

  const renderCardResults = () => {
    if (!(source === 'cards' || source === 'both')) return null;
    if (!query.trim()) return null;

    return (
      <View style={styles.resultSection}>
        <Text style={styles.resultHeader}>Cards</Text>
        {cardResults.length === 0 && !isSearching ? (
          <Text style={styles.emptyLine}>No cards found.</Text>
        ) : (
          cardResults.map(result => {
            const item = cardResultToItem(result);
            const selected = selectedKeys.has(itemKey(item));
            return (
              <ResultRow
                key={itemKey(item)}
                title={item.title}
                meta={result.deckTitle}
                selected={selected}
                onPress={() => toggleItem(item)}
              />
            );
          })
        )}
      </View>
    );
  };

  const renderTermResults = () => {
    if (!(source === 'reference' || source === 'both')) return null;
    if (!query.trim()) return null;

    return (
      <View style={styles.resultSection}>
        <Text style={styles.resultHeader}>Library</Text>
        {termResults.length === 0 && !isSearching ? (
          <Text style={styles.emptyLine}>No library terms found.</Text>
        ) : (
          termResults.map(term => {
            const item = termToItem(term);
            const selected = selectedKeys.has(itemKey(item));
            const meta = [
              term.section === 'encyclopedia' ? 'Encyclopedia' : 'Glossary',
              term.categoryName,
            ].filter(Boolean).join(' / ');
            return (
              <ResultRow
                key={itemKey(item)}
                title={term.term}
                meta={meta}
                detail={stripHtml(term.definition)}
                selected={selected}
                onPress={() => toggleItem(item)}
              />
            );
          })
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.headerAction}>CANCEL</Text>
          </Pressable>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={10}>
            <Text style={[styles.headerAction, !canSave && styles.headerActionDisabled]}>
              SAVE
            </Text>
          </Pressable>
        </View>

        <Text style={styles.title}>New Custom Deck</Text>

        <TextInput
          style={styles.titleInput}
          placeholder="Deck name"
          placeholderTextColor={COLORS.inkFaint}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
        />

        <View style={styles.sourceRow}>
          {SOURCE_OPTIONS.map(option => {
            const active = source === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSource(option.value)}
                style={[styles.sourceButton, active && styles.sourceButtonActive]}
              >
                <Text style={[styles.sourceLabel, active && styles.sourceLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={
            source === 'cards'
              ? 'Search cards...'
              : source === 'reference'
              ? 'Search glossary and encyclopedia...'
              : 'Search cards and library...'
          }
          placeholderTextColor={COLORS.inkFaint}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.selectedBlock}>
          <View style={styles.selectedHeaderRow}>
            <Text style={styles.sectionTitle}>Selected</Text>
            <Text style={styles.countText}>{selectedItems.length}</Text>
          </View>
          {renderSelected()}
        </View>

        {isSearching && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.inkMute} />
          </View>
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {renderCardResults()}
        {renderTermResults()}
      </ScrollView>
    </View>
  );
};

function ResultRow({
  title,
  meta,
  detail,
  selected,
  onPress,
}: {
  title: string;
  meta?: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        selected && styles.resultRowSelected,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.resultText}>
        {!!meta && <Text style={styles.resultMeta} numberOfLines={1}>{meta}</Text>}
        <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
        {!!detail && <Text style={styles.resultDetail} numberOfLines={2}>{detail}</Text>}
      </View>
      <Text style={[styles.addText, selected && styles.addTextSelected]}>
        {selected ? 'ADDED' : 'ADD'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerAction: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: COLORS.ink,
  },
  headerActionDisabled: {
    color: COLORS.inkFaint,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    lineHeight: 34,
    color: COLORS.ink,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  titleInput: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    color: COLORS.ink,
    marginBottom: 20,
  },
  sourceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.paperHair,
    marginBottom: 18,
  },
  sourceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sourceButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.amber,
  },
  sourceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
  },
  sourceLabelActive: {
    color: COLORS.ink,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.paperHair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.ink,
    marginBottom: 22,
  },
  selectedBlock: {
    marginBottom: 18,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: COLORS.ink,
    marginRight: 8,
  },
  countText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: COLORS.inkFaint,
  },
  selectedEmpty: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkFaint,
    paddingVertical: 8,
  },
  selectedRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  selectedName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: COLORS.ink,
  },
  selectedMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.inkMute,
    marginTop: 2,
  },
  removeText: {
    position: 'absolute',
    right: 0,
    top: 12,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.red,
  },
  loadingRow: {
    paddingVertical: 8,
  },
  errorText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: COLORS.red,
    marginBottom: 10,
  },
  resultSection: {
    marginTop: 12,
  },
  resultHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
    marginBottom: 6,
  },
  emptyLine: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: COLORS.inkFaint,
    paddingVertical: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  resultRowSelected: {
    borderTopColor: COLORS.amber,
  },
  resultText: {
    flex: 1,
    paddingRight: 14,
  },
  resultMeta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
    marginBottom: 3,
  },
  resultTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 19,
    lineHeight: 23,
    color: COLORS.ink,
  },
  resultDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.inkMute,
    marginTop: 4,
  },
  addText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.ink,
  },
  addTextSelected: {
    color: COLORS.amber,
  },
  rowPressed: {
    opacity: 0.58,
  },
});
