'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deckApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

function NewDeckContent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const deck = await deckApi.create({
        title,
        description: description || undefined,
        isPublic
      });
      
      router.push(`/dashboard/decks/${deck.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create deck');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Deck</h1>
          <p className="text-gray-600">Create a new flashcard deck for your students</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Deck Title *
              </label>
              <Input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                placeholder="Enter deck title (e.g., Biology Basics, Spanish Vocabulary)"
                maxLength={200}
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose a clear, descriptive title for your deck
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe what this deck covers, learning objectives, or any special instructions..."
                maxLength={1000}
              />
              <p className="mt-1 text-sm text-gray-500">
                Help students understand what they'll learn with this deck
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this deck publicly available to all students
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || !title.trim()}>
                {isLoading ? 'Creating...' : 'Create Deck'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NewDeckPage() {
  return (
    <ProtectedRoute>
      <NewDeckContent />
    </ProtectedRoute>
  );
}