'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CurationKind,
  CurationTargetType,
  Deck,
  Restaurant,
  RestaurantCurationItem,
} from '../../../../shared/types';
import { isoWeekNumber } from '@/lib/iso-week';
import { StatPanel } from './stat-panel';
import { AnnouncementBlock } from './announcement-block';
import { CurationPanel } from './curation-panel';

type PanelId = CurationKind;

export function Masthead({
  restaurant,
  decks,
  curations,
  onSaveAnnouncements,
  onAddCuration,
  onRemoveCuration,
}: {
  restaurant: Restaurant | null;
  decks: Deck[];
  curations: Record<CurationKind, RestaurantCurationItem[]>;
  onSaveAnnouncements: (next: string[]) => Promise<void>;
  onAddCuration: (
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string
  ) => Promise<void>;
  onRemoveCuration: (
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<PanelId | null>(null);
  const week = isoWeekNumber();
  const announcements = restaurant?.announcements ?? [];
  const restaurantName = (restaurant?.name ?? '').toUpperCase();

  const togglePanel = (id: PanelId) =>
    setExpanded((cur) => (cur === id ? null : id));

  return (
    <section
      className="grid items-end"
      style={{
        padding: '48px 36px 40px',
        gridTemplateColumns: '1.3fr 1fr',
        gap: 48,
      }}
    >
      <div>
        <div
          className="text-amber uppercase"
          style={{ fontSize: 11, letterSpacing: '0.24em', marginBottom: 14 }}
        >
          {restaurantName || 'BULLETIN'} · Week {week}
        </div>
        <h1
          className="font-serif text-paper m-0"
          style={{
            fontSize: 72,
            lineHeight: 0.95,
            fontWeight: 400,
            letterSpacing: '-0.03em',
          }}
        >
          Bulletin.
        </h1>

        <AnnouncementBlock
          announcements={announcements}
          editing={editing}
          onSave={onSaveAnnouncements}
        />

        <div className="flex" style={{ gap: 10, marginTop: 28 }}>
          <Link
            href="/dashboard/decks/new"
            className="bg-amber text-ink font-semibold transition-colors hover:bg-[#D58A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            style={{
              padding: '12px 20px',
              fontSize: 13,
              borderRadius: 2,
              letterSpacing: '0.02em',
            }}
          >
            + New deck
          </Link>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="bg-transparent border border-bg-hair text-on-dark transition-colors hover:border-[#3A332B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            style={{ padding: '12px 20px', fontSize: 13, borderRadius: 2 }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-col border-t border-bg-hair">
        <StatPanel
          label="Specials"
          count={curations.specials.length}
          expanded={expanded === 'specials'}
          onToggle={() => togglePanel('specials')}
        >
          <CurationPanel
            mode="cards_decks"
            items={curations.specials}
            editing={editing}
            decks={decks}
            onAdd={(t, id) => onAddCuration('specials', t, id)}
            onRemove={(t, id) => onRemoveCuration('specials', t, id)}
          />
        </StatPanel>

        <StatPanel
          label="New items"
          count={curations.new_item.length}
          expanded={expanded === 'new_item'}
          onToggle={() => togglePanel('new_item')}
        >
          <CurationPanel
            mode="cards_decks"
            items={curations.new_item}
            editing={editing}
            decks={decks}
            onAdd={(t, id) => onAddCuration('new_item', t, id)}
            onRemove={(t, id) => onRemoveCuration('new_item', t, id)}
          />
        </StatPanel>

        <StatPanel
          label="Featured"
          count={curations.featured.length}
          tone="amber"
          expanded={expanded === 'featured'}
          onToggle={() => togglePanel('featured')}
        >
          <CurationPanel
            mode="cards_decks"
            items={curations.featured}
            editing={editing}
            decks={decks}
            onAdd={(t, id) => onAddCuration('featured', t, id)}
            onRemove={(t, id) => onRemoveCuration('featured', t, id)}
          />
        </StatPanel>

        <StatPanel
          label="Glossary highlight"
          count={curations.glossary_highlight.length}
          expanded={expanded === 'glossary_highlight'}
          onToggle={() => togglePanel('glossary_highlight')}
        >
          <CurationPanel
            mode="glossary_terms"
            items={curations.glossary_highlight}
            editing={editing}
            decks={decks}
            onAdd={(t, id) => onAddCuration('glossary_highlight', t, id)}
            onRemove={(t, id) => onRemoveCuration('glossary_highlight', t, id)}
          />
        </StatPanel>
      </div>
    </section>
  );
}
