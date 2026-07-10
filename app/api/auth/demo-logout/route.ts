import { NextRequest, NextResponse } from 'next/server'
import { clearDemoAuthCookie } from '@/lib/demo-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const slug = String(body.slug || 'ennia').toLowerCase().trim()
    const response = NextResponse.json({ success: true })
    clearDemoAuthCookie(response, slug)
    return response
  } catch (error) {
    console.error('Demo logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
