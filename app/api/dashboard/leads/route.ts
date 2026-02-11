import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const temperature = searchParams.get('temperature') // hot, warm, cold
    const intent = searchParams.get('intent') // sales, service, inquiry

    // Fetch leads with their most recent conversation's intent
    let query = supabaseAdmin
      .from('leads')
      .select('*, conversations(intent, created_at)')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: rawLeads, error } = await query

    if (error) throw error

    // Process leads: extract latest conversation intent and apply filters
    let leads = (rawLeads || []).map((lead: any) => {
      // Get intent from most recent conversation
      const conversations = lead.conversations || []
      const sorted = conversations.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latestIntent = sorted[0]?.intent || null

      // Calculate temperature from lead_score
      const score = lead.lead_score || 0
      const temp = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'

      // Remove raw conversations from response to keep payload small
      const { conversations: _, ...leadData } = lead
      return { ...leadData, latest_intent: latestIntent, temperature: temp }
    })

    // Apply temperature filter
    if (temperature && temperature !== 'all') {
      leads = leads.filter((l: any) => l.temperature === temperature)
    }

    // Apply intent filter
    if (intent && intent !== 'all') {
      leads = leads.filter((l: any) => l.latest_intent === intent)
    }

    return NextResponse.json({ leads })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
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
