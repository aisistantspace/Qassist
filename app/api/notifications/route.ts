import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const supabaseAdmin = getSupabaseAdmin()
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error, count } = await query

    if (error) throw error

    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unreadCount: unreadCount || 0
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    
    if (body.action === 'mark_all_read') {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (body.action === 'clear_all') {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('tenant_id', tenantId)
        .select('id')

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'All notifications cleared',
        deleted: data?.length || 0,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
