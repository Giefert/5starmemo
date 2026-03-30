'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { deckApi } from '@/lib/api';
import { Deck, Card, RestaurantCardData } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { RestaurantCardForm } from '@/components/RestaurantCardForm';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import { ImagePreview } from '@/components/ui/ImagePreview';

// Helper to render text with *highlighted* terms (yellow background)
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/\*(.*?)\*/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="bg-amber-200 rounded px-0.5">{part}</span>
          : part
      )}
    </>
  );
}

export default function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Card form state
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  
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
      setIsFeatured(data.isFeatured);
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
    setSuccessMessage('');

    try {
      const updatedDeck = await deckApi.update(resolvedParams.id, {
        title,
        description: description || undefined,
        isPublic,
        isFeatured
      });
      setDeck(prev => prev ? { ...prev, ...updatedDeck } : updatedDeck);
      setSuccessMessage('Changes saved!');

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update deck');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardSubmit = async (data: { restaurantData: RestaurantCardData; imageUrl?: string }) => {
    try {
      if (editingCard) {
        const updatedCard = await deckApi.updateCard(editingCard.id, {
          restaurantData: data.restaurantData,
          imageUrl: data.imageUrl
        });
        setDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.map(card => card.id === updatedCard.id ? updatedCard : card)
            .sort((a, b) => (a.restaurantData?.itemName || '').localeCompare(b.restaurantData?.itemName || ''))
        } : null);
        const cardId = editingCard.id;
        setEditingCard(null);
        setShowCardForm(false);
        scrollToElement(`card-${cardId}`);
      } else {
        const newCard = await deckApi.addCard(resolvedParams.id, {
          restaurantData: data.restaurantData,
          imageUrl: data.imageUrl
        });
        setDeck(prev => prev ? {
          ...prev,
          cards: [...(prev.cards || []), newCard]
            .sort((a, b) => (a.restaurantData?.itemName || '').localeCompare(b.restaurantData?.itemName || '')),
          cardCount: (prev.cardCount || 0) + 1
        } : null);
        setEditingCard(null);
        setShowCardForm(false);
        scrollToElement(`card-${newCard.id}`);
      }
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
    setShowCardForm(true);
  };

  const scrollToElement = (elementId: string) => {
    requestAnimationFrame(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const cancelCardEdit = () => {
    const cardId = editingCard?.id;
    setEditingCard(null);
    setShowCardForm(false);
    if (cardId) scrollToElement(`card-${cardId}`);
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
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Deck</h1>
        </div>

        {successMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded shadow-lg z-50 text-center animate-in fade-in duration-200">
            {successMessage}
          </div>
        )}

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

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => {
                    setIsPublic(e.target.checked);
                    if (!e.target.checked) {
                      setIsFeatured(false);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Make this deck publicly available
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="isFeatured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  disabled={!isPublic}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="isFeatured" className={`ml-2 block text-sm ${!isPublic ? 'text-gray-400' : 'text-gray-900'}`}>
                  Feature this deck (highlight as recommended content)
                </label>
              </div>
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
              <Button onClick={() => { setShowCardForm(true); scrollToElement('add-card-form'); }} disabled={showCardForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* Restaurant Card Form (add new card only) */}
            {showCardForm && !editingCard && (
              <div id="add-card-form">
              <RestaurantCardForm
                onSubmit={handleCardSubmit}
                onCancel={cancelCardEdit}
                isEditing={false}
              />
              </div>
            )}

            {/* Cards List */}
            {!deck.cards || deck.cards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No cards in this deck yet.</p>
                {!showCardForm && (
                  <Button onClick={() => { setShowCardForm(true); scrollToElement('add-card-form'); }} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Card
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {deck.cards.map((card, index) => (
                  <div key={card.id} id={`card-${card.id}`} className="border border-gray-200 rounded-lg p-4">
                    {editingCard?.id === card.id && showCardForm ? (
                      <RestaurantCardForm
                        onSubmit={handleCardSubmit}
                        onCancel={cancelCardEdit}
                        initialData={{ restaurantData: editingCard.restaurantData, imageUrl: editingCard.imageUrl || '' }}
                        isEditing={true}
                      />
                    ) : (
                    <>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-base font-semibold text-gray-900">
                        <span className="bg-blue-100 px-1.5 py-0.5 rounded">{card.restaurantData?.itemName || `Card ${index + 1}`}</span>
                      </h4>
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
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-gray-500">Card {index + 1}</span>
                      {card.restaurantData && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          card.restaurantData.category === 'wine' ? 'bg-purple-100 text-purple-800' :
                          card.restaurantData.category === 'beer' ? 'bg-amber-100 text-amber-800' :
                          card.restaurantData.category === 'cocktail' ? 'bg-pink-100 text-pink-800' :
                          card.restaurantData.category === 'spirit' ? 'bg-orange-100 text-orange-800' :
                          card.restaurantData.category === 'fish' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {card.restaurantData.category}
                        </span>
                      )}
                    </div>

                    {card.restaurantData && (() => {
                      // Type assertion for display - backend already filtered invalid fields
                      const data = card.restaurantData as any;
                      return (
                        <div className={card.imageUrl ? "flex gap-4" : "space-y-3"}>
                          {/* Card Image */}
                          {card.imageUrl && (
                            <div className="flex-shrink-0 w-32 h-40 rounded-md border border-gray-300 overflow-hidden">
                              <img
                                src={getImageUrl(card.imageUrl)}
                                alt={card.restaurantData?.itemName || 'Card image'}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-3">
                          {data.description && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-800">{data.description}</p>
                            </div>
                          )}

                          <div className={`grid gap-4 text-xs ${data.category === 'sake' ? 'grid-cols-1' : data.category === 'maki' || data.category === 'wine' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {data.category === 'sake' ? (
                              <>
                                {data.classification && (
                                  <div>
                                    <span className="font-medium text-gray-700">Classification:</span>
                                    <span className="text-gray-600 ml-1">{data.classification}</span>
                                  </div>
                                )}
                                {data.riceVariety && (
                                  <div>
                                    <span className="font-medium text-gray-700">Rice Variety:</span>
                                    <span className="text-gray-600 ml-1">{data.riceVariety}</span>
                                  </div>
                                )}
                                {data.producer && (
                                  <div>
                                    <span className="font-medium text-gray-700">Producer:</span>
                                    <span className="text-gray-600 ml-1">{data.producer}</span>
                                  </div>
                                )}
                                {data.region && (
                                  <div>
                                    <span className="font-medium text-gray-700">Region:</span>
                                    <span className="text-gray-600 ml-1">{data.region}</span>
                                  </div>
                                )}
                                {data.tastingNotes && data.tastingNotes.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Tasting Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.tastingNotes.join(', ')} /></span>
                                  </div>
                                )}
                                {data.abv && (
                                  <div>
                                    <span className="font-medium text-gray-700">ABV:</span>
                                    <span className="text-gray-600 ml-1">{data.abv}%</span>
                                  </div>
                                )}
                                {data.pricePoint && data.pricePoint !== 'not-specified' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Price Point:</span>
                                    <span className="text-gray-600 ml-1">{data.pricePoint}</span>
                                  </div>
                                )}
                                {data.specialNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Special Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.specialNotes} /></span>
                                  </div>
                                )}
                                {data.allergens && data.allergens.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Allergens:</span>
                                    <span className="text-gray-600 ml-1">{data.allergens.join(', ')}</span>
                                  </div>
                                )}
                                {data.servingTemp && (
                                  <div>
                                    <span className="font-medium text-gray-700">Serving Temp:</span>
                                    <span className="text-gray-600 ml-1">{data.servingTemp}</span>
                                  </div>
                                )}
                                {data.foodPairings && data.foodPairings.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Food Pairings:</span>
                                    <span className="text-gray-600 ml-1">{data.foodPairings.join(', ')}</span>
                                  </div>
                                )}
                                {data.vintage && (
                                  <div>
                                    <span className="font-medium text-gray-700">Vintage:</span>
                                    <span className="text-gray-600 ml-1">{data.vintage}</span>
                                  </div>
                                )}
                              </>
                            ) : data.category === 'maki' ? (
                              <>
                                <div style={{ gridRow: 1, gridColumn: 1 }}>
                                  <span className="font-medium text-gray-700">Topping:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.topping || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 1, gridColumn: 2 }}>
                                  <span className="font-medium text-gray-700">Base:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.base || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 2, gridColumn: 1 }}>
                                  <span className="font-medium text-gray-700">Sauce:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.sauce || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 2, gridColumn: 2 }}>
                                  <span className="font-medium text-gray-700">Paper:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.paper || 'None'} /></span>
                                </div>
                                {data.gluten && (
                                  <div style={{ gridRow: 3, gridColumn: 1 }}>
                                    <span className="font-medium text-gray-700">Gluten:</span>
                                    <span className="text-gray-600 ml-1 capitalize"><HighlightedText text={data.gluten} /></span>
                                  </div>
                                )}
                                {data.pricePoint && data.pricePoint !== 'not-specified' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Price Point:</span>
                                    <span className="text-gray-600 ml-1">{data.pricePoint}</span>
                                  </div>
                                )}
                                {data.specialNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Special Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.specialNotes} /></span>
                                  </div>
                                )}
                              </>
                            ) : data.category === 'fish' ? (
                              <>
                                {data.taste && (
                                  <div>
                                    <span className="font-medium text-gray-700">Taste:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.taste} /></span>
                                  </div>
                                )}
                                {data.country && (
                                  <div>
                                    <span className="font-medium text-gray-700">Country:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.country} /></span>
                                  </div>
                                )}
                                {data.pricePoint && data.pricePoint !== 'not-specified' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Price Point:</span>
                                    <span className="text-gray-600 ml-1">{data.pricePoint}</span>
                                  </div>
                                )}
                                {data.specialNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Special Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.specialNotes} /></span>
                                  </div>
                                )}
                              </>
                            ) : data.category === 'wine' ? (
                              <>
                                <div style={{ gridRow: 1, gridColumn: 1 }}>
                                  <span className="font-medium text-gray-700">Producer:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.producer || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 1, gridColumn: 2 }}>
                                  <span className="font-medium text-gray-700">Region:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.region || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 2, gridColumn: 1 }}>
                                  <span className="font-medium text-gray-700">Appellation:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.appellation || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 2, gridColumn: 2 }}>
                                  <span className="font-medium text-gray-700">Grape Varieties:</span>
                                  <span className="text-gray-600 ml-1"><HighlightedText text={data.grapeVarieties?.join(', ') || 'None'} /></span>
                                </div>
                                <div style={{ gridRow: 3, gridColumn: 1 }}>
                                  <span className="font-medium text-gray-700">Vintage:</span>
                                  <span className="text-gray-600 ml-1">{data.vintage || 'None'}</span>
                                </div>
                                <div style={{ gridRow: 3, gridColumn: 2 }}>
                                  <span className="font-medium text-gray-700">ABV:</span>
                                  <span className="text-gray-600 ml-1">{data.abv ? `${data.abv}%` : 'None'}</span>
                                </div>
                                {data.tastingNotes && data.tastingNotes.length > 0 && (
                                  <div style={{ gridRow: 4, gridColumn: '1 / -1' }}>
                                    <span className="font-medium text-gray-700">Tasting Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.tastingNotes.join(', ')} /></span>
                                  </div>
                                )}
                                {(data.sweetnessLevel || data.acidityLevel || data.bodyLevel) && (
                                  <div style={{ gridRow: 5, gridColumn: '1 / -1' }} className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-gray-100">
                                    {data.sweetnessLevel && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 min-w-[32px]">Dry</span>
                                        <div className="flex flex-1 gap-0.5 h-2">
                                          {[1, 2, 3, 4, 5].map((pos) => (
                                            <div key={pos} className={`flex-1 rounded-sm ${pos === data.sweetnessLevel ? 'bg-gray-400' : 'bg-gray-200'}`} />
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400 min-w-[32px] text-right">Sweet</span>
                                      </div>
                                    )}
                                    {data.acidityLevel && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 min-w-[32px]">Soft</span>
                                        <div className="flex flex-1 gap-0.5 h-2">
                                          {[1, 2, 3, 4, 5].map((pos) => (
                                            <div key={pos} className={`flex-1 rounded-sm ${pos === data.acidityLevel ? 'bg-gray-400' : 'bg-gray-200'}`} />
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400 min-w-[32px] text-right">Acidic</span>
                                      </div>
                                    )}
                                    {data.bodyLevel && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 min-w-[32px]">Light</span>
                                        <div className="flex flex-1 gap-0.5 h-2">
                                          {[1, 2, 3, 4, 5].map((pos) => (
                                            <div key={pos} className={`flex-1 rounded-sm ${pos === data.bodyLevel ? 'bg-gray-400' : 'bg-gray-200'}`} />
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400 min-w-[32px] text-right">Bold</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {data.pricePoint && data.pricePoint !== 'not-specified' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Price Point:</span>
                                    <span className="text-gray-600 ml-1">{data.pricePoint}</span>
                                  </div>
                                )}
                                {data.specialNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Special Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.specialNotes} /></span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {data.ingredients && data.ingredients.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Ingredients:</span>
                                    <span className="text-gray-600 ml-1">{data.ingredients.join(', ')}</span>
                                  </div>
                                )}
                                {data.region && (
                                  <div>
                                    <span className="font-medium text-gray-700">Region:</span>
                                    <span className="text-gray-600 ml-1">{data.region}</span>
                                  </div>
                                )}
                                {data.abv && (
                                  <div>
                                    <span className="font-medium text-gray-700">ABV:</span>
                                    <span className="text-gray-600 ml-1">{data.abv}%</span>
                                  </div>
                                )}
                                {data.tastingNotes && data.tastingNotes.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Tasting Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.tastingNotes.join(', ')} /></span>
                                  </div>
                                )}
                                {data.pricePoint && data.pricePoint !== 'not-specified' && (
                                  <div>
                                    <span className="font-medium text-gray-700">Price Point:</span>
                                    <span className="text-gray-600 ml-1">{data.pricePoint}</span>
                                  </div>
                                )}
                                {data.specialNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Special Notes:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.specialNotes} /></span>
                                  </div>
                                )}
                                {data.producer && (
                                  <div>
                                    <span className="font-medium text-gray-700">Producer:</span>
                                    <span className="text-gray-600 ml-1">{data.producer}</span>
                                  </div>
                                )}
                                {data.allergens && data.allergens.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Allergens:</span>
                                    <span className="text-gray-600 ml-1">{data.allergens.join(', ')}</span>
                                  </div>
                                )}
                                {data.servingTemp && (
                                  <div>
                                    <span className="font-medium text-gray-700">Serving Temp:</span>
                                    <span className="text-gray-600 ml-1">{data.servingTemp}</span>
                                  </div>
                                )}
                                {data.foodPairings && data.foodPairings.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Food Pairings:</span>
                                    <span className="text-gray-600 ml-1">{data.foodPairings.join(', ')}</span>
                                  </div>
                                )}
                                {data.vintage && (
                                  <div>
                                    <span className="font-medium text-gray-700">Vintage:</span>
                                    <span className="text-gray-600 ml-1">{data.vintage}</span>
                                  </div>
                                )}
                                {data.grapeVarieties && data.grapeVarieties.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Grape Varieties:</span>
                                    <span className="text-gray-600 ml-1">{data.grapeVarieties.join(', ')}</span>
                                  </div>
                                )}
                                {data.appellation && (
                                  <div>
                                    <span className="font-medium text-gray-700">Appellation:</span>
                                    <span className="text-gray-600 ml-1">{data.appellation}</span>
                                  </div>
                                )}
                                {data.bodyLevel && (
                                  <div>
                                    <span className="font-medium text-gray-700">Body:</span>
                                    <span className="text-gray-600 ml-1">{data.bodyLevel}/5</span>
                                  </div>
                                )}
                                {data.sweetnessLevel && (
                                  <div>
                                    <span className="font-medium text-gray-700">Sweetness:</span>
                                    <span className="text-gray-600 ml-1">{data.sweetnessLevel}/5</span>
                                  </div>
                                )}
                                {data.acidityLevel && (
                                  <div>
                                    <span className="font-medium text-gray-700">Acidity:</span>
                                    <span className="text-gray-600 ml-1">{data.acidityLevel}/5</span>
                                  </div>
                                )}
                                {data.topping && (
                                  <div>
                                    <span className="font-medium text-gray-700">Topping:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.topping} /></span>
                                  </div>
                                )}
                                {data.base && (
                                  <div>
                                    <span className="font-medium text-gray-700">Base:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.base} /></span>
                                  </div>
                                )}
                                {data.sauce && (
                                  <div>
                                    <span className="font-medium text-gray-700">Sauce:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.sauce} /></span>
                                  </div>
                                )}
                                {data.paper && (
                                  <div>
                                    <span className="font-medium text-gray-700">Paper:</span>
                                    <span className="text-gray-600 ml-1"><HighlightedText text={data.paper} /></span>
                                  </div>
                                )}
                                {data.gluten && (
                                  <div>
                                    <span className="font-medium text-gray-700">Gluten:</span>
                                    <span className="text-gray-600 ml-1 capitalize"><HighlightedText text={data.gluten} /></span>
                                  </div>
                                )}
                                {data.alcohol && data.alcohol.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Alcohol:</span>
                                    <span className="text-gray-600 ml-1">{data.alcohol.join(', ')}</span>
                                  </div>
                                )}
                                {data.other && data.other.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Other:</span>
                                    <span className="text-gray-600 ml-1">{data.other.join(', ')}</span>
                                  </div>
                                )}
                                {data.garnish && (
                                  <div>
                                    <span className="font-medium text-gray-700">Garnish:</span>
                                    <span className="text-gray-600 ml-1">{data.garnish}</span>
                                  </div>
                                )}
                                {data.classification && (
                                  <div>
                                    <span className="font-medium text-gray-700">Classification:</span>
                                    <span className="text-gray-600 ml-1">{data.classification}</span>
                                  </div>
                                )}
                                {data.riceVariety && (
                                  <div>
                                    <span className="font-medium text-gray-700">Rice Variety:</span>
                                    <span className="text-gray-600 ml-1">{data.riceVariety}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          </div>
                        </div>
                      );
                    })()}
                    </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}