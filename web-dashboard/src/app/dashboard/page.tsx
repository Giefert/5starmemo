'use client';

import { useState, useEffect } from 'react';
import { deckApi } from '@/lib/api';
import { Deck } from '../../../../shared/types';
import { applyFilter, CarteFilter } from '@/lib/decks';
import { Masthead } from '@/components/admin/masthead';
import { DeckGrid } from '@/components/admin/deck-grid';

export default function DashboardPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [filter, setFilter] = useState<CarteFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    deckApi
      .getAll()
      .then((data) => {
        if (!cancelled) setDecks(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to fetch decks');
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

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-ink text-on-dark-mute">
        <div className="font-dek italic" style={{ fontSize: 18 }}>
          Loading the carte…
        </div>
      </div>
    );
  }

  const visibleDecks = applyFilter(decks, filter);

  return (
    <main className="bg-ink text-on-dark min-h-screen w-full font-sans">
      <Masthead decks={decks} />

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
