/**
 * Smart routing engine: when to escalate, which department, suggested action.
 */

import type { Department, Priority } from '@/lib/customer-matching'
import { classifyDepartment, classifyPriority } from '@/lib/customer-matching'
import { getRoutingConfig, getDepartmentUrl, type RoutingConfig } from '@/lib/routing-config'

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

function resolveActionUrl(
  config: RoutingConfig,
  department: string,
  matchedForm?: RoutingContext['matchedForm']
): string | undefined {
  const formUrl = matchedForm?.external_url?.trim()
  if (formUrl) return formUrl
  return getDepartmentUrl(config, department) || undefined
}

function resolveSuggestedAction(
  url: string | undefined,
  matchedForm?: RoutingContext['matchedForm'],
  fallback: SuggestedAction = 'human'
): SuggestedAction {
  if (url) return 'link'
  if (matchedForm?.id) return 'form'
  return fallback
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
    const url = resolveActionUrl(config, dept, ctx.matchedForm)
    return {
      shouldRoute: true,
      department: dept,
      priority: dept === 'claims' ? 'high' : priority,
      reason: `Form submitted: ${ctx.formCompleted.formName}`,
      suggestedAction: url ? 'link' : 'none',
      url,
      formId: ctx.matchedForm?.id,
    }
  }

  // Explicit human contact request
  if (ctx.isHumanContactRequest) {
    const url = resolveActionUrl(config, department, ctx.matchedForm)
    return {
      shouldRoute: true,
      department,
      priority: priority === 'medium' ? 'high' : priority,
      reason: 'Customer requested human assistance',
      suggestedAction: resolveSuggestedAction(url, ctx.matchedForm, 'human'),
      url,
      formId: ctx.matchedForm?.id,
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
    const url = resolveActionUrl(config, 'claims', ctx.matchedForm)
    return {
      shouldRoute: true,
      department: 'claims',
      priority: claimPriority,
      reason: isClaimIntent
        ? 'Insurance claim or incident detected'
        : 'Conversation classified as claims department',
      suggestedAction: resolveSuggestedAction(url, ctx.matchedForm, 'human'),
      formId: ctx.matchedForm?.id,
      url,
    }
  }

  // Billing urgent auto-route
  if (
    department === 'billing' &&
    config.routing_rules.auto_route_billing_urgent &&
    (priority === 'high' || priority === 'urgent') &&
    config.department_routing.billing?.auto_route
  ) {
    const url = resolveActionUrl(config, 'billing', ctx.matchedForm)
    return {
      shouldRoute: true,
      department: 'billing',
      priority,
      reason: 'Urgent billing issue detected',
      suggestedAction: resolveSuggestedAction(url, ctx.matchedForm, 'human'),
      url,
      formId: ctx.matchedForm?.id,
    }
  }

  // Sales registration intent + knowledge gap → route to sales
  if (
    isSalesIntent &&
    isKnowledgeGap &&
    config.routing_rules.knowledge_gap_route
  ) {
    const url = resolveActionUrl(config, 'sales', ctx.matchedForm)
    return {
      shouldRoute: true,
      department: 'sales',
      priority: 'medium',
      reason: 'Registration/sales intent with insufficient KB context',
      suggestedAction: resolveSuggestedAction(url, ctx.matchedForm, 'form'),
      formId: ctx.matchedForm?.id,
      url,
    }
  }

  // Sales registration with auto_route enabled
  if (
    isSalesIntent &&
    config.routing_rules.auto_route_sales_registration &&
    config.department_routing.sales?.auto_route
  ) {
    const url = resolveActionUrl(config, 'sales', ctx.matchedForm)
    return {
      shouldRoute: false,
      department: 'sales',
      priority,
      reason: 'Sales intent — guide to form or link',
      suggestedAction: resolveSuggestedAction(url, ctx.matchedForm, url ? 'link' : 'none'),
      formId: ctx.matchedForm?.id,
      url,
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

const DEPARTMENT_LINK_TEMPLATES: Record<string, Record<'EN' | 'NL' | 'ES' | 'PA', string>> = {
  claims: {
    EN: 'You can submit your claim here: {url}',
    NL: 'U kunt uw claim hier indienen: {url}',
    ES: 'Puede presentar su reclamación aquí: {url}',
    PA: 'Bo por entregá bo klaim aki: {url}',
  },
  sales: {
    EN: 'You can get a quote or apply here: {url}',
    NL: 'U kunt hier een offerte aanvragen of aanmelden: {url}',
    ES: 'Puede solicitar una cotización o registrarse aquí: {url}',
    PA: 'Bo por tuma un kotisashon òf apliká aki: {url}',
  },
  billing: {
    EN: 'You can manage billing here: {url}',
    NL: 'U kunt facturatie hier regelen: {url}',
    ES: 'Puede gestionar la facturación aquí: {url}',
    PA: 'Bo por maneha fakturashon aki: {url}',
  },
  support: {
    EN: 'You can reach our support team here: {url}',
    NL: 'U kunt hier contact opnemen met onze support: {url}',
    ES: 'Puede contactar a nuestro equipo de soporte aquí: {url}',
    PA: 'Bo por tuma kontakto ku nos soporte aki: {url}',
  },
  general: {
    EN: 'You can continue here: {url}',
    NL: 'U kunt hier verdergaan: {url}',
    ES: 'Puede continuar aquí: {url}',
    PA: 'Bo por kontinuá aki: {url}',
  },
}

/** Multilingual templates for department page / portal links */
export function formatDepartmentLinkMessage(
  language: 'EN' | 'NL' | 'ES' | 'PA',
  department: string,
  url: string
): string {
  const deptKey = department.toLowerCase()
  const template =
    DEPARTMENT_LINK_TEMPLATES[deptKey]?.[language] ||
    DEPARTMENT_LINK_TEMPLATES[deptKey]?.EN ||
    DEPARTMENT_LINK_TEMPLATES.general[language] ||
    DEPARTMENT_LINK_TEMPLATES.general.EN
  return template.replace('{url}', url)
}
