import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const intent = searchParams.get('intent')
    const department = searchParams.get('department')
    const escalatedOnly = searchParams.get('escalated') === 'true'

    let query = supabaseAdmin
      .from('conversations')
      .select(`
        *,
        lead:leads(name, email, policy_number, account_number)
      `)
      .eq('tenant_id', tenantId)

    if (escalatedOnly) {
      query = query.eq('status', 'escalated')
    } else if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (intent && intent !== 'all') {
      query = query.eq('intent', intent)
    }

    if (department && department !== 'all') {
      query = query.eq('department', department)
    }

    const { data: conversations, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    const sorted = (conversations || []).sort((a, b) => {
      const pa = priorityOrder[a.priority || 'medium'] ?? 2
      const pb = priorityOrder[b.priority || 'medium'] ?? 2
      if (pa !== pb) return pa - pb
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({ conversations: sorted })
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
    let errorMessage = 'Failed to fetch conversations'
    
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
