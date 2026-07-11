'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import EnniaLoginPage from '@/components/demo/EnniaLoginPage'
import { enniaTheme } from '@/lib/demo-themes/ennia'

function DemoLoginForm() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = String(params.slug || 'ennia').toLowerCase()

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const displayName = slug === 'ennia' ? 'ENNIA' : slug.toUpperCase()
  const redirect = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    setError('')
  }, [slug])

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
      return { ok: true, redirect: data.redirect }
    } catch {
      return { ok: false, error: 'Something went wrong. Please try again.' }
    }
  }

  if (slug === 'ennia') {
    return <EnniaLoginPage onSubmit={submitLogin} />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const result = await submitLogin(username, password)
    if (!result.ok) {
      setError(result.error || 'Invalid username or password')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10 mb-4">
            <span className="text-2xl font-bold text-white">{displayName.slice(0, 1)}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{displayName} Demo</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to access your dashboard and AI assistant</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-xl">
          {error && (
            <div className="mb-5 rounded-lg bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Enter username"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 text-slate-500 hover:text-slate-300 text-sm"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign in to dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function EnniaLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: enniaTheme.colors.skyMuted }}
    >
      <div
        className="w-10 h-10 border-2 rounded-full animate-spin"
        style={{ borderColor: `${enniaTheme.colors.cyan}33`, borderTopColor: enniaTheme.colors.cyan }}
      />
      <p className="text-sm font-medium" style={{ color: enniaTheme.colors.textMuted }}>
        Loading ENNIA demo…
      </p>
    </div>
  )
}

export default function DemoLoginPage() {
  return (
    <Suspense fallback={<EnniaLoading />}>
      <DemoLoginForm />
    </Suspense>
  )
}
