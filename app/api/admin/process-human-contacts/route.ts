import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyHumanContactRequest } from '@/lib/email'

/**
 * Retroactively process all conversations to detect human contact requests
 * This endpoint scans existing conversations and marks leads as hot if human contact was requested
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const { leadId, conversationId, sendEmails = false } = body

    // Human contact detection patterns (same as in chat route)
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

    let query = supabaseAdmin
      .from('conversations')
      .select('id, lead_id, messages, created_at, lead:leads(id, name, email, phone, lead_score)')

    // If specific conversation or lead requested, filter
    if (conversationId) {
      query = query.eq('id', conversationId)
    } else if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error('[RETROACTIVE] Error fetching conversations:', error)
      throw error
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conversations found',
        processed: 0,
        detected: 0,
      })
    }

    console.log(`[RETROACTIVE] Processing ${conversations.length} conversation(s)`)

    let processed = 0
    let detected = 0
    const results: Array<{
      conversationId: string
      leadId: string
      detected: boolean
      message?: string
      error?: string
    }> = []

    for (const conversation of conversations) {
      try {
        const messages = conversation.messages || []
        const lead = (conversation as any).lead

        if (!lead) {
          console.warn(`[RETROACTIVE] No lead found for conversation ${conversation.id}`)
          continue
        }

        // Check each user message for human contact requests
        let foundRequest = false
        let requestMessage = ''

        for (const msg of messages) {
          if (msg.role === 'user' && msg.content) {
            const isHumanContactRequest = humanContactPatterns.some(pattern => 
              pattern.test(msg.content)
            )

            if (isHumanContactRequest) {
              foundRequest = true
              requestMessage = msg.content
              break
            }
          }
        }

        if (foundRequest) {
          console.log(`[RETROACTIVE] Human contact detected in conversation ${conversation.id} for lead ${lead.id}`)
          
          // Check if already processed
          const { data: existingEvent } = await supabaseAdmin
            .from('event_logs')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('event_type', 'human_contact_requested')
            .limit(1)
            .maybeSingle()

          if (existingEvent) {
            console.log(`[RETROACTIVE] Already processed for lead ${lead.id}, skipping`)
            results.push({
              conversationId: conversation.id,
              leadId: lead.id,
              detected: true,
              message: 'Already processed',
            })
            continue
          }

          // Mark lead as hot (ensure score >= 70)
          const oldScore = lead.lead_score || 0
          const newScore = Math.max(70, oldScore)

          const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({ lead_score: newScore })
            .eq('id', lead.id)

          if (updateError) {
            console.error(`[RETROACTIVE] Error updating lead ${lead.id}:`, updateError)
            results.push({
              conversationId: conversation.id,
              leadId: lead.id,
              detected: true,
              error: updateError.message,
            })
            continue
          }

          // Log the event
          const { error: logError } = await supabaseAdmin
            .from('event_logs')
            .insert({
              lead_id: lead.id,
              event_type: 'human_contact_requested',
              metadata: {
                message: requestMessage,
                timestamp: new Date().toISOString(),
                detected_at: new Date().toISOString(),
                retroactive: true,
              },
            })

          if (logError) {
            console.error(`[RETROACTIVE] Error logging event for lead ${lead.id}:`, logError)
          }

          // Send email notification if requested
          if (sendEmails) {
            const recentMessages = messages.slice(-5).map((m: any) => 
              `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            ).join('\n')
            const conversationContext = `Recent conversation:\n${recentMessages}\n\nUser message: ${requestMessage}`

            await notifyHumanContactRequest(
              lead.name || 'Unknown',
              lead.email || '',
              lead.phone || null,
              conversationContext,
              lead.id
            ).catch(err => console.error(`[RETROACTIVE] Email notification failed for lead ${lead.id}:`, err))
          }

          detected++
          results.push({
            conversationId: conversation.id,
            leadId: lead.id,
            detected: true,
            message: `Lead marked as hot (score: ${oldScore} -> ${newScore})`,
          })
        } else {
          results.push({
            conversationId: conversation.id,
            leadId: lead.id,
            detected: false,
          })
        }

        processed++
      } catch (error: any) {
        console.error(`[RETROACTIVE] Error processing conversation ${conversation.id}:`, error)
        results.push({
          conversationId: conversation.id,
          leadId: (conversation as any).lead?.id || 'unknown',
          detected: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} conversation(s), detected ${detected} human contact request(s)`,
      processed,
      detected,
      results,
    })
  } catch (error: any) {
    console.error('[RETROACTIVE] Error processing human contacts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process human contacts',
      },
      { status: 500 }
    )
  }
}
