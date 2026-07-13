'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Signika } from 'next/font/google'
import ModernChatInterface from '@/components/ModernChatInterface'
import { enniaTheme } from '@/lib/demo-themes/ennia'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

interface Props {
  initialEnniaSession?: boolean
}

export default function ChatClient({ initialEnniaSession = false }: Props) {
  const searchParams = useSearchParams()
  const embedded = searchParams.get('embedded') === 'true'
  const tenantSlug = searchParams.get('slug') ?? searchParams.get('tenantSlug')
  const [isEnniaSession, setIsEnniaSession] = useState(initialEnniaSession)

  const isEnniaChat =
    tenantSlug?.toLowerCase() === 'ennia' || isEnniaSession

  useEffect(() => {
    if (initialEnniaSession) return
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tenant?.slug === 'ennia' && !data?.isSuperAdmin) setIsEnniaSession(true)
      })
      .catch(() => {})
  }, [initialEnniaSession])

  const shellClass = isEnniaChat ? signika.className : ''
  const pageBg = isEnniaChat ? enniaTheme.colors.greenBg : undefined

  return (
    <div
      className={
        embedded
          ? `min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col ${shellClass}`
          : `min-h-[100dvh] h-[100dvh] sm:min-h-screen sm:h-screen flex flex-col items-center justify-center p-2 sm:p-4 ${shellClass} ${
              isEnniaChat ? '' : 'bg-gray-50'
            }`
      }
      style={!embedded && isEnniaChat ? { backgroundColor: pageBg } : undefined}
    >
      <div
        className={
          embedded
            ? 'h-full w-full flex flex-col min-h-0'
            : `w-full max-w-lg flex-1 min-h-0 flex flex-col bg-white shadow-2xl overflow-hidden border sm:max-h-[700px] ${
                isEnniaChat ? 'rounded border-[#CBDED5]' : 'rounded-2xl border-gray-200'
              }`
        }
      >
        <ModernChatInterface
          embedded={embedded}
          defaultLanguage={isEnniaChat ? 'PA' : undefined}
          enniaPreset={isEnniaChat}
        />
      </div>
    </div>
  )
}
