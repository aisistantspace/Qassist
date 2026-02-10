import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createOrUpdateContact } from '@/lib/hubspot'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    // Get lead from database
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Parse name into first and last
    const nameParts = lead.name.split(' ')
    const firstname = nameParts[0]
    const lastname = nameParts.slice(1).join(' ')

    // Create or update in HubSpot
    const result = await createOrUpdateContact({
      email: lead.email,
      firstname,
      lastname,
      phone: lead.phone,
      lifecyclestage: 'lead',
      hs_lead_status: 'OPEN',
    })

    if (result.success) {
      // Mark as synced in database
      await supabaseAdmin
        .from('leads')
        .update({ synced_to_hubspot: true })
        .eq('id', leadId)

      return NextResponse.json({ success: true, data: result.data })
    } else {
      throw new Error('Failed to sync to HubSpot')
    }
  } catch (error: any) {
    console.error('Error syncing to HubSpot:', error)
    let errorMessage = 'Failed to sync to HubSpot'
    
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



