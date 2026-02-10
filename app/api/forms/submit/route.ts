import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { analyzeEligibility, formatEligibilityResults, type EligibilityResult } from '@/lib/eligibility'
import { sendFormSubmissionEmail, sendFormNotificationEmail } from '@/lib/email'
import { createFormSubmissionNotification } from '@/lib/notifications'
import { checkRateLimit, getClientIP, sanitizeInput } from '@/lib/security'

export async function POST(request: NextRequest) {
  // Rate limiting: max 10 requests per minute per IP
  const clientIP = getClientIP(request)
  const rl = checkRateLimit(`forms-submit:${clientIP}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { formId, leadId, answers } = body

    // Sanitize all answer values before processing and storage
    if (answers && typeof answers === 'object') {
      for (const key of Object.keys(answers)) {
        if (typeof answers[key] === 'string') {
          answers[key] = sanitizeInput(answers[key], 2000)
        }
      }
    }

    if (!formId || !leadId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: formId, leadId, and answers are required' },
        { status: 400 }
      )
    }

    const { data: form, error: formError } = await supabaseAdmin
      .from('form_definitions')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 }
      )
    }

    // Validate all required fields are present and valid
    const requiredFields = form.fields || []
    const missingFields: any[] = []
    const invalidFields: any[] = []

    requiredFields.forEach((field: any) => {
      const value = answers[field.key]
      
      // Check if field is missing
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field)
        return
      }

      // Validate select fields against their options
      if (field.type === 'select' && field.options && Array.isArray(field.options)) {
        if (!field.options.includes(value)) {
          invalidFields.push({ field, message: `Invalid option selected for ${field.label}` })
        }
      }

      // Validate date fields
      if (field.type === 'date') {
        const dateValue = new Date(value)
        if (isNaN(dateValue.getTime())) {
          invalidFields.push({ field, message: `Invalid date format for ${field.label}` })
        }
      }

      // Validate email fields
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          invalidFields.push({ field, message: `Invalid email format for ${field.label}` })
        }
      }

      // Validate number fields
      if (field.type === 'number') {
        if (isNaN(Number(value))) {
          invalidFields.push({ field, message: `Invalid number format for ${field.label}` })
        }
      }
    })

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields: missingFields.map((f: any) => f.label)
        },
        { status: 400 }
      )
    }

    if (invalidFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid field values',
          invalidFields: invalidFields.map((f: any) => f.message)
        },
        { status: 400 }
      )
    }

    const tenantId = (form as { tenant_id?: string }).tenant_id!
    const { data: existingSub } = await supabaseAdmin
      .from('form_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('form_id', formId)
      .eq('lead_id', leadId)
      .maybeSingle()

    // Merge with existing answers if any
    const mergedAnswers = { ...(existingSub?.answers || {}), ...answers }

    // Check if AI response is enabled for this form
    const enableAIResponse = form?.enable_ai_response || false

    // Generate AI response if enabled for this form
    let eligibilityResult: EligibilityResult | null = null
    let eligibilityResultsText = ''

    if (enableAIResponse && form) {
      try {
        // Get lead language for results formatting
        const { data: conversation } = await supabaseAdmin
          .from('conversations')
          .select('language')
          .eq('tenant_id', tenantId)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const language = (conversation?.language || 'EN') as 'EN' | 'NL' | 'ES' | 'PA'

        eligibilityResult = await analyzeEligibility(
          form.name,
          form.description || '',
          mergedAnswers,
          form.ai_response_config || null
        )

        eligibilityResultsText = formatEligibilityResults(eligibilityResult, language)
      } catch (error) {
        console.error('Error generating eligibility results:', error)
        // Continue without results if analysis fails
      }
    }

    // Upsert submission with eligibility results in metadata
    const submissionMetadata: any = {}
    if (eligibilityResult) {
      submissionMetadata.eligibilityResult = eligibilityResult
      submissionMetadata.eligibilityResultsText = eligibilityResultsText
    }

    const { data: submission, error: submitError } = await supabaseAdmin
      .from('form_submissions')
      .upsert({
        tenant_id: tenantId,
        form_id: formId,
        lead_id: leadId,
        answers: mergedAnswers,
        status: 'completed',
        metadata: Object.keys(submissionMetadata).length > 0 ? submissionMetadata : undefined
      }, { onConflict: 'form_id,lead_id' })
      .select()
      .single()

    if (submitError) throw submitError

    // Get lead info for notifications
    const { data: leadRow } = await supabaseAdmin.from('leads').select('name, email').eq('tenant_id', tenantId).eq('id', leadId).single()
    const leadInfo = leadRow ? { name: leadRow.name, email: leadRow.email } : undefined

    // Send form data email if automation enabled
    if (form?.email_automation_enabled && form?.email_automation_recipients) {
      sendFormSubmissionEmail(
        form.name,
        mergedAnswers,
        form.email_automation_recipients,
        leadInfo
      ).catch(err => console.error('Form submission email failed:', err))
    }

    // Create in-app notification
    createFormSubmissionNotification(
      form.name,
      leadInfo?.name,
      leadInfo?.email,
      formId,
      submission.id,
      tenantId
    ).catch(err => console.error('Failed to create notification:', err))

    // Send notification-only emails (no form data) if configured
    if (form?.notification_emails) {
      sendFormNotificationEmail(
        form.name,
        form.notification_emails,
        leadInfo,
        new Date()
      ).catch(err => console.error('Form notification email failed:', err))
    }

    return NextResponse.json({ 
      success: true,
      submission,
      message: 'Form submitted successfully',
      eligibilityResults: eligibilityResultsText || undefined,
      eligibilityResult: eligibilityResult || undefined
    })
  } catch (error: any) {
    console.error('Error submitting form:', error)
    let errorMessage = 'Failed to submit form'
    
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
