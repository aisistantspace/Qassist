import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantFromRequest, DEFAULT_TENANT_ID } from '@/lib/tenant'
import { createChatCompletion, extractLeadMetadata, extractFormData, classifyIntent } from '@/lib/openai'
import { searchKnowledgeBaseWithFallback, buildContext, buildActionGuidance, generateSystemPrompt, isCaseSpecific, getRelevantFormLinks, isEligibilityQuery, isFormTriggered, resolveEffectiveLanguage, logUnansweredQuery } from '@/lib/rag'
import { updateLeadScore } from '@/lib/lead-scoring'
import { getBrandingConfig } from '@/lib/branding'
import { sendFormSubmissionEmail, sendFormNotificationEmail } from '@/lib/email'
import { correctPapiamentu } from '@/lib/papiamentu'
import { sanitizeForPrompt, checkRateLimit, getClientIP } from '@/lib/security'
import { containsAbusiveLanguage, getAbusiveMessageTurnNote } from '@/lib/conversation-conduct'
import { getRecentConversation, summarizeConversation, isResumable, classifyDepartment, classifyPriority } from '@/lib/customer-matching'
import type { Department, Priority } from '@/lib/customer-matching'
import { resolveCustomerIdentity, formatCustomerContextForPrompt, syncLeadFromAnswers } from '@/lib/customer-identity'
import { evaluateRouting, formatFormLinkMessage, formatDepartmentLinkMessage } from '@/lib/routing'
import { dispatchEscalation } from '@/lib/escalation'
import {
  detectAcquisitionFromMessages,
  detectAcquisitionIntentFromText,
  markLeadAsAcquisition,
} from '@/lib/lead-acquisition'
import { inferDepartmentFromFormName } from '@/lib/insurance-form-templates'
import { createFormSubmissionNotification } from '@/lib/notifications'
import type { ChatRequest, ChatResponse, Message } from '@/lib/types'

// Check if integration is enabled
const isHubSpotEnabled = !!process.env.HUBSPOT_ACCESS_TOKEN
const isMailchimpEnabled = !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID)

