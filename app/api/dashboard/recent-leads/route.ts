import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error

    return NextResponse.json({ leads: leads || [] })
  } catch (error: any) {
    console.error('Error fetching recent leads:', error)
    let errorMessage = 'Failed to fetch leads'
    
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


