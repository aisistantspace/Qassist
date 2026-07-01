/**
 * On-demand external customer API lookup (read-only).
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import type { CustomerIdentifiers } from '@/lib/customer-identity'

export interface CustomerLookupConfig {
  enabled: boolean
  api_url: string
  method: 'GET' | 'POST'
  auth_header: string
  auth_value: string
  request_field: 'email' | 'policy_number' | 'account_number' | 'phone'
  response_name_field: string
  response_policy_field: string
  response_status_field?: string
  timeout_ms: number
}

export interface ExternalCustomerRecord {
  name?: string
  email?: string
  policy_number?: string
  account_number?: string
  status?: string
  raw?: Record<string, unknown>
}

const DEFAULT_CONFIG: CustomerLookupConfig = {
  enabled: false,
  api_url: '',
  method: 'POST',
  auth_header: 'Authorization',
  auth_value: '',
  request_field: 'email',
  response_name_field: 'name',
  response_policy_field: 'policy_number',
  response_status_field: 'status',
  timeout_ms: 5000,
}

export async function getCustomerLookupConfig(tenantId: string): Promise<CustomerLookupConfig> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('integration_config')
      .select('customer_lookup_config')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.customer_lookup_config) {
      const { data: fallback } = await supabaseAdmin
        .from('integration_config')
        .select('customer_lookup_config')
        .limit(1)
        .maybeSingle()
      return { ...DEFAULT_CONFIG, ...(fallback?.customer_lookup_config || {}) }
    }
    return { ...DEFAULT_CONFIG, ...data.customer_lookup_config }
  } catch {
    return DEFAULT_CONFIG
  }
}

function pickIdentifier(
  ids: CustomerIdentifiers,
  field: CustomerLookupConfig['request_field']
): string | undefined {
  switch (field) {
    case 'email':
      return ids.email
    case 'policy_number':
      return ids.policy_number
    case 'account_number':
      return ids.account_number
    case 'phone':
      return ids.phone
    default:
      return ids.email
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes('.')) return obj[path]
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

/** Call external customer API; returns normalized record or null */
export async function lookupExternalCustomer(
  tenantId: string,
  identifiers: CustomerIdentifiers
): Promise<ExternalCustomerRecord | null> {
  const config = await getCustomerLookupConfig(tenantId)
  if (!config.enabled || !config.api_url) return null

  const lookupValue = pickIdentifier(identifiers, config.request_field)
  if (!lookupValue) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms || 5000)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (config.auth_header && config.auth_value) {
      headers[config.auth_header] = config.auth_value
    }

    let response: Response
    if (config.method === 'GET') {
      const url = new URL(config.api_url)
      url.searchParams.set(config.request_field, lookupValue)
      response = await fetch(url.toString(), { method: 'GET', headers, signal: controller.signal })
    } else {
      response = await fetch(config.api_url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ [config.request_field]: lookupValue }),
        signal: controller.signal,
      })
    }

    if (!response.ok) {
      console.warn('[CUSTOMER_LOOKUP] API returned', response.status)
      return null
    }

    const data = (await response.json()) as Record<string, unknown>
    const record = (data.customer || data.data || data) as Record<string, unknown>

    return {
      name: getNestedValue(record, config.response_name_field) as string | undefined,
      email: identifiers.email,
      policy_number: (getNestedValue(record, config.response_policy_field) as string) || identifiers.policy_number,
      account_number: identifiers.account_number,
      status: config.response_status_field
        ? (getNestedValue(record, config.response_status_field) as string)
        : undefined,
      raw: record,
    }
  } catch (err) {
    console.error('[CUSTOMER_LOOKUP] Failed:', err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
