import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: forms, error } = await supabaseAdmin
      .from('form_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ forms })
  } catch (error: any) {
    console.error('Error fetching forms:', error)
    let errorMessage = 'Failed to fetch forms'
    
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

export async function POST(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { name, description, fields, is_active, form_mode, enable_ai_response, ai_response_config, email_automation_enabled, email_automation_recipients, use_mode, external_url, notification_emails } = body

    // Auto-detect eligibility forms and set to inline mode and enable AI response by default
    const isEligibilityForm = 
      name?.toLowerCase().includes('eligibility') ||
      name?.toLowerCase().includes('qualify') ||
      description?.toLowerCase().includes('eligibility') ||
      description?.toLowerCase().includes('qualify')
    
    // If form_mode is explicitly set, use it; otherwise default to 'inline' for eligibility forms
    const finalFormMode = form_mode || (isEligibilityForm ? 'inline' : null)
    
    // Auto-enable AI response for eligibility forms if not explicitly set
    const finalEnableAIResponse = enable_ai_response !== undefined ? enable_ai_response : (isEligibilityForm ? true : false)
    
    // Default use_mode to 'inline' if not specified
    const finalUseMode = use_mode || 'inline'

    const { data: form, error } = await supabaseAdmin
      .from('form_definitions')
      .insert({ 
        tenant_id: tenantId,
        name, 
        description, 
        fields, 
        is_active, 
        form_mode: finalFormMode, 
        enable_ai_response: finalEnableAIResponse, 
        ai_response_config, 
        email_automation_enabled: email_automation_enabled ?? false, 
        email_automation_recipients: email_automation_recipients || null,
        use_mode: finalUseMode,
        external_url: external_url || null,
        notification_emails: notification_emails || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ form })
  } catch (error: any) {
    console.error('Error creating form:', error)
    let errorMessage = 'Failed to create form'
    
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
