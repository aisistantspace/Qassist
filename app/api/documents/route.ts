import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: documents || [] })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    let errorMessage = 'Failed to fetch documents'
    
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