export async function POST(request: NextRequest) {
  // Rate limiting: max 20 requests per minute per IP
  const clientIP = getClientIP(request)
  const rl = checkRateLimit(`chat:${clientIP}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body: ChatRequest = await request.json()
    const { message, conversationId, leadId, language, languageExplicit, channel = 'web', triggerFormId, tenantId: bodyTenantId, slug: bodySlug } = body
    const tenantContext = bodyTenantId
      ? { tenantId: bodyTenantId, slug: bodySlug ?? null }
      : bodySlug
        ? await (async () => {
            const { getTenantIdBySlug } = await import('@/lib/tenant')
            const r = await getTenantIdBySlug(bodySlug)
            return r ? { tenantId: r.id, slug: r.slug } : { tenantId: DEFAULT_TENANT_ID, slug: 'default' }
          })()
        : await getTenantFromRequest(request)
    const tenantId = tenantContext.tenantId

    // Allow empty message if triggerFormId is provided (for auto-triggering forms)
    if ((!message || !message.trim()) && !triggerFormId) {
      return NextResponse.json(
        { error: 'Missing required fields: message or triggerFormId' },
        { status: 400 }
      )
    }

    if (!leadId || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId and language' },
        { status: 400 }
      )
    }

    let currentConversationId = conversationId
    let turnCount = 0
    let existingMessages: Message[] = []
    let existingConversationLanguage: 'EN' | 'NL' | 'ES' | 'PA' | undefined

    if (conversationId) {
      const { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single()

      if (conversation) {
        existingMessages = conversation.messages || []
        turnCount = conversation.turn_count || 0
        existingConversationLanguage = conversation.language as 'EN' | 'NL' | 'ES' | 'PA'
      }
    }

    // Use empty string if message is not provided (when triggerFormId is used)
    const rawMessageText = (message || '').trim()
    // Sanitize user message against prompt injection before LLM usage
    const messageText = rawMessageText ? sanitizeForPrompt(rawMessageText) : ''
    // Resolve language: honor explicit flag selection, else auto-detect from message
    const effectiveLanguage: 'EN' | 'NL' | 'ES' | 'PA' = resolveEffectiveLanguage(
      messageText,
      language as 'EN' | 'NL' | 'ES' | 'PA',
      {
        languageExplicit: languageExplicit === true,
        existingConversationLanguage,
      }
    )

    const { getAgentSettings } = await import('@/lib/openai')
    const settings = await getAgentSettings(tenantId)
    const isEligibilityMode = settings.agent_type === 'eligibility'

    // Auto-resume: if no conversationId provided, check for a recent active conversation
    let priorContextSummary: string | null = null
    if (!currentConversationId) {
      const recent = await getRecentConversation(leadId, tenantId)

      if (recent && isResumable(recent.updatedAt, recent.status, 24)) {
        // Resume the active conversation directly
        currentConversationId = recent.id
        existingMessages = recent.messages || []
        turnCount = existingMessages.filter((m: Message) => m.role === 'user').length
        existingConversationLanguage = recent.language as 'EN' | 'NL' | 'ES' | 'PA'
      } else {
        // If there's an older/completed conversation, inject context summary
        if (recent && recent.messages.length > 0) {
          priorContextSummary = summarizeConversation(recent.messages)
        }

        // Create a fresh conversation
        const { data: newConversation, error: convError } = await supabaseAdmin
          .from('conversations')
          .insert({
            tenant_id: tenantId,
            lead_id: leadId,
            messages: [],
            turn_count: 0,
            status: 'active',
            language: effectiveLanguage,
            channel,
          })
          .select()
          .single()

        if (convError) throw convError
        currentConversationId = newConversation.id
      }
    }

    // Skip RAG in eligibility mode — no KB needed
    const kbSearch =
      !isEligibilityMode && messageText
        ? await searchKnowledgeBaseWithFallback(messageText, effectiveLanguage, 15, tenantId)
        : { entries: [], usedFallback: false, sourceLanguages: [] as string[], insuranceProduct: null }
    const relevantEntries = kbSearch.entries
    const context = buildContext(relevantEntries) + buildActionGuidance(relevantEntries)
    const kbUsesForeignContent =
      kbSearch.sourceLanguages.some((l) => l && l !== effectiveLanguage) ||
      relevantEntries.some((e) => e.language && e.language !== effectiveLanguage)
    if (relevantEntries.length === 0 && messageText) {
      logUnansweredQuery(messageText, effectiveLanguage, tenantId).catch(() => {})
    }
    const isCaseQuery = messageText ? isCaseSpecific(messageText) : false
    const systemPrompt = await generateSystemPrompt(context, effectiveLanguage, leadId, messageText || undefined, tenantId, {
      contextFromFallbackLanguages: kbSearch.usedFallback || kbUsesForeignContent,
      kbEntryCount: relevantEntries.length,
      kbSourceLanguages: kbSearch.sourceLanguages,
      insuranceProduct: kbSearch.insuranceProduct,
    })
    const userMessage: Message = {
      role: 'user',
      content: messageText || 'Start form',
      timestamp: new Date().toISOString(),
    }

    // If we have prior conversation context (returning customer, new conversation), inject it
    let enrichedSystemPrompt = systemPrompt
    if (priorContextSummary) {
      enrichedSystemPrompt += `\n\n--- RETURNING CUSTOMER CONTEXT ---\nThis is a returning customer. ${priorContextSummary}\nUse this context to provide continuity, but do not repeat previous answers. Greet them as a returning visitor.`
    }

    if (messageText && containsAbusiveLanguage(messageText)) {
      enrichedSystemPrompt += `\n\n${getAbusiveMessageTurnNote(effectiveLanguage)}`
    }

    // --- Mid-chat customer identification ---
    // When a user provides an email/phone during conversation, check if they're an existing customer
    let customerIdentified = false
    let identifiedLeadId = leadId
    if (messageText && currentConversationId) {
      try {
        const idResult = await resolveCustomerIdentity(tenantId, leadId, currentConversationId, messageText)
        if (idResult) {
          customerIdentified = true
          identifiedLeadId = idResult.mergedLeadId
          const ctx = formatCustomerContextForPrompt(idResult.identifiedLead)
          enrichedSystemPrompt += `\n\n--- CUSTOMER IDENTIFIED ---\n${ctx}.${idResult.wasAnonymous ? ' The conversation has been linked to their existing account.' : ''}${idResult.externalEnriched ? ' (Verified via external customer system)' : ''}\nAcknowledge them by name when appropriate. If they need help with claims, support, or registration, guide them to the right next step or department.`

          // Log the identification event
          Promise.resolve(supabaseAdmin.from('event_logs').insert({
            tenant_id: tenantId,
            lead_id: idResult.mergedLeadId,
            event_type: 'customer_identified',
            metadata: {
              matchType: idResult.matchType,
              wasAnonymous: idResult.wasAnonymous,
              previousLeadId: leadId,
              conversationId: currentConversationId,
              timestamp: new Date().toISOString(),
            },
          })).catch(err => console.error('[CUSTOMER_ID] Failed to log event:', err))

          console.log(`[CUSTOMER_ID] Identified customer, match: ${idResult.matchType}, external: ${idResult.externalEnriched}`)
        }
      } catch (err) {
        console.error('[CUSTOMER_ID] Mid-chat identification failed:', err)
      }
    }

    const openAIMessages = [
      { role: 'system' as const, content: enrichedSystemPrompt },
      ...existingMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      ...(messageText.trim() ? [{ role: 'user' as const, content: messageText }] : []),
    ]

    const defaultFormMode = (settings.default_form_mode || 'conversational') as 'conversational' | 'inline'

    // Check if user is agreeing to show an inline form
    const lowerMessage = messageText.toLowerCase()
    const isAgreeingToForm = messageText.trim() 
      ? /^(yes|sure|ok|okay|alright|fine|go ahead|please|yes please|sure thing|of course|absolutely|definitely|yep|yeah|yup)\b/i.test(lowerMessage)
      : false
    
    // Check conversation history for form permission request
    const lastAssistantMessage = existingMessages.filter(m => m.role === 'assistant').pop()?.content || ''
    const wasFormPermissionRequested = lastAssistantMessage.toLowerCase().includes('form') && 
      (lastAssistantMessage.toLowerCase().includes('fill out') || lastAssistantMessage.toLowerCase().includes('quick form') || lastAssistantMessage.toLowerCase().includes('would you like'))

    // Detect human contact requests - comprehensive pattern matching
    const humanContactPatterns = [
      // Direct human contact requests
      /talk to (a )?human/i,
      /speak with (a )?human/i,
      /speak to (a )?human/i,
      /talk with (a )?human/i,
      /contact (a )?human/i,
      /human (assistance|help|contact|support|agent|representative)/i,
      
      // Email requests
      /email me/i,
      /send me (an )?email/i,
      /contact me (via|by) email/i,
      /reach out (to me|via email)/i,
      /(can|could) (you|someone) email (me|us)/i,
      /(i|we) (want|need|would like) (an|to receive) email/i,
      
      // General contact requests
      /contact me/i,
      /reach out to me/i,
      /someone (reach|contact|email|call|get in touch) (me|out|with me)/i,
      /(can|could) (you|someone) (contact|reach|call|email) (me|us)/i,
      /(i|we) (want|need|would like) (to|someone to) (contact|reach|call|email) (me|us)/i,
      
      // Talk/speak with someone requests
      /(i )?want to (talk|speak) (to|with) (someone|a person|a real person|an agent|a representative)/i,
      /(i )?need (to talk|to speak|human help|to speak with someone|to talk to someone)/i,
      /(can|could) (i|we) (talk|speak) (to|with) (someone|a person|a human|an agent)/i,
      /(i|we) (want|need|would like) (to|someone to) (talk|speak) (to|with) (me|us)/i,
      
      // Payment issues (often trigger human contact)
      /payment (timed out|failed|error|problem|issue|didn't work|doesn't work)/i,
      /(i|we) (tried|attempted) to pay/i,
      /payment (was|got) (rejected|declined|failed)/i,
      /(i|we) (can't|cannot) (complete|finish) (the )?payment/i,
      /payment (process|transaction) (failed|error|problem)/i,
      
      // Help/assistance requests that imply human contact
      /(i|we) (need|want) (help|assistance|support) (from|with)/i,
      /(can|could) (you|someone) (help|assist) (me|us)/i,
      /(i|we) (need|want) (to|someone to) (help|assist) (me|us)/i,
      
      // Specific phrases
      /talk to (you|someone|a person|a real person)/i,
      /speak to (you|someone|a person|a real person)/i,
      /get in touch/i,
      /connect (me|us) (with|to) (someone|a person|an agent)/i,
    ]
    
    const isHumanContactRequest = humanContactPatterns.some(pattern => pattern.test(message))
    
    // Log detection for debugging
    if (isHumanContactRequest) {
      console.log('[HUMAN_CONTACT] Detected human contact request:', {
        message,
        leadId,
        conversationId: currentConversationId,
        matchedPattern: humanContactPatterns.find(p => p.test(message))?.toString(),
      })
    }

    // Call OpenAI
    const completion = await createChatCompletion(openAIMessages) as OpenAI.Chat.ChatCompletion
    let assistantResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.'

    // 1. Dynamic Form Data Extraction (Moved up to check for active forms)
    let hasActiveFormInThisTurn = false
    let formDataToReturn: ChatResponse['formData'] = undefined
    let matchedFormForRouting: { id: string; name: string; external_url?: string; use_mode?: string } | undefined
    let formCompletedForRouting: { formName: string; department?: Department } | undefined
    const conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [...openAIMessages, { role: 'assistant' as const, content: assistantResponse }]
    
    try {
      const { data: activeForms } = await supabaseAdmin
        .from('form_definitions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
      console.log('[FORM DEBUG] Chat route - Active forms:', activeForms?.length || 0, 'leadId:', leadId)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:97',message:'Active forms fetched in chat',data:{activeFormsCount:activeForms?.length||0,leadId,conversationId:currentConversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (activeForms && activeForms.length > 0) {
        // Check if eligibility query detected - auto-trigger eligibility forms inline
        const isEligibility = isEligibilityQuery(message)
        const isEligibilityForm = (form: any) => 
          form.name.toLowerCase().includes('eligibility') ||
          form.description.toLowerCase().includes('eligibility') ||
          form.name.toLowerCase().includes('qualify') ||
          form.description.toLowerCase().includes('qualify')

        for (const form of activeForms) {
          // Check use_mode: skip disabled forms, handle link forms differently
          const useMode = form.use_mode || 'inline' // Default to inline for backward compatibility
          
          // Skip disabled forms entirely
          if (useMode === 'disabled') {
            continue
          }
          
          const formMode = (form.form_mode || defaultFormMode) as 'conversational' | 'inline'
          const isEligibilityFormType = isEligibilityForm(form)
          
          // Check if this form matches the user's query
          const isRelatedToQuery = isFormTriggered(message, form.description, form.name)
          if (isRelatedToQuery) {
            matchedFormForRouting = {
              id: form.id,
              name: form.name,
              external_url: form.external_url,
              use_mode: useMode,
            }
          }
          
          // Handle link mode: if form matches, add external URL to response
          if (useMode === 'link' && isRelatedToQuery && form.external_url && !hasActiveFormInThisTurn) {
            assistantResponse = formatFormLinkMessage(effectiveLanguage, form.name, form.external_url)
            hasActiveFormInThisTurn = true // Prevent other forms from triggering
            break
          }
          
          // Auto-trigger eligibility forms inline when eligibility query detected
          if (useMode === 'inline' && isEligibility && isEligibilityFormType && !hasActiveFormInThisTurn) {
            const { data: submission } = await supabaseAdmin
              .from('form_submissions')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('lead_id', leadId)
              .eq('form_id', form.id)
              .maybeSingle()
            
            const existingAnswers = submission?.answers || {}
            const missingFields = form.fields.filter((f: any) => !existingAnswers[f.key])
            
            if (missingFields.length > 0) {
              // Force inline mode for eligibility forms
              formDataToReturn = {
                formId: form.id,
                formName: form.name,
                fields: form.fields,
                mode: 'inline'
              }
              assistantResponse = `I'll help you check your eligibility! Please fill out the form below:`
              hasActiveFormInThisTurn = true
              break
            }
          }
          
          // Check if specific form ID was requested via triggerFormId
          if (triggerFormId && form.id === triggerFormId && !hasActiveFormInThisTurn) {
            const { data: submission } = await supabaseAdmin
              .from('form_submissions')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('lead_id', leadId)
              .eq('form_id', form.id)
              .maybeSingle()
            
            const existingAnswers = submission?.answers || {}
            const missingFields = form.fields.filter((f: any) => !existingAnswers[f.key])
            
            if (missingFields.length > 0) {
              // Use inline mode if form is eligibility-related or if form mode is inline
              const useInline = isEligibilityFormType || formMode === 'inline'
              formDataToReturn = {
                formId: form.id,
                formName: form.name,
                fields: form.fields,
                mode: useInline ? 'inline' : 'conversational'
              }
              assistantResponse = useInline 
                ? `Please fill out the form below:`
                : assistantResponse
              hasActiveFormInThisTurn = true
              break
            }
          }
          
          // Check if user agreed to show inline form
          if (formMode === 'inline' && isAgreeingToForm && wasFormPermissionRequested && !hasActiveFormInThisTurn) {
            const { data: submission } = await supabaseAdmin
              .from('form_submissions')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('lead_id', leadId)
              .eq('form_id', form.id)
              .maybeSingle()
            
            const existingAnswers = submission?.answers || {}
            const missingFields = form.fields.filter((f: any) => !existingAnswers[f.key])
            
            if (missingFields.length > 0) {
              // Return form data to display inline form
              formDataToReturn = {
                formId: form.id,
                formName: form.name,
                fields: form.fields,
                mode: 'inline'
              }
              assistantResponse = `Great! Please fill out the form below:`
              hasActiveFormInThisTurn = true
              break
            }
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:104',message:'Form trigger check in chat handler',data:{formId:form.id,formName:form.name,isRelated:isRelatedToQuery,formMode,useMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          // Only process conversational forms if use_mode is inline (link forms already handled above)
          if (useMode === 'inline' && isRelatedToQuery && formMode === 'conversational') {
            // Only handle conversational forms here (inline handled above)
            console.log('[FORM DEBUG] Form triggered in chat route:', form.name, 'formId:', form.id)
            const formData = await extractFormData(conversationHistory, form.fields)
            console.log('[FORM DEBUG] Extracted form data:', Object.keys(formData), 'values:', formData)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:107',message:'Form data extracted',data:{formId:form.id,formName:form.name,extractedFieldsCount:Object.keys(formData).length,extractedFields:Object.keys(formData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Get current answers to merge
            const { data: existingSub } = await supabaseAdmin
              .from('form_submissions')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('lead_id', leadId)
              .eq('form_id', form.id)
              .single()

            const mergedAnswers = { ...(existingSub?.answers || {}), ...formData }
            const isCompleted = form.fields.every((f: any) => !!mergedAnswers[f.key])
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:117',message:'Form submission status check',data:{formId:form.id,formName:form.name,existingAnswersCount:Object.keys(existingSub?.answers||{}).length,mergedAnswersCount:Object.keys(mergedAnswers).length,isCompleted,requiredFieldsCount:form.fields.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            
            if (!isCompleted) {
              hasActiveFormInThisTurn = true
            }

            if (Object.keys(formData).length > 0) {
              const { data: upsertResult, error: upsertError } = await supabaseAdmin
                .from('form_submissions')
                .upsert({
                  tenant_id: tenantId,
                  lead_id: leadId,
                  form_id: form.id,
                  answers: mergedAnswers,
                  status: isCompleted ? 'completed' : 'in_progress'
                }, { onConflict: 'form_id,lead_id' })
                .select()
              console.log('[FORM DEBUG] Form submission saved:', { formId: form.id, formName: form.name, status: isCompleted ? 'completed' : 'in_progress', saved: !upsertError, error: upsertError?.message || null })
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:125',message:'Form submission saved',data:{formId:form.id,formName:form.name,status:isCompleted?'completed':'in_progress',saved:!upsertError,error:upsertError?.message||null,upsertResultCount:upsertResult?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              if (isCompleted) {
                await syncLeadFromAnswers(tenantId, leadId, mergedAnswers)
                formCompletedForRouting = {
                  formName: form.name,
                  department: inferDepartmentFromFormName(form.name),
                }
                const { data: leadRow } = await supabaseAdmin.from('leads').select('name, email').eq('tenant_id', tenantId).eq('id', leadId).single()
                const leadInfo = leadRow ? { name: leadRow.name, email: leadRow.email } : undefined

                // Send form data email if automation enabled
                if ((form as any).email_automation_enabled && (form as any).email_automation_recipients) {
                  sendFormSubmissionEmail(
                    form.name,
                    mergedAnswers,
                    (form as any).email_automation_recipients,
                    leadInfo
                  ).catch(err => console.error('Form submission email failed:', err))
                }

                // Create in-app notification
                createFormSubmissionNotification(
                  form.name,
                  leadInfo?.name,
                  leadInfo?.email,
                  form.id,
                  upsertResult?.[0]?.id
                ).catch(err => console.error('Failed to create notification:', err))

                // Send notification-only emails (no form data) if configured
                if ((form as any).notification_emails) {
                  sendFormNotificationEmail(
                    form.name,
                    (form as any).notification_emails,
                    leadInfo,
                    new Date()
                  ).catch(err => console.error('Form notification email failed:', err))
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:137',message:'Form handling error',data:{error:err instanceof Error?err.message:String(err),leadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Form handling failed:', err)
    }

    // Increment turn count
    turnCount++

    const branding = await getBrandingConfig(tenantId)
    const isEligibility = isEligibilityQuery(message)
    const formLinks = await getRelevantFormLinks(message, effectiveLanguage, tenantId)
    
    if (formLinks && !assistantResponse.includes('http')) {
      assistantResponse += formLinks
    }
    
    // Determine if booking CTA should be shown (ONLY if no active form)
    const isKnowledgeGap = relevantEntries.length === 0
    const shouldShowBooking = !hasActiveFormInThisTurn && (turnCount >= 3 || isCaseQuery || isEligibility || isKnowledgeGap) && branding.enable_booking_cta && branding.booking_url

    // Add booking CTA to response if needed (URL without parentheses so link stays clickable)
    if (shouldShowBooking && !assistantResponse.toLowerCase().includes('book') && !formLinks) {
      const ctaText = branding.booking_cta_text || 'Book a consultation'
      const bookingPrompts = {
        EN: `\n\nReady to take the next step? ${ctaText}: ${branding.booking_url}`,
        NL: `\n\nKlaar om de volgende stap te zetten? ${ctaText}: ${branding.booking_url}`,
        ES: `\n\n¿Listo para dar el siguiente paso? ${ctaText}: ${branding.booking_url}`,
        PA: `\n\nKla pa tuma e siguiente paso? ${ctaText}: ${branding.booking_url}`,
      }
      assistantResponse += bookingPrompts[effectiveLanguage] || bookingPrompts.EN
    }

    // Papiamentu correction layer: validate/correct PA responses with Buki di oro + official orthography
    if (effectiveLanguage === 'PA') {
      try {
        const paLocale = (settings as any).papiamentu_locale || 'pap-CW'
        const paLearning = (settings as any).papiamentu_learning ?? false
        const result = correctPapiamentu(assistantResponse, { locale: paLocale })
        assistantResponse = result.corrected
        if (process.env.NODE_ENV === 'development' && result.changes?.length) {
          console.log('[Papiamentu] corrections:', result.changes)
        }
        if ((paLearning || process.env.PAPIAMENTU_LEARNING_ENABLED === 'true') && result.changes?.length) {
          const contextSnippet = assistantResponse.slice(0, 200)
          for (const ch of result.changes) {
            void Promise.resolve(
              supabaseAdmin.from('papiamentu_corrections').insert({
                tenant_id: tenantId,
                from_text: ch.from,
                to_text: ch.to,
                change_type: ch.type,
                context: contextSnippet,
              })
            ).catch((err: unknown) => console.error('[Papiamentu] log correction failed:', err))
          }
        }
      } catch (e) {
        console.error('[Papiamentu] correction failed:', e)
      }
    }

    // Normalize URLs: unwrap (url) or [url] so links stay clickable
    assistantResponse = assistantResponse.replace(/\((https?:\/\/[^\s)]+)\)/g, '$1')
    assistantResponse = assistantResponse.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '$1')

    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date().toISOString(),
    }

    // Classify department and priority based on conversation content
    const allMessages = [...existingMessages, userMessage, assistantMessage]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    const department: Department = classifyDepartment(allMessages)
    const priority: Priority = classifyPriority(allMessages)

    const hasAcquisitionIntent =
      Boolean(formCompletedForRouting) ||
      detectAcquisitionIntentFromText(messageText) ||
      detectAcquisitionFromMessages(allMessages)

    if (hasAcquisitionIntent && currentConversationId) {
      markLeadAsAcquisition(supabaseAdmin, tenantId, identifiedLeadId, formCompletedForRouting ? 'form' : 'chat')
        .catch((err) => console.error('Failed to mark acquisition lead:', err))
      await supabaseAdmin
        .from('conversations')
        .update({ intent: 'sales' })
        .eq('id', currentConversationId)
    }

    const routingEval = await evaluateRouting({
      tenantId,
      message: messageText,
      messages: allMessages,
      kbEntryCount: relevantEntries.length,
      isHumanContactRequest,
      customerVerified: customerIdentified,
      matchedForm: matchedFormForRouting,
      formCompleted: formCompletedForRouting,
    })

    const finalDepartment = routingEval.department || department
    const finalPriority = routingEval.priority || priority
    const shouldEscalate = routingEval.shouldRoute

    // Append department portal link when configured (escalation or link-only routing)
    const actionUrl = routingEval.url
    if (
      actionUrl &&
      !hasActiveFormInThisTurn &&
      !assistantResponse.includes(actionUrl) &&
      routingEval.suggestedAction === 'link'
    ) {
      assistantResponse += `\n\n${formatDepartmentLinkMessage(effectiveLanguage, finalDepartment, actionUrl)}`
      assistantMessage.content = assistantResponse
    }

    // Update conversation in database
    const updatedMessages = [...existingMessages, userMessage, assistantMessage]

    await supabaseAdmin
      .from('conversations')
      .update({
        messages: updatedMessages,
        turn_count: turnCount,
        status: shouldEscalate ? 'escalated' : 'active',
        language: effectiveLanguage,
        department: finalDepartment,
        priority: finalPriority,
        routing_reason: routingEval.reason || undefined,
        customer_verified: customerIdentified || undefined,
        ...(shouldEscalate ? { routed_at: new Date().toISOString() } : {}),
      })
      .eq('id', currentConversationId)

    if (shouldEscalate && routingEval.reason) {
      await dispatchEscalation({
        tenantId,
        conversationId: currentConversationId!,
        leadId: identifiedLeadId,
        department: finalDepartment,
        priority: finalPriority,
        reason: routingEval.reason,
        messages: allMessages,
        customerVerified: customerIdentified,
        force: isHumanContactRequest,
      })
    }

    extractLeadMetadata(conversationHistory)
      .then(metadata => {
        if (Object.keys(metadata).length > 0) {
          return supabaseAdmin
            .from('leads')
            .update(metadata)
            .eq('tenant_id', tenantId)
            .eq('id', identifiedLeadId)
        }
      })
      .catch(err => console.error('Metadata extraction failed:', err))

    // Classify conversation intent (fire and forget) — promote to sales lead when confident
    classifyIntent(conversationHistory)
      .then(async ({ intent, confidence }) => {
        if (intent === 'sales' && confidence >= 0.55) {
          await markLeadAsAcquisition(supabaseAdmin, tenantId, identifiedLeadId, 'chat')
        }
        if (intent && currentConversationId) {
          const updateIntent =
            intent === 'sales' || hasAcquisitionIntent ? 'sales' : intent
          return supabaseAdmin
            .from('conversations')
            .update({ intent: updateIntent })
            .eq('id', currentConversationId)
        }
      })
      .catch(err => console.error('Intent classification failed:', err))

    // If high intent, sync to integrations (if enabled)
    if (shouldShowBooking) {
      // Get lead info
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', leadId)
        .single()

      // Sync to HubSpot only if enabled and not already synced
      if (isHubSpotEnabled && lead && !lead.synced_to_hubspot) {
        fetch(`${request.nextUrl.origin}/api/hubspot/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        }).catch(err => console.error('HubSpot sync failed (optional):', err))
      }

      // Calculate and update lead score (fire and forget)
      updateLeadScore(identifiedLeadId).catch(err => console.error('Lead scoring failed:', err))
    }

    const response: ChatResponse & { customerIdentified?: boolean; department?: string; priority?: string; leadId?: string; routed?: boolean } = {
      message: assistantResponse,
      conversationId: currentConversationId!,
      shouldShowBooking: Boolean(shouldShowBooking),
      turnCount,
      languageUsed: effectiveLanguage,
      formData: formDataToReturn,
      ...(customerIdentified && {
        customerIdentified: true,
        leadId: identifiedLeadId,
      }),
      ...(finalDepartment !== 'general' && { department: finalDepartment }),
      ...(finalPriority !== 'medium' && { priority: finalPriority }),
      ...(shouldEscalate && { routed: true }),
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in chat route:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process chat' },
      { status: 500 }
    )
  }
}
