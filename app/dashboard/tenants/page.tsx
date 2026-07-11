'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface TenantRow {
  id: string
  name: string
  slug: string
  subscription_plan: string
  status: string
  created_at: string
}

export default function TenantsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [form, setForm] = useState({ name: '', slug: '', username: '', password: '', plan: 'starter' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ loginUrl: string; chatUrl: string } | null>(null)

  async function loadTenants() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.status === 403) {
        router.replace('/dashboard')
        return
      }
      if (!res.ok) throw new Error('Failed to load tenants')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenants()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setCreated(null)
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setCreated({ loginUrl: data.loginUrl, chatUrl: data.chatUrl })
      setForm({ name: '', slug: '', username: '', password: '', plan: 'starter' })
      await loadTenants()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SaaS Tenants</h1>
        <p className="text-gray-600 mt-2">Create customer accounts with their own dashboard, chat, and knowledge base.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New customer account</h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {created && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-800 space-y-1">
              <p className="font-semibold">Account created!</p>
              <p>Login: {origin}{created.loginUrl}</p>
              <p>Chat: {origin}{created.chatUrl}</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL slug</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="ennia"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin username</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create tenant account'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing tenants</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : tenants.length === 0 ? (
            <p className="text-gray-500 text-sm">No tenants yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <li key={t.id} className="py-3">
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">
                    /demo/{t.slug}/login · {t.subscription_plan} · {t.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
