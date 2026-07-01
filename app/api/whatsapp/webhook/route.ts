import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, markWhatsAppMessageRead, formatWhatsAppNumber } from '@/lib/whatsapp'
import { searchKnowledgeBaseWithFallback, buildContext, generateSystemPrompt, isCaseSpecific, detectLanguageFromText } from '@/lib/rag'
import { createChatCompletion } from '@/lib/openai'
import { updateLeadScore } from '@/lib/lead-scoring'
import { sanitizeForPrompt, checkRateLimit } from '@/lib/security'
import type { Message } from '@/lib/types'

// GET - Webhook verification (required by Meta)
export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Fetch verify token from database
  const { data: config } = await supabaseAdmin
    .from('whatsapp_config')
    .select('webhook_verify_token')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (mode === 'subscribe' && token === config?.webhook_verify_token) {
    console.log('WhatsApp webhook verified')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.error('WhatsApp webhook verification failed')
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  }
}

// POST - Receive incoming messages
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    // Log the webhook payload for debugging
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Check if this is a message event
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages || value.messages.length === 0) {
      // Not a message event (could be status update, etc.)
      return NextResponse.json({ success: true })
    }

    const message = value.messages[0]
    const from = message.from // Sender's WhatsApp phone number
    const messageId = message.id
    const rawMessageText = message.text?.body

    if (!rawMessageText) {
      // Not a text message (could be image, audio, etc.)
      return NextResponse.json({ success: true })
    }

    // Rate limiting: max 30 requests per minute per phone number
    const whRl = checkRateLimit(`whatsapp:${from}`, 30, 60_000)
    if (!whRl.allowed) {
      return NextResponse.json({ success: true }) // Silently drop for webhooks
    }

    // Sanitize user message against prompt injection
    const messageText = sanitizeForPrompt(rawMessageText)

    // Mark message as read
    markWhatsAppMessageRead(messageId).catch(console.error)

    // Format phone number
    const whatsappPhone = formatWhatsAppNumber(from)

    // Find or create lead based on WhatsApp phone number
    let lead = await findOrCreateLeadByWhatsApp(whatsappPhone)

    if (!lead) {
      await sendWhatsAppMessage(
        from,
        'Sorry, we encountered an error processing your message. Please try again later.'
      )
      return NextResponse.json({ success: false }, { status: 500 })
    }

    // Find or create conversation
    let conversation = await findActiveWhatsAppConversation(lead.id)
    const existingLanguage = conversation?.language as 'EN' | 'NL' | 'ES' | 'PA' | undefined
    // Detect language from message; fallback to existing conversation or EN
    const effectiveLanguage: 'EN' | 'NL' | 'ES' | 'PA' = detectLanguageFromText(messageText) || existingLanguage || 'EN'
    let turnCount = conversation?.turn_count || 0
    let existingMessages: Message[] = conversation?.messages || []

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          lead_id: lead.id,
          messages: [],
          turn_count: 0,
          status: 'active',
          language: effectiveLanguage,
          channel: 'whatsapp',
          whatsapp_message_id: messageId,
        })
        .select()
        .single()

      if (convError) throw convError
      conversation = newConv
    }

    // Perform RAG search
    const kbSearch = await searchKnowledgeBaseWithFallback(messageText, effectiveLanguage, 12)
    const relevantEntries = kbSearch.entries
    const context = buildContext(relevantEntries)
    const kbUsesForeignContent = relevantEntries.some(
      (e) => e.language && e.language !== effectiveLanguage
    )

    const isCaseQuery = isCaseSpecific(messageText)

    const systemPrompt = await generateSystemPrompt(context, effectiveLanguage, lead.id, messageText, undefined, {
      contextFromFallbackLanguages: kbSearch.usedFallback || kbUsesForeignContent,
      kbEntryCount: relevantEntries.length,
    })
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    const openAIMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...existingMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: messageText },
    ]

    // Call OpenAI
    const completion = await createChatCompletion(openAIMessages) as OpenAI.Chat.ChatCompletion
    let assistantResponse = completion.choices[0]?.message?.content || 
      'I apologize, but I could not generate a response. Please try again.'

    // Increment turn count
    turnCount++

    // Determine if booking CTA should be shown
    const shouldShowBooking = turnCount >= 3 || isCaseQuery

    // Add booking CTA to response if needed
    if (shouldShowBooking && !assistantResponse.toLowerCase().includes('book')) {
      const bookingPrompts: Record<string, string> = {
        EN: '\n\nReady to take the next step? Book a consultation: https://www.getprobooking.com/livinginparadise/Immigration-Advice',
        NL: '\n\nKlaar om de volgende stap te zetten? Boek een consultatie: https://www.getprobooking.com/livinginparadise/Immigration-Advice',
        ES: '\n\n¿Listo para dar el siguiente paso? Reserva una consulta: https://www.getprobooking.com/livinginparadise/Immigration-Advice',
        PA: '\n\nKla pa tuma e siguiente paso? Reservá un konsulta: https://www.getprobooking.com/livinginparadise/Immigration-Advice',
      }
      assistantResponse += bookingPrompts[effectiveLanguage] || bookingPrompts.EN
    }

    // Unwrap (url) / [url] so links stay clickable
    assistantResponse = assistantResponse.replace(/\((https?:\/\/[^\s)]+)\)/g, '$1')
    assistantResponse = assistantResponse.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '$1')

    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date().toISOString(),
    }

    // Update conversation in database (persist effective language)
    const updatedMessages = [...existingMessages, userMessage, assistantMessage]
    await supabaseAdmin
      .from('conversations')
      .update({
        messages: updatedMessages,
        turn_count: turnCount,
        status: shouldShowBooking ? 'escalated' : 'active',
        language: effectiveLanguage,
      })
      .eq('id', conversation.id)

    // If high intent, sync to HubSpot
    if (shouldShowBooking) {
      if (!lead.synced_to_hubspot) {
        // Trigger HubSpot sync (fire and forget)
        const origin = request.nextUrl.origin
        fetch(`${origin}/api/hubspot/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id }),
        }).catch(err => console.error('HubSpot sync failed:', err))
      }

      // Calculate and update lead score (fire and forget)
      updateLeadScore(lead.id).catch(err => console.error('Lead scoring failed:', err))
    }

    // Send response via WhatsApp
    const sendResult = await sendWhatsAppMessage(from, assistantResponse)

    if (!sendResult.success) {
      console.error('Failed to send WhatsApp message:', sendResult.error)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper: Find or create lead by WhatsApp phone
async function findOrCreateLeadByWhatsApp(whatsappPhone: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Try to find existing lead
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('whatsapp_phone', whatsappPhone)
      .single()

    if (existingLead) {
      return existingLead
    }

    // Create new lead
    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name: `WhatsApp User ${whatsappPhone.slice(-4)}`, // Placeholder name
        phone: whatsappPhone,
        whatsapp_phone: whatsappPhone,
        language: 'EN', // Default to English
        source: 'whatsapp',
        intent_level: 'low',
      })
      .select()
      .single()

    if (error) throw error

    // Sync to Mailchimp (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLead.name,
        phone: newLead.phone,
        language: newLead.language,
        source: 'whatsapp',
      }),
    }).catch(console.error)

    return newLead
  } catch (error) {
    console.error('Error finding/creating lead:', error)
    return null
  }
}

// Helper: Find active WhatsApp conversation for lead
async function findActiveWhatsAppConversation(leadId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('channel', 'whatsapp')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return data
  } catch (error) {
    return null
  }
}


