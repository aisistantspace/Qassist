import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessDemoChat, getChatGateSlug, hasTenantDemoAccess } from '@/lib/demo-auth'
import { isDashboardAuthenticated, isSuperAdminRequest } from '@/lib/dashboard-tenant'

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
  // Public read for chat/embed; writes still require auth below
  if (pathname === '/api/settings/branding' || pathname === '/api/settings/widget') {
    return false
  }
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const authed = isDashboardAuthenticated(request)
    const superAdmin = isSuperAdminRequest(request)

    // Protect dashboard UI routes (super admin or tenant SaaS session)
    if (pathname.startsWith('/dashboard')) {
      if (!authed) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Platform admin login — only redirect if super admin (not tenant demo session)
    if (pathname === '/login') {
      if (superAdmin) {
        return NextResponse.redirect(new URL('/dashboard/tenants', request.url))
      }
    }

    // ENNIA / demo chat gate — require login before /chat when configured
    const chatGateSlug = getChatGateSlug()
    if (chatGateSlug && pathname === '/chat') {
      if (!canAccessDemoChat(request, chatGateSlug)) {
        const loginUrl = new URL(`/demo/${chatGateSlug}/login`, request.url)
        loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Demo login pages — only skip if THIS tenant is signed in (super admin ≠ demo user)
    const demoLoginMatch = pathname.match(/^\/demo\/([^/]+)\/login$/)
    if (demoLoginMatch) {
      const slug = demoLoginMatch[1].toLowerCase()
      if (hasTenantDemoAccess(request, slug)) {
        const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    }

    // Protect sensitive API routes (POST/PUT/PATCH/DELETE always; GET except public settings above)
    if (pathname.startsWith('/api/') && isProtectedApiRoute(pathname)) {
      if (!authed) {
        return NextResponse.json(
          { error: 'Unauthorized. Please provide a valid authentication cookie or Bearer token.' },
          { status: 401 }
        )
      }
    }

    const isPublicSettingsRead =
      (pathname === '/api/settings/branding' || pathname === '/api/settings/widget') &&
      request.method === 'GET'
    if (
      pathname.startsWith('/api/') &&
      !isPublicSettingsRead &&
      (pathname.startsWith('/api/settings/branding') || pathname.startsWith('/api/settings/widget')) &&
      request.method !== 'GET'
    ) {
      if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    return NextResponse.next()
  } catch {
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
