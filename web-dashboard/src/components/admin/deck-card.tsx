import Link from 'next/link';
import { Deck } from '../../../../shared/types';
import { deckCategory, deckWarn } from '@/lib/decks';
import { formatEditedDate } from '@/lib/format-date';

export function DeckCard({
  deck,
  onDelete,
}: {
  deck: Deck;
  onDelete: (id: string) => void;
}) {
  const cat = deckCategory(deck);
  const warn = deckWarn(deck);
  const cards = deck.cardCount ?? 0;

  return (
    <article
      className="relative flex flex-col bg-paper"
      style={{ padding: '22px 22px 18px', gap: 14, minHeight: 176 }}
    >
      {deck.isFeatured && (
        <div
          className="absolute flex items-center text-amber uppercase font-bold"
          style={{ top: 12, right: 12, fontSize: 10, letterSpacing: '0.18em', gap: 5 }}
        >
          <span className="rounded-full bg-amber" style={{ width: 5, height: 5 }} />
          Featured
        </div>
      )}

      <div>
        <div
          className="uppercase text-on-paper-eyebrow"
          style={{ fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}
        >
          {cat}
        </div>
        <h3
          className="font-serif text-on-paper m-0"
          style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          {deck.title}
        </h3>
      </div>

      <div
        className="flex text-on-paper-mute tabular-nums mt-auto"
        style={{ gap: 14, fontSize: 12 }}
      >
        <span>
          {cards} {cards === 1 ? 'card' : 'cards'}
        </span>
        <span>·</span>
        <span>Edited {formatEditedDate(deck.updatedAt)}</span>
      </div>

      {warn && (
        <div className="flex items-center text-red" style={{ fontSize: 11, gap: 6 }}>
          <span className="rounded-full bg-red" style={{ width: 4, height: 4 }} />
          {warn}
        </div>
      )}

      <div
        className="flex border-t border-paper-hair"
        style={{ gap: 14, fontSize: 12, paddingTop: 12 }}
      >
        <Link
          href={`/dashboard/decks/${deck.id}`}
          className="text-on-paper font-semibold uppercase hover:underline"
          style={{ letterSpacing: '0.04em' }}
        >
          Edit
        </Link>
        <Link
          href={`/dashboard/decks/${deck.id}`}
          className="text-on-paper-mute uppercase hover:text-on-paper hover:font-semibold"
          style={{ letterSpacing: '0.04em' }}
        >
          Preview
        </Link>
        <button
          type="button"
          onClick={() => onDelete(deck.id)}
          className="text-on-paper-faint uppercase hover:text-red"
          style={{ letterSpacing: '0.04em', marginLeft: 'auto', cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
