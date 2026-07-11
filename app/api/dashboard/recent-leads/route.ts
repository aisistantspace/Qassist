import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'
import { isAcquisitionLead } from '@/lib/lead-acquisition'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: rawLeads, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, created_at, status, tags, conversations(intent, created_at), form_submissions(status)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) throw error

    const leads = (rawLeads || [])
      .map((lead: any) => {
        const conversations = lead.conversations || []
        const sorted = conversations.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const latestIntent = sorted[0]?.intent || null
        const hasCompletedForm = (lead.form_submissions || []).some(
          (f: { status?: string }) => f.status === 'completed'
        )
        const { conversations: _, form_submissions: __, ...rest } = lead
        return { ...rest, latest_intent: latestIntent, has_completed_form: hasCompletedForm }
      })
      .filter((lead: any) =>
        isAcquisitionLead({
          tags: lead.tags,
          latestIntent: lead.latest_intent,
          status: lead.status,
          hasCompletedForm: lead.has_completed_form,
          name: lead.name,
          email: lead.email,
        })
      )
      .slice(0, 5)

    return NextResponse.json({ leads })
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
