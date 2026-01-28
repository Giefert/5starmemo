'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { glossaryApi } from '@/lib/api';
import {
  GlossaryTerm,
  GlossaryCategory,
  CardMatchSuggestion,
  GlossaryTermCard
} from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ArrowLeft, Plus, X, Check, Search, Link as LinkIcon, Unlink } from 'lucide-react';

export default function TermEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === 'new';
  const router = useRouter();

  // Form state
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);

  // Existing term data (for edit mode)
  const [existingTerm, setExistingTerm] = useState<GlossaryTerm | null>(null);

  // Card linking state
  const [suggestions, setSuggestions] = useState<CardMatchSuggestion[]>([]);
  const [linkedCards, setLinkedCards] = useState<GlossaryTermCard[]>([]);
  const [customSearch, setCustomSearch] = useState('');
  const [searchResults, setSearchResults] = useState<CardMatchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadCategories();
    if (!isNew) {
      loadTerm();
    }
  }, [resolvedParams.id]);

  // Auto-fetch suggestions when term is loaded
  useEffect(() => {
    if (!isNew && existingTerm) {
      loadSuggestions();
    }
  }, [existingTerm]);

  const loadCategories = async () => {
    try {
      const data = await glossaryApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadTerm = async () => {
    try {
      const data = await glossaryApi.getTermById(resolvedParams.id);
      setExistingTerm(data);
      setTerm(data.term);
      setDefinition(data.definition);
      setCategoryId(data.categoryId);
      setLinkedCards(data.linkedCards || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load term');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!existingTerm) return;
    try {
      const result = await glossaryApi.getSuggestions(existingTerm.id, 20);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const handleCustomSearch = async () => {
    if (!customSearch.trim()) return;
    setIsSearching(true);
    try {
      const result = await glossaryApi.searchCards(customSearch, 20);
      // Filter out already linked cards
      const linkedIds = new Set(linkedCards.map(lc => lc.cardId));
      setSearchResults(result.suggestions.filter(s => !linkedIds.has(s.cardId)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;

    setIsSaving(true);
    setError('');

    try {
      if (isNew) {
        const created = await glossaryApi.createTerm({ term, definition, categoryId });
        router.push(`/dashboard/glossary/${created.id}`);
      } else {
        await glossaryApi.updateTerm(resolvedParams.id, { term, definition, categoryId });
        setSuccessMessage('Term saved!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save term');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkCard = async (suggestion: CardMatchSuggestion) => {
    if (!existingTerm) return;
    try {
      const link = await glossaryApi.linkCard(
        existingTerm.id,
        suggestion.cardId,
        suggestion.matchField,
        suggestion.matchContext
      );
      // Add card data to the link
      const newLink: GlossaryTermCard = {
        ...link,
        card: suggestion.card
      };
      setLinkedCards([...linkedCards, newLink]);
      setSuggestions(suggestions.filter(s => s.cardId !== suggestion.cardId));
      setSearchResults(searchResults.filter(s => s.cardId !== suggestion.cardId));
    } catch (err) {
      console.error('Failed to link card:', err);
    }
  };

  const handleUnlinkCard = async (cardId: string) => {
    if (!existingTerm) return;
    try {
      await glossaryApi.unlinkCard(existingTerm.id, cardId);
      setLinkedCards(linkedCards.filter(lc => lc.cardId !== cardId));
      // Refresh suggestions to show the unlinked card again
      loadSuggestions();
    } catch (err) {
      console.error('Failed to unlink card:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/glossary" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Glossary
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isNew ? 'Add New Term' : 'Edit Term'}
          </h1>
        </div>

        {successMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded shadow-lg z-50">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Term Form */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Term Details</h2>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Term *</label>
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g., Malolactic Fermentation"
                required
                maxLength={200}
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Definition *</label>
              <RichTextEditor
                value={definition}
                onChange={setDefinition}
                placeholder="Enter definition with formatting..."
                className="focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || undefined)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || !term.trim() || !definition.trim()}>
                {isSaving ? 'Saving...' : (isNew ? 'Create Term' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </div>

        {/* Card Linking Section (only shown after term is created) */}
        {!isNew && existingTerm && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Linked Cards ({linkedCards.length})
              </h2>
              <p className="text-sm text-gray-500">
                Connect this term to relevant flashcards
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Linked Cards */}
              {linkedCards.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Currently Linked</h3>
                  {linkedCards.map(link => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <LinkIcon className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {link.card?.restaurantData?.itemName || 'Unknown Card'}
                          </p>
                          {link.matchField && (
                            <p className="text-xs text-gray-500">
                              Matched on: {link.matchField}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlinkCard(link.cardId)}
                      >
                        <Unlink className="h-3 w-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Suggested Cards</h3>
                  <p className="text-xs text-gray-500">Based on term: &quot;{existingTerm.term}&quot;</p>
                  {suggestions.slice(0, 5).map(suggestion => (
                    <div key={suggestion.cardId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-700">
                          {suggestion.matchScore}% match
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {suggestion.card.restaurantData?.itemName || 'Unknown Card'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Found in: {suggestion.matchField} - &quot;{suggestion.matchContext?.substring(0, 50)}{suggestion.matchContext && suggestion.matchContext.length > 50 ? '...' : ''}&quot;
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleLinkCard(suggestion)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuggestions(suggestions.filter(s => s.cardId !== suggestion.cardId))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Search */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Search for Cards</h3>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search cards by name, region, ingredients..."
                      value={customSearch}
                      onChange={(e) => setCustomSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomSearch())}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleCustomSearch} disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {searchResults.map(result => (
                      <div key={result.cardId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div>
                          <p className="font-medium text-gray-900">
                            {result.card.restaurantData?.itemName || 'Unknown Card'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.matchField}: &quot;{result.matchContext?.substring(0, 50)}{result.matchContext && result.matchContext.length > 50 ? '...' : ''}&quot;
                          </p>
                        </div>
                        <Button size="sm" onClick={() => handleLinkCard(result)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
