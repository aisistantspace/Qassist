import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('agent_settings')
      .select('*')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // Return defaults if no settings found
    const defaultSettings = {
      openai_model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
      instructions: 'You are a dedicated customer support agent.',
      default_form_mode: 'conversational',
      papiamentu_locale: 'pap-CW',
      papiamentu_learning: false,
    }

    return NextResponse.json(data || defaultSettings)
  } catch (error: any) {
    console.error('Error fetching agent settings:', error)
    let errorMessage = 'Failed to fetch agent settings'
    
    if (error.message?.includes('Supabase admin client is not initialized')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { instructions, openai_model, temperature, max_tokens, default_form_mode, llm_provider, llm_base_url, llm_api_key, papiamentu_locale, papiamentu_learning } = body

    const { data: existing } = await supabaseAdmin
      .from('agent_settings')
      .select('id')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const updateData: any = {}
    if (instructions !== undefined) updateData.instructions = instructions
    if (openai_model !== undefined) updateData.openai_model = openai_model
    if (temperature !== undefined) updateData.temperature = temperature
    if (max_tokens !== undefined) updateData.max_tokens = max_tokens
    if (default_form_mode !== undefined) updateData.default_form_mode = default_form_mode
    if (llm_provider !== undefined) updateData.llm_provider = llm_provider
    if (llm_base_url !== undefined) updateData.llm_base_url = llm_base_url || null
    if (llm_api_key !== undefined) updateData.llm_api_key = llm_api_key || null
    if (papiamentu_locale !== undefined) updateData.papiamentu_locale = papiamentu_locale
    if (papiamentu_learning !== undefined) updateData.papiamentu_learning = papiamentu_learning

    let result
    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('agent_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new with defaults
      const { data, error } = await supabaseAdmin
        .from('agent_settings')
        .insert({
          tenant_id: DEFAULT_TENANT_ID,
          instructions: instructions || 'You are a dedicated customer support agent.',
          openai_model: openai_model || 'gpt-4o-mini',
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens || 500,
          default_form_mode: default_form_mode || 'conversational',
          llm_provider: llm_provider || 'openai',
          llm_base_url: llm_base_url || null,
          llm_api_key: llm_api_key || null,
          papiamentu_locale: papiamentu_locale || 'pap-CW',
          papiamentu_learning: papiamentu_learning ?? false,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error updating agent settings:', error)
    let errorMessage = 'Failed to update agent settings'
    
    if (error.message?.includes('Supabase admin client is not initialized')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
