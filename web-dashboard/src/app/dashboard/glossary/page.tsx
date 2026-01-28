'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { glossaryApi } from '@/lib/api';
import { GlossaryTerm, GlossaryCategory } from '../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, Tag, Trash2, Edit } from 'lucide-react';

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [termsData, categoriesData] = await Promise.all([
        glossaryApi.getTerms(selectedCategory),
        glossaryApi.getCategories()
      ]);
      setTerms(termsData);
      setCategories(categoriesData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load glossary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;
    try {
      await glossaryApi.deleteTerm(id);
      setTerms(terms.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete term');
    }
  };

  const filteredTerms = terms.filter(term =>
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading glossary...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Glossary</h1>
            <p className="text-gray-600">Manage terms and link them to cards</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/glossary/categories">
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                Manage Categories
              </Button>
            </Link>
            <Link href="/dashboard/glossary/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{terms.length}</div>
            <div className="text-sm text-gray-500">Total Terms</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {terms.reduce((sum, t) => sum + (t.linkedCardCount || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Card Links</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.termCount || 0})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Terms List */}
        <div className="bg-white shadow rounded-lg">
          {filteredTerms.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No terms match your search' : 'No terms yet'}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/glossary/new">
                  <Button>Add Your First Term</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTerms.map(term => (
                <div key={term.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/dashboard/glossary/${term.id}`}
                          className="text-lg font-medium text-blue-600 hover:text-blue-500"
                        >
                          {term.term}
                        </Link>
                        {term.category && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: term.category.color ? `${term.category.color}20` : '#e5e7eb',
                              color: term.category.color || '#374151'
                            }}
                          >
                            {term.category.name}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">{term.definition}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {term.linkedCardCount || 0} linked cards
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <Link href={`/dashboard/glossary/${term.id}`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTerm(term.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
