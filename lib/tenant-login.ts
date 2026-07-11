import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantIdBySlug, DEFAULT_TENANT_ID } from '@/lib/tenant'
import { setTenantSessionCookie, verifyPassword } from '@/lib/tenant-session'
import {
  clearDemoAuthCookie,
  getDemoCredentials,
  verifyDemoLogin,
  setDemoAuthCookie,
  generateDemoAuthToken,
} from '@/lib/demo-auth'
import { clearAuthCookie } from '@/lib/auth'

export async function handleTenantLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const slug = String(body.slug || 'ennia').toLowerCase().trim()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    let tenantId = DEFAULT_TENANT_ID
    let tenantSlug = slug
    let role: 'admin' | 'member' = 'admin'
    let userId: string | undefined
    let displayName = slug === 'ennia' ? 'ENNIA' : slug.toUpperCase()
    let authenticated = false

    const resolved = await getTenantIdBySlug(slug)
    if (resolved) {
      tenantId = resolved.id
      tenantSlug = resolved.slug
    } else if (slug === 'ennia' || slug === 'default') {
      tenantId = DEFAULT_TENANT_ID
      tenantSlug = 'ennia'
    } else {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: userRow } = await supabase
      .from('tenant_users')
      .select('id, username, password_hash, role, full_name, is_active')
      .eq('tenant_id', tenantId)
      .eq('username', username)
      .maybeSingle()

    if (userRow?.is_active && verifyPassword(password, userRow.password_hash)) {
      authenticated = true
      role = userRow.role === 'member' ? 'member' : 'admin'
      userId = userRow.id
      if (userRow.full_name) displayName = userRow.full_name
    }

    if (!authenticated && verifyDemoLogin(slug, username, password)) {
      authenticated = true
      const creds = getDemoCredentials(slug)
      if (creds) displayName = creds.displayName
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const chatPath =
      getDemoCredentials(slug)?.chatPath ||
      (slug === 'ennia' ? '/chat' : `/chat?slug=${encodeURIComponent(tenantSlug)}`)

    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
      chatPath,
      displayName,
      tenant: { id: tenantId, slug: tenantSlug },
    })

    setTenantSessionCookie(response, {
      tenantId,
      slug: tenantSlug,
      username,
      role,
      userId,
    })

    setDemoAuthCookie(response, tenantSlug, generateDemoAuthToken())

    // Tenant login is separate from platform super-admin
    clearAuthCookie(response)

    return response
  } catch (error) {
    console.error('Tenant login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
