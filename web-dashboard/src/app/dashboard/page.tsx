'use client';

import { useState, useEffect, useCallback } from 'react';
import { curationApi, deckApi, restaurantApi } from '@/lib/api';
import {
  CurationKind,
  CurationTargetType,
  Deck,
  Restaurant,
  RestaurantCurationItem,
} from '../../../../shared/types';
import { applyFilter, CarteFilter } from '@/lib/decks';
import { Masthead } from '@/components/admin/masthead';
import { DeckGrid } from '@/components/admin/deck-grid';

const EMPTY_CURATIONS: Record<CurationKind, RestaurantCurationItem[]> = {
  specials: [],
  new_item: [],
  featured: [],
  glossary_highlight: [],
};

export default function DashboardPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [curations, setCurations] =
    useState<Record<CurationKind, RestaurantCurationItem[]>>(EMPTY_CURATIONS);
  const [filter, setFilter] = useState<CarteFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      deckApi.getAll(),
      restaurantApi.me(),
      curationApi.list('specials'),
      curationApi.list('new_item'),
      curationApi.list('featured'),
      curationApi.list('glossary_highlight'),
    ])
      .then(([d, r, specials, newItems, featured, glossaryHighlight]) => {
        if (cancelled) return;
        setDecks(d);
        setRestaurant(r);
        setCurations({
          specials,
          new_item: newItems,
          featured,
          glossary_highlight: glossaryHighlight,
        });
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await deckApi.delete(deckId);
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete deck');
    }
  };

  const handleSaveAnnouncements = useCallback(async (next: string[]) => {
    const saved = await restaurantApi.updateAnnouncements(next);
    setRestaurant((cur) => (cur ? { ...cur, announcements: saved } : cur));
  }, []);

  const handleAddCuration = useCallback(
    async (kind: CurationKind, targetType: CurationTargetType, targetId: string) => {
      const items = await curationApi.add(kind, targetType, targetId);
      setCurations((cur) => ({ ...cur, [kind]: items }));
    },
    []
  );

  const handleRemoveCuration = useCallback(
    async (kind: CurationKind, targetType: CurationTargetType, targetId: string) => {
      await curationApi.remove(kind, targetType, targetId);
      const items = await curationApi.list(kind);
      setCurations((cur) => ({ ...cur, [kind]: items }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-ink text-on-dark-mute">
        <div className="font-dek italic" style={{ fontSize: 18 }}>
          Loading the bulletin…
        </div>
      </div>
    );
  }

  const visibleDecks = applyFilter(decks, filter);

  return (
    <main className="bg-ink text-on-dark min-h-screen w-full font-sans">
      <Masthead
        restaurant={restaurant}
        decks={decks}
        curations={curations}
        onSaveAnnouncements={handleSaveAnnouncements}
        onAddCuration={handleAddCuration}
        onRemoveCuration={handleRemoveCuration}
      />

      {error && (
        <div
          className="bg-red text-paper"
          style={{ padding: '12px 36px', fontSize: 13 }}
        >
          {error}
        </div>
      )}

      <DeckGrid
        decks={visibleDecks}
        totalCount={decks.length}
        filter={filter}
        onFilterChange={setFilter}
        onDelete={handleDeleteDeck}
      />
    </main>
  );
}
