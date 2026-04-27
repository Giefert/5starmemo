import Link from 'next/link';
import { Deck } from '../../../../shared/types';
import { buildLede, deckWarn, spellOut } from '@/lib/decks';
import { isoWeekNumber } from '@/lib/iso-week';
import { StatRow } from './stat-row';

export function Masthead({ decks }: { decks: Deck[] }) {
  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount ?? 0), 0);
  const featuredCount = decks.filter((d) => d.isFeatured).length;
  const warnCount = decks.filter((d) => deckWarn(d) !== null).length;
  const week = isoWeekNumber();
  const lede = buildLede(decks);

  const decksWord = spellOut(decks.length);
  const cardsWord = spellOut(totalCards);

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
          The carte · Week {week}
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
          {decksWord} {decks.length === 1 ? 'deck' : 'decks'}.
          <br />
          <span className="text-on-dark-mute italic">{cardsWord}</span>{' '}
          {totalCards === 1 ? 'card' : 'cards'}.
        </h1>
        <p
          className="text-on-dark-mute"
          style={{ fontSize: 15, lineHeight: 1.55, margin: '22px 0 0', maxWidth: 540 }}
        >
          {lede}
        </p>
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
          <Link
            href="/dashboard/glossary"
            className="bg-transparent border border-bg-hair text-on-dark transition-colors hover:border-[#3A332B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            style={{ padding: '12px 20px', fontSize: 13, borderRadius: 2 }}
          >
            Import glossary
          </Link>
        </div>
      </div>

      <div className="flex flex-col border-t border-bg-hair">
        <StatRow label="Decks published" value={decks.length} />
        <StatRow label="Total cards" value={totalCards} />
        <StatRow label="Featured this week" value={featuredCount} tone="amber" />
        <StatRow label="Needs your attention" value={warnCount} tone="red" />
      </div>
    </section>
  );
}
