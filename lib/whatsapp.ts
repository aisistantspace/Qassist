import { getSupabaseAdmin } from './supabase'

interface WhatsAppConfig {
  phone_number_id: string
  access_token: string
  is_active: boolean
}

// Fetch WhatsApp configuration from database
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('integration_config')
      .select('whatsapp_phone_number_id, whatsapp_access_token, whatsapp_enabled')
      .limit(1)
      .maybeSingle()

    if (!data?.whatsapp_enabled || !data?.whatsapp_phone_number_id || !data?.whatsapp_access_token) {
      return null
    }

    return {
      phone_number_id: data.whatsapp_phone_number_id,
      access_token: data.whatsapp_access_token,
      is_active: data.whatsapp_enabled
    }
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error)
    return null
  }
}

// Send WhatsApp message
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getWhatsAppConfig()
    
    if (!config) {
      return {
        success: false,
        error: 'WhatsApp integration is not configured or inactive',
      }
    }

    const url = `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: true, // Enable link previews
          body: text,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('WhatsApp API error:', error)
      return {
        success: false,
        error: error.error?.message || 'Failed to send WhatsApp message',
      }
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    }
  }
}

// Send WhatsApp template message (for specific use cases)
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: any[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getWhatsAppConfig()
    
    if (!config) {
      return {
        success: false,
        error: 'WhatsApp integration is not configured or inactive',
      }
    }

    const url = `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: components || [],
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('WhatsApp API error:', error)
      return {
        success: false,
        error: error.error?.message || 'Failed to send WhatsApp template',
      }
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp template:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp template',
    }
  }
}

// Mark WhatsApp message as read
export async function markWhatsAppMessageRead(messageId: string): Promise<boolean> {
  try {
    const config = await getWhatsAppConfig()
    
    if (!config) {
      return false
    }

    const url = `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error marking message as read:', error)
    return false
  }
}

// Validate WhatsApp phone number format
export function isValidWhatsAppNumber(phone: string): boolean {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // WhatsApp numbers should be 10-15 digits (without + sign)
  return cleaned.length >= 10 && cleaned.length <= 15
}

// Format phone number for WhatsApp (remove + and spaces)
export function formatWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}


