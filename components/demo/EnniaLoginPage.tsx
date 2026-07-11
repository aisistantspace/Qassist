'use client'

import { useState } from 'react'
import Link from 'next/link'
import EnniaLogo from '@/components/demo/EnniaLogo'
import { enniaTheme } from '@/lib/demo-themes/ennia'

interface EnniaLoginPageProps {
  onSubmit: (username: string, password: string) => Promise<{ ok: boolean; error?: string; redirect?: string }>
}

export default function EnniaLoginPage({ onSubmit }: EnniaLoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const t = enniaTheme.colors

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
    <div className="min-h-[100dvh] flex flex-col lg:flex-row" style={{ background: t.skyMuted }}>
      {/* Brand — compact on mobile, side panel on desktop */}
      <div
        className="lg:w-[42%] lg:min-h-[100dvh] flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16"
        style={{
          background: `linear-gradient(160deg, ${t.navyDeep} 0%, ${t.navy} 55%, ${t.cyanDark} 100%)`,
        }}
      >
        <EnniaLogo variant="light" className="mb-6 lg:mb-10" />
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
          {enniaTheme.tagline}
        </h1>
        <p className="mt-2 text-base sm:text-lg font-medium" style={{ color: t.cyanLight }}>
          AI assistant demo
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="w-full max-w-[400px]">
          <div
            className="rounded-2xl border p-6 sm:p-8 shadow-sm"
            style={{ background: t.white, borderColor: t.border }}
          >
            <h2 className="text-xl font-bold mb-1" style={{ color: t.navy }}>
              Sign in
            </h2>
            <p className="text-sm mb-6" style={{ color: t.textMuted }}>
              Use the credentials shared with you.
            </p>

            {error && (
              <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>
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
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-[#00A8E8]/30 disabled:opacity-50 min-h-[48px]"
                  style={{ borderColor: t.border, color: t.text }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>
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
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-16 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-[#00A8E8]/30 disabled:opacity-50 min-h-[48px]"
                    style={{ borderColor: t.border, color: t.text }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 text-sm font-medium"
                    style={{ color: t.cyanDark }}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-40 transition-opacity min-h-[48px]"
                style={{ background: `linear-gradient(135deg, ${t.cyan}, ${t.cyanDark})` }}
              >
                {isLoading ? 'Signing in…' : 'Continue'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs" style={{ color: t.textMuted }}>
            <Link href="/login" className="hover:underline" style={{ color: t.cyanDark }}>
              Platform admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
