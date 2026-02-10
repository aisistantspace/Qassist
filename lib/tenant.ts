import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from './supabase'

/** Default tenant UUID used when no tenant is specified (single-tenant / backward compat). */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export interface TenantContext {
  tenantId: string
  slug: string | null
}

/**
 * Resolve tenant from request: header x-tenant-id or x-tenant-slug, or query param tenant/slug.
 * Returns default tenant if none specified.
 */
export async function getTenantFromRequest(request: NextRequest): Promise<TenantContext> {
  const tenantIdHeader = request.headers.get('x-tenant-id')
  const tenantSlugHeader = request.headers.get('x-tenant-slug')
  const { searchParams } = new URL(request.url)
  const tenantIdQuery = searchParams.get('tenant') ?? searchParams.get('tenantId')
  const tenantSlugQuery = searchParams.get('slug') ?? searchParams.get('tenantSlug')

  if (tenantIdHeader && isValidUuid(tenantIdHeader)) {
    return { tenantId: tenantIdHeader, slug: null }
  }
  if (tenantIdQuery && isValidUuid(tenantIdQuery)) {
    return { tenantId: tenantIdQuery, slug: null }
  }

  const slug = tenantSlugHeader ?? tenantSlugQuery
  if (slug) {
    const resolved = await getTenantIdBySlug(slug)
    if (resolved) return { tenantId: resolved.id, slug: resolved.slug }
  }

  return { tenantId: DEFAULT_TENANT_ID, slug: 'default' }
}

/** Synchronous version: returns tenant id only, using default if slug not resolved (no DB lookup). */
export function getTenantIdFromRequestSync(request: NextRequest): string {
  const tenantIdHeader = request.headers.get('x-tenant-id')
  const { searchParams } = new URL(request.url)
  const tenantIdQuery = searchParams.get('tenant') ?? searchParams.get('tenantId')
  if (tenantIdHeader && isValidUuid(tenantIdHeader)) return tenantIdHeader
  if (tenantIdQuery && isValidUuid(tenantIdQuery)) return tenantIdQuery
  return DEFAULT_TENANT_ID
}

function isValidUuid(s: string): boolean {
  const u = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return u.test(s)
}

/** Look up tenant id by slug. Returns null if not found. */
export async function getTenantIdBySlug(slug: string): Promise<{ id: string; slug: string } | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id, slug: data.slug }
}
