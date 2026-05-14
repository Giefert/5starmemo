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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import apiService from '../services/api';
import { GlossaryCategory, GlossaryTermSummary, GlossaryTerm, GlossarySection } from '../types/shared';
import { stripHtml, cleanHtml, customHTMLElementModels } from '../utils/html';

type ViewState = 'list' | 'detail';

export default function GlossaryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Data state
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [terms, setTerms] = useState<GlossaryTermSummary[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // Section state
  const [activeSection, setActiveSection] = useState<GlossarySection>('glossary');

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
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [activeSection, selectedCategory, debouncedSearch]);

  const loadData = useCallback(async () => {
    try {
      if (!isRefreshing) setIsLoading(true);

      const [categoriesData, termsData] = await Promise.all([
        apiService.getGlossaryCategories(activeSection),
        apiService.getGlossaryTerms({
          section: activeSection,
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
  }, [activeSection, selectedCategory, debouncedSearch, isRefreshing]);

  const handleSectionChange = (newSection: GlossarySection) => {
    if (newSection === activeSection) return;
    setActiveSection(newSection);
    setSelectedCategory(undefined);
    setSearchQuery('');
    setDebouncedSearch('');
    setIsFilterVisible(false);
  };

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

  // Render category dropdown
  const renderCategoryDropdown = () => (
    <View style={styles.dropdown}>
      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
        <TouchableOpacity
          style={[styles.dropdownItem, !selectedCategory && styles.dropdownItemActive]}
          onPress={() => setSelectedCategory(undefined)}
        >
          <Text style={[styles.dropdownItemText, !selectedCategory && styles.dropdownItemTextActive]}>
            All
          </Text>
          {!selectedCategory && <Ionicons name="checkmark" size={18} color="#007AFF" />}
        </TouchableOpacity>
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
              onPress={() => setSelectedCategory(isActive ? undefined : cat.id)}
            >
              <View style={styles.dropdownItemLabel}>
                {cat.color && <View style={[styles.dropdownColorDot, { backgroundColor: cat.color }]} />}
                <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                  {cat.name} ({cat.termCount || 0})
                </Text>
              </View>
              {isActive && <Ionicons name="checkmark" size={18} color="#007AFF" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
        {stripHtml(item.definition)}
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
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: cleanHtml(selectedTerm.definition) }}
              baseStyle={styles.detailDefinition}
              enableExperimentalMarginCollapsing={true}
              customHTMLElementModels={customHTMLElementModels}
              tagsStyles={{
                p: { marginVertical: 4 },
                ul: { marginVertical: 8, paddingLeft: 0 },
                li: { marginVertical: 0, paddingVertical: 2 },
                strong: { fontWeight: '600' },
                em: { fontStyle: 'italic' },
                u: { textDecorationLine: 'underline' },
                // Keep heading support for backwards compatibility with existing content
                h1: { fontSize: 31, fontWeight: 'bold', marginVertical: 8, lineHeight: 40 },
                h2: { fontSize: 25, fontWeight: 'bold', marginVertical: 6, lineHeight: 32 },
                h3: { fontSize: 20, fontWeight: '600', marginVertical: 4, lineHeight: 28 },
              }}
              classesStyles={{
                'font-large': { fontSize: 20 },
                'font-larger': { fontSize: 24 },
                'font-largest': { fontSize: 32 },
              }}
              renderersProps={{
                ul: {
                  markerBoxStyle: {
                    paddingTop: 2,
                    paddingRight: 8,
                  },
                },
                ol: {
                  markerBoxStyle: {
                    paddingTop: 2,
                    paddingRight: 8,
                  },
                },
              }}
            />

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
        <Text style={styles.title}>Reference</Text>
      </View>

      {/* Section Toggle */}
      <View style={styles.toggleBar}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleOption, activeSection === 'glossary' && styles.toggleOptionActive]}
            onPress={() => handleSectionChange('glossary')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeSection === 'glossary' && styles.toggleTextActive]}>
              Glossary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, activeSection === 'encyclopedia' && styles.toggleOptionActive]}
            onPress={() => handleSectionChange('encyclopedia')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeSection === 'encyclopedia' && styles.toggleTextActive]}>
              Encyclopedia
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterToolbar}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search terms..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          {categories.length > 0 && (
            <TouchableOpacity
              style={[styles.toolbarButton, (isFilterVisible || selectedCategory) && styles.toolbarButtonActive]}
              onPress={() => setIsFilterVisible(!isFilterVisible)}
            >
              <Ionicons
                name="filter"
                size={16}
                color={isFilterVisible || selectedCategory ? '#fff' : '#666'}
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.filterButtonText,
                (isFilterVisible || selectedCategory) && styles.filterButtonTextActive,
              ]}>
                Filter{selectedCategory ? ' (1)' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isFilterVisible && categories.length > 0 && renderCategoryDropdown()}
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
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  toggleBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#EFEFF4',
    borderRadius: 8,
    padding: 2,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  toggleTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    padding: 0,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  toolbarButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  dropdown: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemActive: {
    backgroundColor: '#f5f9ff',
  },
  dropdownItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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
