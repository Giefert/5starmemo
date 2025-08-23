'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { deckApi } from '@/lib/api';
import { Deck, Card } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

function EditDeckContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Card form state
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchDeck();
  }, [resolvedParams.id]);

  const fetchDeck = async () => {
    try {
      const data = await deckApi.getById(resolvedParams.id);
      setDeck(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setIsPublic(data.isPublic);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch deck');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const updatedDeck = await deckApi.update(resolvedParams.id, {
        title,
        description: description || undefined,
        isPublic
      });
      setDeck(updatedDeck);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update deck');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;

    try {
      if (editingCard) {
        const updatedCard = await deckApi.updateCard(editingCard.id, {
          front: cardFront,
          back: cardBack
        });
        setDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.map(card => card.id === updatedCard.id ? updatedCard : card)
        } : null);
      } else {
        const newCard = await deckApi.addCard(resolvedParams.id, {
          front: cardFront,
          back: cardBack
        });
        setDeck(prev => prev ? {
          ...prev,
          cards: [...(prev.cards || []), newCard],
          cardCount: (prev.cardCount || 0) + 1
        } : null);
      }
      
      setCardFront('');
      setCardBack('');
      setEditingCard(null);
      setShowCardForm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    try {
      await deckApi.deleteCard(cardId);
      setDeck(prev => prev ? {
        ...prev,
        cards: prev.cards?.filter(card => card.id !== cardId),
        cardCount: Math.max(0, (prev.cardCount || 0) - 1)
      } : null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete card');
    }
  };

  const startEditCard = (card: Card) => {
    setEditingCard(card);
    setCardFront(card.front);
    setCardBack(card.back);
    setShowCardForm(true);
  };

  const cancelCardEdit = () => {
    setEditingCard(null);
    setCardFront('');
    setCardBack('');
    setShowCardForm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading deck...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Deck not found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Deck</h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Deck Details Form */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Deck Details</h2>
          </div>
          <form onSubmit={handleUpdateDeck} className="p-6 space-y-6">
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
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={1000}
              />
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
                Make this deck publicly available
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Cards Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Cards ({deck.cards?.length || 0})
              </h2>
              <Button onClick={() => setShowCardForm(true)} disabled={showCardForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* Card Form */}
            {showCardForm && (
              <form onSubmit={handleCardSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  {editingCard ? 'Edit Card' : 'Add New Card'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Front *
                    </label>
                    <textarea
                      value={cardFront}
                      onChange={(e) => setCardFront(e.target.value)}
                      className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter the question or prompt..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Back *
                    </label>
                    <textarea
                      value={cardBack}
                      onChange={(e) => setCardBack(e.target.value)}
                      className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter the answer..."
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={cancelCardEdit}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!cardFront.trim() || !cardBack.trim()}>
                    {editingCard ? 'Update Card' : 'Add Card'}
                  </Button>
                </div>
              </form>
            )}

            {/* Cards List */}
            {!deck.cards || deck.cards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No cards in this deck yet.</p>
                {!showCardForm && (
                  <Button onClick={() => setShowCardForm(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Card
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {deck.cards.map((card, index) => (
                  <div key={card.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">Card {index + 1}</span>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditCard(card)}
                          disabled={showCardForm}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCard(card.id)}
                          disabled={showCardForm}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Front</h4>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{card.front}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Back</h4>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{card.back}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <EditDeckContent params={params} />
    </ProtectedRoute>
  );
}