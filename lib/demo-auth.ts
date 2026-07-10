import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days for demo guests

export interface DemoCredentials {
  slug: string
  username: string
  password: string
  chatPath: string
  displayName: string
}

function envKey(slug: string, suffix: string): string {
  return `DEMO_${slug.toUpperCase().replace(/-/g, '_')}_${suffix}`
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/** Demo cookie name per slug, e.g. demo_auth_ennia */
export function demoAuthCookieName(slug: string): string {
  return `demo_auth_${slug.toLowerCase()}`
}

export function getDemoCredentials(slug: string): DemoCredentials | null {
  const normalized = slug.toLowerCase()
  const username = process.env[envKey(normalized, 'USERNAME')]
  const password = process.env[envKey(normalized, 'PASSWORD')]
  if (!username || !password) return null

  const chatPath =
    process.env[envKey(normalized, 'CHAT_PATH')] ||
    (normalized === 'ennia' ? '/chat' : `/chat?slug=${encodeURIComponent(normalized)}`)

  const displayName =
    process.env[envKey(normalized, 'DISPLAY_NAME')] ||
    (normalized === 'ennia' ? 'ENNIA' : normalized.toUpperCase())

  return {
    slug: normalized,
    username,
    password,
    chatPath,
    displayName,
  }
}

export function isDemoConfigured(slug: string): boolean {
  return getDemoCredentials(slug) !== null
}

/** Slugs with DEMO_<SLUG>_USERNAME + PASSWORD set in env. */
export function listConfiguredDemoSlugs(): string[] {
  const slugs = new Set<string>()
  const fromList = process.env.DEMO_PROTECTED_SLUGS?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (fromList?.length) {
    for (const slug of fromList) {
      if (isDemoConfigured(slug)) slugs.add(slug)
    }
  }
  if (isDemoConfigured('ennia')) slugs.add('ennia')
  for (const key of Object.keys(process.env)) {
    const m = key.match(/^DEMO_([A-Z0-9_]+)_USERNAME$/)
    if (m) {
      const slug = m[1].toLowerCase().replace(/_/g, '-')
      if (isDemoConfigured(slug)) slugs.add(slug)
    }
  }
  return [...slugs]
}

export function verifyDemoLogin(slug: string, username: string, password: string): boolean {
  const creds = getDemoCredentials(slug)
  if (!creds) return false
  return timingSafeEqual(username.trim(), creds.username) && timingSafeEqual(password, creds.password)
}

export function isDashboardAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get('dashboard_auth')?.value
}

export function isDemoAuthenticated(request: NextRequest, slug: string): boolean {
  return !!request.cookies.get(demoAuthCookieName(slug))?.value
}

export function canAccessDemoChat(request: NextRequest, slug: string): boolean {
  if (!isDemoConfigured(slug)) return true
  return isDemoAuthenticated(request, slug) || isDashboardAuthenticated(request)
}

/**
 * When ENNIA demo creds are set, /chat is gated (default tenant ENNIA KB).
 * Set DEMO_ENNIA_PROTECT_CHAT=false to keep /chat public.
 */
export function getChatGateSlug(): string | null {
  if (!isDemoConfigured('ennia')) return null
  if (process.env.DEMO_ENNIA_PROTECT_CHAT === 'false') return null
  return 'ennia'
}

export function setDemoAuthCookie(response: NextResponse, slug: string, token: string): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  response.cookies.set(demoAuthCookieName(slug), token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })
  return response
}

export function clearDemoAuthCookie(response: NextResponse, slug: string): NextResponse {
  response.cookies.delete(demoAuthCookieName(slug))
  return response
}

export function generateDemoAuthToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Use at top of /api/chat and /api/leads when demo gate is active. */
export function demoChatAccessDeniedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Demo login required. Please sign in at /demo/ennia/login' },
    { status: 401 }
  )
}

export function assertDemoChatAccess(request: NextRequest): NextResponse | null {
  const gateSlug = getChatGateSlug()
  if (!gateSlug) return null
  if (canAccessDemoChat(request, gateSlug)) return null
  return demoChatAccessDeniedResponse()
}

/** Server component helper (cookies() from next/headers). */
export async function canAccessDemoChatFromCookieStore(
  slug: string,
  getCookie: (name: string) => string | undefined
): Promise<boolean> {
  if (!isDemoConfigured(slug)) return true
  if (getCookie('dashboard_auth')) return true
  if (getCookie(demoAuthCookieName(slug))) return true
  return false
}
