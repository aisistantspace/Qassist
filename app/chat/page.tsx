import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { parseTenantSessionToken, TENANT_SESSION_COOKIE } from '@/lib/tenant-session'
import ChatClient from './ChatClient'

export default async function ChatPage() {
  const cookieStore = await cookies()
  const session = parseTenantSessionToken(cookieStore.get(TENANT_SESSION_COOKIE)?.value)
  const initialEnniaSession = session?.slug === 'ennia'

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading assistant...</div>}>
      <ChatClient initialEnniaSession={initialEnniaSession} />
    </Suspense>
  )
}
