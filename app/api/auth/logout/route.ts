import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
import { clearTenantSessionCookie } from '@/lib/tenant-session'
import { clearDemoAuthCookie } from '@/lib/demo-auth'
import { getTenantSession } from '@/lib/tenant-session'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    const session = getTenantSession(request)
    clearAuthCookie(response)
    clearTenantSessionCookie(response)
    if (session?.slug) {
      clearDemoAuthCookie(response, session.slug)
    } else {
      clearDemoAuthCookie(response, 'ennia')
    }

    return response
  } catch (error: unknown) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'An error occurred during logout' }, { status: 500 })
  }
}
