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
