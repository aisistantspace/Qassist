import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET - Fetch current agent settings
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('agent_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          instructions: 'You are a dedicated customer support agent.',
          openai_model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 500,
          papiamentu_locale: 'pap-CW',
          papiamentu_learning: false,
        })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    let errorMessage = 'Failed to fetch settings'
    
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

// POST - Update agent settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instructions, openai_model, temperature, max_tokens, llm_provider, llm_base_url, llm_api_key, papiamentu_locale, papiamentu_learning } = body

    // Validation
    if (!instructions || instructions.trim().length < 10) {
      return NextResponse.json(
        { error: 'Instructions must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (!openai_model || typeof openai_model !== 'string') {
      return NextResponse.json(
        { error: 'A model must be selected' },
        { status: 400 }
      )
    }

    if (temperature < 0 || temperature > 1) {
      return NextResponse.json(
        { error: 'Temperature must be between 0 and 1' },
        { status: 400 }
      )
    }

    if (max_tokens < 50 || max_tokens > 2000) {
      return NextResponse.json(
        { error: 'Max tokens must be between 50 and 2000' },
        { status: 400 }
      )
    }

    // Check if settings exist - more robustly
    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('agent_settings')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase error fetching settings:', fetchError)
      throw new Error(`Database error: ${fetchError.message}`)
    }

    let result

    if (existing) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('agent_settings')
        .update({
          instructions,
          openai_model,
          temperature,
          max_tokens,
          llm_provider: llm_provider || 'openai',
          llm_base_url: llm_base_url || null,
          llm_api_key: llm_api_key || null,
          papiamentu_locale: papiamentu_locale || 'pap-CW',
          papiamentu_learning: papiamentu_learning ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating settings:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabaseAdmin
        .from('agent_settings')
        .insert({
          instructions,
          openai_model,
          temperature,
          max_tokens,
          llm_provider: llm_provider || 'openai',
          llm_base_url: llm_base_url || null,
          llm_api_key: llm_api_key || null,
          papiamentu_locale: papiamentu_locale || 'pap-CW',
          papiamentu_learning: papiamentu_learning ?? false,
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error inserting settings:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error in agent settings POST:', error)
    let errorMessage = 'Failed to update settings'
    
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


