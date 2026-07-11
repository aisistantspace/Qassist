import { NextRequest, NextResponse } from 'next/server'
import { getDashboardTenantContext, isSuperAdminRequest } from '@/lib/dashboard-tenant'
import { getTenantSession } from '@/lib/tenant-session'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = getTenantSession(request)
    if (session) {
      const supabase = getSupabaseAdmin()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_plan, status')
        .eq('id', session.tenantId)
        .maybeSingle()

      return NextResponse.json({
        authenticated: true,
        isSuperAdmin: false,
        user: {
          username: session.username,
          role: session.role,
        },
        tenant: tenant || { id: session.tenantId, slug: session.slug, name: session.slug },
        chatPath: session.slug === 'ennia' ? '/chat' : `/chat?slug=${session.slug}`,
      })
    }

    if (isSuperAdminRequest(request)) {
      const ctx = await getDashboardTenantContext(request)
      const supabase = getSupabaseAdmin()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_plan, status')
        .eq('id', ctx.tenantId)
        .maybeSingle()

      return NextResponse.json({
        authenticated: true,
        isSuperAdmin: true,
        user: { username: 'super-admin', role: 'super_admin' },
        tenant: tenant || { id: ctx.tenantId, slug: ctx.slug },
        chatPath: '/chat',
      })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
