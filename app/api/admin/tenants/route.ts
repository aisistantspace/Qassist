import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/tenant-session'
import { isSuperAdminRequest } from '@/lib/dashboard-tenant'

/** Super-admin only: create tenant + first admin user */
export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, slug, username, password, plan = 'starter' } = body

    if (!name || !slug || !username || !password) {
      return NextResponse.json(
        { error: 'name, slug, username, and password are required' },
        { status: 400 }
      )
    }

    const normalizedSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
    const supabase = getSupabaseAdmin()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: String(name).trim(),
        slug: normalizedSlug,
        subscription_plan: plan,
        status: 'active',
      })
      .select('id, name, slug')
      .single()

    if (tenantError) {
      if (tenantError.code === '23505') {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
      throw tenantError
    }

    const { error: userError } = await supabase.from('tenant_users').insert({
      tenant_id: tenant.id,
      username: String(username).trim(),
      password_hash: hashPassword(String(password)),
      role: 'admin',
      full_name: `${name} Admin`,
    })

    if (userError) throw userError

    // Seed empty branding + widget rows for new tenant
    await supabase.from('branding_config').insert({
      tenant_id: tenant.id,
      company_name: name,
      widget_title: `${name} Chat`,
      welcome_message: `Welcome to ${name}! How can we help you today?`,
      primary_color: '#3B82F6',
      default_language: 'EN',
      enable_lead_capture: true,
      lead_capture_fields: ['name', 'email'],
    })

    await supabase.from('widget_config').insert({
      tenant_id: tenant.id,
      theme: 'light',
      primary_color: '#3B82F6',
      position: 'bottom-right',
      initial_state: 'minimized',
      suggested_messages: [],
      placeholder_text: 'Type your message...',
    })

    return NextResponse.json({
      success: true,
      tenant,
      loginUrl: `/demo/${normalizedSlug}/login`,
      chatUrl: `/chat?slug=${normalizedSlug}`,
    })
  } catch (error: unknown) {
    console.error('Create tenant error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create tenant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug, subscription_plan, status, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: users } = await supabase
      .from('tenant_users')
      .select('id, tenant_id, username, role, is_active, created_at')

    return NextResponse.json({
      tenants: tenants || [],
      users: users || [],
    })
  } catch (error: unknown) {
    console.error('List tenants error:', error)
    return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 })
  }
}
