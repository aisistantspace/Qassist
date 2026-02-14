import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * Normalize a phone number for comparison.
 * Strips spaces, dashes, parentheses, dots.
 * Handles Curacao formats: +5999, 005999, 5999, 09, etc.
 */
export function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  let normalized = phone.replace(/[\s\-().]/g, '')
  // Remove leading + and country code variations
  if (normalized.startsWith('+')) normalized = normalized.slice(1)
  if (normalized.startsWith('00')) normalized = normalized.slice(2)
  // If it starts with 5999 (Curacao country+area), keep last 7 digits
  if (normalized.startsWith('5999') && normalized.length >= 11) {
    normalized = normalized.slice(-7)
  }
  // If it starts with 09 or 9 (local Curacao), keep last 7 digits
  if (normalized.startsWith('09') && normalized.length >= 8) {
    normalized = normalized.slice(-7)
  }
  if (normalized.startsWith('9') && normalized.length >= 7 && normalized.length <= 8) {
    normalized = normalized.slice(-7)
  }
  return normalized
}

/**
 * Extract the last 4 digits of a phone number for fuzzy matching.
 */
function phoneLast4(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-4)
}

/**
 * Find a returning customer by multi-field matching.
 * Priority: 1) exact email  2) exact phone (normalized)  3) name + partial match
 * All matches are scoped to the given tenant.
 */
export async function findReturningCustomer(
  tenantId: string,
  fields: { name?: string; email?: string; phone?: string }
): Promise<{ lead: any; matchType: 'email' | 'phone' | 'name' } | null> {
  const supabaseAdmin = getSupabaseAdmin()

  // Priority 1: Exact email match
  if (fields.email && !fields.email.startsWith('anon-')) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', fields.email)
      .maybeSingle()

    if (data) return { lead: data, matchType: 'email' }
  }

  // Priority 2: Phone match (normalized)
  if (fields.phone) {
    const normalizedInput = normalizePhone(fields.phone)
    if (normalizedInput.length >= 7) {
      // Fetch leads with phone numbers for this tenant and compare normalized
      const { data: leadsWithPhone } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('phone', 'is', null)
        .limit(200)

      if (leadsWithPhone) {
        for (const lead of leadsWithPhone) {
          if (lead.phone && normalizePhone(lead.phone) === normalizedInput) {
            return { lead, matchType: 'phone' }
          }
        }
      }

      // Also check whatsapp_phone
      const { data: leadsWithWA } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('whatsapp_phone', 'is', null)
        .limit(200)

      if (leadsWithWA) {
        for (const lead of leadsWithWA) {
          if (lead.whatsapp_phone && normalizePhone(lead.whatsapp_phone) === normalizedInput) {
            return { lead, matchType: 'phone' }
          }
        }
      }
    }
  }

  // Priority 3: Name match + partial field confirmation
  // Only if we have a name AND at least one other field to cross-reference
  if (fields.name && fields.name.trim().length > 2) {
    const nameLower = fields.name.trim().toLowerCase()

    // Search by name (case-insensitive via ilike)
    const { data: nameMatches } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('name', nameLower)
      .limit(10)

    if (nameMatches && nameMatches.length > 0) {
      for (const lead of nameMatches) {
        // Confirm with email domain match
        if (fields.email && lead.email && !lead.email.startsWith('anon-')) {
          const inputDomain = fields.email.split('@')[1]?.toLowerCase()
          const leadDomain = lead.email.split('@')[1]?.toLowerCase()
          if (inputDomain && leadDomain && inputDomain === leadDomain) {
            return { lead, matchType: 'name' }
          }
        }
        // Confirm with phone last 4 digits
        if (fields.phone && lead.phone) {
          if (phoneLast4(fields.phone) === phoneLast4(lead.phone)) {
            return { lead, matchType: 'name' }
          }
        }
      }
    }
  }

  return null
}

/**
 * Get the most recent conversation for a lead.
 * Returns the conversation with its messages, or null.
 */
