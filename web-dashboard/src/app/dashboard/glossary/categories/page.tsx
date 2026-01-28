'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { glossaryApi } from '@/lib/api';
import { GlossaryCategory } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Tag } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // New category form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await glossaryApi.getCategories();
      setCategories(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      const category = await glossaryApi.createCategory({
        name: newName,
        description: newDescription || undefined,
        color: newColor,
        displayOrder: categories.length
      });
      setCategories([...categories, category]);
      setShowNewForm(false);
      setNewName('');
      setNewDescription('');
      setNewColor('#6366f1');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (category: GlossaryCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditColor(category.color || '#6366f1');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditColor('');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      const updated = await glossaryApi.updateCategory(id, {
        name: editName,
        description: editDescription || undefined,
        color: editColor
      });
      setCategories(categories.map(c => c.id === id ? { ...c, ...updated } : c));
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!confirm(`Delete "${category?.name}"? Terms in this category will become uncategorized.`)) return;

    try {
      await glossaryApi.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading categories...</div>
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Glossary Categories</h1>
              <p className="text-gray-600">Organize your terms with custom categories</p>
            </div>
            {!showNewForm && (
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-900 font-bold">&times;</button>
          </div>
        )}

        {/* New Category Form */}
        {showNewForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">New Category</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Wine Regions"
                    required
                    maxLength={100}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="#6366f1"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  maxLength={500}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white shadow rounded-lg">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No categories yet</p>
              {!showNewForm && (
                <Button onClick={() => setShowNewForm(true)}>
                  Add Your First Category
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {categories.map(category => (
                <div key={category.id} className="p-4">
                  {editingId === category.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Category name"
                          maxLength={100}
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          maxLength={500}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            placeholder="#6366f1"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(category.id)} disabled={isSaving || !editName.trim()}>
                          <Save className="h-3 w-3 mr-1" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#6366f1' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{category.name}</span>
                            <span className="text-xs text-gray-500">
                              ({category.termCount || 0} terms)
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(category)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
