'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { userApi } from '@/lib/api';
import { UserListItem } from '../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Users as UsersIcon, Tag } from 'lucide-react';

// Deterministic pastel chip color for a role name. Same role always gets the
// same hue, so admins can scan a column of chips and recognise roles by color.
function roleChipColor(name: string): string {
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

export default function UsersListPage() {
  const [students, setStudents] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getAll();
      setStudents(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete student "${username}"? This will permanently remove their progress.`)) return;
    try {
      await userApi.delete(id);
      setStudents(students.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete student');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading students…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student accounts, role membership, and deck access.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/users/roles">
            <Button variant="outline">
              <Tag className="h-4 w-4 mr-2" />
              Manage Roles
            </Button>
          </Link>
          <Link href="/dashboard/users/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Student
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <UsersIcon className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No students yet</h2>
          <p className="text-gray-500 mb-4">Add your first student to start assigning deck access.</p>
          <Link href="/dashboard/users/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decks</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {s.roles.length === 0 ? (
                        <span className="text-sm text-gray-400 italic">no roles</span>
                      ) : (
                        s.roles.map(r => (
                          <span
                            key={r.id}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleChipColor(r.name)}`}
                          >
                            {r.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s.totalAccessibleDeckCount}
                    {s.directDeckCount > 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({s.directDeckCount} direct)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link href={`/dashboard/users/${s.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit className="h-4 w-4 inline" />
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id, s.username)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
