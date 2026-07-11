import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantFromRequest, getTenantIdBySlug } from '@/lib/tenant'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

async function resolveWidgetTenantId(request: NextRequest): Promise<string> {
  try {
    return await getDashboardTenantId(request)
  } catch {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug') ?? searchParams.get('tenantSlug')
    const tenantIdParam = searchParams.get('tenant') ?? searchParams.get('tenantId')
    if (tenantIdParam) return tenantIdParam
    if (slug) {
      const resolved = await getTenantIdBySlug(slug)
      if (resolved) return resolved.id
    }
    return (await getTenantFromRequest(request)).tenantId
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await resolveWidgetTenantId(request)
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('widget_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data || {
      theme: 'light',
      primary_color: '#3B82F6',
      position: 'bottom-right',
      initial_state: 'minimized',
      initial_messages: ['Hi! How can I help you today?'],
      suggested_messages: [],
      placeholder_text: 'Type your message...',
      chat_icon_url: '',
      bubble_text: null,
      bubble_position: 'left',
    })
  } catch (error: unknown) {
    console.error('Error fetching widget config:', error)
    const err = error as { message?: string; name?: string }
    let errorMessage = 'Failed to fetch config'

    if (err.message?.includes('Supabase admin client is not initialized') || err.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (err.message) {
      errorMessage = err.message
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('widget_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase error fetching widget config:', fetchError)
      throw new Error(`Database error: ${fetchError.message}`)
    }

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('widget_config')
        .update(body)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating widget config:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      return NextResponse.json({ success: true, data })
    }

    const { data, error } = await supabaseAdmin
      .from('widget_config')
      .insert({ ...body, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      console.error('Supabase error inserting widget config:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Error in widget settings POST:', error)
    const err = error as { message?: string; name?: string }
    let errorMessage = 'Failed to update config'

    if (err.message?.includes('Supabase admin client is not initialized') || err.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (err.message) {
      errorMessage = err.message
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
