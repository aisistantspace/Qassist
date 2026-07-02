/**
 * Leads = people trying to acquire a product or service (sales intent),
 * not every anonymous chat visitor or general information seeker.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const ACQUISITION_TAG = 'Acquisition'
export const FORM_SUBMITTED_TAG = 'Form-Submitted'
export const CHAT_DRAFT_TAG = 'Chat-Draft'

const ACQUISITION_MESSAGE_PATTERNS: RegExp[] = [
  /\b(quote|kotisashon|offerte|cotizaci[oó]n|prèis|premium|premie)\b/i,
  /\b(get a quote|request a quote|offerte aanvragen|pedir (una )?cotizaci[oó]n)\b/i,
  /\b(buy|purchase|kòmpr[aá]|kopen|comprar|inschrij|register|signup|sign.?up|afsluiten|aanvragen)\b/i,
  /\b(new policy|pòlisa nobo|nieuwe polis|nueva p[oó]liza)\b/i,
  /\b(i want to|i'd like to|i need to).*(buy|purchase|quote|register|sign up|policy|insurance|verzekering|seguro)\b/i,
  /\b(ik wil|ik wil graag|ik wou).*(afsluiten|kopen|aanvragen|inschrijven|offerte|verzekering|polis)\b/i,
  /\b(mi ke|mi ta ke).*(kumpr[aá]|kòmpr[aá]|inskrib|registr|kotisashon|seguro|pòlisa)\b/i,
  /\b(take out|afsluiten).*(insurance|verzekering|seguro|polis|policy)\b/i,
  /\b(apply for|aanvragen).*(insurance|verzekering|policy|polis|seguro)\b/i,
  /\b(how much|wat kost|kwanto|price for|kosten van).*(insurance|verzekering|seguro|policy|polis)\b/i,
  /\binterested in (getting|buying|purchasing)\b/i,
  /\bgeinteresseerd in\b/i,
]

export function detectAcquisitionIntentFromText(text: string): boolean {
  if (!text?.trim()) return false
  return ACQUISITION_MESSAGE_PATTERNS.some((p) => p.test(text))
}

export function detectAcquisitionFromMessages(
  messages: { role: string; content: string }[]
): boolean {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n')
  return detectAcquisitionIntentFromText(userText)
}

export interface AcquisitionLeadCheck {
  tags?: string[] | null
  latestIntent?: string | null
  status?: string | null
  hasCompletedForm?: boolean
  name?: string | null
  email?: string | null
}

/** True when this record belongs on the Leads (sales pipeline) page. */
export function isAcquisitionLead(input: AcquisitionLeadCheck): boolean {
  const tags = input.tags || []

  if (tags.includes(ACQUISITION_TAG) || tags.includes(FORM_SUBMITTED_TAG)) {
    return true
  }
  if (input.hasCompletedForm) return true
  if (input.latestIntent === 'sales') return true
  if (input.status && ['qualified', 'booked', 'contacted'].includes(input.status)) {
    return true
  }

  // General info / support only — not a sales lead
  if (input.latestIntent === 'inquiry' || input.latestIntent === 'service') {
    return false
  }

  // Anonymous chat starter with no acquisition signal
  const isAnonymous =
    (!input.name || input.name === 'Anonymous User') &&
    (!input.email || input.email.includes('@temp.com') || input.email.startsWith('anon-'))
  if (tags.includes(CHAT_DRAFT_TAG) && isAnonymous) {
    return false
  }

  return false
}

export async function markLeadAsAcquisition(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  leadId: string,
  source: 'chat' | 'form' | 'quote'
): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('tags, status')
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .maybeSingle()

  if (!lead) return

  const tags = new Set<string>(lead.tags || [])
  tags.delete(CHAT_DRAFT_TAG)
  tags.add(ACQUISITION_TAG)
  if (source === 'form') tags.add(FORM_SUBMITTED_TAG)

  await supabaseAdmin
    .from('leads')
    .update({
      tags: [...tags],
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
}
