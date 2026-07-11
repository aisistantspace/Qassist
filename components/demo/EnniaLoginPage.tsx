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

  const c = enniaTheme.colors

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
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: c.greenBg, color: c.text }}>
      {/* Site header — matches ennia.com nav */}
      <header
        className="sticky top-0 z-10 px-4 flex items-center justify-between min-h-[56px] sm:px-6"
        style={{ backgroundColor: c.greenDark }}
      >
        <a href={enniaTheme.website} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <EnniaLogo variant="light" />
        </a>
        <span className="hidden sm:block text-white/90 text-sm font-semibold">{enniaTheme.tagline}</span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Intro — desktop */}
        <section className="hidden lg:flex lg:w-[46%] flex-col justify-center px-12 xl:px-16 py-12">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight" style={{ color: c.greenDarker }}>
            {enniaTheme.tagline}
          </h1>
          <p className="mt-6 text-base leading-relaxed max-w-md" style={{ color: c.text }}>
            AI assistant demo — dashboard, chat, and insurance knowledge for ENNIA stakeholders.
          </p>
        </section>

        {/* Form */}
        <section className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden mb-6 text-center">
              <EnniaLogo variant="dark" className="mx-auto" />
              <p className="mt-3 text-lg font-bold" style={{ color: c.greenDarker }}>
                {enniaTheme.tagline}
              </p>
            </div>

            <div
              className="rounded border bg-white p-6 sm:p-7 shadow-sm"
              style={{ borderColor: c.greenBorder }}
            >
              <h2 className="text-xl font-bold" style={{ color: c.greenDarker }}>
                Sign in
              </h2>
              <p className="text-sm mt-1 mb-6" style={{ color: c.textMuted }}>
                Demo account for stakeholders.
              </p>

              {error && (
                <p
                  className="mb-4 text-sm rounded border px-3 py-2"
                  style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
                >
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold mb-1.5" style={{ color: c.text }}>
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
                    className="w-full px-3 py-3 rounded border text-base focus:outline-none focus:ring-1 focus:ring-[#307E57]/35 disabled:opacity-50 min-h-[44px]"
                    style={{ borderColor: c.greenBorder, color: c.text }}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold mb-1.5" style={{ color: c.text }}>
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
                      className="w-full px-3 py-3 pr-14 rounded border text-base focus:outline-none focus:ring-1 focus:ring-[#307E57]/35 disabled:opacity-50 min-h-[44px]"
                      style={{ borderColor: c.greenBorder, color: c.text }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 text-sm font-semibold"
                      style={{ color: c.greenDark }}
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="w-full py-3 rounded font-bold text-white text-base disabled:opacity-40 min-h-[44px] hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: c.greenDark }}
                >
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>

            <p className="mt-4 text-center text-xs" style={{ color: c.textMuted }}>
              <Link href="/login" className="font-semibold hover:underline" style={{ color: c.greenDark }}>
                Platform admin
              </Link>
              {' · '}
              <a href={enniaTheme.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                ennia.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
