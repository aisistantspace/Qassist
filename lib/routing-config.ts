/**
 * Load per-tenant routing configuration from integration_config.
 */

import { getSupabaseAdmin } from '@/lib/supabase'

export interface DepartmentConfig {
  email: string
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
  claims: { email: '', auto_route: true },
  support: { email: '', auto_route: false },
  sales: { email: '', auto_route: false },
  billing: { email: '', auto_route: true },
  general: { email: '', auto_route: false },
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
      department_routing: { ...DEFAULT_DEPARTMENT_ROUTING, ...(data?.department_routing || {}) },
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
