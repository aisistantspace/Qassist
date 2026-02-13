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
    iconColor: 'text-blue-600',
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
    iconColor: 'text-teal-500',
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
    iconColor: 'text-blue-600',
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
    iconColor: 'text-teal-500',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#E2E8F0] relative overflow-hidden">
      {/* ---- Soft gradient blobs ---- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] right-[10%] w-[700px] h-[700px] rounded-full bg-blue-400/[0.12] blur-[120px]" />
        <div className="absolute bottom-[5%] -left-[5%] w-[600px] h-[600px] rounded-full bg-teal-400/[0.12] blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-300/[0.07] blur-[100px]" />
      </div>

      {/* ---- Header ---- */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 lg:px-16 py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 shadow-md shadow-blue-500/15">
            <SparkleIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Astute <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">AI</span>sistant
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-600 hover:text-teal-600 border border-slate-400/50 hover:border-teal-400 backdrop-blur-sm bg-white/30 px-5 py-2.5 rounded-lg transition-all duration-200"
        >
          Sign in
        </Link>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 pt-16 pb-20">
        <div className="max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
            AI that handles your
            <span className="block text-blue-600 mt-1">customer chat conversations.</span>
          </h1>
          <p className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
            Na papiamentu tambe!
          </p>

          <p className="text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed mb-3">
            An AI chat assistant that answers inquiries, creates tickets, routes to forms, and captures leads — around the clock.
          </p>
          <p className="text-base text-slate-500 italic mb-12">
            AI ku ta maneha bo kòmbersashonnan ku kliente — 24/7.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
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
              className="p-6 rounded-2xl backdrop-blur-xl bg-white/50 border border-white/60 shadow-xl shadow-slate-300/30 hover:bg-white/70 hover:shadow-2xl hover:scale-[1.02] hover:border-white/80 transition-all duration-300"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-teal-500/10 border border-blue-200/30 mb-4 ${cap.iconColor}`}>
                {cap.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{cap.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Built for section ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl shadow-lg shadow-slate-300/20 px-8 py-10 text-center">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Built for</p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Insurance companies, service desks, local businesses — any organization that needs to handle customer inquiries at scale while keeping it personal.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 bg-slate-200/50 border-t border-slate-300/40 px-6 sm:px-12 lg:px-16 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Developed by{' '}
            <a href="https://astuteweb.agency" target="_blank" className="text-slate-600 hover:text-teal-600 underline decoration-slate-400 underline-offset-2 transition-colors">
              Astute Web Agency
            </a>
          </span>
          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Dashboard
          </Link>
        </div>
      </footer>
    </main>
  )
}
