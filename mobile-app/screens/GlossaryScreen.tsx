import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { GlossaryCategory, GlossaryTermSummary, GlossaryTerm } from '../types/shared';

type ViewState = 'list' | 'detail';

export default function GlossaryScreen() {
  const insets = useSafeAreaInsets();

  // Data state
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [terms, setTerms] = useState<GlossaryTermSummary[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // UI state
  const [viewState, setViewState] = useState<ViewState>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [selectedCategory, debouncedSearch]);

  const loadData = useCallback(async () => {
    try {
      if (!isRefreshing) setIsLoading(true);

      const [categoriesData, termsData] = await Promise.all([
        apiService.getGlossaryCategories(),
        apiService.getGlossaryTerms({
          categoryId: selectedCategory,
          search: debouncedSearch || undefined,
          limit: 100
        })
      ]);

      setCategories(categoriesData);
      setTerms(termsData.terms);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load glossary');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, debouncedSearch, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleTermPress = async (termId: string) => {
    setIsLoadingDetail(true);
    setViewState('detail');
    try {
      const term = await apiService.getGlossaryTerm(termId);
      setSelectedTerm(term);
    } catch (err: any) {
      setError(err.message || 'Failed to load term details');
      setViewState('list');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedTerm(null);
  };

  // Render category filter pills
  const renderCategoryFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScrollView}
      contentContainerStyle={styles.categoryContainer}
    >
      <TouchableOpacity
        style={[
          styles.categoryPill,
          !selectedCategory && styles.categoryPillActive
        ]}
        onPress={() => setSelectedCategory(undefined)}
      >
        <Text style={[
          styles.categoryText,
          !selectedCategory && styles.categoryTextActive
        ]}>All</Text>
      </TouchableOpacity>
      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.categoryPill,
            selectedCategory === cat.id && styles.categoryPillActive,
            cat.color && selectedCategory !== cat.id && { borderColor: cat.color }
          ]}
          onPress={() => setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === cat.id && styles.categoryTextActive
          ]}>
            {cat.name} ({cat.termCount || 0})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render term item
  const renderTermItem = ({ item }: { item: GlossaryTermSummary }) => (
    <TouchableOpacity
      style={styles.termCard}
      onPress={() => handleTermPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.termHeader}>
        <Text style={styles.termTitle}>{item.term}</Text>
        {item.categoryName && (
          <View style={[
            styles.termCategoryBadge,
            { backgroundColor: item.categoryColor ? `${item.categoryColor}20` : '#e5e7eb' }
          ]}>
            <Text style={[
              styles.termCategoryText,
              { color: item.categoryColor || '#374151' }
            ]}>
              {item.categoryName}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.termDefinition} numberOfLines={2}>
        {item.definition}
      </Text>
      {item.linkedCardCount > 0 && (
        <Text style={styles.termMeta}>
          {item.linkedCardCount} linked card{item.linkedCardCount !== 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Term Detail View
  if (viewState === 'detail') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Term Details</Text>
        </View>

        {isLoadingDetail ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : selectedTerm ? (
          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.detailTerm}>{selectedTerm.term}</Text>
            {selectedTerm.category && (
              <View style={[
                styles.detailCategoryBadge,
                { backgroundColor: selectedTerm.category.color ? `${selectedTerm.category.color}20` : '#e5e7eb' }
              ]}>
                <Text style={{ color: selectedTerm.category.color || '#374151' }}>
                  {selectedTerm.category.name}
                </Text>
              </View>
            )}
            <Text style={styles.detailDefinition}>{selectedTerm.definition}</Text>

            {selectedTerm.linkedCards && selectedTerm.linkedCards.length > 0 && (
              <View style={styles.linkedCardsSection}>
                <Text style={styles.sectionTitle}>
                  Related Cards ({selectedTerm.linkedCards.length})
                </Text>
                {selectedTerm.linkedCards.map(link => (
                  <View key={link.id} style={styles.linkedCardItem}>
                    <Text style={styles.linkedCardName}>
                      {link.card?.restaurantData?.itemName || 'Unknown Card'}
                    </Text>
                    {link.matchField && (
                      <Text style={styles.linkedCardMeta}>
                        Matched on: {link.matchField}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        ) : null}
      </View>
    );
  }

  // List View
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Glossary</Text>
      </View>

      {/* Search Bar and Category Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search terms..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {categories.length > 0 && renderCategoryFilters()}
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading glossary...</Text>
        </View>
      ) : (
        <FlatList
          data={terms}
          renderItem={renderTermItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 }
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No terms found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : selectedCategory
                  ? 'No terms in this category yet'
                  : 'Check back later for new content'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  categoryScrollView: {
    marginTop: 10,
    marginHorizontal: -16,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 12,
    paddingTop: 8,
  },
  termCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  termTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  termCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  termCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  termDefinition: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailTerm: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  detailCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailDefinition: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
  },
  linkedCardsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  linkedCardItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkedCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  linkedCardMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
