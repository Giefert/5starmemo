'use client';

import { useEffect, useState } from 'react';
import { roleApi, deckApi } from '@/lib/api';
import { StudentRoleSummary, Deck } from '../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, Trash2, Tag } from 'lucide-react';

// Deterministic pastel chip color for a role name. Same role always gets the
// same hue, so admins can scan roles by color in both this panel and the
// students table.
export function roleChipColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const palette = [
    'bg-amber-100 text-amber-800',
    'bg-sky-100 text-sky-800',
    'bg-emerald-100 text-emerald-800',
    'bg-rose-100 text-rose-800',
    'bg-violet-100 text-violet-800',
    'bg-cyan-100 text-cyan-800',
    'bg-lime-100 text-lime-800',
    'bg-fuchsia-100 text-fuchsia-800',
  ];
  return palette[Math.abs(hash) % palette.length];
}

// Self-contained roles panel: create roles, assign decks to them, and delete
// them — all inline. Assigning roles to a student stays on each student's page.
// `onChange` lets the parent refresh dependent views (e.g. the students table's
// role chips) after a role is created, renamed, or deleted.
export function RolesManager({ onChange }: { onChange?: () => void }) {
  const [roles, setRoles] = useState<StudentRoleSummary[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline editor for a single role (name/description + deck grants)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeckIds, setEditDeckIds] = useState<Set<string>>(new Set());
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([roleApi.getAll(), deckApi.getAll()])
      .then(([r, d]) => {
        setRoles(r);
        setAllDecks(d);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load roles'))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshRoles = async () => {
    setRoles(await roleApi.getAll());
    onChange?.();
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const role = await roleApi.create({ name: newName, description: newDescription || undefined });
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      await refreshRoles();
      openEditor(role.id); // jump straight into assigning decks to the new role
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const openEditor = async (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      return;
    }
    setEditingId(id);
    setEditLoading(true);
    setError('');
    try {
      const detail = await roleApi.getById(id);
      setEditName(detail.name);
      setEditDescription(detail.description || '');
      setEditDeckIds(new Set(detail.decks.map(d => d.id)));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load role');
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const toggleDeck = (deckId: string) => {
    setEditDeckIds(prev => {
      const next = new Set(prev);
      if (next.has(deckId)) next.delete(deckId);
      else next.add(deckId);
      return next;
    });
  };

  const saveRole = async () => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      await roleApi.update(editingId, { name: editName, description: editDescription || undefined });
      await roleApi.setDecks(editingId, Array.from(editDeckIds));
      setEditingId(null);
      await refreshRoles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"? Students lose access to its decks unless granted elsewhere.`)) return;
    try {
      await roleApi.delete(id);
      if (editingId === id) setEditingId(null);
      await refreshRoles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  return (
    <section className="bg-white shadow rounded-lg mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          <p className="text-sm text-gray-500">Bundle deck access into roles, then assign roles to students from each student&apos;s page.</p>
        </div>
        <Button variant="outline" onClick={() => setShowCreate(v => !v)}>
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={createRole} className="px-6 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input required maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Sommelier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              maxLength={1000}
              rows={2}
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !newName.trim()}>{creating ? 'Creating…' : 'Create role'}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}>Cancel</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="px-6 py-6 text-sm text-gray-500">Loading roles…</p>
      ) : roles.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Tag className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No roles yet. Create roles like &quot;Server&quot; or &quot;Sommelier&quot; to group deck access.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {roles.map(r => (
            <li key={r.id}>
              <div className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleChipColor(r.name)}`}>{r.name}</span>
                  {r.description && <span className="text-sm text-gray-500 truncate">{r.description}</span>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-gray-400">
                    {r.deckCount} deck{r.deckCount === 1 ? '' : 's'} · {r.memberCount} member{r.memberCount === 1 ? '' : 's'}
                  </span>
                  <button onClick={() => openEditor(r.id)} className="text-sm text-blue-600 hover:text-blue-800">
                    {editingId === r.id ? 'Close' : 'Edit'}
                  </button>
                  <button onClick={() => deleteRole(r.id, r.name)} className="text-red-600 hover:text-red-800" aria-label={`Delete ${r.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingId === r.id && (
                <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                  {editLoading ? (
                    <p className="py-4 text-sm text-gray-500">Loading…</p>
                  ) : (
                    <div className="pt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <Input maxLength={100} value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <Input maxLength={1000} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Decks granted to this role</label>
                        {allDecks.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No decks exist yet.</p>
                        ) : (
                          <div className="grid gap-1 sm:grid-cols-2 max-h-60 overflow-y-auto pr-2">
                            {allDecks.map(d => (
                              <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editDeckIds.has(d.id)}
                                  onChange={() => toggleDeck(d.id)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-900">{d.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveRole} disabled={saving || !editName.trim()}>
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? 'Saving…' : 'Save role'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
