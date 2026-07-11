'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Signika } from 'next/font/google'
import ModernChatInterface from '@/components/ModernChatInterface'
import { enniaTheme } from '@/lib/demo-themes/ennia'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

function ChatContent() {
  const searchParams = useSearchParams()
  const embedded = searchParams.get('embedded') === 'true'
  const [isEnniaSession, setIsEnniaSession] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tenant?.slug === 'ennia' && !data?.isSuperAdmin) setIsEnniaSession(true)
      })
      .catch(() => {})
  }, [])

  const shellClass = isEnniaSession ? signika.className : ''
  const pageBg = isEnniaSession ? enniaTheme.colors.greenBg : undefined

  return (
    <div
      className={
        embedded
          ? `min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col ${shellClass}`
          : `min-h-[100dvh] h-[100dvh] sm:min-h-screen sm:h-screen flex flex-col items-center justify-center p-2 sm:p-4 ${shellClass} ${
              isEnniaSession ? '' : 'bg-gray-50'
            }`
      }
      style={!embedded && isEnniaSession ? { backgroundColor: pageBg } : undefined}
    >
      <div
        className={
          embedded
            ? 'h-full w-full flex flex-col min-h-0'
            : `w-full max-w-lg flex-1 min-h-0 flex flex-col bg-white shadow-2xl overflow-hidden border sm:max-h-[700px] ${
                isEnniaSession ? 'rounded border-[#CBDED5]' : 'rounded-2xl border-gray-200'
              }`
        }
      >
        <ModernChatInterface embedded={embedded} />
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading assistant...</div>}>
      <ChatContent />
    </Suspense>
  )
}
