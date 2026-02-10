import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('integration_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data || {
      mailchimp_enabled: false,
      hubspot_enabled: false,
      whatsapp_enabled: false,
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      smtp_from_email: '',
      smtp_secure: false,
      smtp_enabled: false,
      notification_recipient_email: ''
    })
  } catch (error: any) {
    console.error('Error fetching integrations:', error)
    let errorMessage = 'Failed to fetch integrations'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing } = await supabaseAdmin
      .from('integration_config')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('integration_config')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    } else {
      const { data, error } = await supabaseAdmin
        .from('integration_config')
        .insert(body)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }
  } catch (error: any) {
    console.error('Error updating integrations:', error)
    let errorMessage = 'Failed to update integrations'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}






