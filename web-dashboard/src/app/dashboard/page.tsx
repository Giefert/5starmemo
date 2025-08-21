'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { deckApi } from '@/lib/api';
import { Deck } from '../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Users, BarChart3 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

function DashboardContent() {
  const { user, logout } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const data = await deckApi.getAll();
      setDecks(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch decks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    
    try {
      await deckApi.delete(deckId);
      setDecks(decks.filter(deck => deck.id !== deckId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete deck');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">5StarMemo Management</h1>
              <p className="text-gray-600">Welcome back, {user?.username}</p>
            </div>
            <Button onClick={logout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Decks</dt>
                    <dd className="text-lg font-medium text-gray-900">{decks.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Cards</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Public Decks</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {decks.filter(deck => deck.isPublic).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decks Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Your Decks</h2>
              <Link href="/dashboard/decks/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Deck
                </Button>
              </Link>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {decks.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No decks</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new deck.</p>
                <div className="mt-6">
                  <Link href="/dashboard/decks/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Deck
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.map((deck) => (
                  <div key={deck.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{deck.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        deck.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {deck.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    
                    {deck.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{deck.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <span>{deck.cardCount || 0} cards</span>
                      <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Link href={`/dashboard/decks/${deck.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="px-3"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}