import type { NextRequest } from 'next/server'
import { DEFAULT_TENANT_ID, getTenantIdBySlug } from '@/lib/tenant'
import { getTenantSession } from '@/lib/tenant-session'

const SUPER_ADMIN_COOKIE = 'dashboard_auth'

export interface DashboardTenantContext {
  tenantId: string
  slug: string | null
  role: 'super_admin' | 'admin' | 'member'
  isSuperAdmin: boolean
  username?: string
}

export function isSuperAdminRequest(request: NextRequest): boolean {
  if (request.cookies.get(SUPER_ADMIN_COOKIE)?.value) return true
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const dashboardPassword = process.env.DASHBOARD_PASSWORD || process.env.ADMIN_PASSWORD
    if (dashboardPassword && token === dashboardPassword) return true
  }
  return false
}

export function isDashboardAuthenticated(request: NextRequest): boolean {
  return isSuperAdminRequest(request) || !!getTenantSession(request)
}

/** Resolve tenant for dashboard/admin API routes. */
export async function getDashboardTenantContext(request: NextRequest): Promise<DashboardTenantContext> {
  const session = getTenantSession(request)
  if (session) {
    return {
      tenantId: session.tenantId,
      slug: session.slug,
      role: session.role,
      isSuperAdmin: false,
      username: session.username,
    }
  }

  if (isSuperAdminRequest(request)) {
    const url = new URL(request.url)
    const slug =
      request.headers.get('x-tenant-slug') ||
      url.searchParams.get('slug') ||
      url.searchParams.get('tenantSlug')

    if (slug) {
      const resolved = await getTenantIdBySlug(slug)
      if (resolved) {
        return {
          tenantId: resolved.id,
          slug: resolved.slug,
          role: 'super_admin',
          isSuperAdmin: true,
        }
      }
    }

    return {
      tenantId: DEFAULT_TENANT_ID,
      slug: 'ennia',
      role: 'super_admin',
      isSuperAdmin: true,
    }
  }

  throw new Error('UNAUTHORIZED')
}

export async function getDashboardTenantId(request: NextRequest): Promise<string> {
  const ctx = await getDashboardTenantContext(request)
  return ctx.tenantId
}
