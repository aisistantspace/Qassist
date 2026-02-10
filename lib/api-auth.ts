/**
 * API route authentication helper.
 * Checks for a valid dashboard_auth cookie or Bearer token.
 */
import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'dashboard_auth'

/**
 * Authenticate an API request.
 * Returns true if the request has a valid auth cookie or bearer token.
 */
export function authenticateApiRequest(request: NextRequest): boolean {
  // 1. Check dashboard_auth cookie (same mechanism as dashboard)
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  if (authCookie?.value) {
    return true
  }

  // 2. Check Authorization: Bearer <token> header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    // Validate against the dashboard password (same credential)
    const dashboardPassword = process.env.DASHBOARD_PASSWORD || process.env.ADMIN_PASSWORD
    if (dashboardPassword && token === dashboardPassword) {
      return true
    }
  }

  return false
}
