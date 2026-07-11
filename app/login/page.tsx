'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Invalid password')
        setIsLoading(false)
        return
      }
      router.push(data.redirect || searchParams.get('redirect') || '/dashboard/tenants')
      router.refresh()
    } catch {
      setError('Something went wrong. Try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0B0F19] flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Astute <span className="text-blue-400">AI</span>sistant
          </h1>
        </div>

        <Link
          href="/demo/ennia/login"
          className="flex items-center justify-between gap-3 w-full mb-6 p-4 rounded-2xl border border-[#00A8E8]/40 bg-[#00A8E8]/10 hover:bg-[#00A8E8]/20 transition-colors min-h-[56px]"
        >
          <div className="text-left min-w-0">
            <p className="font-semibold text-white">ENNIA Demo</p>
            <p className="text-sm text-slate-400 truncate">Customer login</p>
          </div>
          <span className="text-[#00A8E8] text-sm font-medium shrink-0">→</span>
        </Link>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <p className="relative text-center text-xs text-slate-500 bg-[#0B0F19] px-3 mx-auto w-fit">Admin</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          {error && (
            <p className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">
                Admin password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pr-16 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-4 text-sm text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base disabled:opacity-40 transition-colors min-h-[48px]"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#0B0F19]">
          <Spinner className="w-8 h-8 text-blue-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
