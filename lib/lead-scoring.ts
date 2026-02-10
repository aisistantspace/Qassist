import { getSupabaseAdmin } from './supabase'

export interface LeadScoreFactors {
  conversationLength: number  // Number of turns
  bookingClicks: number        // How many times clicked booking
  caseSpecificQueries: number  // Questions about their specific case
  timeSpent: number           // Minutes in conversation
  returnVisits: number        // How many times they came back
  engagementLevel: number     // Overall engagement score
}

export interface ScoringResult {
  totalScore: number
  category: 'cold' | 'warm' | 'hot'
  factors: LeadScoreFactors
  recommendations: string[]
}

export interface LeadScoringWeights {
  conversation_length: { multiplier: number; cap: number }
  booking_clicks: { multiplier: number; cap: number }
  case_specific_queries: { multiplier: number; cap: number }
  time_spent: { multiplier: number; cap: number }
  return_visits: { multiplier: number; cap: number }
}

export interface LeadScoringConfig {
  hot_threshold: number
  warm_threshold: number
  include_human_contact_requests: boolean
  weights: LeadScoringWeights
  ai_filtering_instructions: string
}

const DEFAULT_WEIGHTS: LeadScoringWeights = {
  conversation_length: { multiplier: 3, cap: 25 },
  booking_clicks: { multiplier: 15, cap: 30 },
  case_specific_queries: { multiplier: 10, cap: 20 },
  time_spent: { multiplier: 2, cap: 15 },
  return_visits: { multiplier: 5, cap: 10 },
}

export const defaultLeadScoringConfig: LeadScoringConfig = {
  hot_threshold: 70,
  warm_threshold: 40,
  include_human_contact_requests: true,
  weights: DEFAULT_WEIGHTS,
  ai_filtering_instructions: '',
}

function mergeWeights(raw: unknown): LeadScoringWeights {
  if (!raw || typeof raw !== 'object') return DEFAULT_WEIGHTS
  const out = { ...DEFAULT_WEIGHTS }
  const w = raw as Record<string, { multiplier?: number; cap?: number }>
  for (const key of Object.keys(DEFAULT_WEIGHTS) as (keyof LeadScoringWeights)[]) {
    if (w[key] && typeof w[key] === 'object') {
      const m = (w[key] as any).multiplier
      const c = (w[key] as any).cap
      out[key] = {
        multiplier: typeof m === 'number' && m >= 0 ? m : DEFAULT_WEIGHTS[key].multiplier,
        cap: typeof c === 'number' && c >= 0 ? c : DEFAULT_WEIGHTS[key].cap,
      }
    }
  }
  return out
}

/**
 * Load lead scoring config from integration_config, merged with defaults.
 */
export async function getLeadScoringConfig(): Promise<LeadScoringConfig> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('integration_config')
    .select('lead_scoring_config')
    .limit(1)
    .maybeSingle()

  if (error || !data?.lead_scoring_config) return defaultLeadScoringConfig
  const raw = data.lead_scoring_config as Record<string, unknown>
  return {
    hot_threshold: typeof raw.hot_threshold === 'number'
      ? Math.min(100, Math.max(0, raw.hot_threshold))
      : defaultLeadScoringConfig.hot_threshold,
    warm_threshold: typeof raw.warm_threshold === 'number'
      ? Math.min(100, Math.max(0, raw.warm_threshold))
      : defaultLeadScoringConfig.warm_threshold,
    include_human_contact_requests: typeof raw.include_human_contact_requests === 'boolean'
      ? raw.include_human_contact_requests
      : defaultLeadScoringConfig.include_human_contact_requests,
    weights: mergeWeights(raw.weights),
    ai_filtering_instructions: typeof raw.ai_filtering_instructions === 'string'
      ? raw.ai_filtering_instructions
      : '',
  }
}

/**
 * Calculate lead score based on multiple factors (uses config thresholds and weights).
 */
export async function calculateLeadScore(leadId: string): Promise<ScoringResult> {
  const supabaseAdmin = getSupabaseAdmin()
  const config = await getLeadScoringConfig()

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)

  const { data: events } = await supabaseAdmin
    .from('event_logs')
    .select('*')
    .eq('lead_id', leadId)

  if (!lead || !conversations) {
    return {
      totalScore: 0,
      category: 'cold',
      factors: {
        conversationLength: 0,
        bookingClicks: 0,
        caseSpecificQueries: 0,
        timeSpent: 0,
        returnVisits: 0,
        engagementLevel: 0,
      },
      recommendations: ['No conversation data available'],
    }
  }

  const factors: LeadScoreFactors = {
    conversationLength: conversations.reduce((sum: number, c: any) => sum + (c.turn_count || 0), 0),
    bookingClicks: events?.filter((e: any) => e.event_type === 'book_click').length || 0,
    caseSpecificQueries: conversations.filter((c: any) => c.status === 'escalated').length,
    timeSpent: calculateTimeSpent(conversations),
    returnVisits: conversations.length,
    engagementLevel: calculateEngagement(conversations),
  }

  const w = config.weights
  let score = 0
  score += Math.min(factors.conversationLength * w.conversation_length.multiplier, w.conversation_length.cap)
  score += Math.min(factors.bookingClicks * w.booking_clicks.multiplier, w.booking_clicks.cap)
  score += Math.min(factors.caseSpecificQueries * w.case_specific_queries.multiplier, w.case_specific_queries.cap)
  score += Math.min(factors.timeSpent * w.time_spent.multiplier, w.time_spent.cap)
  score += Math.min(factors.returnVisits * w.return_visits.multiplier, w.return_visits.cap)
  score = Math.min(Math.round(score), 100)

  let category: 'cold' | 'warm' | 'hot'
  if (score >= config.hot_threshold) category = 'hot'
  else if (score >= config.warm_threshold) category = 'warm'
  else category = 'cold'

  const recommendations = generateRecommendations(score, factors, config.hot_threshold, config.warm_threshold)

  return {
    totalScore: score,
    category,
    factors,
    recommendations,
  }
}

