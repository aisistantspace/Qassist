import { NextRequest, NextResponse } from 'next/server'
import {
  generateDemoAuthToken,
  getDemoCredentials,
  isDemoConfigured,
  setDemoAuthCookie,
  verifyDemoLogin,
} from '@/lib/demo-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const slug = String(body.slug || '').toLowerCase().trim()
    const username = String(body.username || '')
    const password = String(body.password || '')

    if (!slug) {
      return NextResponse.json({ error: 'Demo slug is required' }, { status: 400 })
    }
    if (!isDemoConfigured(slug)) {
      return NextResponse.json({ error: 'This demo is not configured' }, { status: 404 })
    }
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (!verifyDemoLogin(slug, username, password)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const creds = getDemoCredentials(slug)!
    const token = generateDemoAuthToken()
    const response = NextResponse.json({
      success: true,
      redirect: creds.chatPath,
      displayName: creds.displayName,
    })
    setDemoAuthCookie(response, slug, token)
    return response
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