export async function getRecentConversation(
  leadId: string,
  tenantId: string
): Promise<{ id: string; messages: any[]; updatedAt: string; status: string; language: string } | null> {
  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id, messages, updated_at, status, language')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    messages: data.messages || [],
    updatedAt: data.updated_at,
    status: data.status,
    language: data.language,
  }
}

/**
 * Build a short summary of a previous conversation for system prompt injection.
 * Extracts key user messages to give the AI context about prior interactions.
 */
export function summarizeConversation(messages: any[], maxLength: number = 500): string {
  if (!messages || messages.length === 0) return ''

  // Extract user messages to understand what they asked about
  const userMessages = messages
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content)

  // Extract last assistant response for context
  const lastAssistant = messages
    .filter((m: any) => m.role === 'assistant')
    .pop()

  const topics = userMessages.slice(0, 5).join(' | ')
  const lastResponse = lastAssistant?.content?.slice(0, 200) || ''

  let summary = `Customer previously asked about: ${topics}`
  if (lastResponse) {
    summary += `. Last response covered: ${lastResponse}`
  }

  return summary.slice(0, maxLength)
}

/**
 * Determine if a conversation is recent enough to resume directly.
 * Returns true if the conversation was updated within the given hours and is still active.
 */
export function isResumable(updatedAt: string, status: string, withinHours: number = 24): boolean {
  if (status !== 'active') return false
  const updated = new Date(updatedAt)
  const now = new Date()
  const diffMs = now.getTime() - updated.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= withinHours
}

// ---------------------------------------------------------------------------
// Mid-chat customer identification
// ---------------------------------------------------------------------------

/**
 * Extract email addresses from freeform text (user chat messages).
 * Returns the first valid-looking email found, or null.
 */
export function extractEmailFromText(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  if (!matches || matches.length === 0) return null
  // Filter out obvious non-emails (temp/anon patterns)
  const real = matches.find(m => !m.startsWith('anon-') && !m.endsWith('@temp.com'))
  return real?.toLowerCase() || null
}

/**
 * Extract phone numbers from freeform text.
 * Returns the first valid-looking phone found, or null.
 */
export function extractPhoneFromText(text: string): string | null {
  // Match common phone patterns: +5999..., (599)9..., 5999-..., digits with dashes/spaces
  const phoneRegex = /(?:\+?[\d]{1,4}[\s\-.]?)?(?:\(?\d{1,4}\)?[\s\-.]?)?[\d][\d\s\-.]{5,14}\d/g
  const matches = text.match(phoneRegex)
  if (!matches || matches.length === 0) return null
  // Find the longest match (most likely a full phone number)
  const best = matches.reduce((a, b) => a.replace(/\D/g, '').length >= b.replace(/\D/g, '').length ? a : b)
  const digits = best.replace(/\D/g, '')
  // Must be at least 7 digits to be a real phone
  if (digits.length < 7) return null
  return best.trim()
}

/**
 * Mid-chat customer identification: When a customer provides their email or phone
 * during conversation, look them up and merge with the current anonymous lead.
 * Returns the identified customer lead and match type, or null.
 */
