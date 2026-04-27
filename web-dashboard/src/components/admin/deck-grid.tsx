import { Deck } from '../../../../shared/types';
import { CarteFilter } from '@/lib/decks';
import { DeckCard } from './deck-card';
import { FilterPills } from './filter-pills';

export function DeckGrid({
  decks,
  totalCount,
  filter,
  onFilterChange,
  onDelete,
}: {
  decks: Deck[];
  totalCount: number;
  filter: CarteFilter;
  onFilterChange: (f: CarteFilter) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section
      className="bg-paper text-on-paper"
      style={{ padding: '40px 36px 56px' }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 24 }}
      >
        <div className="flex items-baseline" style={{ gap: 16 }}>
          <h2
            className="font-serif m-0 text-on-paper"
            style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            The pass
          </h2>
          <span
            className="uppercase text-on-paper-mute"
            style={{ fontSize: 12, letterSpacing: '0.16em' }}
          >
            {totalCount} {totalCount === 1 ? 'deck' : 'decks'} · all public
          </span>
        </div>
        <FilterPills active={filter} onChange={onFilterChange} />
      </div>

      {decks.length === 0 ? (
        <div
          className="font-dek italic text-on-paper-mute text-center"
          style={{ fontSize: 18, padding: '64px 0' }}
        >
          No decks yet. Add your first one above.
        </div>
      ) : (
        <div
          className="grid grid-cols-3 bg-paper-hair border border-paper-hair"
          style={{ gap: 1 }}
        >
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
