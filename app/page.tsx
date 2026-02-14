'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
    iconColor: 'text-blue-400',
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
    description: 'Guide customers to sign-ups, claims, support tickets, or sales. Automatically based on their needs.',
    iconColor: 'text-teal-400',
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
    iconColor: 'text-blue-400',
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
    iconColor: 'text-teal-400',
  },
]

export default function Home() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState('')
  const [mobileSlide, setMobileSlide] = useState(0)

  const openLightbox = (src: string, alt: string) => {
    setLightboxSrc(src)
    setLightboxAlt(alt)
  }

  const slides = [
    { src: '/preview-chat.png', alt: 'Live chat in Papiamentu', label: 'Chat Widget', w: 800, h: 1200 },
    { src: '/preview-dashboard.png', alt: 'Dashboard overview', label: 'Dashboard', w: 1920, h: 1080 },
    { src: '/preview-conversations.png', alt: 'Conversation management', label: 'Conversations', w: 1920, h: 1080 },
  ]

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
          className="text-sm font-medium text-slate-600 hover:text-teal-600 border border-slate-400/50 hover:border-teal-400 px-5 py-2.5 rounded-lg transition-all duration-200"
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
            An AI chat assistant that answers inquiries, creates tickets, routes to forms, and captures leads. Around the clock.
          </p>
          <p className="text-base text-slate-500 italic mb-12">
            AI ku ta maneha bo kòmbersashonnan ku kliente. 24/7.
          </p>

          <a
            href="https://meetings.hubspot.com/quantone"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
          >
            Book a Demo
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </section>

      {/* ---- Product Showcase ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Section label */}
          <p className="text-center text-sm font-medium text-slate-500 uppercase tracking-wider mb-10">
            A peek inside
          </p>

          {/* ===== Mobile Carousel (< md) ===== */}
          <div className="md:hidden">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/20 border border-white/40 ring-1 ring-slate-900/5">
              {/* Browser chrome bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-3 py-1 text-[11px] text-slate-400 font-medium border border-slate-200 text-center">
                    {slides[mobileSlide].label}
                  </div>
                </div>
                <div className="w-14" />
              </div>

              {/* Slide image - tap to enlarge */}
              <div
                className="relative cursor-pointer"
                onClick={() => openLightbox(slides[mobileSlide].src, slides[mobileSlide].alt)}
              >
                <Image
                  src={slides[mobileSlide].src}
                  alt={slides[mobileSlide].alt}
                  width={slides[mobileSlide].w}
                  height={slides[mobileSlide].h}
                  className="w-full h-auto block"
                  priority={mobileSlide === 0}
                />
                {/* Tap hint overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity bg-black/10">
                  <div className="bg-white/90 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 shadow-lg">
                    Tap to enlarge
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-4 mt-5">
              {/* Previous */}
              <button
                onClick={() => setMobileSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 border border-slate-200 shadow-sm hover:bg-white transition-colors"
                aria-label="Previous screenshot"
              >
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {slides.map((slide, i) => (
                  <button
                    key={slide.src}
                    onClick={() => setMobileSlide(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === mobileSlide ? 'w-7 bg-blue-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`View ${slide.label}`}
                  />
                ))}
              </div>

              {/* Next */}
              <button
                onClick={() => setMobileSlide((prev) => (prev + 1) % slides.length)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 border border-slate-200 shadow-sm hover:bg-white transition-colors"
                aria-label="Next screenshot"
              >
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Slide label */}
            <p className="text-center text-sm text-slate-500 mt-3 font-medium">
              {slides[mobileSlide].label}
              <span className="text-slate-400 ml-1">({mobileSlide + 1}/{slides.length})</span>
            </p>
          </div>

          {/* ===== Desktop Overlapping Layout (md+) ===== */}
          <div className="hidden md:block relative">
            {/* Chat - primary large screenshot */}
            <div
              className="showcase-card relative mx-auto max-w-5xl rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/20 border border-white/40 ring-1 ring-slate-900/5 cursor-pointer hover:shadow-3xl transition-shadow duration-200"
              onClick={() => openLightbox('/preview-chat.png', 'Live chat in Papiamentu')}
            >
              {/* Browser chrome bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-4 py-1 text-[11px] text-slate-400 font-medium border border-slate-200 min-w-[200px] text-center">
                    Live Chat
                  </div>
                </div>
                <div className="w-14" />
              </div>
              <Image
                src="/preview-chat.png"
                alt="Live chat in Papiamentu with AI-powered responses"
                width={800}
                height={1200}
                className="w-full h-auto block max-h-[600px] object-cover object-top"
                priority
              />
            </div>

            {/* Dashboard - overlapping from bottom-left */}
            <div
              className="showcase-card showcase-delay-1 absolute -bottom-12 -left-4 lg:-left-8 w-[55%] max-w-[550px] rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/25 border border-white/40 ring-1 ring-slate-900/5 cursor-pointer hover:shadow-3xl transition-shadow duration-200"
              onClick={() => openLightbox('/preview-dashboard.png', 'Dashboard overview')}
            >
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-3 py-0.5 text-[10px] text-slate-400 font-medium border border-slate-200">
                    app.astuteaisistant.com/dashboard
                  </div>
                </div>
              </div>
              <Image
                src="/preview-dashboard.png"
                alt="Dashboard overview showing leads, active chats, and language distribution"
                width={1920}
                height={1080}
                className="w-full h-auto block"
              />
            </div>

            {/* Conversations - overlapping from bottom-right */}
            <div
              className="showcase-card showcase-delay-2 absolute -bottom-16 -right-2 lg:-right-6 w-[42%] max-w-[420px] rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/25 border border-white/40 ring-1 ring-slate-900/5 cursor-pointer hover:shadow-3xl transition-shadow duration-200"
              onClick={() => openLightbox('/preview-conversations.png', 'Conversation management')}
            >
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-3 py-0.5 text-[10px] text-slate-400 font-medium border border-slate-200">
                    Conversations
                  </div>
                </div>
              </div>
              <Image
                src="/preview-conversations.png"
                alt="Conversation management with lead tracking and language detection"
                width={1920}
                height={1080}
                className="w-full h-auto block"
              />
            </div>
          </div>

          {/* Spacer for overlapping elements */}
          <div className="h-8 md:h-32" />
        </div>
      </section>

      {/* ---- Capabilities ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className="glass-card relative overflow-hidden p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-blue-900/20 to-teal-900/15 border border-blue-300/20 shadow-xl shadow-blue-900/10 hover:from-blue-900/30 hover:to-teal-900/25 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-300/30 transition-all duration-300"
              style={{ animationDelay: `${i * 2}s` } as React.CSSProperties}
            >
              {/* Animated sheen overlay */}
              <div className="sheen-overlay" />

              <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-xl backdrop-blur-md bg-white/60 border border-white/70 shadow-sm mb-4 ${cap.iconColor}`}>
                {cap.icon}
              </div>
              <h3 className="relative z-10 text-base font-semibold text-slate-900 mb-2">{cap.title}</h3>
              <p className="relative z-10 text-sm text-slate-600 leading-relaxed">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Built for section ---- */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-900/15 to-teal-900/10 border border-blue-300/15 rounded-2xl shadow-lg shadow-blue-900/10 px-8 py-10 text-center">
            <div className="sheen-overlay" style={{ animationDelay: '5s' } as React.CSSProperties} />
            <p className="relative z-10 text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Built for</p>
            <p className="relative z-10 text-lg text-slate-700 leading-relaxed">
              Insurance companies, service desks, local businesses. Any organization that needs to handle customer inquiries at scale while keeping it personal.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 border-t border-slate-300/40 px-6 sm:px-12 lg:px-16 py-6">
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

      {/* ---- Animation styles ---- */}
      <style jsx>{`
        @keyframes sheen {
          0% {
            transform: translateX(-100%) rotate(15deg);
          }
          100% {
            transform: translateX(300%) rotate(15deg);
          }
        }
        .sheen-overlay {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.06) 40%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.06) 60%,
            transparent 100%
          );
          animation: sheen 8s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
        .glass-card:nth-child(1) .sheen-overlay { animation-delay: 0s; }
        .glass-card:nth-child(2) .sheen-overlay { animation-delay: 2s; }
        .glass-card:nth-child(3) .sheen-overlay { animation-delay: 4s; }
        .glass-card:nth-child(4) .sheen-overlay { animation-delay: 6s; }

        @keyframes showcaseFadeUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .showcase-card {
          animation: showcaseFadeUp 0.8s ease-out both;
        }
        .showcase-delay-1 {
          animation-delay: 0.3s;
        }
        .showcase-delay-2 {
          animation-delay: 0.6s;
        }

        @keyframes lightboxFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lightboxZoomIn {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        .lightbox-overlay {
          animation: lightboxFadeIn 0.2s ease-out both;
        }
        .lightbox-image {
          animation: lightboxZoomIn 0.25s ease-out both;
        }
      `}</style>

      {/* ---- Lightbox ---- */}
      {lightboxSrc && (
        <div
          className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* Caption */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-white/70 text-sm font-medium">{lightboxAlt}</span>
          </div>
          {/* Image */}
          <Image
            src={lightboxSrc}
            alt={lightboxAlt}
            width={1920}
            height={1200}
            className="lightbox-image max-w-full max-h-[90vh] w-auto h-auto rounded-lg shadow-2xl object-contain cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