export async function identifyCustomerMidChat(
  tenantId: string,
  currentLeadId: string,
  conversationId: string,
  messageText: string,
): Promise<{
  identifiedLead: any
  matchType: 'email' | 'phone' | 'name'
  wasAnonymous: boolean
  mergedLeadId: string
} | null> {
  const supabaseAdmin = getSupabaseAdmin()

  // Extract potential identifiers from message
  const extractedEmail = extractEmailFromText(messageText)
  const extractedPhone = extractPhoneFromText(messageText)

  if (!extractedEmail && !extractedPhone) return null

  // Look up existing customer
  const match = await findReturningCustomer(tenantId, {
    email: extractedEmail || undefined,
    phone: extractedPhone || undefined,
  })

  if (!match) return null

  // Check if the current lead is anonymous
  const { data: currentLead } = await supabaseAdmin
    .from('leads')
    .select('name, email')
    .eq('id', currentLeadId)
    .eq('tenant_id', tenantId)
    .single()

  const wasAnonymous = !currentLead || currentLead.email?.startsWith('anon-') || currentLead.name === 'Anonymous User'

  // If the found customer is DIFFERENT from the current lead, we need to merge
  if (match.lead.id !== currentLeadId) {
    if (wasAnonymous) {
      // Re-point the conversation from anonymous lead to the real customer
      await supabaseAdmin
        .from('conversations')
        .update({ lead_id: match.lead.id, customer_verified: true })
        .eq('id', conversationId)

      // Clean up the anonymous lead (delete or mark it)
      await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', currentLeadId)
        .eq('tenant_id', tenantId)
        .eq('email', currentLead?.email || '') // safety: only delete if still anonymous

      console.log(`[CUSTOMER_ID] Merged anonymous lead ${currentLeadId} -> existing customer ${match.lead.id} (${match.matchType})`)

      return {
        identifiedLead: match.lead,
        matchType: match.matchType,
        wasAnonymous: true,
        mergedLeadId: match.lead.id,
      }
    } else {
      // Current lead is not anonymous but different - just flag the conversation
      await supabaseAdmin
        .from('conversations')
        .update({ customer_verified: true })
        .eq('id', conversationId)

      return {
        identifiedLead: match.lead,
        matchType: match.matchType,
        wasAnonymous: false,
        mergedLeadId: match.lead.id,
      }
    }
  } else {
    // Same lead - just mark as verified
    await supabaseAdmin
      .from('conversations')
      .update({ customer_verified: true })
      .eq('id', conversationId)

    return {
      identifiedLead: match.lead,
      matchType: match.matchType,
      wasAnonymous: false,
      mergedLeadId: match.lead.id,
    }
  }
}

// ---------------------------------------------------------------------------
// Department classification
// ---------------------------------------------------------------------------

export type Department = 'claims' | 'support' | 'sales' | 'billing' | 'general'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

const DEPARTMENT_PATTERNS: Record<Department, RegExp[]> = {
  claims: [
    /\b(accident|aksidente|ongeluk|accidente)\b/i,
    /\b(claim|klaim|reclamación|reclamacion)\b/i,
    /\b(damage|damag|daño|schade)\b/i,
    /\b(stolen|robá|gestolen|robado)\b/i,
    /\b(theft|ladron|diefstal|robo)\b/i,
    /\b(loss|pérdida|verlies)\b/i,
    /\b(crash|choque|botsing)\b/i,
    /\b(injury|herida|verwonding|lesion)\b/i,
    /\b(emergency|emergencia|noodgeval|emergensia)\b/i,
    /\b(totaled|total loss|pèrdida total)\b/i,
    /\b(fire|candela|brand|fuego|incendio)\b/i,
    /\b(flood|inundación|overstroming|inundashon)\b/i,
    /\b(break.?in|inbraak|robo)\b/i,
  ],
  support: [
    /\b(help|ayuda|hulp|yuda)\b/i,
    /\b(issue|problema|probleem)\b/i,
    /\b(not working|no ta traha|werkt niet|no funciona)\b/i,
    /\b(broken|roto|kapot|kibr[áa])\b/i,
    /\b(fix|arregla|repareer|drecha)\b/i,
    /\b(error|fout|falta)\b/i,
    /\b(trouble|moeilijk)\b/i,
    /\b(complaint|klacht|queja|keho)\b/i,
    /\b(cancel|cancelar|annuleer|kansela)\b/i,
    /\b(change|cambio|wijzig|kambia)\b/i,
    /\b(update|actualiza|bijwerk)\b/i,
  ],
  sales: [
    /\b(buy|compra|kopen|kòmpr[aá])\b/i,
    /\b(purchase|aankoop|adquirir)\b/i,
    /\b(quote|cotización|offerte|kotisashon)\b/i,
    /\b(price|precio|prijs|prèis)\b/i,
    /\b(plan|pòlisa|polis|poliza)\b/i,
    /\b(coverage|cobertura|dekking|kobertura)\b/i,
    /\b(new policy|nueva póliza|nieuwe polis|pòlisa nobo)\b/i,
    /\b(interest|interés|geïnteresseerd|interes)\b/i,
    /\b(sign.?up|registra|inschrijv|registr[áa])\b/i,
    /\b(how much|cuánto|hoeveel|kuantu)\b/i,
    /\b(offer|oferta|aanbieding|ofresé)\b/i,
  ],
  billing: [
    /\b(payment|pago|betaling|pago)\b/i,
    /\b(invoice|factura|factuur|faktura)\b/i,
    /\b(bill|cuenta|rekening)\b/i,
    /\b(refund|reembolso|terugbetaling|devolvé)\b/i,
    /\b(charge|cobro|kosten)\b/i,
    /\b(premium|premie|prima)\b/i,
    /\b(overdue|vencido|achterstallig|atras[áa])\b/i,
    /\b(receipt|recibo|ontvangstbewijs|resibo)\b/i,
    /\b(balance|saldo|balans)\b/i,
  ],
  general: [],
}

