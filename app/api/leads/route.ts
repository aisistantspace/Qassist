import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantFromRequest, getTenantIdBySlug, DEFAULT_TENANT_ID } from '@/lib/tenant'
import { addContactToMailchimp } from '@/lib/mailchimp'
import { checkRateLimit, getClientIP, sanitizeInput } from '@/lib/security'
import { findReturningCustomer, getRecentConversation } from '@/lib/customer-matching'
import type { Lead } from '@/lib/types'
import { assertDemoChatAccess } from '@/lib/demo-auth'

// Check if Mailchimp integration is enabled
const isMailchimpEnabled = !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID)

export async function POST(request: NextRequest) {
  const demoDenied = assertDemoChatAccess(request)
  if (demoDenied) return demoDenied

  // Rate limiting: max 10 requests per minute per IP
  const clientIP = getClientIP(request)
  const rl = checkRateLimit(`leads:${clientIP}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body: Lead & { tenantId?: string; slug?: string } = await request.json()
    const { name, email, phone, consent, source_page, utm_params, tenantId: bodyTenantId, slug: bodySlug } = body
    const tenantId = bodyTenantId
      ? bodyTenantId
      : bodySlug
        ? (await getTenantIdBySlug(bodySlug))?.id ?? DEFAULT_TENANT_ID
        : (await getTenantFromRequest(request)).tenantId

    // For initial chat creation, we might not have name/email yet
    // If it's a full lead submission (consent is true), we still want to be careful
    // But for the lazy creation, we'll allow an empty name/email
    const isInitialCreation = !name && !email;
    
    if (!isInitialCreation && (!name || !email || !consent)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Sanitize input fields before storage
    const safeName = name ? sanitizeInput(name, 200) : ''
    const safeEmail = email ? sanitizeInput(email, 320) : ''
    const safePhone = phone ? sanitizeInput(phone, 30) : undefined

    // If it's an initial creation, we'll set a placeholder
    const finalName = safeName || 'Anonymous User';
    const finalEmail = safeEmail || `anon-${Date.now()}@temp.com`;
    const finalConsent = consent ?? true; // Default to true for chat sessions

    // Multi-field customer matching: email, phone, then name + partial field
    if (!isInitialCreation) {
      const match = await findReturningCustomer(tenantId, {
        name: safeName || undefined,
        email: safeEmail || undefined,
        phone: safePhone || undefined,
      })

      if (match) {
        // Update lead fields if they were missing (e.g. phone was added)
        const updates: Record<string, any> = {}
        if (safePhone && !match.lead.phone) updates.phone = safePhone
        if (safeName && match.lead.name === 'Anonymous User') updates.name = safeName
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('leads').update(updates).eq('id', match.lead.id)
          Object.assign(match.lead, updates)
        }

        // Load most recent conversation for resumption
        const recentConversation = await getRecentConversation(match.lead.id, tenantId)

        return NextResponse.json({
          success: true,
          lead: match.lead,
          existed: true,
          matchType: match.matchType,
          recentConversation: recentConversation
            ? { id: recentConversation.id, messages: recentConversation.messages, updatedAt: recentConversation.updatedAt, status: recentConversation.status }
            : null,
        })
      }
    }

    const { data: newLead, error: dbError } = await supabaseAdmin
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name: finalName,
        email: finalEmail,
        phone: safePhone,
        consent: finalConsent,
        source_page,
        utm_params: utm_params || {},
        tags: isInitialCreation ? ['Chat-Draft'] : [],
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Sync to Mailchimp only if enabled (fire and forget - don't wait)
    if (isMailchimpEnabled) {
      addContactToMailchimp({
        email: safeEmail,
        name: safeName,
        phone: safePhone,
        tags: ['AI-Chat-Lead'],
        sourcePage: source_page,
        utmParams: utm_params,
      })
        .then(() => {
          supabaseAdmin
            .from('leads')
            .update({ synced_to_mailchimp: true })
            .eq('tenant_id', tenantId)
            .eq('id', newLead.id)
        })
        .catch(err => console.error('Mailchimp sync failed (optional):', err))
    }

    return NextResponse.json({ success: true, lead: newLead })
  } catch (error: any) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create lead' },
      { status: 500 }
    )
  }
}


