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
      <div
        className="lg:w-[44%] lg:min-h-[100dvh] flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-14 border-b lg:border-b-0 lg:border-r border-white/10"
        style={{
          background: `linear-gradient(165deg, ${t.navyDeep} 0%, ${t.navy} 50%, ${t.cyanDark} 100%)`,
        }}
      >
        <EnniaLogo variant="light" className="mb-8" />
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
          {enniaTheme.tagline}
        </h1>
        <p className="mt-2 text-lg font-medium" style={{ color: t.cyanLight }}>
          {enniaTheme.taglineNl}
        </p>
        <p className="mt-5 text-sm sm:text-base text-white/70 max-w-sm leading-relaxed">
          Insurance AI demo — chat assistant and management dashboard for ENNIA.
        </p>
        <ul className="mt-8 space-y-2 text-sm text-white/60 hidden sm:block">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#6BB4C5]" />
            Multilingual chat (NL · EN · ES · Papiamentu)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#6BB4C5]" />
            Leads, conversations &amp; knowledge base
          </li>
        </ul>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded border p-6 sm:p-7 bg-white shadow-sm" style={{ borderColor: t.border }}>
            <div className="lg:hidden mb-6">
              <EnniaLogo variant="dark" />
            </div>

            <h2 className="text-xl font-bold" style={{ color: t.navy }}>
              Sign in
            </h2>
            <p className="text-sm mt-1 mb-6" style={{ color: t.textMuted }}>
              Demo account for stakeholders.
            </p>

            {error && (
              <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
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
                  className="w-full px-3 py-3 rounded border text-base focus:outline-none focus:ring-1 focus:ring-[#00A8E8]/40 disabled:opacity-50 min-h-[44px]"
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
                    className="w-full px-3 py-3 pr-14 rounded border text-base focus:outline-none focus:ring-1 focus:ring-[#00A8E8]/40 disabled:opacity-50 min-h-[44px]"
                    style={{ borderColor: t.border, color: t.text }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 text-sm font-medium"
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
                className="w-full py-3 rounded font-semibold text-white text-base disabled:opacity-40 min-h-[44px]"
                style={{ background: t.cyan }}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs" style={{ color: t.textMuted }}>
            <Link href="/login" className="hover:underline" style={{ color: t.cyanDark }}>
              Platform admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
