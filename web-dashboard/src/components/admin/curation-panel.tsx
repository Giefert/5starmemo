'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CurationTargetType,
  Deck,
  RestaurantCurationItem,
} from '../../../../shared/types';
import { cardApi, CardSearchResult } from '@/lib/api';

interface SearchResult {
  targetType: CurationTargetType;
  targetId: string;
  name: string;
  deckTitle?: string;
}

export function CurationPanel({
  items,
  editing,
  decks,
  onAdd,
  onRemove,
}: {
  items: RestaurantCurationItem[];
  editing: boolean;
  decks: Deck[];
  onAdd: (targetType: CurationTargetType, targetId: string) => Promise<void>;
  onRemove: (targetType: CurationTargetType, targetId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const existingKeys = useMemo(
    () => new Set(items.map((i) => `${i.targetType}:${i.targetId}`)),
    [items]
  );

  useEffect(() => {
    if (!editing || !debounced) {
      setResults([]);
      return;
    }
    const myReq = ++reqId.current;
    setSearching(true);

    // Query backend for cards, filter loaded decks client-side.
    const lower = debounced.toLowerCase();
    const deckMatches: SearchResult[] = decks
      .filter((d) => d.title.toLowerCase().includes(lower))
      .slice(0, 10)
      .map((d) => ({
        targetType: 'deck',
        targetId: d.id,
        name: d.title,
      }));

    cardApi
      .search(debounced, 10)
      .then((cards: CardSearchResult[]) => {
        if (reqId.current !== myReq) return;
        const cardMatches: SearchResult[] = cards.map((c) => ({
          targetType: 'card',
          targetId: c.id,
          name: c.name || '(untitled card)',
          deckTitle: c.deckTitle,
        }));
        setResults([...cardMatches, ...deckMatches]);
      })
      .catch(() => {
        if (reqId.current === myReq) setResults(deckMatches);
      })
      .finally(() => {
        if (reqId.current === myReq) setSearching(false);
      });
  }, [debounced, editing, decks]);

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {items.length === 0 && !editing && (
        <div className="text-on-dark-mute italic" style={{ fontSize: 13 }}>
          Nothing here yet.
        </div>
      )}

      {items.map((item) => (
        <CurationRow
          key={`${item.targetType}:${item.targetId}`}
          item={item}
          editing={editing}
          onRemove={() => onRemove(item.targetType, item.targetId)}
        />
      ))}

      {editing && (
        <div style={{ marginTop: items.length > 0 ? 10 : 0 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards or decks…"
            className="w-full bg-ink-soft text-on-dark border border-bg-hair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            style={{
              padding: '8px 10px',
              fontSize: 13,
              borderRadius: 2,
              fontFamily: 'inherit',
            }}
          />

          {debounced && (
            <div className="flex flex-col" style={{ gap: 2, marginTop: 6 }}>
              {searching && results.length === 0 && (
                <div className="text-on-dark-mute italic" style={{ fontSize: 12 }}>
                  Searching…
                </div>
              )}
              {!searching && results.length === 0 && (
                <div className="text-on-dark-mute italic" style={{ fontSize: 12 }}>
                  No matches.
                </div>
              )}
              {results.map((r) => {
                const key = `${r.targetType}:${r.targetId}`;
                const already = existingKeys.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={already}
                    onClick={async () => {
                      await onAdd(r.targetType, r.targetId);
                      setQuery('');
                    }}
                    className="text-left flex items-center justify-between transition-colors hover:bg-ink-soft disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      padding: '6px 8px',
                      fontSize: 13,
                      borderRadius: 2,
                    }}
                  >
                    <span className="text-on-dark truncate" style={{ paddingRight: 8 }}>
                      {r.name}
                      {r.deckTitle && (
                        <span className="text-on-dark-mute" style={{ marginLeft: 6 }}>
                          · {r.deckTitle}
                        </span>
                      )}
                    </span>
                    <TypeBadge type={r.targetType} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CurationRow({
  item,
  editing,
  onRemove,
}: {
  item: RestaurantCurationItem;
  editing: boolean;
  onRemove: () => void;
}) {
  const href =
    item.targetType === 'card'
      ? `/dashboard/decks/${item.deckId}#card-${item.targetId}`
      : `/dashboard/decks/${item.targetId}`;

  const label = (
    <span className="flex items-center justify-between" style={{ gap: 8 }}>
      <span className="text-on-dark truncate" style={{ paddingRight: 8 }}>
        {item.name}
        {item.deckTitle && (
          <span className="text-on-dark-mute" style={{ marginLeft: 6 }}>
            · {item.deckTitle}
          </span>
        )}
      </span>
      <TypeBadge type={item.targetType} />
    </span>
  );

  return (
    <div
      className="flex items-center justify-between"
      style={{ gap: 8, padding: '4px 0' }}
    >
      {editing ? (
        <span className="flex-1" style={{ fontSize: 13 }}>
          {label}
        </span>
      ) : (
        <Link
          href={href}
          className="flex-1 transition-colors hover:text-amber"
          style={{ fontSize: 13, textDecoration: 'none' }}
        >
          {label}
        </Link>
      )}
      {editing && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="text-on-dark-mute transition-colors hover:text-red"
          style={{ fontSize: 16, lineHeight: 1, padding: '0 4px' }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: CurationTargetType }) {
  const label = type === 'card' ? 'card' : 'deck';
  return (
    <span
      className="uppercase text-on-dark-mute border border-bg-hair"
      style={{
        fontSize: 9,
        letterSpacing: '0.12em',
        padding: '2px 6px',
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
