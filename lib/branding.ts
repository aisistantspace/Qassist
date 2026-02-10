import { getSupabaseAdmin } from './supabase'

export interface BrandingConfig {
  id?: string
  company_name: string
  company_description?: string
  company_website?: string
  company_phone?: string
  company_email?: string
  widget_title: string
  widget_subtitle?: string
  welcome_message: string
  primary_color: string
  logo_url?: string
  favicon_url?: string
  default_language: string
  enable_lead_capture: boolean
  lead_capture_fields: string[]
  booking_url?: string
  booking_cta_text?: string
  enable_booking_cta: boolean
  agent_name: string
  agent_avatar_url: string
  developer_branding_enabled: boolean
  created_at?: string
  updated_at?: string
}

/** Fetch branding configuration for a tenant (default tenant if tenantId omitted). */
export async function getBrandingConfig(tenantId?: string): Promise<BrandingConfig> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('branding_config')
      .select('*')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      // Return defaults if no branding found
      return {
        company_name: 'My Company',
        company_description: '',
        widget_title: 'Chat Assistant',
        welcome_message: 'Hello! How can I help you today?',
        primary_color: '#3B82F6',
        default_language: 'EN',
        enable_lead_capture: true,
        lead_capture_fields: ['name', 'email'],
        enable_booking_cta: false,
        agent_name: 'Assistant',
        agent_avatar_url: 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
        developer_branding_enabled: true,
      }
    }

    return data
  } catch (error) {
    console.error('Error fetching branding config:', error)
    // Return defaults on error
    return {
      company_name: 'My Company',
      company_description: '',
      widget_title: 'Chat Assistant',
      welcome_message: 'Hello! How can I help you today?',
      primary_color: '#3B82F6',
      default_language: 'EN',
      enable_lead_capture: true,
      lead_capture_fields: ['name', 'email'],
      enable_booking_cta: false,
      agent_name: 'Assistant',
      agent_avatar_url: 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
      developer_branding_enabled: true,
    }
  }
}

// Get greeting message based on language
export function getGreeting(language: string, companyName: string, agentName: string = 'Assistant'): string {
  const greetings: Record<string, string> = {
    EN: `Hi! / ¡Hola! 👋\n\nI'm ${agentName}, your ${companyName} assistant. How can I help you today?\nSoy ${agentName}, tu asistente de ${companyName}. ¿Cómo te puedo ayudar hoy?`,
    NL: `Hoi! 👋\n\nIk ben ${agentName}, je assistent van ${companyName}. Hoe kan ik je helpen?`,
    ES: `¡Hola! 👋\n\nSoy ${agentName}, tu asistente de ${companyName}. ¿Cómo te puedo ayudar hoy?`,
    PA: `Bon dia! 👋\n\nMi ta ${agentName}, bo asistente di ${companyName}. Con mi por yuda bo?`,
  }

  return greetings[language] || greetings.EN
}
