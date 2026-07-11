import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getTenantFromRequest, getTenantIdBySlug } from '@/lib/tenant'
import { getDashboardTenantId, getDashboardTenantContext } from '@/lib/dashboard-tenant'
import { enniaTheme } from '@/lib/demo-themes/ennia'

function applyEnniaBrandingDefaults(data: Record<string, unknown>, slug: string | null) {
  if (slug !== 'ennia') return data
  const b = enniaTheme.branding
  const storedWelcome = typeof data.welcome_message === 'string' ? data.welcome_message : ''
  const welcomeMessage =
    storedWelcome && !/welkom|waarmee/i.test(storedWelcome)
      ? storedWelcome
      : b.welcomeMessage
  return {
    ...data,
    company_name: data.company_name || 'ENNIA',
    company_website: data.company_website || enniaTheme.website,
    widget_title: data.widget_title || b.widgetTitle,
    agent_name: data.agent_name || b.agentName,
    welcome_message: welcomeMessage,
    primary_color: data.primary_color || b.primaryColor,
    logo_url: data.logo_url || b.logoUrl,
    favicon_url: data.favicon_url || b.faviconUrl,
    default_language: data.default_language || b.defaultLanguage,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slugParam = searchParams.get('slug') ?? searchParams.get('tenantSlug')
    const tenantIdParam = searchParams.get('tenant') ?? searchParams.get('tenantId')

    let tenantId = tenantIdParam
    let slug = slugParam

    if (!tenantId && !slug) {
      try {
        const ctx = await getDashboardTenantContext(request)
        if (!ctx.isSuperAdmin) {
          tenantId = ctx.tenantId
          slug = ctx.slug
        }
      } catch {
        // Public chat — fall through to default tenant resolution
      }
    }

    if (!tenantId) {
      tenantId =
        (slug ? (await getTenantIdBySlug(slug))?.id : null) ??
        (await getTenantFromRequest(request)).tenantId
    }
    if (!slug && tenantId) {
      const supabaseAdmin = getSupabaseAdmin()
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .maybeSingle()
      slug = tenantRow?.slug ?? null
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('branding_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      const defaults = applyEnniaBrandingDefaults(
        {
          company_name: 'My Company',
          company_description: '',
          widget_title: 'Chat Assistant',
          welcome_message: 'Hello! How can I help you today?',
          primary_color: '#3B82F6',
          default_language: 'EN',
          enable_lead_capture: true,
          lead_capture_fields: ['name', 'email'],
          agent_name: 'Assistant',
          agent_avatar_url:
            'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
          developer_branding_enabled: true,
        },
        slug
      )
      return NextResponse.json(defaults)
    }
    return NextResponse.json(applyEnniaBrandingDefaults(data, slug))
  } catch (error: any) {
    console.error('Error fetching branding:', error)
    let errorMessage = 'Failed to fetch branding configuration'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// POST - Update branding configuration
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const body = await request.json()
    const {
      company_name,
      company_description,
      company_website,
      company_phone,
      company_email,
      widget_title,
      widget_subtitle,
      welcome_message,
      primary_color,
      logo_url,
      favicon_url,
      default_language,
      enable_lead_capture,
      lead_capture_fields,
      booking_url,
      booking_cta_text,
      enable_booking_cta,
      agent_name,
      agent_avatar_url,
      developer_branding_enabled,
    } = body

    // Validation
    if (!company_name || company_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (primary_color && !/^#[0-9A-F]{6}$/i.test(primary_color)) {
      return NextResponse.json(
        { error: 'Primary color must be a valid hex color (e.g., #3B82F6)' },
        { status: 400 }
      )
    }

    // Check if branding exists - more robustly
    let supabaseAdmin
    try {
      // Debug: Log the actual URL being used
      const actualUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      console.log('DEBUG: Supabase URL from env:', actualUrl)
      console.log('DEBUG: URL ends with .co?', actualUrl.endsWith('.supabase.co'))
      console.log('DEBUG: URL ends with .com?', actualUrl.endsWith('.supabase.com'))
      
      supabaseAdmin = getSupabaseAdmin()
    } catch (initError: any) {
      console.error('Failed to initialize Supabase admin client:', {
        error: initError.message,
        errorType: initError.name,
        urlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        actualUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        keySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
      throw initError
    }
    
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('branding_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase error fetching branding:', {
        code: fetchError.code,
        message: fetchError.message,
        hint: fetchError.hint,
        details: fetchError.details,
      })
      throw new Error(`Database error: ${fetchError.message}`)
    }

    let result

    const brandingData = {
      company_name,
      company_description,
      company_website,
      company_phone,
      company_email,
      widget_title,
      widget_subtitle,
      welcome_message,
      primary_color,
      logo_url,
      favicon_url,
      default_language,
      enable_lead_capture,
      lead_capture_fields,
      booking_url,
      booking_cta_text,
      enable_booking_cta,
      agent_name: agent_name || 'Assistant',
      agent_avatar_url: agent_avatar_url || 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
      developer_branding_enabled: developer_branding_enabled !== undefined ? developer_branding_enabled : true,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing branding
      const { data, error } = await supabaseAdmin
        .from('branding_config')
        .update(brandingData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating branding:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('branding_config')
        .insert({ ...brandingData, tenant_id: tenantId })
        .select()
        .single()

      if (error) {
        console.error('Supabase error inserting branding:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error in branding POST:', {
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    })
    
    let errorMessage = 'Failed to update branding configuration'
    
    // Check for specific error types and provide actionable guidance
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    } else if (error.message?.includes('Invalid Supabase URL format')) {
      errorMessage = 'Invalid Supabase URL format. URL must be in format: https://[project-id].supabase.co. Please check your NEXT_PUBLIC_SUPABASE_URL in Vercel.'
    } else if (error.message?.includes('Service role key appears invalid')) {
      errorMessage = 'Invalid service role key format. Please verify your SUPABASE_SERVICE_ROLE_KEY in Vercel matches the key from your Supabase dashboard.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. This could indicate: 1) Your Supabase project may be paused, 2) Network connectivity issues, or 3) Invalid credentials. Check your Supabase project status and verify your environment variables in Vercel.'
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Database connection timeout. Unable to reach Supabase. Check if your Supabase project is active and not paused.'
    } else if (error.message?.includes('403') || error.message?.includes('401')) {
      errorMessage = 'Authentication failed. Please verify your SUPABASE_SERVICE_ROLE_KEY is correct and has not expired. Check your Supabase dashboard for the current service role key.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
