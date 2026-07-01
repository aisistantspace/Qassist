/**
 * Load per-tenant routing configuration from integration_config.
 */

import { getSupabaseAdmin } from '@/lib/supabase'

export interface DepartmentConfig {
  email: string
  /** Customer-facing page (claim portal, quote app, department form, etc.) */
  url: string
  auto_route: boolean
}

export interface RoutingRules {
  auto_route_claims: boolean
  auto_route_sales_registration: boolean
  auto_route_billing_urgent: boolean
  knowledge_gap_route: boolean
}

export interface RoutingConfig {
  department_routing: Record<string, DepartmentConfig>
  routing_rules: RoutingRules
}

const DEFAULT_DEPARTMENT_ROUTING: Record<string, DepartmentConfig> = {
  claims: { email: '', url: '', auto_route: true },
  support: { email: '', url: '', auto_route: false },
  sales: { email: '', url: '', auto_route: false },
  billing: { email: '', url: '', auto_route: true },
  general: { email: '', url: '', auto_route: false },
}

function mergeDepartmentRouting(
  stored?: Record<string, Partial<DepartmentConfig>>
): Record<string, DepartmentConfig> {
  const merged: Record<string, DepartmentConfig> = { ...DEFAULT_DEPARTMENT_ROUTING }
  for (const key of Object.keys(DEFAULT_DEPARTMENT_ROUTING)) {
    merged[key] = { ...DEFAULT_DEPARTMENT_ROUTING[key], ...(stored?.[key] || {}) }
  }
  for (const [key, config] of Object.entries(stored || {})) {
    if (!merged[key]) {
      merged[key] = { email: '', url: '', auto_route: false, ...config }
    }
  }
  return merged
}

const DEFAULT_ROUTING_RULES: RoutingRules = {
  auto_route_claims: true,
  auto_route_sales_registration: false,
  auto_route_billing_urgent: true,
  knowledge_gap_route: false,
}

export async function getRoutingConfig(tenantId: string): Promise<RoutingConfig> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    let data: { department_routing?: Record<string, DepartmentConfig>; routing_rules?: RoutingRules } | null = null

    const { data: tenantRow } = await supabaseAdmin
      .from('integration_config')
      .select('department_routing, routing_rules')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    data = tenantRow

    if (!data) {
      const { data: fallback } = await supabaseAdmin
        .from('integration_config')
        .select('department_routing, routing_rules')
        .limit(1)
        .maybeSingle()
      data = fallback
    }

    return {
      department_routing: mergeDepartmentRouting(data?.department_routing),
      routing_rules: { ...DEFAULT_ROUTING_RULES, ...(data?.routing_rules || {}) },
    }
  } catch {
    return {
      department_routing: DEFAULT_DEPARTMENT_ROUTING,
      routing_rules: DEFAULT_ROUTING_RULES,
    }
  }
}

export function getDepartmentEmail(
  config: RoutingConfig,
  department: string
): string | null {
  const dept = config.department_routing[department]
  return dept?.email?.trim() || null
}

export function getDepartmentUrl(
  config: RoutingConfig,
  department: string
): string | null {
  const dept = config.department_routing[department]
  return dept?.url?.trim() || null
}
