'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { roleApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function NewRolePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const role = await roleApi.create({ name, description: description || undefined });
      router.push(`/dashboard/users/roles/${role.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard/users/roles" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to roles
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-1">New Role</h1>
      <p className="text-gray-600 mb-6">After creating, open the role to grant it deck access.</p>

      {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sommelier" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create role'}</Button>
          <Link href="/dashboard/users/roles">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
