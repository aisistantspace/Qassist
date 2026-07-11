'use client'

import { useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import EnniaLoginPage from '@/components/demo/EnniaLoginPage'
import { enniaTheme } from '@/lib/demo-themes/ennia'

function GenericDemoLogin({
  displayName,
  onSubmit,
}: {
  displayName: string
  onSubmit: (user: string, pass: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const result = await onSubmit(username, password)
    if (!result.ok) {
      setError(result.error || 'Invalid username or password')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {error && (
            <p className="mb-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[48px]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-16 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[48px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-4 text-sm text-slate-500"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40 min-h-[48px]"
            >
              {isLoading ? 'Signing in…' : 'Continue'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          <Link href="/login" className="text-slate-400 hover:text-white">
            Platform admin
          </Link>
        </p>
      </div>
    </div>
  )
}

function DemoLoginForm() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = String(params.slug || 'ennia').toLowerCase()
  const redirect = searchParams.get('redirect') || '/dashboard'

  async function submitLogin(user: string, pass: string) {
    try {
      const response = await fetch('/api/auth/tenant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, username: user, password: pass }),
      })
      const data = await response.json()
      if (!response.ok) {
        return { ok: false, error: data.error || 'Invalid username or password' }
      }
      router.push(data.redirect || redirect)
      router.refresh()
      return { ok: true }
    } catch {
      return { ok: false, error: 'Something went wrong. Try again.' }
    }
  }

  if (slug === 'ennia') {
    return <EnniaLoginPage onSubmit={submitLogin} />
  }

  return (
    <GenericDemoLogin displayName={slug.toUpperCase()} onSubmit={submitLogin} />
  )
}

function Loading() {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: enniaTheme.colors.skyMuted }}
    >
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: `${enniaTheme.colors.cyan}33`, borderTopColor: enniaTheme.colors.cyan }}
      />
    </div>
  )
}

export default function DemoLoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DemoLoginForm />
    </Suspense>
  )
}
