import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/papiamentu/corrections
 * Returns recent Papiamentu corrections for review (self-learning log).
 * Query: limit (default 100), tenant_id (optional filter).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)
    const tenantId = searchParams.get('tenant_id') || undefined

    const supabaseAdmin = getSupabaseAdmin()
    let q = supabaseAdmin
      .from('papiamentu_corrections')
      .select('id, tenant_id, from_text, to_text, change_type, context, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (tenantId) {
      q = q.eq('tenant_id', tenantId)
    }

    const { data, error } = await q

    if (error) {
      console.error('[Papiamentu corrections]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ corrections: data ?? [], count: (data ?? []).length })
  } catch (e) {
    console.error('[Papiamentu corrections]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}
