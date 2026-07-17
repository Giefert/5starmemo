'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Deck, RestaurantCardData, RestaurantCategory } from '../../../../../shared/types';
import { cardApi, deckApi } from '@/lib/api';
import { RestaurantCardForm } from '@/components/RestaurantCardForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Plus, Trash2 } from 'lucide-react';

const CATEGORIES: Array<{ value: '' | RestaurantCategory; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'wine', label: 'Wine' },
  { value: 'beer', label: 'Beer' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'spirit', label: 'Spirit' },
  { value: 'maki', label: 'Maki' },
  { value: 'sake', label: 'Sake' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'fish', label: 'Fish' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'starters', label: 'Starters' },
  { value: 'sashimi', label: 'Sashimi' },
];

type ApiError = { response?: { data?: { error?: string } } };
const errorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.error || fallback;

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'' | RestaurantCategory>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Card | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCards, nextDecks] = await Promise.all([
        cardApi.getAll({ q: query.trim() || undefined, category: category || undefined }),
        deckApi.getAll(),
      ]);
      setCards(nextCards);
      setDecks(nextDecks);
    } catch (error: unknown) {
      setError(errorMessage(error, 'Failed to load cards'));
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, [load]);

  const groupedCards = useMemo(() => {
    const groups = new Map<string, Card[]>();
    for (const card of cards) {
      const type = card.restaurantData?.category || 'uncategorized';
      groups.set(type, [...(groups.get(type) ?? []), card]);
    }
    return [...groups.entries()];
  }, [cards]);

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, Card[]>();
    for (const card of cards) {
      const name = card.restaurantData?.itemName?.trim().toLocaleLowerCase();
      const type = card.restaurantData?.category;
      if (!name || !type) continue;
      const key = `${type}:${name}`;
      groups.set(key, [...(groups.get(key) ?? []), card]);
    }
    return [...groups.values()].filter(group => group.length > 1);
  }, [cards]);

  const beginCreate = () => {
    setEditing(null);
    setSelectedDeckIds(new Set());
    setCreating(true);
  };

  const beginEdit = (card: Card) => {
    setCreating(false);
    setEditing(card);
    setSelectedDeckIds(new Set(card.deckIds ?? card.decks?.map(deck => deck.id) ?? []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditing(null);
    setSelectedDeckIds(new Set());
  };

  const toggleDeck = (deckId: string) => {
    setSelectedDeckIds(current => {
      const next = new Set(current);
      if (next.has(deckId)) next.delete(deckId);
      else next.add(deckId);
      return next;
    });
  };

  const saveCard = async (data: { restaurantData: RestaurantCardData; imageUrl?: string | null }) => {
    try {
      if (editing) {
        await cardApi.update(editing.id, {
          restaurantData: data.restaurantData,
          imageUrl: data.imageUrl || undefined,
        });
        const oldDeckIds = new Set(editing.deckIds ?? editing.decks?.map(deck => deck.id) ?? []);
        await Promise.all([
          ...[...selectedDeckIds]
            .filter(deckId => !oldDeckIds.has(deckId))
            .map(deckId => deckApi.addExistingCard(deckId, editing.id)),
          ...[...oldDeckIds]
            .filter(deckId => !selectedDeckIds.has(deckId))
            .map(deckId => deckApi.removeCard(deckId, editing.id)),
        ]);
      } else {
        await cardApi.create({
          restaurantData: data.restaurantData,
          imageUrl: data.imageUrl || undefined,
          deckIds: [...selectedDeckIds],
        });
      }
      cancelForm();
      await load();
    } catch (error: unknown) {
      alert(errorMessage(error, 'Failed to save card'));
    }
  };

  const deleteCard = async (card: Card) => {
    const usage = card.decks?.length ?? card.deckIds?.length ?? 0;
    if (!confirm(`Delete this canonical card${usage ? ` from ${usage} deck${usage === 1 ? '' : 's'}` : ''}? Study progress and links for it will also be deleted.`)) return;
    try {
      await cardApi.delete(card.id);
      setCards(current => current.filter(item => item.id !== card.id));
    } catch (error: unknown) {
      alert(errorMessage(error, 'Failed to delete card'));
    }
  };

  const mergeDuplicates = async (group: Card[]) => {
    const [survivor, ...duplicates] = group;
    if (!confirm(`Merge ${group.length} “${survivor.restaurantData?.itemName}” cards? The first version shown will be kept and all deck memberships, links, bulletin entries, and study history will be consolidated into it.`)) return;
    try {
      await cardApi.merge(survivor.id, duplicates.map(card => card.id));
      await load();
    } catch (error: unknown) {
      alert(errorMessage(error, 'Failed to merge cards'));
    }
  };

  const formOpen = creating || Boolean(editing);

  return (
    <main className="min-h-screen bg-ink px-6 py-8 text-paper lg:px-9">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-on-dark-mute">Canonical library</p>
            <h1 className="font-serif text-4xl">Cards</h1>
            <p className="mt-2 max-w-2xl text-sm text-on-dark-mute">
              Edit a card once and every deck that uses it receives the update.
            </p>
          </div>
          <Button onClick={beginCreate} disabled={formOpen}>
            <Plus className="mr-2 h-4 w-4" /> New card
          </Button>
        </div>

        {formOpen && (
          <section className="mb-8 rounded-lg bg-white p-6 text-gray-900 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">{editing ? 'Edit canonical card' : 'Create card'}</h2>
            <div className="mb-6 rounded-md border border-gray-200 p-4">
              <h3 className="mb-1 text-sm font-medium">Decks</h3>
              <p className="mb-3 text-xs text-gray-500">A card may be in any number of decks, including none.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {decks.map(deck => (
                  <label key={deck.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDeckIds.has(deck.id)}
                      onChange={() => toggleDeck(deck.id)}
                      className="rounded border-gray-300"
                    />
                    {deck.title}
                  </label>
                ))}
              </div>
            </div>
            <RestaurantCardForm
              onSubmit={saveCard}
              onCancel={cancelForm}
              initialData={editing ? {
                restaurantData: editing.restaurantData,
                imageUrl: editing.imageUrl,
              } : undefined}
              isEditing={Boolean(editing)}
            />
          </section>
        )}

        <section className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search card names, details, or deck names…"
            className="bg-white text-gray-900"
          />
          <select
            value={category}
            onChange={event => setCategory(event.target.value as '' | RestaurantCategory)}
            className="rounded-md border border-bg-hair bg-white px-3 py-2 text-sm text-gray-900"
          >
            {CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </section>

        {error && <div className="mb-5 rounded bg-red px-4 py-3 text-sm text-paper">{error}</div>}
        {!loading && duplicateGroups.length > 0 && (
          <section className="mb-7 rounded-lg border border-amber/50 bg-white p-5 text-gray-900">
            <div className="mb-3">
              <h2 className="font-semibold">Possible duplicates</h2>
              <p className="text-xs text-gray-500">Same normalized name and card type. Review the versions before choosing merge.</p>
            </div>
            <div className="space-y-3">
              {duplicateGroups.map(group => (
                <div key={group.map(card => card.id).join(':')} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium">{group[0].restaurantData?.itemName} · {group[0].restaurantData?.category}</p>
                    <p className="text-xs text-gray-500">
                      {group.map((card, index) => `Version ${index + 1}: ${card.decks?.map(deck => deck.title).join(', ') || 'unassigned'}`).join(' · ')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => mergeDuplicates(group)} disabled={formOpen}>
                    Merge {group.length} versions
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
        {loading ? (
          <p className="py-12 text-center text-on-dark-mute">Loading cards…</p>
        ) : groupedCards.length === 0 ? (
          <div className="rounded-lg border border-bg-hair p-12 text-center text-on-dark-mute">No cards match this view.</div>
        ) : (
          <div className="space-y-8">
            {groupedCards.map(([type, items]) => (
              <section key={type}>
                <div className="mb-3 flex items-baseline gap-3 border-b border-bg-hair pb-2">
                  <h2 className="font-serif text-2xl capitalize">{type}</h2>
                  <span className="text-xs text-on-dark-mute">{items.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(card => (
                    <article id={`card-${card.id}`} key={card.id} className="rounded-lg border border-bg-hair bg-white p-4 text-gray-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{card.restaurantData?.itemName || '(untitled card)'}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {card.decks?.length
                              ? card.decks.map(deck => deck.title).join(' · ')
                              : 'Unassigned'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => beginEdit(card)} disabled={formOpen} aria-label="Edit card">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteCard(card)} disabled={formOpen} aria-label="Delete card">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {card.restaurantData?.description && (
                        <p className="mt-3 line-clamp-3 text-sm text-gray-600">{card.restaurantData.description}</p>
                      )}
                      <p className="mt-3 text-xs font-medium text-gray-500">
                        Used in {card.decks?.length ?? 0} deck{card.decks?.length === 1 ? '' : 's'}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
