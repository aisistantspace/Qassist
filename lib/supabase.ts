import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Validate Supabase URL format
function validateSupabaseUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is empty' }
  }
  
  const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/
  if (!urlPattern.test(url)) {
    return { 
      valid: false, 
      error: 'Invalid Supabase URL format. Expected format: https://[project-id].supabase.co' 
    }
  }
  
  return { valid: true }
}

// Validate service role key format
function validateServiceKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'Service role key is empty' }
  }
  
  // JWT tokens start with 'eyJ' (base64 encoded '{"')
  if (!key.startsWith('eyJ')) {
    return { 
      valid: false, 
      error: 'Service role key appears invalid. JWT tokens should start with "eyJ"' 
    }
  }
  
  return { valid: true }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
} else {
  // Validate URL format if provided
  const urlValidation = validateSupabaseUrl(supabaseUrl)
  if (!urlValidation.valid) {
    console.error('Supabase URL validation failed:', urlValidation.error)
  }
  
  // Validate service key format if provided
  if (supabaseServiceKey) {
    const keyValidation = validateServiceKey(supabaseServiceKey)
    if (!keyValidation.valid) {
      console.error('Supabase service key validation failed:', keyValidation.error)
    }
  }
}

// Client-side Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Server-side Supabase client with service role (for admin operations)
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })
  : null

// Helper function to check if Supabase admin client is available
export function isSupabaseAdminAvailable(): boolean {
  return supabaseAdmin !== null
}

// Helper function to get Supabase admin client or throw error
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const missingVars: string[] = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    // Check for validation errors
    let validationError: string | null = null
    if (supabaseUrl) {
      const urlValidation = validateSupabaseUrl(supabaseUrl)
      if (!urlValidation.valid) {
        validationError = urlValidation.error || 'Invalid URL format'
      }
    }
    if (supabaseServiceKey && !validationError) {
      const keyValidation = validateServiceKey(supabaseServiceKey)
      if (!keyValidation.valid) {
        validationError = keyValidation.error || 'Invalid service key format'
      }
    }
    
    let errorMessage: string
    if (missingVars.length > 0) {
      errorMessage = `Supabase admin client is not initialized. Missing environment variables: ${missingVars.join(', ')}. Please configure these in your Vercel environment variables.`
    } else if (validationError) {
      errorMessage = `Supabase admin client is not initialized. ${validationError} Please check your Supabase configuration in Vercel.`
    } else {
      errorMessage = 'Supabase admin client is not initialized. Please check your Supabase configuration.'
    }
    
    console.error('Supabase initialization error:', errorMessage)
    console.error('Environment check:', {
      urlSet: !!supabaseUrl,
      urlLength: supabaseUrl.length,
      keySet: !!supabaseServiceKey,
      keyLength: supabaseServiceKey.length,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'not set',
    })
    
    throw new Error(errorMessage)
  }
  return supabaseAdmin
}

// Export validation functions for use in health check
export { validateSupabaseUrl, validateServiceKey }


