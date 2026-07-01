/**
 * Smart routing engine: when to escalate, which department, suggested action.
 */

import type { Department, Priority } from '@/lib/customer-matching'
import { classifyDepartment, classifyPriority } from '@/lib/customer-matching'
import { getRoutingConfig } from '@/lib/routing-config'

export type SuggestedAction = 'form' | 'link' | 'human' | 'none'

export interface RoutingEvaluation {
  shouldRoute: boolean
  department: Department
  priority: Priority
  reason: string
  suggestedAction: SuggestedAction
  formId?: string
  url?: string
}

export interface RoutingContext {
  tenantId: string
  message: string
  messages: { role: string; content: string }[]
  kbEntryCount: number
  isHumanContactRequest: boolean
  customerVerified: boolean
  formCompleted?: { formName: string; department?: Department }
  matchedForm?: { id: string; name: string; external_url?: string; use_mode?: string }
}

const SALES_INTENT_PATTERNS = [
  /\b(register|registr|inskrib|signup|sign.?up|inschrij)\b/i,
  /\b(buy|compra|kopen|kòmpr[aá]|purchase)\b/i,
  /\b(quote|cotiz|offerte|kotisashon|prèis|price)\b/i,
  /\b(new policy|pòlisa nobo|nieuwe polis)\b/i,
]

const CLAIM_INTENT_PATTERNS = [
  /\b(claim|klaim|reclam)\b/i,
  /\b(accident|aksidente|ongeluk)\b/i,
  /\b(damage|damag|daño|schade)\b/i,
  /\b(emergency|emergencia|noodgeval)\b/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

export async function evaluateRouting(ctx: RoutingContext): Promise<RoutingEvaluation> {
  const config = await getRoutingConfig(ctx.tenantId)
  const department = classifyDepartment(ctx.messages)
  const priority = classifyPriority(ctx.messages)
  const userText = ctx.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')

  const isClaimIntent = matchesAny(userText, CLAIM_INTENT_PATTERNS)
  const isSalesIntent = matchesAny(userText, SALES_INTENT_PATTERNS)
  const isKnowledgeGap = ctx.kbEntryCount === 0

  // Form completed → route to matching department
  if (ctx.formCompleted) {
    const dept = ctx.formCompleted.department || department
    return {
      shouldRoute: true,
      department: dept,
      priority: dept === 'claims' ? 'high' : priority,
      reason: `Form submitted: ${ctx.formCompleted.formName}`,
      suggestedAction: 'none',
    }
  }

  // Explicit human contact request
  if (ctx.isHumanContactRequest) {
    return {
      shouldRoute: true,
      department,
      priority: priority === 'medium' ? 'high' : priority,
      reason: 'Customer requested human assistance',
      suggestedAction: 'human',
    }
  }

  // Auto-route claims (accident, damage, claim keywords)
  if (
    (department === 'claims' || isClaimIntent) &&
    config.routing_rules.auto_route_claims &&
    (config.department_routing.claims?.auto_route !== false)
  ) {
    const claimPriority: Priority =
      priority === 'medium' && isClaimIntent ? 'urgent' : priority
    return {
      shouldRoute: true,
      department: 'claims',
      priority: claimPriority,
      reason: isClaimIntent
        ? 'Insurance claim or incident detected'
        : 'Conversation classified as claims department',
      suggestedAction: ctx.matchedForm?.id ? 'form' : 'human',
      formId: ctx.matchedForm?.id,
    }
  }

  // Billing urgent auto-route
  if (
    department === 'billing' &&
    config.routing_rules.auto_route_billing_urgent &&
    (priority === 'high' || priority === 'urgent') &&
    config.department_routing.billing?.auto_route
  ) {
    return {
      shouldRoute: true,
      department: 'billing',
      priority,
      reason: 'Urgent billing issue detected',
      suggestedAction: 'human',
    }
  }

  // Sales registration intent + knowledge gap → route to sales
  if (
    isSalesIntent &&
    isKnowledgeGap &&
    config.routing_rules.knowledge_gap_route
  ) {
    return {
      shouldRoute: true,
      department: 'sales',
      priority: 'medium',
      reason: 'Registration/sales intent with insufficient KB context',
      suggestedAction: ctx.matchedForm?.external_url ? 'link' : 'form',
      formId: ctx.matchedForm?.id,
      url: ctx.matchedForm?.external_url,
    }
  }

  // Sales registration with auto_route enabled
  if (
    isSalesIntent &&
    config.routing_rules.auto_route_sales_registration &&
    config.department_routing.sales?.auto_route
  ) {
    return {
      shouldRoute: false,
      department: 'sales',
      priority,
      reason: 'Sales intent — guide to form or link',
      suggestedAction: ctx.matchedForm?.external_url ? 'link' : ctx.matchedForm?.id ? 'form' : 'link',
      formId: ctx.matchedForm?.id,
      url: ctx.matchedForm?.external_url,
    }
  }

  return {
    shouldRoute: false,
    department,
    priority,
    reason: '',
    suggestedAction: 'none',
  }
}

/** Multilingual templates for external form links */
export function formatFormLinkMessage(
  language: 'EN' | 'NL' | 'ES' | 'PA',
  formName: string,
  url: string
): string {
  const templates: Record<string, string> = {
    EN: `You can complete our ${formName} here: ${url}`,
    NL: `U kunt ons ${formName} hier invullen: ${url}`,
    ES: `Puede completar nuestro ${formName} aquí: ${url}`,
    PA: `Bo por kompletá nos ${formName} aki: ${url}`,
  }
  return templates[language] || templates.EN
}