const PRIORITY_PATTERNS: { priority: Priority; patterns: RegExp[] }[] = [
  {
    priority: 'urgent',
    patterns: [
      /\b(accident|aksidente|ongeluk|accidente)\b/i,
      /\b(emergency|emergencia|noodgeval|emergensia)\b/i,
      /\b(urgent|urgente|dringend|urgen)\b/i,
      /\b(immediately|inmediatamente|onmiddellijk|mes ora)\b/i,
      /\b(right now|ahora mismo|nu meteen|awor mes)\b/i,
      /\b(asap|lo antes posible|zo snel mogelijk)\b/i,
      /\b(crash|choque|botsing)\b/i,
      /\b(fire|candela|brand|fuego|incendio)\b/i,
      /\b(injury|herida|verwonding|lesion)\b/i,
    ],
  },
  {
    priority: 'high',
    patterns: [
      /\b(stolen|robá|gestolen|robado)\b/i,
      /\b(damage|daño|schade|damag)\b/i,
      /\b(claim|klaim|reclamación)\b/i,
      /\b(complaint|klacht|queja|keho)\b/i,
      /\b(not working|no ta traha|werkt niet)\b/i,
      /\b(payment (failed|error|problem|issue))\b/i,
      /talk to .*(human|person|agent|representative)/i,
      /speak .*(human|person|agent|representative)/i,
    ],
  },
]

/**
 * Classify which department a conversation should be routed to
 * based on the full message history and current message.
 */
export function classifyDepartment(messages: { role: string; content: string }[]): Department {
  // Combine all user messages for pattern matching
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')

  let topDept: Department = 'general'
  let topScore = 0

  for (const [dept, patterns] of Object.entries(DEPARTMENT_PATTERNS) as [Department, RegExp[]][]) {
    if (dept === 'general') continue
    const score = patterns.filter(p => p.test(userText)).length
    if (score > topScore) {
      topScore = score
      topDept = dept
    }
  }

  return topDept
}

/**
 * Classify the priority level of a conversation based on message content.
 */
export function classifyPriority(messages: { role: string; content: string }[]): Priority {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')

  for (const { priority, patterns } of PRIORITY_PATTERNS) {
    if (patterns.some(p => p.test(userText))) {
      return priority
    }
  }

  return 'medium'
}

/**
 * Build a structured escalation context for human agent handoff.
 * Contains everything a human agent needs to pick up the conversation.
 */
export function buildEscalationContext(
  lead: any,
  messages: { role: string; content: string }[],
  department: Department,
  priority: Priority,
  customerVerified: boolean,
): {
  customerName: string
  customerEmail: string
  customerPhone: string | null
  department: Department
  priority: Priority
  customerVerified: boolean
  conversationSummary: string
  lastUserMessage: string
  turnCount: number
} {
  const userMessages = messages.filter(m => m.role === 'user')
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || ''
  const summary = summarizeConversation(messages, 800)

  return {
    customerName: lead?.name || 'Unknown',
    customerEmail: lead?.email || '',
    customerPhone: lead?.phone || null,
    department,
    priority,
    customerVerified,
    conversationSummary: summary,
    lastUserMessage: lastUserMsg,
    turnCount: userMessages.length,
  }
}
