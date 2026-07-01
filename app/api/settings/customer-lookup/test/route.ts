import { NextRequest, NextResponse } from 'next/server'
import type { CustomerLookupConfig } from '@/lib/integrations/customer-lookup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = body.customer_lookup_config as CustomerLookupConfig
    const testValue = body.test_value as string

    if (!config?.api_url) {
      return NextResponse.json({ error: 'API URL is required' }, { status: 400 })
    }
    if (!testValue?.trim()) {
      return NextResponse.json({ error: 'Test value is required (email, policy#, etc.)' }, { status: 400 })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (config.auth_header && config.auth_value) {
      headers[config.auth_header] = config.auth_value
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms || 5000)

    let response: Response
    const field = config.request_field || 'email'

    try {
      if (config.method === 'GET') {
        const url = new URL(config.api_url)
        url.searchParams.set(field, testValue.trim())
        response = await fetch(url.toString(), { method: 'GET', headers, signal: controller.signal })
      } else {
        response = await fetch(config.api_url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ [field]: testValue.trim() }),
          signal: controller.signal,
        })
      }
    } finally {
      clearTimeout(timeout)
    }

    const rawText = await response.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = rawText
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: `API returned ${response.status}`,
        raw: parsed,
      })
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      raw: parsed,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lookup test failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
