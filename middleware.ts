import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'dashboard_auth'

// API routes that require authentication (settings, admin, upload, dashboard analytics, etc.)
const PROTECTED_API_PREFIXES = [
  '/api/settings',
  '/api/dashboard',
  '/api/admin',
  '/api/documents',
  '/api/upload',
  '/api/papiamentu/corrections',
  '/api/notifications',
  '/api/scoring',
  '/api/scrape',
  '/api/hubspot',
]

// Routes that are explicitly public (no auth required)
// Everything not in PROTECTED_API_PREFIXES and starting with /api/ is also public by default
// Explicitly listed for clarity:
// /api/chat, /api/embed, /api/forms/submit, /api/leads (POST), /api/whatsapp/webhook, /api/health/*, /api/analytics, /api/auth/*

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isAuthenticated(request: NextRequest): boolean {
  // 1. Dashboard auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  if (authCookie?.value) {
    return true
  }

  // 2. Bearer token (matches dashboard password for programmatic access)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const dashboardPassword = process.env.DASHBOARD_PASSWORD || process.env.ADMIN_PASSWORD
    if (dashboardPassword && token === dashboardPassword) {
      return true
    }
  }

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect dashboard UI routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login') {
    if (isAuthenticated(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect sensitive API routes
  if (pathname.startsWith('/api/') && isProtectedApiRoute(pathname)) {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide a valid authentication cookie or Bearer token.' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match dashboard pages, login page, and API routes.
     * Exclude static assets and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
