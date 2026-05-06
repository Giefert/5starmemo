'use client';

import { useEffect, useState } from 'react';

export function AnnouncementBlock({
  announcements,
  editing,
  onSave,
}: {
  announcements: string[];
  editing: boolean;
  onSave: (next: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState(announcements.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setDraft(announcements.join('\n'));
  }, [announcements, editing]);

  if (!editing) {
    if (announcements.length === 0) return null;
    return (
      <div style={{ margin: '22px 0 0', maxWidth: 540 }}>
        {announcements.map((a, i) => (
          <p
            key={i}
            className="text-on-dark-mute"
            style={{ fontSize: 15, lineHeight: 1.55, margin: i === 0 ? 0 : '6px 0 0' }}
          >
            {a}
          </p>
        ))}
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const next = draft
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await onSave(next);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save announcements');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ margin: '22px 0 0', maxWidth: 540 }}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="One announcement per line."
        rows={4}
        className="w-full bg-ink-soft text-on-dark border border-bg-hair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        style={{
          padding: '10px 12px',
          fontSize: 15,
          lineHeight: 1.55,
          borderRadius: 2,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      <div className="flex" style={{ gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-amber text-ink font-semibold transition-colors hover:bg-[#D58A1F] disabled:opacity-60"
          style={{ padding: '8px 14px', fontSize: 12, borderRadius: 2 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {error && (
          <span className="text-red" style={{ fontSize: 12, alignSelf: 'center' }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
