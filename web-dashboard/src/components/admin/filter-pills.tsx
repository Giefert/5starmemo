import { CarteFilter } from '@/lib/decks';

const FILTERS: CarteFilter[] = ['All', 'Food', 'Bar', 'Featured'];

export function FilterPills({
  active,
  onChange,
}: {
  active: CarteFilter;
  onChange: (f: CarteFilter) => void;
}) {
  return (
    <div className="flex" style={{ gap: 18, fontSize: 13 }}>
      {FILTERS.map((f) => {
        const isActive = f === active;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={
              isActive
                ? 'text-on-paper font-medium'
                : 'text-on-paper-mute hover:text-on-paper'
            }
            style={{ cursor: 'pointer' }}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}
