import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-gradient-to-b from-white to-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4 tracking-tighter">
            AI Assistant Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Expert AI support for your business. Powered by advanced RAG technology.
          </p>
        </div>

        <div className="flex gap-4">
          <Link 
            href="/dashboard" 
            className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 active:scale-95"
          >
            Go to Dashboard
          </Link>
          <Link 
            href="/chat" 
            className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:border-primary-600 hover:text-primary-600 transition-all active:scale-95"
          >
            Try Chat Widget
          </Link>
        </div>
      </div>
      
      <div className="mt-20 text-gray-400 text-sm font-medium">
        Developed by <a href="https://astutewebagency.com" target="_blank" className="hover:text-primary-600 underline decoration-1 underline-offset-4 transition-colors">Astute Web Agency</a>
      </div>
    </main>
  )
}
