type Tone = 'default' | 'amber' | 'red';

export function StatPanel({
  label,
  count,
  tone = 'default',
  expanded,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  tone?: Tone;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const valueColor =
    tone === 'red' ? 'text-red' : tone === 'amber' ? 'text-amber' : 'text-paper';

  return (
    <div className="border-b border-bg-hair">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex justify-between items-baseline text-left transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        style={{ padding: '14px 0' }}
      >
        <span className="text-[13px] text-on-dark-mute flex items-center" style={{ gap: 8 }}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms ease',
              color: 'var(--color-on-dark-mute)',
            }}
          >
            ›
          </span>
          {label}
        </span>
        <span
          className={`font-serif text-[28px] font-normal tabular-nums ${valueColor}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          {count}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '4px 0 18px' }}>{children}</div>
      )}
    </div>
  );
}
