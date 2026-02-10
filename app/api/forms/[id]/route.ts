import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { name, description, fields, is_active, form_mode, enable_ai_response, ai_response_config, email_automation_enabled, email_automation_recipients, use_mode, external_url, notification_emails } = body

    // Auto-detect eligibility forms and set to inline mode by default
    const isEligibilityForm = 
      name?.toLowerCase().includes('eligibility') ||
      name?.toLowerCase().includes('qualify') ||
      description?.toLowerCase().includes('eligibility') ||
      description?.toLowerCase().includes('qualify')
    
    // If form_mode is explicitly set, use it; otherwise default to 'inline' for eligibility forms
    // If form_mode is explicitly null, respect that (user wants to use global default)
    const finalFormMode = form_mode !== undefined 
      ? form_mode 
      : (isEligibilityForm ? 'inline' : null)
    
    // Auto-enable AI response for eligibility forms if not explicitly set
    const finalEnableAIResponse = enable_ai_response !== undefined 
      ? enable_ai_response 
      : (isEligibilityForm ? true : false)

    const updatePayload: Record<string, unknown> = { name, description, fields, is_active, form_mode: finalFormMode, enable_ai_response: finalEnableAIResponse, ai_response_config }
    if (email_automation_enabled !== undefined) updatePayload.email_automation_enabled = email_automation_enabled
    if (email_automation_recipients !== undefined) updatePayload.email_automation_recipients = email_automation_recipients
    if (use_mode !== undefined) updatePayload.use_mode = use_mode
    if (external_url !== undefined) updatePayload.external_url = external_url
    if (notification_emails !== undefined) updatePayload.notification_emails = notification_emails
    const { data: form, error } = await supabaseAdmin
      .from('form_definitions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ form })
  } catch (error: any) {
    console.error('Error updating form:', error)
    let errorMessage = 'Failed to update form'
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('form_definitions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting form:', error)
    let errorMessage = 'Failed to delete form'
    
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

