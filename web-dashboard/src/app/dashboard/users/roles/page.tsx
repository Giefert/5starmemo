'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { roleApi } from '@/lib/api';
import { StudentRoleSummary } from '../../../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ArrowLeft, Tag } from 'lucide-react';

export default function RolesListPage() {
  const [roles, setRoles] = useState<StudentRoleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      setRoles(await roleApi.getAll());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"? Students lose access to its decks unless granted elsewhere.`)) return;
    try {
      await roleApi.delete(id);
      setRoles(roles.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading roles…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard/users" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to students
      </Link>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600">Custom roles bundle deck access. Assign students to roles from each student&apos;s page.</p>
        </div>
        <Link href="/dashboard/users/roles/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {roles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Tag className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No roles yet</h2>
          <p className="text-gray-500 mb-4">Create roles like &quot;Server&quot; or &quot;Sommelier&quot; to group deck access.</p>
          <Link href="/dashboard/users/roles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decks</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.description || <span className="italic text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.memberCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.deckCount}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link href={`/dashboard/users/roles/${r.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit className="h-4 w-4 inline" />
                    </Link>
                    <button onClick={() => handleDelete(r.id, r.name)} className="text-red-600 hover:text-red-800">
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
