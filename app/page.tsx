import Link from 'next/link'

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" />
    </svg>
  )
}

const capabilities = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    title: 'Answer inquiries instantly',
    description: 'AI trained on your knowledge base handles customer questions 24/7. No waiting, no missed messages.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5" />
        <path d="M4 20L21 3" />
        <path d="M21 16v5h-5" />
        <path d="M15 15l6 6" />
        <path d="M4 4l5 5" />
      </svg>
    ),
    title: 'Route to the right forms',
    description: 'Guide customers to sign-ups, claims, support tickets, or sales — automatically based on their needs.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Capture and qualify leads',
    description: 'Collect contact details naturally through conversation. Score and prioritize automatically.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: 'Support in 4 languages',
    description: 'Built-in English, Dutch, Spanish, and Papiamentu with AI-powered translation and correction.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0B0F19]" />

      {/* Subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[40%] w-[600px] h-[600px] rounded-full bg-blue-600/[0.03] blur-[120px]" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ---- Header ---- */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 lg:px-16 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/15">
            <SparkleIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Astute <span className="text-blue-400">AI</span>sistant
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-5 py-2.5 rounded-lg transition-all"
        >
          Sign in
        </Link>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 pt-8 pb-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            AI that handles your
            <span className="block text-blue-400 mt-1">customer operations.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
            Answer inquiries, create tickets, route to forms, and capture leads — all from one intelligent assistant that works around the clock.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg bg-blue-600 hover:bg-blue-500 transition-colors duration-200 shadow-lg shadow-blue-600/20"
          >
            Request a Demo
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ---- Capabilities ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10] transition-all duration-300"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/10 border border-blue-500/10 mb-4 text-blue-400">
                {cap.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{cap.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Built for section ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-slate-600 uppercase tracking-wider mb-4">Built for</p>
          <p className="text-lg text-slate-400 leading-relaxed">
            Insurance companies, service desks, local businesses — any organization that needs to handle customer inquiries at scale while keeping it personal.
          </p>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 sm:px-12 lg:px-16 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-slate-700 font-medium">
            Developed by{' '}
            <a href="https://astuteweb.agency" target="_blank" className="text-slate-600 hover:text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors">
              Astute Web Agency
            </a>
          </span>
          <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Dashboard
          </Link>
        </div>
      </footer>
    </main>
  )
}
