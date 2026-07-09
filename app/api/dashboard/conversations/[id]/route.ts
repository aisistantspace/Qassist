import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        lead:leads(
          name, 
          email, 
          phone, 
          policy_number,
          account_number,
          metadata,
          service_interest, 
          visa_type, 
          num_applicants, 
          nationality, 
          country_residence, 
          applying_from
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    const { data: formSubmissions } = await supabaseAdmin
      .from('form_submissions')
      .select('id, form_id, answers, status, created_at')
      .eq('lead_id', conversation.lead_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ conversation, formSubmissions: formSubmissions || [] })
  } catch (error: unknown) {
    console.error('Error fetching conversation:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { notes, status, assigned_to, action } = body

    const updates: Record<string, unknown> = {}

    if (notes !== undefined) updates.notes = notes

    if (action === 'assign') {
      updates.assigned_to = assigned_to || body.staffEmail || 'Staff'
      updates.status = 'escalated'
    } else if (action === 'resolve') {
      updates.status = 'completed'
    } else if (action === 'in_progress') {
      updates.status = 'escalated'
    } else if (status) {
      updates.status = status
    }

    if (assigned_to !== undefined && action !== 'assign') {
      updates.assigned_to = assigned_to
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Error updating conversation:', error)
    const message = error instanceof Error ? error.message : 'Failed to update conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin.from('conversations').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting conversation:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
