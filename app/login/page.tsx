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

function RoutingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

const features = [
  {
    icon: ChatIcon,
    title: 'Smart Inquiries',
    description: 'AI answers customer questions instantly from your knowledge base.',
  },
  {
    icon: RoutingIcon,
    title: 'Tickets & Routing',
    description: 'Categorize requests and route to the right team or form.',
  },
  {
    icon: UsersIcon,
    title: 'Lead Capture',
    description: 'Qualify visitors and capture contact details automatically.',
  },
  {
    icon: GlobeIcon,
    title: 'Multi-Language',
    description: 'Serve customers in English, Dutch, Spanish, and Papiamentu.',
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
      {/* ---- Dark charcoal background ---- */}
      <div className="absolute inset-0 bg-[#0B0F19]" />

      {/* ---- Single subtle blue glow ---- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[600px] h-[600px] rounded-full bg-blue-600/[0.04] blur-[120px]" />
        <div className="absolute bottom-[15%] right-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      {/* ---- Subtle dot grid ---- */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ======== LEFT: Product Showcase (hidden on mobile) ======== */}
      <div className={`hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-between p-12 xl:p-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
        {/* Top: Brand */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <SparkleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Astute <span className="text-blue-400">AI</span>sistant
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Hero message + features */}
        <div className="flex-1 flex flex-col justify-center max-w-xl -mt-8">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
            Your AI-powered
            <span className="block text-blue-400 mt-1">
              service desk.
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Handle inquiries, route to forms, capture leads, create tickets. All automated, 24/7.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all duration-300 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/10 group-hover:border-blue-500/20 transition-colors">
                    <feature.icon className="w-[18px] h-[18px] text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white/90">{feature.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-12">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Stats */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">24/7</span>
            <span className="text-xs text-slate-500 font-medium">Always Active</span>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">4+</span>
            <span className="text-xs text-slate-500 font-medium">Languages</span>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">&lt;2s</span>
            <span className="text-xs text-slate-500 font-medium">Response Time</span>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">99.9%</span>
            <span className="text-xs text-slate-500 font-medium">Uptime</span>
          </div>
        </div>
      </div>

      {/* ======== RIGHT: Login Form ======== */}
      <div className={`w-full lg:w-[45%] relative z-10 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* Subtle divider line on left edge (desktop only) */}
        <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-white/[0.06]" />

        {/* Glass card */}
        <div className="w-full max-w-sm">
          {/* Mobile brand (only visible on small screens) */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-4">
              <SparkleIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Astute <span className="text-blue-400">AI</span>sistant
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">AI-Powered Service Desk</p>
          </div>

          {/* Card */}
          <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/30 p-8">
            {/* Header */}
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to your dashboard</p>
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
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <LockIcon className="w-[18px] h-[18px] text-slate-600 group-focus-within:text-blue-400/60 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 hover:border-white/[0.12] transition-all"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-400 transition-colors"
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
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner className="w-5 h-5" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Sign in to Dashboard</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs font-medium">Secured with end-to-end encryption</span>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-slate-700">
            Powered by{' '}
            <a href="https://astuteweb.agency" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 transition-colors underline decoration-slate-700 underline-offset-2">
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
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
          <LoadingSpinner className="w-8 h-8 text-blue-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
