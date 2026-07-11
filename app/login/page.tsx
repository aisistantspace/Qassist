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
    <div className="min-h-[100dvh] bg-[#0B0F19] flex flex-col lg:flex-row">
      {/* Brand — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
        <div>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-blue-600 mb-6">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            Astute <span className="text-blue-400">AI</span>sistant
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-sm leading-relaxed">
            AI service desk — chat, leads, knowledge base, and dashboards for your customers.
          </p>
        </div>
        <p className="text-xs text-slate-600">Platform owner access</p>
      </div>

      {/* Sign-in */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-blue-600 mb-3">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <h1 className="text-lg font-bold text-white">
              Astute <span className="text-blue-400">AI</span>sistant
            </h1>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1 lg:mb-2">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Pick how you want to access the platform.</p>

          <Link
            href="/demo/ennia/login"
            className="flex items-center justify-between gap-3 w-full mb-5 p-4 rounded border border-[#307E57]/50 bg-[#307E57]/10 hover:bg-[#307E57]/15 transition-colors min-h-[52px]"
          >
            <div className="text-left min-w-0 flex items-center gap-3">
              <img
                src="/ennia/logo-green.webp"
                alt="ENNIA"
                width={90}
                height={21}
                className="h-5 w-auto shrink-0"
              />
              <div>
                <p className="font-semibold text-white">ENNIA Demo</p>
                <p className="text-sm text-slate-400">Customer login</p>
              </div>
            </div>
            <span className="text-[#307E57] text-sm shrink-0">→</span>
          </Link>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <p className="relative text-center text-xs text-slate-500 bg-[#0B0F19] px-2 mx-auto w-fit">Admin</p>
          </div>

          <div className="rounded border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            {error && (
              <p className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Platform admin password"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full px-3 py-3 pr-14 rounded border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-base focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 text-sm text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base disabled:opacity-40 transition-colors min-h-[44px]"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner />
                    Signing in…
                  </span>
                ) : (
                  'Admin sign in'
                )}
              </button>
            </form>
          </div>
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
