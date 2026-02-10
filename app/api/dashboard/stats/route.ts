import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const [
      { count: leadsToday },
      { count: activeConversations },
      { count: bookingRequestsWeek },
      { count: mailchimpSynced },
      { count: hubspotSynced },
      { data: avgData },
    ] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('status', 'active'),
      supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('status', 'escalated')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('synced_to_mailchimp', true),
      supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('synced_to_hubspot', true),
      supabaseAdmin
        .from('conversations')
        .select('turn_count')
        .eq('tenant_id', DEFAULT_TENANT_ID),
    ])

    const avgConversationLength = avgData && avgData.length > 0
      ? avgData.reduce((sum: number, c: any) => sum + (c.turn_count || 0), 0) / avgData.length
      : 0

    return NextResponse.json({
      leads_today: leadsToday || 0,
      active_conversations: activeConversations || 0,
      booking_requests_week: bookingRequestsWeek || 0,
      mailchimp_synced: mailchimpSynced || 0,
      hubspot_synced: hubspotSynced || 0,
      avg_conversation_length: avgConversationLength,
    })
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    let errorMessage = 'Failed to fetch stats'
    
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
