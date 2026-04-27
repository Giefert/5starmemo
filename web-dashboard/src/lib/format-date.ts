const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format like "Mar 23 · 2026" — Carte editorial style.
export function formatEditedDate(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${day} · ${d.getFullYear()}`;
}
