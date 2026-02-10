import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET - Fetch WhatsApp configuration
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('whatsapp_config')
      .select('id, phone_number_id, business_account_id, is_active, display_name, phone_number, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no config exists, return empty
      if (error.code === 'PGRST116') {
        return NextResponse.json({ configured: false })
      }
      throw error
    }

    return NextResponse.json({
      configured: true,
      ...data,
    })
  } catch (error: any) {
    console.error('Error fetching WhatsApp config:', error)
    let errorMessage = 'Failed to fetch WhatsApp configuration'
    
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

// POST - Update WhatsApp configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      phone_number_id,
      business_account_id,
      access_token,
      webhook_verify_token,
      is_active,
      display_name,
      phone_number,
    } = body

    // Validation
    if (!phone_number_id || !business_account_id || !access_token || !webhook_verify_token) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if config exists
    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_config')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing) {
      // Update existing config
      const { data, error } = await supabaseAdmin
        .from('whatsapp_config')
        .update({
          phone_number_id,
          business_account_id,
          access_token, // In production, encrypt this
          webhook_verify_token,
          is_active: is_active ?? false,
          display_name,
          phone_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, phone_number_id, business_account_id, is_active, display_name, phone_number')
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new config
      const { data, error } = await supabaseAdmin
        .from('whatsapp_config')
        .insert({
          phone_number_id,
          business_account_id,
          access_token, // In production, encrypt this
          webhook_verify_token,
          is_active: is_active ?? false,
          display_name,
          phone_number,
        })
        .select('id, phone_number_id, business_account_id, is_active, display_name, phone_number')
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error updating WhatsApp config:', error)
    let errorMessage = 'Failed to update WhatsApp configuration'
    
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

// DELETE - Deactivate WhatsApp integration
export async function DELETE() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_config')
      .select('id')
      .limit(1)
      .single()

    if (!existing) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabaseAdmin
      .from('whatsapp_config')
      .update({ is_active: false })
      .eq('id', existing.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deactivating WhatsApp:', error)
    let errorMessage = 'Failed to deactivate WhatsApp'
    
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