/**
 * Calculate time spent in conversations (in minutes)
 */
function calculateTimeSpent(conversations: any[]): number {
  let totalMinutes = 0

  for (const conv of conversations) {
    if (conv.messages && conv.messages.length >= 2) {
      const firstMsg = new Date(conv.messages[0].timestamp)
      const lastMsg = new Date(conv.messages[conv.messages.length - 1].timestamp)
      const minutes = (lastMsg.getTime() - firstMsg.getTime()) / (1000 * 60)
      totalMinutes += minutes
    }
  }

  return Math.round(totalMinutes)
}

/**
 * Calculate engagement level (0-10)
 */
function calculateEngagement(conversations: any[]): number {
  if (conversations.length === 0) return 0

  let engagementScore = 0

  for (const conv of conversations) {
    // Long conversations = more engaged
    if (conv.turn_count >= 5) engagementScore += 3
    else if (conv.turn_count >= 3) engagementScore += 2
    else engagementScore += 1

    // Escalated = high intent
    if (conv.status === 'escalated') engagementScore += 2
  }

  return Math.min(Math.round(engagementScore / conversations.length * 2), 10)
}

/**
 * Generate recommendations based on score and factors
 */
function generateRecommendations(
  score: number,
  factors: LeadScoreFactors,
  hotThreshold: number = 70,
  warmThreshold: number = 40
): string[] {
  const recommendations: string[] = []

  if (score >= hotThreshold) {
    recommendations.push('HOT LEAD - Contact immediately')
    recommendations.push('This lead is highly qualified and ready to book')
    if (factors.bookingClicks > 0) {
      recommendations.push(`Clicked booking ${factors.bookingClicks} time(s) - Follow up now`)
    }
  } else if (score >= warmThreshold) {
    recommendations.push('WARM LEAD - Follow up within 24 hours')
    recommendations.push('Send a personalized email with next steps')
    if (factors.conversationLength >= 5) {
      recommendations.push('Good engagement level - nurture with case studies')
    }
  } else {
    recommendations.push('COLD LEAD - Add to nurture campaign')
    recommendations.push('Send educational content')
    if (factors.conversationLength < 3) {
      recommendations.push('Low engagement - may need more touchpoints')
    }
  }

  return recommendations
}

/**
 * Update lead score in database
 */
export async function updateLeadScore(leadId: string): Promise<ScoringResult> {
  const supabaseAdmin = getSupabaseAdmin()
  const result = await calculateLeadScore(leadId)

  await supabaseAdmin
    .from('leads')
    .update({
      lead_score: result.totalScore,
      status: result.category === 'hot' ? 'qualified' : 'new',
    })
    .eq('id', leadId)

  return result
}

/**
 * Get all hot leads (score >= config.hot_threshold OR requested human contact if enabled).
 */
export async function getHotLeads(): Promise<any[]> {
  const supabaseAdmin = getSupabaseAdmin()
  const config = await getLeadScoringConfig()
  const hotThreshold = config.hot_threshold

  const { data: highScoreLeads } = await supabaseAdmin
    .from('leads')
    .select('*, conversations(*)')
    .gte('lead_score', hotThreshold)
    .order('lead_score', { ascending: false })

  const allHotLeads = new Map<string, any>()
  if (highScoreLeads) {
    highScoreLeads.forEach(lead => {
      allHotLeads.set(lead.id, lead)
    })
  }

  if (config.include_human_contact_requests) {
    const { data: humanContactEvents } = await supabaseAdmin
      .from('event_logs')
      .select('lead_id, leads(*, conversations(*))')
      .eq('event_type', 'human_contact_requested')
      .order('created_at', { ascending: false })

    if (humanContactEvents) {
      humanContactEvents.forEach((event: any) => {
        if (event.leads) {
          const lead = event.leads
          if (lead.lead_score < hotThreshold) {
            lead.lead_score = hotThreshold
          }
          allHotLeads.set(lead.id, lead)
        }
      })
    }
  }

  return Array.from(allHotLeads.values()).sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
}

/**
 * Check if lead should trigger alert
 */
export function shouldAlertAdmin(score: number, previousScore: number): boolean {
  // Alert if:
  // 1. Score jumped to hot (>= 70) from lower
  // 2. Score increased by 20+ points
  return (score >= 70 && previousScore < 70) || (score - previousScore >= 20)
}


