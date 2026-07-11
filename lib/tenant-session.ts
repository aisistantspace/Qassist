import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const TENANT_SESSION_COOKIE = 'tenant_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export interface TenantSessionPayload {
  tenantId: string
  slug: string
  username: string
  role: 'admin' | 'member'
  userId?: string
  exp: number
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || 'dev-insecure-session-secret'
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, saltB64, hashB64] = stored.split(':')
    if (algo !== 'scrypt' || !saltB64 || !hashB64) return false
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    const actual = crypto.scryptSync(password, salt, expected.length)
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

export function createTenantSessionToken(payload: Omit<TenantSessionPayload, 'exp'>): string {
  const full: TenantSessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_DURATION_MS,
  }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function parseTenantSessionToken(token: string | undefined | null): TenantSessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig || sign(body) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TenantSessionPayload
    if (!payload.tenantId || !payload.slug || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getTenantSession(request: NextRequest): TenantSessionPayload | null {
  return parseTenantSessionToken(request.cookies.get(TENANT_SESSION_COOKIE)?.value)
}

export function setTenantSessionCookie(response: NextResponse, payload: Omit<TenantSessionPayload, 'exp'>): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  response.cookies.set(TENANT_SESSION_COOKIE, createTenantSessionToken(payload), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })
  return response
}

export function clearTenantSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(TENANT_SESSION_COOKIE)
  return response
}
