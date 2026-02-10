'use client'

import Link from 'next/link'
import WhatsAppButton from './WhatsAppButton'

interface DualCTAProps {
  layout?: 'horizontal' | 'vertical'
  className?: string
}

export default function DualCTA({ layout = 'horizontal', className = '' }: DualCTAProps) {
  function handleAssistantClick() {
    // Track assistant open
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'assistant_open',
        metadata: {
          source_page: window.location.pathname,
          cta_location: 'dual_cta',
        },
      }),
    }).catch(err => console.error('Analytics error:', err))
  }

  const layoutClasses = layout === 'horizontal' 
    ? 'flex flex-col sm:flex-row gap-4' 
    : 'flex flex-col gap-4'

  return (
    <div className={`${layoutClasses} ${className}`}>
      <Link
        href="/assistant"
        onClick={handleAssistantClick}
        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 text-center"
      >
        <div className="text-lg mb-1">💬 Chat on Website</div>
        <div className="text-sm opacity-90">Get instant AI answers</div>
      </Link>
      
      <div className="flex-1">
        <WhatsAppButton showCTAButton={true} />
      </div>
    </div>
  )
}



