import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessDemoChat, getChatGateSlug } from '@/lib/demo-auth'

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

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isAuthenticated(request: NextRequest): boolean {
  try {
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
  } catch {
    // Never crash on auth check
  }

  return false
}

export function middleware(request: NextRequest) {
  try {
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

    // ENNIA / demo chat gate — require demo login before /chat when configured
    const chatGateSlug = getChatGateSlug()
    if (chatGateSlug && pathname === '/chat') {
      if (!canAccessDemoChat(request, chatGateSlug)) {
        const loginUrl = new URL(`/demo/${chatGateSlug}/login`, request.url)
        loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Demo login pages: if already authed, go straight to chat
    const demoLoginMatch = pathname.match(/^\/demo\/([^/]+)\/login$/)
    if (demoLoginMatch) {
      const slug = demoLoginMatch[1].toLowerCase()
      if (canAccessDemoChat(request, slug)) {
        const redirectTo = request.nextUrl.searchParams.get('redirect') || (slug === 'ennia' ? '/chat' : `/chat?slug=${slug}`)
        return NextResponse.redirect(new URL(redirectTo, request.url))
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
  } catch {
    // If middleware fails for any reason, let the request through rather than crashing
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/chat',
    '/demo/:path*',
    '/api/:path*',
  ],
}
