import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0f172a] to-[#1a1040]" />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.07] blur-[100px] animate-float-orb" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-indigo-500/[0.08] blur-[100px] animate-float-orb" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-400/[0.04] blur-[120px] animate-float-orb" style={{ animationDelay: '-8s' }} />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-3xl w-full text-center animate-fade-in-up">
        {/* Brand icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/25 mb-8">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-4">
          Astute{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
            AI
          </span>
          sistant
        </h1>

        <p className="text-lg sm:text-xl text-blue-200/50 mb-10 max-w-xl mx-auto leading-relaxed">
          Intelligent customer engagement powered by advanced AI. Turn every conversation into an opportunity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="group relative px-8 py-4 rounded-xl text-white font-semibold text-lg overflow-hidden transition-all duration-300 shadow-xl shadow-blue-500/20 hover:shadow-blue-400/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">
              Go to Dashboard
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>
          <Link
            href="/chat"
            className="px-8 py-4 rounded-xl font-semibold text-lg text-white/80 border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.18] transition-all duration-300"
          >
            Try Chat Widget
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-20 text-blue-200/20 text-sm font-medium">
        Developed by{' '}
        <a href="https://astuteweb.agency" target="_blank" className="text-blue-200/30 hover:text-blue-200/50 underline decoration-blue-200/10 underline-offset-2 transition-colors">
          Astute Web Agency
        </a>
      </div>
    </main>
  )
}
