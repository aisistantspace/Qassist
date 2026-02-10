import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    // Check if environment variables are set
    const missingVars: string[] = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        details: {
          urlSet: !!supabaseUrl,
          keySet: !!supabaseServiceKey,
          urlLength: supabaseUrl.length,
          keyLength: supabaseServiceKey.length,
        }
      }, { status: 503 })
    }
    
    // Validate URL format
    const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/
    if (!urlPattern.test(supabaseUrl)) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid Supabase URL format. URL must be in format: https://[project-id].supabase.co',
        details: {
          urlProvided: supabaseUrl.substring(0, 50) + (supabaseUrl.length > 50 ? '...' : ''),
          urlLength: supabaseUrl.length,
        }
      }, { status: 400 })
    }
    
    // Validate service role key format (JWT tokens start with eyJ)
    if (!supabaseServiceKey.startsWith('eyJ')) {
      return NextResponse.json({
        status: 'error',
        message: 'Service role key appears invalid. JWT tokens should start with "eyJ"',
        details: {
          keyPrefix: supabaseServiceKey.substring(0, 10) + '...',
          keyLength: supabaseServiceKey.length,
        }
      }, { status: 400 })
    }
    
    // Test actual database connection
    try {
      const supabaseAdmin = getSupabaseAdmin()
      
      // Try a simple query to test connection
      const { data, error } = await supabaseAdmin
        .from('branding_config')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      // If we get here, connection works (even if table is empty)
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        // Other errors indicate connection issues
        return NextResponse.json({
          status: 'error',
          message: 'Database connection failed',
          details: {
            errorCode: error.code,
            errorMessage: error.message,
            errorHint: error.hint,
          }
        }, { status: 503 })
      }
      
      return NextResponse.json({
        status: 'ok',
        message: 'Supabase connection successful',
        details: {
          urlValid: true,
          keyValid: true,
          connectionTest: 'passed',
        }
      })
    } catch (connectionError: any) {
      // Catch network errors, timeouts, etc.
      const errorMessage = connectionError.message || 'Unknown connection error'
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('ECONNREFUSED') ||
                            errorMessage.includes('ETIMEDOUT') ||
                            connectionError.name === 'TypeError'
      
      return NextResponse.json({
        status: 'error',
        message: isNetworkError 
          ? 'Unable to reach Supabase. Check if your project is active and network connectivity.'
          : 'Database connection error',
        details: {
          errorType: connectionError.name || 'Unknown',
          errorMessage: errorMessage,
          isNetworkError,
        }
      }, { status: 503 })
    }
  } catch (error: any) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      details: {
        errorType: error.name || 'Unknown',
        errorMessage: error.message || 'Unknown error',
      }
    }, { status: 500 })
  }
}



