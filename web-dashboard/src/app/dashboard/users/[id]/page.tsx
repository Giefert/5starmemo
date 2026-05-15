'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { userApi, roleApi, deckApi } from '@/lib/api';
import { UserDetail, StudentRoleSummary, Deck } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [allRoles, setAllRoles] = useState<StudentRoleSummary[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Identity form
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Role membership
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [savingRoles, setSavingRoles] = useState(false);

  // Direct deck access
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [savingDecks, setSavingDecks] = useState(false);

  // Password reset
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    Promise.all([userApi.getById(id), roleApi.getAll(), deckApi.getAll()])
      .then(([d, r, ds]) => {
        setDetail(d);
        setAllRoles(r);
        setAllDecks(ds);
        setEmail(d.email);
        setUsername(d.username);
        setSelectedRoleIds(new Set(d.roles.map(x => x.id)));
        setSelectedDeckIds(new Set(d.directDecks.map(x => x.id)));
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load student'))
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
      await userApi.update(id, { email, username });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update student');
    } finally {
      setSavingIdentity(false);
    }
  };

  const saveRoles = async () => {
    setSavingRoles(true);
    try {
      await userApi.setRoles(id, Array.from(selectedRoleIds));
      // Refresh detail so the "Also via roles" view reflects the new state.
      const refreshed = await userApi.getById(id);
      setDetail(refreshed);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update roles');
    } finally {
      setSavingRoles(false);
    }
  };

  const saveDecks = async () => {
    setSavingDecks(true);
    try {
      await userApi.setDecks(id, Array.from(selectedDeckIds));
      const refreshed = await userApi.getById(id);
      setDetail(refreshed);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update deck access');
    } finally {
      setSavingDecks(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) {
      setPasswordMessage('Password must be at least 8 characters.');
      return;
    }
    setResettingPassword(true);
    setPasswordMessage('');
    try {
      await userApi.resetPassword(id, newPassword);
      setPasswordMessage('Password reset. Share the new password with the student.');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMessage(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm(`Permanently delete "${detail.username}"? All their study progress will be removed.`)) return;
    try {
      await userApi.delete(id);
      router.push('/dashboard/users');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete student');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }

  if (error || !detail) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error || 'Not found'}</div>
        <Link href="/dashboard/users" className="text-blue-600 hover:underline mt-4 inline-block">← Back to students</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard/users" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to students
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-1">{detail.username}</h1>
      <p className="text-gray-600 mb-6">{detail.email}</p>

      {/* Identity */}
      <section className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Identity</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <Input type="text" minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <Button onClick={saveIdentity} disabled={savingIdentity}>
          <Save className="h-4 w-4 mr-2" />
          {savingIdentity ? 'Saving…' : 'Save identity'}
        </Button>
      </section>

      {/* Roles */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Roles</h2>
        <p className="text-sm text-gray-500 mb-4">Decks granted to any of these roles will be visible to this student.</p>
        {allRoles.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No roles defined. <Link href="/dashboard/users/roles/new" className="text-blue-600 hover:underline">Create one</Link>.</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {allRoles.map(r => (
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
            <Button onClick={saveRoles} disabled={savingRoles}>
              <Save className="h-4 w-4 mr-2" />
              {savingRoles ? 'Saving…' : 'Save roles'}
            </Button>
          </>
        )}
      </section>

      {/* Direct deck access */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Direct deck access</h2>
        <p className="text-sm text-gray-500 mb-4">Decks this student gets in addition to anything inherited from roles.</p>
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
              {savingDecks ? 'Saving…' : 'Save direct access'}
            </Button>
          </>
        )}

        {detail.roleDecks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Also accessible via roles</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {detail.roleDecks.map(rd => (
                <li key={`${rd.viaRoleId}-${rd.id}`}>
                  <span className="text-gray-900">{rd.title}</span>
                  <span className="text-gray-400"> — via {rd.viaRoleName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Password reset */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset password</h2>
        <p className="text-sm text-gray-500 mb-4">Set a new password for this student and share it with them.</p>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="text"
              minLength={8}
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={resetPassword} disabled={resettingPassword || newPassword.length < 8}>
            {resettingPassword ? 'Resetting…' : 'Reset'}
          </Button>
        </div>
        {passwordMessage && (
          <p className="mt-2 text-sm text-gray-600">{passwordMessage}</p>
        )}
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-lg shadow p-6 border border-red-100">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Danger zone</h2>
        <p className="text-sm text-gray-500 mb-4">Deleting a student removes their account and all study progress permanently.</p>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete student
        </Button>
      </section>
    </div>
  );
}
