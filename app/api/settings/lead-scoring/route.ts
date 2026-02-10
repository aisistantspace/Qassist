import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const DEFAULT_WEIGHTS = {
  conversation_length: { multiplier: 3, cap: 25 },
  booking_clicks: { multiplier: 15, cap: 30 },
  case_specific_queries: { multiplier: 10, cap: 20 },
  time_spent: { multiplier: 2, cap: 15 },
  return_visits: { multiplier: 5, cap: 10 },
}

const defaultLeadScoringConfig = {
  hot_threshold: 70,
  warm_threshold: 40,
  include_human_contact_requests: true,
  weights: DEFAULT_WEIGHTS,
  ai_filtering_instructions: '',
}

function mergeWithDefaults(raw: Record<string, unknown> | null): typeof defaultLeadScoringConfig {
  if (!raw || typeof raw !== 'object') return defaultLeadScoringConfig
  const hot = typeof raw.hot_threshold === 'number' ? raw.hot_threshold : defaultLeadScoringConfig.hot_threshold
  const warm = typeof raw.warm_threshold === 'number' ? raw.warm_threshold : defaultLeadScoringConfig.warm_threshold
  const includeHuman = typeof raw.include_human_contact_requests === 'boolean'
    ? raw.include_human_contact_requests
    : defaultLeadScoringConfig.include_human_contact_requests
  const weights = raw.weights && typeof raw.weights === 'object'
    ? { ...defaultLeadScoringConfig.weights, ...(raw.weights as object) }
    : defaultLeadScoringConfig.weights
  const ai = typeof raw.ai_filtering_instructions === 'string' ? raw.ai_filtering_instructions : ''
  return {
    hot_threshold: Math.min(100, Math.max(0, hot)),
    warm_threshold: Math.min(100, Math.max(0, warm)),
    include_human_contact_requests: includeHuman,
    weights,
    ai_filtering_instructions: ai,
  }
}

function validateWeights(w: unknown): w is Record<string, { multiplier?: number; cap?: number }> {
  if (!w || typeof w !== 'object') return false
  for (const v of Object.values(w)) {
    if (v !== null && typeof v === 'object') {
      if ('multiplier' in v && typeof (v as any).multiplier !== 'number') return false
      if ('cap' in v && typeof (v as any).cap !== 'number') return false
    }
  }
  return true
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('integration_config')
      .select('lead_scoring_config')
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    const config = mergeWithDefaults(data?.lead_scoring_config ?? null)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('Error fetching lead scoring config:', error)
    const errorMessage =
      error.message?.includes('Supabase admin client is not initialized') ||
      error.message?.includes('Missing environment variables')
        ? 'Database connection error. Please check your Supabase configuration.'
        : error.message || 'Failed to fetch lead scoring config'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const hot = typeof body.hot_threshold === 'number' ? Math.min(100, Math.max(0, body.hot_threshold)) : defaultLeadScoringConfig.hot_threshold
    const warm = typeof body.warm_threshold === 'number' ? Math.min(100, Math.max(0, body.warm_threshold)) : defaultLeadScoringConfig.warm_threshold
    const includeHuman = typeof body.include_human_contact_requests === 'boolean' ? body.include_human_contact_requests : defaultLeadScoringConfig.include_human_contact_requests
    const weights = validateWeights(body.weights) ? { ...defaultLeadScoringConfig.weights, ...body.weights } : defaultLeadScoringConfig.weights
    const ai = typeof body.ai_filtering_instructions === 'string' ? body.ai_filtering_instructions : ''

    const config = {
      hot_threshold: hot,
      warm_threshold: warm,
      include_human_contact_requests: includeHuman,
      weights,
      ai_filtering_instructions: ai,
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: existing } = await supabaseAdmin
      .from('integration_config')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('integration_config')
        .update({
          lead_scoring_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('lead_scoring_config')
        .single()

      if (error) throw error
      return NextResponse.json(mergeWithDefaults(data?.lead_scoring_config ?? null))
    } else {
      const { data, error } = await supabaseAdmin
        .from('integration_config')
        .insert({ lead_scoring_config: config })
        .select('lead_scoring_config')
        .single()

      if (error) throw error
      return NextResponse.json(mergeWithDefaults(data?.lead_scoring_config ?? null))
    }
  } catch (error: any) {
    console.error('Error saving lead scoring config:', error)
    const errorMessage =
      error.message?.includes('Supabase admin client is not initialized') ||
      error.message?.includes('Missing environment variables')
        ? 'Database connection error. Please check your Supabase configuration.'
        : error.message || 'Failed to save lead scoring config'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
