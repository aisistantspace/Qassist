import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved')
    const language = searchParams.get('language')

    let query = supabaseAdmin
      .from('unanswered_queries')
      .select('*')
      .eq('tenant_id', tenantId)

    if (resolved === 'true') {
      query = query.eq('resolved', true)
    } else if (resolved === 'false') {
      query = query.eq('resolved', false)
    }

    if (language && language !== 'all') {
      query = query.eq('language', language)
    }

    const { data: queries, error } = await query

    if (error) throw error

    const all = queries || []
    const openCount = all.filter((q) => !q.resolved).length
    const totalFrequency = all
      .filter((q) => !q.resolved)
      .reduce((sum, q) => sum + (q.frequency || 1), 0)

    const sorted = [...all].sort((a, b) => {
      if ((b.frequency || 0) !== (a.frequency || 0)) {
        return (b.frequency || 0) - (a.frequency || 0)
      }
      return new Date(b.last_asked).getTime() - new Date(a.last_asked).getTime()
    })

    return NextResponse.json({
      queries: sorted,
      stats: {
        open: openCount,
        total_asks: totalFrequency,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching unanswered queries:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch unanswered queries'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { id, resolved } = body

    if (!id || typeof resolved !== 'boolean') {
      return NextResponse.json({ error: 'id and resolved (boolean) are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('unanswered_queries')
      .update({ resolved })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, query: data })
  } catch (error: unknown) {
    console.error('Error updating unanswered query:', error)
    const message = error instanceof Error ? error.message : 'Failed to update query'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const clearResolved = searchParams.get('clear_resolved') === 'true'

    if (id) {
      const { error } = await supabaseAdmin
        .from('unanswered_queries')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: 1 })
    }

    if (clearResolved) {
      const { data, error } = await supabaseAdmin
        .from('unanswered_queries')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('resolved', true)
        .select('id')

      if (error) throw error
      return NextResponse.json({ success: true, deleted: data?.length || 0 })
    }

    return NextResponse.json(
      { error: 'Provide id or clear_resolved=true' },
      { status: 400 }
    )
  } catch (error: unknown) {
    console.error('Error deleting unanswered query:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete query'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
