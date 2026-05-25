'use client';

import { useMemo, useState } from 'react';
import { Deck } from '../../../../shared/types';

// Order featured decks the way the mobile app does: by featured_order, with
// any unordered ones (null) trailing by newest-created.
function orderFeatured(decks: Deck[]): Deck[] {
  return decks
    .filter((d) => d.isFeatured)
    .sort((a, b) => {
      const ao = a.featuredOrder;
      const bo = b.featuredOrder;
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function FeaturedDecks({
  decks,
  onSave,
}: {
  decks: Deck[];
  // Replace-all the featured set, in order.
  onSave: (deckIds: string[]) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const featured = useMemo(() => orderFeatured(decks), [decks]);
  const available = useMemo(
    () =>
      decks
        .filter((d) => !d.isFeatured)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [decks]
  );

  const commit = async (ids: string[]) => {
    setSaving(true);
    try {
      await onSave(ids);
    } finally {
      setSaving(false);
    }
  };

  const ids = featured.map((d) => d.id);

  const move = (idx: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= ids.length) return;
    const next = ids.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    return commit(next);
  };

  const remove = (deckId: string) => commit(ids.filter((id) => id !== deckId));

  const add = (deckId: string) => {
    if (!deckId || ids.includes(deckId)) return;
    return commit([...ids, deckId]);
  };

  return (
    <section
      className="bg-paper text-on-paper border-b border-paper-hair"
      style={{ padding: '40px 36px 32px' }}
    >
      <div className="flex items-baseline" style={{ gap: 16, marginBottom: 6 }}>
        <h2
          className="font-serif m-0 text-on-paper"
          style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}
        >
          Featured
        </h2>
        <span
          className="uppercase text-on-paper-mute"
          style={{ fontSize: 12, letterSpacing: '0.16em' }}
        >
          {featured.length} pinned
        </span>
      </div>
      <p
        className="font-dek italic text-on-paper-mute m-0"
        style={{ fontSize: 14, marginBottom: 20 }}
      >
        Pinned to the top of the student deck list, in this order.
      </p>

      {featured.length === 0 ? (
        <div
          className="font-dek italic text-on-paper-mute"
          style={{ fontSize: 14, marginBottom: 20 }}
        >
          No featured decks yet. Add one below.
        </div>
      ) : (
        <ol className="flex flex-col m-0 p-0" style={{ gap: 1, marginBottom: 20 }}>
          {featured.map((deck, idx) => (
            <li
              key={deck.id}
              className="flex items-center justify-between bg-paper border border-paper-hair"
              style={{ padding: '10px 14px', gap: 12, listStyle: 'none' }}
            >
              <span className="flex items-baseline" style={{ gap: 12, minWidth: 0 }}>
                <span
                  className="text-on-paper-faint tabular-nums"
                  style={{ fontSize: 12, width: 18 }}
                >
                  {idx + 1}
                </span>
                <span className="font-serif text-on-paper truncate" style={{ fontSize: 18 }}>
                  {deck.title}
                </span>
              </span>
              <span className="flex items-center" style={{ gap: 4 }}>
                <button
                  type="button"
                  onClick={() => move(idx, 'up')}
                  disabled={saving || idx === 0}
                  aria-label="Move up"
                  className="text-on-paper-mute transition-colors hover:text-amber disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ fontSize: 14, lineHeight: 1, padding: '2px 6px', cursor: 'pointer' }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 'down')}
                  disabled={saving || idx === featured.length - 1}
                  aria-label="Move down"
                  className="text-on-paper-mute transition-colors hover:text-amber disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ fontSize: 14, lineHeight: 1, padding: '2px 6px', cursor: 'pointer' }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(deck.id)}
                  disabled={saving}
                  aria-label="Remove from featured"
                  className="text-on-paper-faint transition-colors hover:text-red disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ fontSize: 18, lineHeight: 1, padding: '0 6px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <select
        value=""
        disabled={saving || available.length === 0}
        onChange={(e) => add(e.target.value)}
        className="bg-paper text-on-paper border border-paper-hair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-50"
        style={{ padding: '10px 12px', fontSize: 13, borderRadius: 2, minWidth: 240 }}
      >
        <option value="" disabled>
          {available.length === 0 ? 'All decks are featured' : '+ Add featured deck…'}
        </option>
        {available.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
    </section>
  );
}
