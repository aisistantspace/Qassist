/**
 * Unified customer identity: extract identifiers, internal match, sync from forms.
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import {
  extractEmailFromText,
  extractPhoneFromText,
  findReturningCustomer,
  normalizePhone,
} from '@/lib/customer-matching'
import { lookupExternalCustomer } from '@/lib/integrations/customer-lookup'

export type IdentityMatchType = 'email' | 'phone' | 'name' | 'policy_number' | 'account_number'

export interface CustomerIdentifiers {
  name?: string
  email?: string
  phone?: string
  policy_number?: string
  account_number?: string
}

const LEAD_FIELD_KEYS: Record<string, keyof CustomerIdentifiers> = {
  name: 'name',
  full_name: 'name',
  fullname: 'name',
  nòmber: 'name',
  nomber: 'name',
  email: 'email',
  e_mail: 'email',
  phone: 'phone',
  telefoon: 'phone',
  telefon: 'phone',
  policy_number: 'policy_number',
  policy: 'policy_number',
  polis: 'policy_number',
  polisnummer: 'policy_number',
  pòlisa: 'policy_number',
  account_number: 'account_number',
  account: 'account_number',
  rekening: 'account_number',
}

/** Extract policy/account numbers from freeform text */
export function extractPolicyNumberFromText(text: string): string | null {
  const patterns = [
    /\b(?:policy|polis|pòlisa|poliza)\s*(?:#|no\.?|number|nòmber|nummer)?\s*:?\s*([A-Z0-9][-A-Z0-9]{4,20})\b/i,
    /\b(?:polis|policy)\s+([A-Z0-9][-A-Z0-9]{4,20})\b/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1].toUpperCase()
  }
  return null
}

export function extractAccountNumberFromText(text: string): string | null {
  const patterns = [
    /\b(?:account|rekening|cuenta)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9][-A-Z0-9]{4,20})\b/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1].toUpperCase()
  }
  return null
}

export function extractIdentifiersFromText(text: string): CustomerIdentifiers {
  return {
    email: extractEmailFromText(text) || undefined,
    phone: extractPhoneFromText(text) || undefined,
    policy_number: extractPolicyNumberFromText(text) || undefined,
    account_number: extractAccountNumberFromText(text) || undefined,
  }
}

export function normalizeFormAnswersToIdentifiers(
  answers: Record<string, unknown>
): CustomerIdentifiers {
  const out: CustomerIdentifiers = {}
  for (const [key, value] of Object.entries(answers)) {
    if (value == null || String(value).trim() === '') continue
    const mapped = LEAD_FIELD_KEYS[key.toLowerCase()]
    if (mapped) {
      out[mapped] = String(value).trim()
    }
  }
  return out
}

/** Find customer by email, phone, policy_number, or account_number */
export async function findCustomerByIdentifiers(
  tenantId: string,
  fields: CustomerIdentifiers
): Promise<{ lead: Record<string, unknown>; matchType: IdentityMatchType } | null> {
  const supabaseAdmin = getSupabaseAdmin()

  const emailMatch = await findReturningCustomer(tenantId, {
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
  })
  if (emailMatch) return emailMatch as { lead: Record<string, unknown>; matchType: IdentityMatchType }

  if (fields.policy_number) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('policy_number', fields.policy_number)
      .maybeSingle()
    if (data) return { lead: data, matchType: 'policy_number' }
  }

  if (fields.account_number) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('account_number', fields.account_number)
      .maybeSingle()
    if (data) return { lead: data, matchType: 'account_number' }
  }

  return null
}

/** Sync form/chat answers onto the leads row */
export async function syncLeadFromAnswers(
  tenantId: string,
  leadId: string,
  answers: Record<string, unknown>
): Promise<void> {
  const ids = normalizeFormAnswersToIdentifiers(answers)
  if (Object.keys(ids).length === 0) return

  const supabaseAdmin = getSupabaseAdmin()
  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('name, email, phone, policy_number, account_number, metadata')
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .maybeSingle()

  const update: Record<string, unknown> = {}
  const metadata = { ...(existing?.metadata || {}) }

  if (ids.name && (!existing?.name || existing.name === 'Anonymous User')) {
    update.name = ids.name
  }
  if (ids.email && (!existing?.email || existing.email.startsWith('anon-'))) {
    update.email = ids.email.toLowerCase()
  }
  if (ids.phone && !existing?.phone) {
    update.phone = ids.phone
  }
  if (ids.policy_number) {
    update.policy_number = ids.policy_number.toUpperCase()
    metadata.policy_number = ids.policy_number
  }
  if (ids.account_number) {
    update.account_number = ids.account_number.toUpperCase()
    metadata.account_number = ids.account_number
  }

  if (Object.keys(metadata).length > 0) {
    update.metadata = metadata
  }

  if (Object.keys(update).length === 0) return

  await supabaseAdmin
    .from('leads')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
}

