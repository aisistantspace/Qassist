import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      company_name,
      company_website,
      primary_color = '#3B82F6',
      crawl = true,
      maxPages = 25,
    } = body

    if (!company_name || !company_website) {
      return NextResponse.json(
        { error: 'company_name and company_website are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // --- 1. Upsert branding config ---
    const brandingData = {
      company_name,
      company_description: `${company_name} — powered by AI Assistant`,
      company_website,
      widget_title: `${company_name} Chat`,
      widget_subtitle: 'Ask us anything',
      welcome_message: `Welcome to ${company_name}! How can we help you today?`,
      primary_color,
      default_language: 'EN',
      agent_name: `${company_name} Assistant`,
      enable_lead_capture: true,
      lead_capture_fields: ['name', 'email'],
      developer_branding_enabled: true,
      updated_at: new Date().toISOString(),
    }

    const { data: existingBrand } = await supabaseAdmin
      .from('branding_config')
      .select('id')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingBrand) {
      await supabaseAdmin
        .from('branding_config')
        .update(brandingData)
        .eq('id', existingBrand.id)
    } else {
      await supabaseAdmin
        .from('branding_config')
        .insert({ ...brandingData, tenant_id: DEFAULT_TENANT_ID })
    }

    // --- 2. Set multilingual suggested messages ---
    const suggestedMessages = [
      'What services do you offer?',
      'Welke diensten bieden jullie aan?',
      'Ki servisio boso ta ofresé?',
      'Qué servicios ofrecen?',
    ]

    const widgetData = {
      suggested_messages: suggestedMessages,
      primary_color,
      theme: 'light',
      position: 'bottom-right',
      initial_state: 'minimized',
      placeholder_text: 'Type your message in any language...',
      updated_at: new Date().toISOString(),
    }

    const { data: existingWidget } = await supabaseAdmin
      .from('widget_config')
      .select('id')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingWidget) {
      await supabaseAdmin
        .from('widget_config')
        .update(widgetData)
        .eq('id', existingWidget.id)
    } else {
      await supabaseAdmin
        .from('widget_config')
        .insert({ ...widgetData, tenant_id: DEFAULT_TENANT_ID })
    }

    // --- 3. Trigger crawl if requested ---
    let crawlResult = null
    if (crawl) {
      try {
        // Build absolute URL for internal fetch
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const crawlApiUrl = `${protocol}://${host}/api/scrape/crawl`

        const crawlRes = await fetch(crawlApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            url: company_website,
            maxPages,
          }),
        })

        if (crawlRes.ok) {
          crawlResult = await crawlRes.json()
        } else {
          const errData = await crawlRes.json().catch(() => null)
          crawlResult = { error: errData?.error || `Crawl returned ${crawlRes.status}` }
        }
      } catch (crawlErr: any) {
        crawlResult = { error: crawlErr.message || 'Crawl failed' }
      }
    }

    return NextResponse.json({
      success: true,
      branding: brandingData,
      crawl: crawlResult,
      message: `Demo configured for ${company_name}` + (crawlResult?.totalChunks ? ` — ${crawlResult.totalChunks} knowledge entries imported` : ''),
    })
  } catch (error: any) {
    console.error('Demo setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Demo setup failed' },
      { status: 500 }
    )
  }
}
