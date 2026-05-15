'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { roleApi, deckApi } from '@/lib/api';
import { StudentRoleDetail, Deck } from '../../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [role, setRole] = useState<StudentRoleDetail | null>(null);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [savingDecks, setSavingDecks] = useState(false);

  useEffect(() => {
    Promise.all([roleApi.getById(id), deckApi.getAll()])
      .then(([r, d]) => {
        setRole(r);
        setAllDecks(d);
        setName(r.name);
        setDescription(r.description || '');
        setSelectedDeckIds(new Set(r.decks.map(x => x.id)));
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load role'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const toggle = (set: Set<string>, target: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(target)) next.delete(target);
    else next.add(target);
    setter(next);
  };

  const saveIdentity = async () => {
    setSavingIdentity(true);
    try {
      const updated = await roleApi.update(id, { name, description: description || undefined });
      setRole(prev => prev ? { ...prev, name: updated.name, description: updated.description } : prev);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    } finally {
      setSavingIdentity(false);
    }
  };

  const saveDecks = async () => {
    setSavingDecks(true);
    try {
      await roleApi.setDecks(id, Array.from(selectedDeckIds));
      const refreshed = await roleApi.getById(id);
      setRole(refreshed);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update decks');
    } finally {
      setSavingDecks(false);
    }
  };

  const handleDelete = async () => {
    if (!role) return;
    if (!confirm(`Delete role "${role.name}"? Students lose access to its decks unless granted elsewhere.`)) return;
    try {
      await roleApi.delete(id);
      router.push('/dashboard/users/roles');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }

  if (error || !role) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error || 'Not found'}</div>
        <Link href="/dashboard/users/roles" className="text-blue-600 hover:underline mt-4 inline-block">← Back to roles</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard/users/roles" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to roles
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{role.name}</h1>

      <section className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Identity</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input value={name} maxLength={100} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            rows={3}
          />
        </div>
        <Button onClick={saveIdentity} disabled={savingIdentity}>
          <Save className="h-4 w-4 mr-2" />
          {savingIdentity ? 'Saving…' : 'Save'}
        </Button>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Decks granted to this role</h2>
        <p className="text-sm text-gray-500 mb-4">Every student with this role can see the selected decks.</p>
        {allDecks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No decks exist yet.</p>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-2">
              {allDecks.map(d => (
                <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDeckIds.has(d.id)}
                    onChange={() => toggle(selectedDeckIds, d.id, setSelectedDeckIds)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-900">{d.title}</span>
                </label>
              ))}
            </div>
            <Button onClick={saveDecks} disabled={savingDecks}>
              <Save className="h-4 w-4 mr-2" />
              {savingDecks ? 'Saving…' : 'Save decks'}
            </Button>
          </>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Members ({role.members.length})</h2>
        <p className="text-sm text-gray-500 mb-4">Membership is edited from each student&apos;s page.</p>
        {role.members.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No students assigned yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {role.members.map(m => (
              <li key={m.id} className="py-2 flex justify-between items-center">
                <div>
                  <Link href={`/dashboard/users/${m.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {m.username}
                  </Link>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6 border border-red-100">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Danger zone</h2>
        <p className="text-sm text-gray-500 mb-4">Deletes this role and its deck grants. Members keep any other roles + direct grants.</p>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete role
        </Button>
      </section>
    </div>
  );
}
