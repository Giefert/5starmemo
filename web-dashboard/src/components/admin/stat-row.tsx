type Tone = 'default' | 'amber' | 'red';

export function StatRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  const valueColor =
    tone === 'red' ? 'text-red' : tone === 'amber' ? 'text-amber' : 'text-paper';
  return (
    <div className="flex justify-between items-baseline py-[14px] border-b border-bg-hair">
      <span className="text-[13px] text-on-dark-mute">{label}</span>
      <span
        className={`font-serif text-[28px] font-normal tabular-nums ${valueColor}`}
        style={{ letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
    </div>
  );
}
