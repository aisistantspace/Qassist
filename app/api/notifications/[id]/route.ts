import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

// PATCH - Mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    const updateData: Record<string, any> = {}
    if (body.is_read !== undefined) {
      updateData.is_read = body.is_read
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ notification: data })
  } catch (error: any) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
