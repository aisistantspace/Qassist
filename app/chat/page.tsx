'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ModernChatInterface from '@/components/ModernChatInterface'

function ChatContent() {
  const searchParams = useSearchParams()
  const embedded = searchParams.get('embedded') === 'true'
  
  return (
    <div
      className={
        embedded
          ? 'min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col'
          : 'min-h-[100dvh] h-[100dvh] sm:min-h-screen sm:h-screen bg-gray-50 flex flex-col items-center justify-center p-2 sm:p-4'
      }
    >
      <div
        className={
          embedded
            ? 'h-full w-full flex flex-col min-h-0'
            : 'w-full max-w-lg flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 sm:max-h-[700px]'
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