/** Resolve identity from message: internal DB + optional external API */
export async function resolveCustomerIdentity(
  tenantId: string,
  currentLeadId: string,
  conversationId: string,
  messageText: string
): Promise<{
  identifiedLead: Record<string, unknown>
  matchType: IdentityMatchType
  wasAnonymous: boolean
  mergedLeadId: string
  externalEnriched?: boolean
} | null> {
  const extracted = extractIdentifiersFromText(messageText)
  if (!extracted.email && !extracted.phone && !extracted.policy_number && !extracted.account_number) {
    return null
  }

  const match = await findCustomerByIdentifiers(tenantId, extracted)
  const supabaseAdmin = getSupabaseAdmin()

  const { data: currentLead } = await supabaseAdmin
    .from('leads')
    .select('name, email')
    .eq('id', currentLeadId)
    .eq('tenant_id', tenantId)
    .single()

  const wasAnonymous =
    !currentLead ||
    currentLead.email?.startsWith('anon-') ||
    currentLead.name === 'Anonymous User'

  let mergedLeadId = currentLeadId
  let identifiedLead: Record<string, unknown> = currentLead || {}

  if (match && match.lead.id !== currentLeadId) {
    if (wasAnonymous) {
      await supabaseAdmin
        .from('conversations')
        .update({ lead_id: match.lead.id, customer_verified: true })
        .eq('id', conversationId)

      await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', currentLeadId)
        .eq('tenant_id', tenantId)

      mergedLeadId = match.lead.id as string
      identifiedLead = match.lead
    } else {
      await supabaseAdmin
        .from('conversations')
        .update({ customer_verified: true })
        .eq('id', conversationId)
      mergedLeadId = match.lead.id as string
      identifiedLead = match.lead
    }
  } else if (match) {
    await supabaseAdmin
      .from('conversations')
      .update({ customer_verified: true })
      .eq('id', conversationId)
    identifiedLead = match.lead
    mergedLeadId = match.lead.id as string
  } else {
    // No internal match — update current lead with extracted identifiers
    await syncLeadFromAnswers(tenantId, currentLeadId, extracted as Record<string, unknown>)
  }

  // External API lookup (on-demand)
  let externalEnriched = false
  const external = await lookupExternalCustomer(tenantId, extracted)
  if (external) {
    const meta = {
      ...((identifiedLead.metadata as Record<string, unknown>) || {}),
      external_customer: external,
      external_lookup_at: new Date().toISOString(),
    }
    await supabaseAdmin
      .from('leads')
      .update({ metadata: meta })
      .eq('tenant_id', tenantId)
      .eq('id', mergedLeadId)
    identifiedLead = { ...identifiedLead, metadata: meta }
    externalEnriched = true
    await supabaseAdmin
      .from('conversations')
      .update({ customer_verified: true })
      .eq('id', conversationId)
  }

  if (!match && !external) return null

  return {
    identifiedLead,
    matchType: match?.matchType || 'email',
    wasAnonymous,
    mergedLeadId,
    externalEnriched,
  }
}

export function formatCustomerContextForPrompt(lead: Record<string, unknown>): string {
  const ext = (lead.metadata as Record<string, unknown>)?.external_customer as Record<string, unknown> | undefined
  const parts: string[] = []
  if (lead.name && lead.name !== 'Anonymous User') parts.push(`Name: ${lead.name}`)
  if (lead.email && !String(lead.email).startsWith('anon-')) parts.push(`Email: ${lead.email}`)
  if (lead.phone) parts.push(`Phone: ${lead.phone}`)
  if (lead.policy_number) parts.push(`Policy: ${lead.policy_number}`)
  if (lead.account_number) parts.push(`Account: ${lead.account_number}`)
  if (ext) {
    if (ext.name) parts.push(`External record name: ${ext.name}`)
    if (ext.policy_number) parts.push(`External policy: ${ext.policy_number}`)
    if (ext.status) parts.push(`Status: ${ext.status}`)
  }
  return parts.join('. ')
}
