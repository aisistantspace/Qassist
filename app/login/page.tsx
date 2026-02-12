'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/* ---------- Inline SVG Icons ---------- */

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* Feature icons */
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a3.5 3.5 0 0 0-3.37 4.44A3.5 3.5 0 0 0 5 10.5a3.5 3.5 0 0 0 1.13 3.06A3.5 3.5 0 0 0 9.5 17h1V2h-1z" />
      <path d="M14.5 2a3.5 3.5 0 0 1 3.37 4.44A3.5 3.5 0 0 1 19 10.5a3.5 3.5 0 0 1-1.13 3.06A3.5 3.5 0 0 1 14.5 17h-1V2h1z" />
      <path d="M12 17v5" />
      <path d="M9 22h6" />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

const features = [
  {
    icon: ChatIcon,
    title: 'AI-Powered Conversations',
    description: 'Engage visitors 24/7 with intelligent chat powered by advanced RAG technology.',
  },
  {
    icon: BrainIcon,
    title: 'Knowledge Base',
    description: 'Upload documents, FAQs, and content — your AI learns and answers accurately.',
  },
  {
    icon: BarChartIcon,
    title: 'Lead Capture & Scoring',
    description: 'Automatically qualify and score leads with smart conversation analysis.',
  },
  {
    icon: ShieldIcon,
    title: 'Enterprise Ready',
    description: 'Secure, white-label solution with CRM integrations and multi-language support.',
  },
]

/* ---------- Login Form ---------- */

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

      const redirect = searchParams.get('redirect') || '/dashboard'
      router.push(redirect)
      router.refresh()
    } catch (err: any) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* ---- Animated gradient background (covers entire page) ---- */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0f172a] to-[#1a1040]" />

      {/* ---- Floating orbs ---- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.07] blur-[100px] animate-float-orb" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/[0.08] blur-[100px] animate-float-orb" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-400/[0.04] blur-[120px] animate-float-orb" style={{ animationDelay: '-8s' }} />
        <div className="absolute top-[5%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-500/[0.06] blur-[80px] animate-float-orb" style={{ animationDelay: '-6s' }} />
      </div>

      {/* ---- Subtle dot grid ---- */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ======== LEFT: Product Showcase (hidden on mobile) ======== */}
      <div className={`hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-between p-12 xl:p-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
        {/* Top: Brand */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/20">
              <SparkleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Astute <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">AI</span>sistant
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Hero message + features */}
        <div className="flex-1 flex flex-col justify-center max-w-xl -mt-8">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
            Turn every visitor into a
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 mt-1">
              qualified lead.
            </span>
          </h2>
          <p className="text-blue-200/50 text-lg mb-10 leading-relaxed">
            Your AI assistant engages, qualifies, and converts visitors around the clock — so you never miss an opportunity.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/10 group-hover:border-blue-400/20 transition-colors">
                    <feature.icon className="w-[18px] h-[18px] text-blue-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white/90">{feature.title}</h3>
                </div>
                <p className="text-xs text-blue-200/40 leading-relaxed pl-12">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Social proof / Stats */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">24/7</span>
            <span className="text-xs text-blue-200/40 font-medium">Always Active</span>
          </div>
          <div className="w-px h-10 bg-white/[0.08]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">4+</span>
            <span className="text-xs text-blue-200/40 font-medium">Languages</span>
          </div>
          <div className="w-px h-10 bg-white/[0.08]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">&lt;2s</span>
            <span className="text-xs text-blue-200/40 font-medium">Response Time</span>
          </div>
          <div className="w-px h-10 bg-white/[0.08]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">99.9%</span>
            <span className="text-xs text-blue-200/40 font-medium">Uptime</span>
          </div>
        </div>
      </div>

      {/* ======== RIGHT: Login Form ======== */}
      <div className={`w-full lg:w-[45%] relative z-10 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* Subtle divider glow on left edge (desktop only) */}
        <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

        {/* Glass card */}
        <div className="w-full max-w-sm">
          {/* Mobile brand (only visible on small screens) */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/25 mb-4">
              <SparkleIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Astute <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">AI</span>sistant
            </h1>
            <p className="mt-1 text-sm text-blue-200/50 font-medium">Intelligent Customer Engagement</p>
          </div>

          {/* Card */}
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.10] rounded-2xl shadow-2xl shadow-black/20 p-8">
            {/* Header */}
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-blue-200/40">Sign in to your dashboard</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3 flex items-start gap-3 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-300 font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password input */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-blue-200/50 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <LockIcon className="w-[18px] h-[18px] text-blue-300/30 group-focus-within:text-blue-300/60 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-blue-200/25 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/30 hover:border-white/[0.14] transition-all"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-300/30 hover:text-blue-300/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !password}
                className="group relative w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              >
                {/* Gradient background with animated shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity group-hover:opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100" />

                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                {isLoading ? (
                  <span className="relative flex items-center gap-2">
                    <LoadingSpinner className="w-5 h-5" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="relative flex items-center gap-2">
                    <span>Sign in to Dashboard</span>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-200/25">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs font-medium">Secured with end-to-end encryption</span>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-blue-200/20">
            Powered by{' '}
            <a href="https://astuteweb.agency" target="_blank" rel="noopener noreferrer" className="text-blue-200/30 hover:text-blue-200/50 transition-colors underline decoration-blue-200/10 underline-offset-2">
              Astute Web Agency
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Page export ---------- */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
          <LoadingSpinner className="w-8 h-8 text-blue-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
