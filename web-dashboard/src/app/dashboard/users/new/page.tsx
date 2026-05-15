'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, roleApi, deckApi } from '@/lib/api';
import { StudentRoleSummary, Deck } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function NewStudentPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<StudentRoleSummary[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([roleApi.getAll(), deckApi.getAll()])
      .then(([r, d]) => {
        setRoles(r);
        setDecks(d);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load options'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await authApi.createUser({
        email,
        username,
        password,
        role: 'student',
        roleIds: Array.from(selectedRoleIds),
        deckIds: Array.from(selectedDeckIds),
      });
      router.push(`/dashboard/users/${user.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard/users" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to students
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-1">New Student</h1>
      <p className="text-gray-600 mb-6">Create a student account and grant initial access.</p>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Identity</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <Input type="text" required minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial password</label>
            <Input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">Share this with the student verbally. They can keep it or you can reset it later.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Roles</h2>
          <p className="text-sm text-gray-500 mb-4">Roles bundle deck access. A student gets the union of decks from every role they belong to.</p>
          {roles.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No roles yet. <Link href="/dashboard/users/roles/new" className="text-blue-600 hover:underline">Create one</Link>.</p>
          ) : (
            <div className="space-y-2">
              {roles.map(r => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(r.id)}
                    onChange={() => toggle(selectedRoleIds, r.id, setSelectedRoleIds)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-900">{r.name}</span>
                  <span className="text-xs text-gray-400">— {r.deckCount} deck{r.deckCount === 1 ? '' : 's'}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Direct deck access</h2>
          <p className="text-sm text-gray-500 mb-4">Optional — for decks this student should see in addition to their role-based access.</p>
          {decks.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No decks exist yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {decks.map(d => (
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
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create student'}</Button>
          <Link href="/dashboard/users">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
