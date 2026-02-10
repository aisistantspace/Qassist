import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: rawSubmissions, error } = await supabaseAdmin
      .from('form_submissions')
      .select(`
        *,
        form:form_definitions(name),
        lead:leads(name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Flatten the response for the UI
    const submissions = rawSubmissions.map((sub: any) => ({
      ...sub,
      form_name: sub.form?.name,
      lead_name: sub.lead?.name,
      lead_email: sub.lead?.email
    }))

    return NextResponse.json({ submissions })
  } catch (error: any) {
    console.error('Error fetching submissions:', error)
    let errorMessage = 'Failed to fetch submissions'
    
    if (error.message?.includes('Supabase admin client is not initialized')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

