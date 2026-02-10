import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Cookie name for authentication
const AUTH_COOKIE_NAME = 'dashboard_auth'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Verify password against environment variable
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.DASHBOARD_PASSWORD
  
  if (!correctPassword) {
    console.error('DASHBOARD_PASSWORD environment variable is not set')
    return false
  }
  
  // Use timing-safe comparison to prevent timing attacks
  // Both buffers must be the same length for timingSafeEqual
  const passwordBuffer = Buffer.from(password, 'utf8')
  const correctBuffer = Buffer.from(correctPassword, 'utf8')
  
  if (passwordBuffer.length !== correctBuffer.length) {
    return false
  }
  
  return crypto.timingSafeEqual(passwordBuffer, correctBuffer)
}

/**
 * Generate a simple authentication token
 * In a production system, you might want to use JWT or a more sophisticated token
 */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Check if user is authenticated by verifying the auth cookie
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)
    
    if (!authCookie?.value) {
      return false
    }
    
    // In a simple implementation, we just check if the cookie exists
    // For production, you might want to verify the token signature/expiry
    return true
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Set authentication cookie
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  })
  
  return response
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}

/**
 * Get authentication token from request
 */
export function getAuthToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value || null
}

