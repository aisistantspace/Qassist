import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, generateAuthToken, setAuthCookie } from '@/lib/auth'
import { clearTenantSessionCookie } from '@/lib/tenant-session'
import { clearDemoAuthCookie } from '@/lib/demo-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Verify password
    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Generate auth token
    const token = generateAuthToken()
    
    // Create response
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard/tenants',
    })

    setAuthCookie(response, token)
    clearTenantSessionCookie(response)
    clearDemoAuthCookie(response, 'ennia')

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}



