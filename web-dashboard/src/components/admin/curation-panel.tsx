'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CurationTargetType,
  Deck,
  formatSeasonality,
  isMonthInSeason,
  MONTH_NAMES,
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
  hiddenItems = [],
  editing,
  decks,
  onAdd,
  onRemove,
  onReorder,
  onRestore,
  showSeasonTimeline = false,
}: {
  items: RestaurantCurationItem[];
  hiddenItems?: RestaurantCurationItem[];
  editing: boolean;
  decks: Deck[];
  onAdd: (targetType: CurationTargetType, targetId: string) => Promise<void>;
  onRemove: (targetType: CurationTargetType, targetId: string) => Promise<void>;
  onReorder: (
    items: { targetType: CurationTargetType; targetId: string }[]
  ) => Promise<void>;
  onRestore?: (targetId: string) => Promise<void>;
  showSeasonTimeline?: boolean;
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

      {showSeasonTimeline && items.length > 0 && <SeasonTimeline items={items} />}

      {(!showSeasonTimeline || editing) && (
        <div className="flex flex-col" style={{ gap: 6 }}>
          {showSeasonTimeline && editing && (
            <div
              className="uppercase text-on-dark-mute border-t border-bg-hair"
              style={{ fontSize: 9, letterSpacing: '0.14em', marginTop: 10, paddingTop: 12 }}
            >
              Manage items
            </div>
          )}
          {items.map((item, idx) => (
            <CurationRow
              key={`${item.targetType}:${item.targetId}`}
              item={item}
              editing={editing}
              canMoveUp={!item.automatic && idx > 0 && !items[idx - 1].automatic}
              canMoveDown={
                !item.automatic && idx < items.length - 1 && !items[idx + 1].automatic
              }
              onRemove={() => onRemove(item.targetType, item.targetId)}
              onMove={(dir) => {
                const swap = dir === 'up' ? idx - 1 : idx + 1;
                const next = items.slice();
                [next[idx], next[swap]] = [next[swap], next[idx]];
                return onReorder(
                  next.map((i) => ({ targetType: i.targetType, targetId: i.targetId }))
                );
              }}
            />
          ))}
        </div>
      )}

      {(hiddenItems.length > 0 || editing) && onRestore && (
        <div
          className="border-t border-bg-hair"
          style={{ marginTop: 12, paddingTop: 12 }}
        >
          <div
            className="uppercase text-on-dark-mute"
            style={{ fontSize: 9, letterSpacing: '0.14em', marginBottom: 6 }}
          >
            Seasonal fish not shown · {hiddenItems.length}
          </div>
          {hiddenItems.length === 0 ? (
            <div className="text-on-dark-mute italic" style={{ fontSize: 12 }}>
              Nothing hidden.
            </div>
          ) : (
            hiddenItems.map((item) => (
              <HiddenCurationRow
                key={`${item.targetType}:${item.targetId}`}
                item={item}
                editing={editing}
                onRestore={() => onRestore(item.targetId)}
              />
            ))
          )}
        </div>
      )}

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

const TIMELINE_LABEL_WIDTH = 152;
const TIMELINE_MONTH_WIDTH = 76;
const TIMELINE_HEADER_HEIGHT = 48;
const TIMELINE_ROW_HEIGHT = 60;

function SeasonTimeline({ items }: { items: RestaurantCurationItem[] }) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: MONTH_NAMES[date.getMonth()].slice(0, 3).toUpperCase(),
      isCurrent: offset === 0,
    };
  });

  return (
    <div style={{ paddingBottom: 8 }}>
      <div
        className="flex items-center justify-between text-on-dark-mute"
        style={{ gap: 12, marginBottom: 8 }}
      >
        <span className="flex items-center uppercase" style={{ gap: 7, fontSize: 9, letterSpacing: '0.12em' }}>
          <span className="bg-amber" style={{ width: 20, height: 7, borderRadius: 999 }} />
          Seasonal window
        </span>
        <span className="font-dek italic" style={{ fontSize: 12 }}>Scroll months →</span>
      </div>

      <div className="flex border border-bg-hair overflow-hidden">
        <div style={{ width: TIMELINE_LABEL_WIDTH, flexShrink: 0 }}>
          <div
            className="flex items-end uppercase text-on-dark-mute border-r border-b border-bg-hair bg-ink-soft"
            style={{ height: TIMELINE_HEADER_HEIGHT, padding: '0 10px 8px', fontSize: 9, letterSpacing: '0.12em' }}
          >
            Item
          </div>
          {items.map((item) => {
            const range = formatSeasonality(item.seasonStartMonth, item.seasonEndMonth);
            const href = item.targetType === 'card'
              ? `/dashboard/cards#card-${item.targetId}`
              : `/dashboard/decks/${item.targetId}`;
            return (
              <Link
                key={`${item.targetType}:${item.targetId}`}
                href={href}
                className="flex flex-col justify-center border-r border-b border-bg-hair transition-colors hover:bg-ink-soft"
                style={{ height: TIMELINE_ROW_HEIGHT, padding: '0 10px', textDecoration: 'none' }}
                aria-label={`${item.name}: ${range ?? 'season not specified'}`}
              >
                <span className="text-on-dark truncate" style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>
                  {item.name}
                </span>
                <span className="text-on-dark-mute truncate font-dek italic" style={{ fontSize: 10, marginTop: 2 }}>
                  {range ?? 'Season not specified'}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-x-auto" style={{ minWidth: 0 }}>
          <div style={{ width: months.length * TIMELINE_MONTH_WIDTH }}>
            <div className="flex border-b border-bg-hair" style={{ height: TIMELINE_HEADER_HEIGHT }}>
              {months.map((month) => (
                <div
                  key={`${month.year}-${month.month}`}
                  className="flex flex-col items-center justify-center border-r border-bg-hair"
                  style={{
                    width: TIMELINE_MONTH_WIDTH,
                    flexShrink: 0,
                    background: month.isCurrent ? 'rgba(232,154,43,0.14)' : 'var(--color-ink-soft)',
                  }}
                >
                  <span className={month.isCurrent ? 'text-on-dark' : 'text-on-dark-mute'} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>
                    {month.label}
                  </span>
                  <span className="text-on-dark-mute" style={{ fontSize: 8, marginTop: 2 }}>
                    {month.isCurrent ? 'NOW' : month.year}
                  </span>
                </div>
              ))}
            </div>

            {items.map((item) => (
              <div
                key={`${item.targetType}:${item.targetId}`}
                className="flex border-b border-bg-hair"
                style={{ height: TIMELINE_ROW_HEIGHT }}
              >
                {months.map((month, monthIndex) => {
                  const active = isMonthInSeason(item.seasonStartMonth, item.seasonEndMonth, month.month);
                  const previousActive = monthIndex > 0 && isMonthInSeason(
                    item.seasonStartMonth,
                    item.seasonEndMonth,
                    months[monthIndex - 1].month
                  );
                  const nextActive = monthIndex < months.length - 1 && isMonthInSeason(
                    item.seasonStartMonth,
                    item.seasonEndMonth,
                    months[monthIndex + 1].month
                  );
                  return (
                    <div
                      key={`${month.year}-${month.month}`}
                      className="flex items-center border-r border-bg-hair"
                      style={{
                        width: TIMELINE_MONTH_WIDTH,
                        flexShrink: 0,
                        background: month.isCurrent ? 'rgba(232,154,43,0.045)' : undefined,
                      }}
                    >
                      {active && (
                        <span
                          className="bg-amber"
                          style={{
                            width: '100%',
                            height: 12,
                            marginLeft: previousActive ? 0 : 6,
                            marginRight: nextActive ? 0 : 6,
                            borderTopLeftRadius: previousActive ? 0 : 999,
                            borderBottomLeftRadius: previousActive ? 0 : 999,
                            borderTopRightRadius: nextActive ? 0 : 999,
                            borderBottomRightRadius: nextActive ? 0 : 999,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurationRow({
  item,
  editing,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMove,
}: {
  item: RestaurantCurationItem;
  editing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => Promise<void>;
}) {
  const href =
    item.targetType === 'card'
      ? `/dashboard/cards#card-${item.targetId}`
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
      <TypeBadge type={item.targetType} automatic={item.automatic} />
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
        <div className="flex items-center" style={{ gap: 2 }}>
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="text-on-dark-mute transition-colors hover:text-amber disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: 12, lineHeight: 1, padding: '0 4px' }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="text-on-dark-mute transition-colors hover:text-amber disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: 12, lineHeight: 1, padding: '0 4px' }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="text-on-dark-mute transition-colors hover:text-red"
            style={{ fontSize: 16, lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function HiddenCurationRow({
  item,
  editing,
  onRestore,
}: {
  item: RestaurantCurationItem;
  editing: boolean;
  onRestore: () => Promise<void>;
}) {
  const href = `/dashboard/cards#card-${item.targetId}`;

  return (
    <div className="flex items-center justify-between" style={{ gap: 8, padding: '4px 0' }}>
      <Link
        href={href}
        className="flex-1 text-on-dark transition-colors hover:text-amber truncate"
        style={{ fontSize: 13, textDecoration: 'none' }}
      >
        {item.name}
        {item.deckTitle && (
          <span className="text-on-dark-mute" style={{ marginLeft: 6 }}>
            · {item.deckTitle}
          </span>
        )}
      </Link>
      {editing ? (
        <button
          type="button"
          onClick={() => void onRestore()}
          className="text-amber transition-colors hover:text-paper"
          style={{ fontSize: 11, padding: '2px 4px' }}
        >
          Show
        </button>
      ) : (
        <span className="uppercase text-on-dark-mute" style={{ fontSize: 9 }}>
          Hidden
        </span>
      )}
    </div>
  );
}

function TypeBadge({
  type,
  automatic = false,
}: {
  type: CurationTargetType;
  automatic?: boolean;
}) {
  const label = automatic ? 'auto' : type === 'card' ? 'card' : 'deck';
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
