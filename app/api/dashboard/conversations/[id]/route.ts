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

    return NextResponse.json({ conversation })
  } catch (error: any) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    )
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
    const { notes } = body

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ notes })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500 }
    )
  }
}


