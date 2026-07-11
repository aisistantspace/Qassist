'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import EnniaLogo from '@/components/demo/EnniaLogo'
import { enniaTheme } from '@/lib/demo-themes/ennia'

interface EnniaLoginPageProps {
  onSubmit: (username: string, password: string) => Promise<{ ok: boolean; error?: string; redirect?: string }>
}

const features = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'AI Chat Assistant',
    desc: 'Answers insurance questions in NL, EN, ES & Papiamentu — like Chat met ons on ennia.com.',
  },
  {
    icon: ChartBarIcon,
    title: 'Live Dashboard',
    desc: 'Leads, conversations, knowledge base & analytics in one place.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'ENNIA Knowledge',
    desc: 'Powered by your crawled product & service content from ennia.com.',
  },
]

export default function EnniaLoginPage({ onSubmit }: EnniaLoginPageProps) {
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

  const t = enniaTheme.colors

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: t.skyMuted }}>
      {/* Hero panel */}
      <div
        className="relative lg:w-[58%] min-h-[42vh] lg:min-h-screen overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(145deg, ${t.navyDeep} 0%, ${t.navy} 42%, ${t.cyanDark} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl"
            style={{ background: t.cyan }}
          />
          <div
            className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl"
            style={{ background: t.cyanLight }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full blur-2xl opacity-60"
            style={{ background: t.coral }}
          />
        </div>

        <div className="relative z-10 flex flex-col flex-1 p-8 lg:p-12 xl:p-16">
          <div className="flex items-center justify-between gap-4">
            <EnniaLogo variant="light" className="h-10 w-auto" />
            <a
              href={enniaTheme.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-white/70 hover:text-white transition-colors hidden sm:inline"
            >
              ennia.com ↗
            </a>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-xl py-10 lg:py-0">
            <div
              className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border border-white/20 text-white/90"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <SparklesIcon className="w-4 h-4" style={{ color: t.cyanLight }} />
              AI Assistant Demo · Stakeholder Preview
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              {enniaTheme.tagline}
            </h1>
            <p className="mt-2 text-xl sm:text-2xl font-medium" style={{ color: t.cyanLight }}>
              {enniaTheme.taglineNl}
            </p>
            <p className="mt-6 text-base sm:text-lg text-white/75 leading-relaxed max-w-md">
              Waar kunnen wij je mee helpen? Explore the full ENNIA AI experience — dashboard, chat, and
              insurance knowledge — built for the Dutch Caribbean.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {enniaTheme.islands.map((island) => (
                <span
                  key={island}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white/90 border border-white/15"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {island}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-1">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex gap-4 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${t.cyan}22`, color: t.cyanLight }}
                  >
                    <f.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                    <p className="text-sm text-white/65 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10">
            {enniaTheme.categories.map((cat) => (
              <span key={cat} className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Login panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl shadow-xl shadow-slate-200/60 border p-8 sm:p-10"
            style={{ background: t.white, borderColor: t.border }}
          >
            <div className="lg:hidden mb-8 flex justify-center">
              <EnniaLogo variant="dark" className="h-9 w-auto" />
            </div>

            <div className="text-center lg:text-left mb-8">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: t.navy }}>
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: t.textMuted }}>
                Sign in to your ENNIA demo account. Access the dashboard and AI chat assistant.
              </p>
            </div>

            {error && (
              <div
                className="mb-6 rounded-xl px-4 py-3 text-sm border"
                style={{
                  background: '#FEF2F2',
                  borderColor: '#FECACA',
                  color: '#B91C1C',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: t.textMuted }}
                >
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
                  placeholder="ennia-demo"
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl border text-base transition-all outline-none focus:ring-2 focus:ring-[#00A8E8]/25 disabled:opacity-50"
                  style={{
                    borderColor: t.border,
                    color: t.text,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: t.textMuted }}
                >
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
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 pr-14 rounded-xl border text-base transition-all outline-none focus:ring-2 focus:ring-[#00A8E8]/25 disabled:opacity-50"
                    style={{ borderColor: t.border, color: t.text }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 text-sm font-medium transition-colors"
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
                className="w-full py-4 rounded-xl font-bold text-white text-base shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-lg active:translate-y-0"
                style={{
                  background: `linear-gradient(135deg, ${t.cyan} 0%, ${t.cyanDark} 100%)`,
                  boxShadow: `0 10px 30px -8px ${t.cyan}66`,
                }}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Open ENNIA Dashboard'
                )}
              </button>
            </form>

            <div
              className="mt-8 pt-6 border-t flex items-start gap-3 text-xs leading-relaxed"
              style={{ borderColor: t.border, color: t.textMuted }}
            >
              <GlobeAltIcon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.cyan }} />
              <p>
                After login you&apos;ll access the <strong style={{ color: t.text }}>dashboard</strong>,{' '}
                <strong style={{ color: t.text }}>chat assistant</strong>, and ENNIA knowledge base.
                Demo credentials provided by Astute Web Agency.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: t.textMuted }}>
            Powered by{' '}
            <Link href="https://astuteweb.agency" className="font-semibold hover:underline" style={{ color: t.cyanDark }}>
              Astute AIssistant
            </Link>
            {' · '}
            <a href={enniaTheme.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              ENNIA Feel Secure
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
