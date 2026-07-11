import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        conversations(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ lead })
  } catch (error: any) {
    console.error('Error fetching lead:', error)
    let errorMessage = 'Failed to fetch lead'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const allowed = [
      'status', 'lead_score', 'notes', 'name', 'email', 'phone',
      'service_interest', 'visa_type', 'num_applicants', 'nationality',
      'country_residence', 'applying_from',
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    if (updates.status === 'contacted') updates.last_contacted = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating lead:', error)
    let errorMessage = 'Failed to update lead'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    let errorMessage = 'Failed to delete lead'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
