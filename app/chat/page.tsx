import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { parseTenantSessionToken, TENANT_SESSION_COOKIE } from '@/lib/tenant-session'
import ChatClient from './ChatClient'

export default function ChatPage() {
  const session = parseTenantSessionToken(cookies().get(TENANT_SESSION_COOKIE)?.value)
  const initialEnniaSession = session?.slug === 'ennia'

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading assistant...</div>}>
      <ChatClient initialEnniaSession={initialEnniaSession} />
    </Suspense>
  )
}
