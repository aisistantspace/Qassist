import { getSupabaseAdmin } from './supabase'
import { generateEmbedding, getAgentSettings } from './openai'
import { getBrandingConfig } from './branding'
import { getPapiamentuPromptGuide } from './papiamentu/prompt-guide'
import { expandKbSearchQuery } from './papiamentu/kb-query-expand'
import { getConductPromptBlock } from './conversation-conduct'
import { buildRoutingPromptGuidance } from './routing'
import { getRoutingConfig } from './routing-config'

export interface KnowledgeBaseAction {
  action_type?: 'none' | 'link' | 'form'
  action_url?: string
  action_form_id?: string
}

export interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: 'FAQ' | 'Service' | 'Blog' | 'Policy'
  language: 'EN' | 'NL' | 'ES' | 'PA'
  tags: string[]
  embedding?: number[]
  metadata?: KnowledgeBaseAction & Record<string, unknown>
  similarity?: number
  created_at?: string
  updated_at?: string
}

/**
 * Detect language from user text using a SCORE-BASED system.
 * Each language earns points for matching patterns.  Highest score wins.
 * PA is scored with strong discriminators so it is not confused with ES/NL.
 */
export function detectLanguageFromText(text: string): 'EN' | 'NL' | 'ES' | 'PA' {
  const lowerText = text.toLowerCase().trim()
  if (!lowerText) return 'EN'

  // ── Papiamentu patterns (scored) ─────────────────────────────────
  // Weight 3 = very strong PA indicator (no overlap with ES/NL)
  // Weight 2 = strong indicator
  // Weight 1 = shared with ES but also common in PA
  const paPatterns: [RegExp, number][] = [
    // --- Weight 3: unique PA markers ---
    [/\bta\b/i, 3],           // verb marker "ta" (very frequent in PA)
    [/\bku\b/i, 3],           // "with" (Spanish uses "con")
    [/\bkiko\b/i, 3],         // "what" (Spanish "qué")
    [/\bbai\b/i, 3],          // "go" (Spanish "ir")
    [/\bduna\b/i, 3],         // "give" (Spanish "dar")
    [/\bmester\b/i, 3],       // "must" (Spanish "deber")
    [/\btur\b/i, 3],          // "all" (Spanish "todo")
    [/\bmashá\b/i, 3],        // "very/much"
    [/\bkaminda\b/i, 3],      // "where" (Spanish "donde")
    [/\blaga\b/i, 3],         // "let/leave"
    [/\bhasi\b/i, 3],         // "do/make" (Spanish "hacer")
    [/\bdanki\b/i, 3],        // "thank you"
    [/\bbisa\b/i, 3],         // "tell/say"
    [/\bkòrsou\b/i, 3],       // Curaçao in PA
    [/\bserka\b/i, 3],        // "near/at"
    [/\bawor\b/i, 3],         // "now"
    [/\btambe\b/i, 3],        // "also"
    [/\bdjis\b/i, 3],         // "just"
    [/\bpromé\b/i, 3],        // "first"
    [/\bdifo\b/i, 3],         // "tough/difficult"
    // k-words where Spanish uses c (strong PA signal)
    [/\bkasa\b/i, 3],         // "house" (ES: casa)
    [/\bkome\b/i, 3],         // "eat" (ES: comer)
    [/\bkoló\b/i, 3],         // "color" (ES: color)
    [/\bkurason\b/i, 3],      // "heart" (ES: corazón)
    [/\bkòmou\b/i, 3],        // "how" (ES: cómo)
    [/\bkachó\b/i, 3],        // "dog"
    [/\btraha\b/i, 3],        // "work" (ES: trabajar)
    [/\bpèrdè\b/i, 3],        // "lose"
    // --- Weight 2: strong PA phrases and patterns ---
    [/bon\s*dia/i, 2],         // "good day"
    [/bon\s*tardi/i, 2],       // "good afternoon"
    [/bon\s*nochi/i, 2],       // "good night"
    [/bon\s*bini/i, 2],        // "welcome"
    [/kon\s*ta/i, 2],          // "how are you"
    [/por\s*fabor/i, 2],       // "please" (note: fabor, not favor)
    [/\bmi\s+ta\b/i, 2],      // "I am" (PA verb structure)
    [/\bbo\s+ta\b/i, 2],      // "you are"
    [/\bnos\s+ta\b/i, 2],     // "we are"
    [/\bnan\s+ta\b/i, 2],     // "they are"
    [/\bmi\s+ke\b/i, 2],      // "I want"
    [/\bbo\s+ke\b/i, 2],      // "you want"
    [/shon\b/i, 2],            // PA suffix (-shon not -ción)
    // --- Weight 1: present in PA but may overlap ---
    [/\bpa\b/i, 1],            // preposition (but also ES "para")
    [/\bdi\b/i, 1],            // "of" (also ES "de")
    [/\bun\b/i, 1],            // "a/an" (shared)
    [/\bbo\b/i, 1],            // "you"
    [/\bsi\b/i, 1],            // "if/yes"
    [/\bnos\b/i, 1],           // "our/we"
    [/\byuda\b/i, 1],          // "help" (ES: ayuda)
  ]

  // ── Spanish patterns (scored) ────────────────────────────────────
  // NOTE: bare accent patterns removed — they fire on PA text too
  const esPatterns: [RegExp, number][] = [
    // --- Weight 3: uniquely Spanish ---
    [/\bhola\b/i, 3],
    [/\bcómo\b/i, 3],          // "how" with Spanish accent
    [/\bqué\b/i, 3],           // "what" (PA uses "kiko")
    [/\bestoy\b/i, 3],         // "I am" (PA uses "mi ta")
    [/\bme\s+llamo\b/i, 3],    // "my name is"
    [/\bquiero\b/i, 3],        // "I want" (PA uses "mi ke")
    [/\bnecesito\b/i, 3],      // "I need"
    [/\bpuedo\b/i, 3],         // "I can"
    [/\btengo\b/i, 3],         // "I have"
    [/\binmigración\b/i, 3],
    [/\bmudarse\b/i, 3],
    [/\bdónde\b/i, 3],
    [/\bcuánto\b/i, 3],
    [/\bcuándo\b/i, 3],
    [/¿/i, 3],                 // inverted question mark (uniquely Spanish)
    [/¡/i, 3],                 // inverted exclamation (uniquely Spanish)
    // --- Weight 2 ---
    [/buenos?\s*d[ií]as?/i, 2],
    [/buenas?\s*(tardes?|noches?)/i, 2],
    [/\bgracias\b/i, 2],       // "thanks" (PA: danki)
    [/por\s*favor\b/i, 2],     // note: "favor" not "fabor"
    [/\binformación\b/i, 2],
    [/\bayuda\b/i, 2],
    [/\bvivir\b/i, 2],
    [/\btrabajar\b/i, 2],
    // --- Weight 1 ---
    [/\bpregunta\b/i, 1],      // shared with PA
    [/\bvisa\b/i, 1],
    [/\bpermiso\b/i, 1],
    [/\bresidencia\b/i, 1],
    [/\bsoy\b/i, 1],
  ]

  // ── Dutch patterns (scored) ──────────────────────────────────────
  const nlPatterns: [RegExp, number][] = [
    [/\bhallo\b/i, 3],
    [/\bik\s/i, 3],
    [/\bgraag\b/i, 3],
    [/\bkunnen\b/i, 3],
    [/\bbedankt\b/i, 3],
    [/\balsjeblieft\b/i, 3],
    [/\binformatie\b/i, 3],
    [/\bvisum\b/i, 3],
    [/\bvergunning\b/i, 3],
    [/\bverblijf\b/i, 3],
    [/\bhoe\b/i, 2],
    [/\bwat\b/i, 2],
    [/\bwaar\b/i, 2],
    [/\bwanneer\b/i, 2],
    [/\bwaarom\b/i, 2],
    [/\bwelke\b/i, 2],
    [/\bmijn\s/i, 2],
    [/\bnaam\b/i, 2],
    [/\bvraag\b/i, 2],
    [/\bwerk\b/i, 2],
    [/\bhet\s/i, 1],
    [/\been\s/i, 1],
    [/\bde\s/i, 1],
    [/\bvan\s/i, 1],
    [/\bvoor\s/i, 1],
    [/\bgoed\b/i, 1],
    [/\bnee\b/i, 1],
  ]

  // Score each language
  function score(patterns: [RegExp, number][]): number {
    let total = 0
    for (const [pat, weight] of patterns) {
      if (pat.test(lowerText)) total += weight
    }
    return total
  }

  const paScore = score(paPatterns)
  const esScore = score(esPatterns)
  const nlScore = score(nlPatterns)

  // If any language scored, return the highest. On tie: PA > ES > NL
  // (PA and ES share many words, so PA wins ties because PA is a subset context)
  const maxScore = Math.max(paScore, esScore, nlScore)

  if (maxScore === 0) return 'EN'
  if (paScore >= esScore && paScore >= nlScore) return 'PA'
  if (esScore >= nlScore) return 'ES'
  return 'NL'
}

/**
 * Resolve the language for this turn.
 * When the user explicitly picked a flag (languageExplicit), honor that choice.
 * Otherwise auto-detect from message text.
 */
export function resolveEffectiveLanguage(
  messageText: string,
  requestedLanguage: 'EN' | 'NL' | 'ES' | 'PA',
  options: {
    languageExplicit?: boolean
    existingConversationLanguage?: 'EN' | 'NL' | 'ES' | 'PA'
  } = {}
): 'EN' | 'NL' | 'ES' | 'PA' {
  if (options.languageExplicit) {
    return requestedLanguage
  }
  if (!messageText) {
    return options.existingConversationLanguage ?? requestedLanguage
  }
  // Keep Papiamentu session when user already chose PA (demo: full PA conversation)
  if (
    requestedLanguage === 'PA' ||
    options.existingConversationLanguage === 'PA'
  ) {
    return 'PA'
  }
  return detectLanguageFromText(messageText)
}

// Restore missing helper functions for API
export function isEligibilityQuery(query: string): boolean {
  const eligibilityKeywords = [
    'eligible', 'eligibility', 'qualify', 'can i move', 'can i live',
    'requirements', 'do i qualify', 'am i eligible', 'check eligibility',
    'geschikt', 'in aanmerking', 'voldoe ik', 'kan ik', // Dutch
    'elegible', 'requisitos', 'califico', 'puedo mudarme', // Spanish
    'elegibel', 'rekisito', 'por mi', // Papiamento
  ]
  const lowerQuery = query.toLowerCase()
  return eligibilityKeywords.some(keyword => lowerQuery.includes(keyword))
}

export function isRealEstateQuery(query: string): boolean {
  const realEstateKeywords = [
    'real estate', 'property', 'house', 'apartment', 'buy home', 'purchase property',
    'housing', 'rent', 'buy a house', 'property investment',
    'onroerend goed', 'huis', 'appartement', 'woning', // Dutch
    'bienes raíces', 'propiedad', 'casa', 'apartamento', 'comprar casa', // Spanish
    'kas', 'propiedat', 'apartamento', // Papiamento
  ]
  const lowerQuery = query.toLowerCase()
  return realEstateKeywords.some(keyword => lowerQuery.includes(keyword))
}

export function isCaseSpecific(query: string): boolean {
  const caseKeywords = [
    'my situation', 'my case', 'i have', 'can i', 'am i eligible',
    'will i', 'should i', 'my company', 'my business', 'my passport',
    'my documents', 'personally', 'specifically',
  ]
  const lowerQuery = query.toLowerCase()
  return caseKeywords.some(keyword => lowerQuery.includes(keyword))
}

export async function getRelevantFormLinks(query: string, language: string, tenantId?: string): Promise<string> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabaseAdmin = getSupabaseAdmin()

    if (isEligibilityQuery(query)) {
      const { data: forms } = await supabaseAdmin
        .from('form_definitions')
        .select('id, name, description')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .or('name.ilike.%eligibility%,name.ilike.%qualify%,description.ilike.%eligibility%,description.ilike.%qualify%')
        .limit(1)
      
      if (forms && forms.length > 0) {
        // Forms are auto-triggered by the chat route, so return empty
        // The AI will be instructed via system prompt to trigger the form
        return ''
      }
    }
    
    // Find active real estate forms
    if (isRealEstateQuery(query)) {
      const { data: forms } = await supabaseAdmin
        .from('form_definitions')
        .select('id, name, description')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .or('name.ilike.%real estate%,name.ilike.%property%,description.ilike.%real estate%,description.ilike.%property%')
        .limit(1)
      
      if (forms && forms.length > 0) {
        // Forms are auto-triggered by the chat route, so return empty
        return ''
      }
    }
  } catch (error) {
    console.error('Error fetching forms for getRelevantFormLinks:', error)
  }
  
  // No forms found or error - return empty (forms will be auto-triggered if they exist)
  return ''
}

const KB_VECTOR_MATCH_THRESHOLD = 0.52
const KB_KEYWORD_MIN_VECTOR_RESULTS = 4
const KEYWORD_SEARCH_SIMILARITY = 0.48

const KEYWORD_STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'about', 'have', 'does', 'your', 'with', 'from',
  'this', 'that', 'they', 'them', 'will', 'would', 'could', 'should', 'there',
  'here', 'want', 'need', 'tell', 'know', 'like', 'just', 'also', 'very', 'much',
  'hoe', 'wat', 'voor', 'naar', 'deze', 'die', 'het', 'een', 'van', 'zijn',
  'que', 'como', 'para', 'por', 'los', 'las', 'una', 'uno', 'del', 'con',
  'kiko', 'kon', 'ta', 'bo', 'mi', 'nos', 'tin', 'por', 'fabor', 'mucho',
])

function extractKeywordTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^\w\sàáèéêëìíîïòóôùúüñç'-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !KEYWORD_STOP_WORDS.has(w))
    ),
  ].slice(0, 6)
}

// Perform vector similarity search (optional tenantId for multi-tenant)
export async function searchKnowledgeBase(
  query: string,
  language: string,
  limit: number = 5,
  tenantId?: string,
  options?: { matchThreshold?: number; embedQuery?: string }
): Promise<KnowledgeBaseEntry[]> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const queryEmbedding = await generateEmbedding(options?.embedQuery ?? query)

    const { data, error } = await supabaseAdmin.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      filter_tenant_id: tid,
      match_threshold: options?.matchThreshold ?? 0.6,
      match_count: limit,
      filter_language: language,
    })

    if (error) {
      console.error('Error searching knowledge base:', error)
      return []
    }

    return await enrichKbWithMetadata(data || [])
  } catch (error) {
    console.error('Error in searchKnowledgeBase:', error)
    return []
  }
}

/** Search all KB languages for tenant — primary RAG path (no missed chunks from wrong language tag). */
export async function searchKnowledgeBaseAllLanguages(
  embedQuery: string,
  limit: number = 15,
  tenantId?: string,
  matchThreshold: number = KB_VECTOR_MATCH_THRESHOLD
): Promise<KnowledgeBaseEntry[]> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const queryEmbedding = await generateEmbedding(embedQuery)

    const { data, error } = await supabaseAdmin.rpc('match_knowledge_base_all_languages', {
      query_embedding: queryEmbedding,
      filter_tenant_id: tid,
      match_threshold: matchThreshold,
      match_count: limit,
    })

    if (error) {
      console.warn('[KB] multilingual RPC unavailable, using parallel language search:', error.message)
      return searchKnowledgeBaseParallelLanguages(embedQuery, limit, tid, matchThreshold)
    }

    return await enrichKbWithMetadata(data || [])
  } catch (error) {
    console.error('Error in searchKnowledgeBaseAllLanguages:', error)
    return searchKnowledgeBaseParallelLanguages(embedQuery, limit, tenantId ?? DEFAULT_TENANT_ID, matchThreshold)
  }
}

async function searchKnowledgeBaseParallelLanguages(
  embedQuery: string,
  limit: number,
  tenantId: string,
  matchThreshold: number
): Promise<KnowledgeBaseEntry[]> {
  const langs = ['EN', 'NL', 'ES', 'PA'] as const
  const batches = await Promise.all(
    langs.map((lang) =>
      searchKnowledgeBase(embedQuery, lang, limit, tenantId, {
        embedQuery,
        matchThreshold,
      })
    )
  )
  return mergeKbResults(batches, limit)
}

/** Keyword fallback when vector search returns too few hits */
async function supplementKbWithKeywordSearch(
  query: string,
  tenantId: string,
  limit: number
): Promise<KnowledgeBaseEntry[]> {
  const terms = extractKeywordTerms(query)
  if (!terms.length || limit <= 0) return []

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const orFilter = terms
      .flatMap((term) => {
        const safe = term.replace(/[%_]/g, '')
        return [`title.ilike.%${safe}%`, `content.ilike.%${safe}%`]
      })
      .join(',')

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('id, title, content, category, language, tags')
      .eq('tenant_id', tenantId)
      .or(orFilter)
      .limit(limit)

    if (error || !data?.length) return []

    return data.map((row) => ({
      ...row,
      category: row.category as KnowledgeBaseEntry['category'],
      language: row.language as KnowledgeBaseEntry['language'],
      tags: row.tags || [],
      similarity: KEYWORD_SEARCH_SIMILARITY,
    }))
  } catch (error) {
    console.error('Keyword KB supplement failed:', error)
    return []
  }
}

function mergeKbResults(batches: KnowledgeBaseEntry[][], limit: number): KnowledgeBaseEntry[] {
  const byId = new Map<string, KnowledgeBaseEntry>()
  for (const batch of batches) {
    for (const entry of batch) {
      const existing = byId.get(entry.id)
      if (!existing || (entry.similarity ?? 0) > (existing.similarity ?? 0)) {
        byId.set(entry.id, entry)
      }
    }
  }
  return [...byId.values()]
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit)
}

/**
 * RAG search: all languages + keyword supplement so scraped/manual chunks are not missed.
 */
export async function searchKnowledgeBaseWithFallback(
  query: string,
  language: string,
  limit: number = 15,
  tenantId?: string
): Promise<{ entries: KnowledgeBaseEntry[]; usedFallback: boolean; sourceLanguages: string[] }> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  const embedQuery = expandKbSearchQuery(query, language)

  const vectorResults = await searchKnowledgeBaseAllLanguages(embedQuery, limit, tid)

  let entries = vectorResults
  if (vectorResults.length < KB_KEYWORD_MIN_VECTOR_RESULTS) {
    const keywordHits = await supplementKbWithKeywordSearch(
      embedQuery,
      tid,
      limit - vectorResults.length
    )
    entries = mergeKbResults([vectorResults, keywordHits], limit)
  }

  const usedFallback = entries.some((e) => e.language && e.language !== language)
  const sourceLanguages = [...new Set(entries.map((e) => e.language).filter(Boolean))]

  return { entries, usedFallback, sourceLanguages }
}

async function enrichKbWithMetadata(entries: KnowledgeBaseEntry[]): Promise<KnowledgeBaseEntry[]> {
  if (!entries.length) return entries
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const ids = entries.map((e) => e.id)
    const { data } = await supabaseAdmin
      .from('knowledge_base')
      .select('id, metadata')
      .in('id', ids)

    const metaMap = new Map((data || []).map((r: { id: string; metadata?: Record<string, unknown> }) => [r.id, r.metadata || {}]))
    return entries.map((e) => ({ ...e, metadata: metaMap.get(e.id) || e.metadata }))
  } catch {
    return entries
  }
}

/** Build action guidance block from KB entries with action metadata */
export function buildActionGuidance(entries: KnowledgeBaseEntry[]): string {
  const actions = entries
    .map((e) => e.metadata)
    .filter((m): m is KnowledgeBaseAction & Record<string, unknown> =>
      !!m && typeof m.action_type === 'string' && m.action_type !== 'none'
    )

  if (!actions.length) return ''

  const lines = actions.map((m) => {
    if (m.action_type === 'link' && m.action_url) {
      return `- Guide the customer to register or take the next step at: ${m.action_url}`
    }
    if (m.action_type === 'form' && m.action_form_id) {
      return `- Offer the customer the related form (form ID: ${m.action_form_id}) to complete their request.`
    }
    return ''
  }).filter(Boolean)

  if (!lines.length) return ''
  return `\n### ACTION GUIDANCE (from knowledge base)\nAfter answering, help the customer take the next step:\n${lines.join('\n')}`
}

async function getActiveForms(tenantId?: string) {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('form_definitions')
    .select('*')
    .eq('tenant_id', tid)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching forms:', error)
    return []
  }
  return data || []
}

async function getFormSubmission(leadId: string, formId: string, tenantId?: string) {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('form_submissions')
    .select('*')
    .eq('tenant_id', tid)
    .eq('lead_id', leadId)
    .eq('form_id', formId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching submission:', error)
  }
  return data
}

/** Log questions the KB could not answer (for dashboard gap analysis). */
export async function logUnansweredQuery(
  query: string,
  language: string,
  tenantId?: string
): Promise<void> {
  if (!query?.trim()) return
  try {
    const { DEFAULT_TENANT_ID } = await import('./tenant')
    const tid = tenantId ?? DEFAULT_TENANT_ID
    const supabaseAdmin = getSupabaseAdmin()
    const normalized = query.trim().slice(0, 500)

    const { data: existing } = await supabaseAdmin
      .from('unanswered_queries')
      .select('id, frequency')
      .eq('tenant_id', tid)
      .eq('query', normalized)
      .eq('language', language)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('unanswered_queries')
        .update({
          frequency: (existing.frequency || 1) + 1,
          last_asked: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('unanswered_queries').insert({
        tenant_id: tid,
        query: normalized,
        language,
        frequency: 1,
      })
    }
  } catch (err) {
    console.error('[KB] Failed to log unanswered query:', err)
  }
}

// Build context from retrieved knowledge base entries (labels each chunk's stored language)
export function buildContext(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return 'No relevant information found in the knowledge base.'
  }

  const langNames: Record<string, string> = {
    EN: 'English',
    NL: 'Dutch',
    ES: 'Spanish',
    PA: 'Papiamentu',
  }

  return entries
    .map((entry, idx) => {
      const langLabel = langNames[entry.language] || entry.language || 'unknown'
      return `[Source ${idx + 1}: ${entry.title} | stored in: ${langLabel}]\n${entry.content}\n`
    })
    .join('\n')
}

// Helper to check if a form should be triggered based on user message
const INSURANCE_FORM_INTENTS: { patterns: RegExp[]; keywords: string[] }[] = [
  {
    patterns: [/\b(claim|klaim|reclam|aksidente|accident|damage|schade)\b/i],
    keywords: ['claim', 'accident', 'damage', 'intake', 'incident'],
  },
  {
    patterns: [/\b(register|inskrib|signup|inschrij|new policy|pòlisa nobo)\b/i],
    keywords: ['register', 'registration', 'signup', 'enroll', 'inskrib'],
  },
  {
    patterns: [/\b(quote|cotiz|offerte|kotisashon|prèis|price)\b/i],
    keywords: ['quote', 'price', 'cotiz', 'offerte'],
  },
  {
    patterns: [/\b(policy change|wijzig|cambio|change request)\b/i],
    keywords: ['change', 'update', 'modify', 'policy change'],
  },
]

export function isFormTriggered(userMessage: string, formDescription: string, formName: string): boolean {
  const lowerMsg = userMessage.toLowerCase()
  const lowerDesc = formDescription.toLowerCase()
  const lowerName = formName.toLowerCase()
  const combined = `${lowerName} ${lowerDesc}`

  // Insurance intent keywords
  for (const intent of INSURANCE_FORM_INTENTS) {
    const msgMatches = intent.patterns.some((p) => p.test(lowerMsg))
    const formMatches = intent.keywords.some((k) => combined.includes(k))
    if (msgMatches && formMatches) return true
  }

  // Direct name mention
  if (lowerMsg.includes(lowerName)) {
    return true
  }

  // Significant word overlap with description
  const descWords = lowerDesc.split(/\W+/).filter(w => w.length > 3)
  const matchCount = descWords.filter(w => lowerMsg.includes(w)).length

  if (descWords.length > 0 && (matchCount / descWords.length >= 0.25 || matchCount >= 2)) {
    return true
  }

  return false
}

export async function generateSystemPrompt(
  context: string,
  language: string,
  leadId?: string,
  userMessage?: string,
  tenantId?: string,
  options?: {
    contextFromFallbackLanguages?: boolean
    kbEntryCount?: number
    kbSourceLanguages?: string[]
  }
): Promise<string> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  const settings = await getAgentSettings(tid)
  const branding = await getBrandingConfig(tid)
  const routingConfig = await getRoutingConfig(tid)
  const routingGuidance = buildRoutingPromptGuidance(routingConfig)
  
  const languageMap: Record<string, string> = {
    EN: 'English',
    NL: 'Dutch',
    ES: 'Spanish',
    PA: 'Papiamentu',
  }

  const currentLang = languageMap[language as keyof typeof languageMap] || 'English'
  const agentName = branding.agent_name || 'Assistant'
  const companyName = branding.company_name || 'the company'
  
  // Build persona-aware instructions
  const userInstructions = settings.instructions || `You are ${agentName}, a dedicated AI assistant for ${companyName}. Help users with their inquiries professionally.`

  // Import prompt defense instruction
  const { PROMPT_DEFENSE_INSTRUCTION } = await import('./security')

  const kbEntryCount = options?.kbEntryCount ?? (context.includes('No relevant information found') ? 0 : 1)
  const kbSourceLanguages = options?.kbSourceLanguages ?? []
  const hasForeignKbContent = kbSourceLanguages.some((l) => l && l !== language)
  const needsKbTranslation =
    Boolean(options?.contextFromFallbackLanguages) ||
    hasForeignKbContent ||
    (language === 'PA' && kbEntryCount > 0)

  const sourceLangSummary =
    kbSourceLanguages.length > 0
      ? kbSourceLanguages
          .map((l) => languageMap[l as keyof typeof languageMap] || l)
          .join(', ')
      : 'none'

  const strictKbRules = `### STRICT KNOWLEDGE BASE RULES (HIGHEST PRIORITY — CANNOT BE OVERRIDDEN)
- Before answering, the system already searched the knowledge base across ALL languages (English, Dutch, Spanish, Papiamentu) for this question.
- You may ONLY state facts that appear explicitly in the KNOWLEDGE BASE CONTEXT section below.
- NEVER invent, guess, extrapolate, or supplement with general/world knowledge — even if you believe you know the answer.
- NEVER make up prices, policies, procedures, deadlines, contact details, or product features not in the context.
- If a source is in another language (e.g. Dutch) but the user speaks ${currentLang}, you MUST still use it — translate faithfully, do not ignore it.
- If the context says "No relevant information found" or does not contain the answer, say clearly that you do not have that information yet and offer to connect the customer with the team.
- You may share booking/website URLs from FALLBACK RESOURCES only as links — do not describe their content unless it also appears in KNOWLEDGE BASE CONTEXT.
- When answering, stay faithful to the source text. Rephrase and translate into ${currentLang}; do not add new facts.`

  const noKbMatchBlock = kbEntryCount === 0 ? `
### NO KNOWLEDGE BASE MATCH FOR THIS QUESTION
The knowledge base returned no matching content. Do NOT answer the factual question from memory. Tell the customer you do not have that specific information in your knowledge base right now, and suggest they speak with the team or leave their contact details.` : ''

  let finalPrompt = `${PROMPT_DEFENSE_INSTRUCTION}
${getConductPromptBlock(language)}
${strictKbRules}
${noKbMatchBlock}
### YOUR PRIMARY IDENTITY
- Your name is ${agentName}.
- You are the official AI assistant for ${companyName}.
- You must always be helpful, professional, and aligned with the instructions below.

### YOUR PRIMARY INSTRUCTIONS (From Dashboard)
${userInstructions}

### CRITICAL LANGUAGE INSTRUCTION
- **You MUST respond ONLY in ${currentLang}.**
- The user is speaking ${currentLang}, and you must match them perfectly.
${language === 'PA' ? getPapiamentuPromptGuide() : ''}${needsKbTranslation ? `
### KNOWLEDGE BASE TRANSLATION (REQUIRED)
The knowledge base was searched in all languages. Chunks retrieved for this question are stored in: ${sourceLangSummary}.
The user speaks ${currentLang}. You MUST translate and adapt every relevant fact into correct ${currentLang}${language === 'PA' ? ' (Buki di Oro Curaçao orthography)' : ''}.
- Do NOT copy Dutch, English, or Spanish sentences verbatim into your reply.
- Do NOT claim you lack information if any source below contains the answer in another language — translate it.
- Combine facts from multiple sources when they refer to the same topic.` : ''}
### CRITICAL LINK RULE
- **When you include any URL (e.g. booking link, website), NEVER wrap it in parentheses or brackets.** Output the raw URL so it stays clickable (e.g. "Book here: https://..." not "Book here: (https://...)"). Links must work when the user clicks them.
${language === 'PA' ? `- **PAPIAMENTU LINK CTA:** Tell the customer **"Bishitá e link"** or **"Bo por bishitá e link aki:"** followed by the URL. NEVER use Spanish "visita/visitar" or English "visit/click the link". Use **e link** (not el/la link).` : ''}

### KNOWLEDGE BASE CONTEXT (Use this to answer questions)
${context}

### FALLBACK RESOURCES
- ${branding.booking_url ? `Book an Appointment: ${branding.booking_url}` : ''}
- Company Website: ${branding.company_website || '#'}

### CUSTOMER IDENTIFICATION PROTOCOL
- When a customer describes an urgent situation (accident, claim, damage, emergency, theft) or asks about their existing policy/account, collect their email or policy number so the system can identify them.
- Say something like: "I want to make sure we can help you as quickly as possible. Could you share the email address or policy number you registered with us?"
- If the customer provides an email, phone, or policy number, the system will automatically check if they are an existing customer.
- If a customer is identified as existing (you will see a CUSTOMER IDENTIFIED note in the conversation), acknowledge them by name and let them know their information has been found.
- For urgent situations (accidents, emergencies, claims), reassure the customer that you are connecting them with the appropriate department and a team member will follow up.
- Collect policy or account numbers via forms or when the customer asks about their existing policy — never ask for passwords or SSN.
${routingGuidance ? `\n\n${routingGuidance}` : ''}`

  const activeForms = await getActiveForms(tid)
  console.log('[FORM DEBUG] Active forms:', activeForms.length, 'leadId:', leadId, 'hasUserMessage:', !!userMessage)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:236',message:'Active forms fetched',data:{activeFormsCount:activeForms.length,leadId:leadId||'none',hasUserMessage:!!userMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  let formInstructions = ''
  let hasActiveForm = false
  
  if (leadId && activeForms.length > 0) {
    for (const form of activeForms) {
      const submission = await getFormSubmission(leadId, form.id, tid)
      if (submission && submission.status === 'in_progress') {
        const answers = submission.answers || {}
        const missingFields = form.fields.filter((f: any) => !answers[f.key])
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:264',message:'Found in_progress form - continuing',data:{formId:form.id,formName:form.name,existingAnswersCount:Object.keys(answers).length,missingFieldsCount:missingFields.length,allFieldsCount:form.fields.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        if (missingFields.length > 0) {
          hasActiveForm = true
          console.log('[FORM DEBUG] Continuing in_progress form:', form.name, 'missing fields:', missingFields.length, 'next field:', missingFields[0]?.label)
          formInstructions = `
### ACTIVE CONVERSATIONAL FORM: ${form.name}
The user is interested in ${form.name}. Your mission is to collect the information naturally through conversation.

**CRITICAL INSTRUCTION:**
1. **Ask ONLY the NEXT missing question.** Do NOT list multiple questions.
2. **Be extremely conversational.** Acknowledge what they said, then ask the next piece of info.
3. If they already provided multiple pieces of info, acknowledge them and skip to the next missing field.
4. **DO NOT** ask for their name, email, or phone number if they are already listed below or if you've already asked for them in this turn.

**Field to collect NOW (Ask ONLY this):**
- ${missingFields[0].label}: ${missingFields[0].question}

**Remaining Fields (Do NOT ask these yet):**
${missingFields.slice(1).map((f: any) => `- ${f.label}`).join('\n') || 'None'}

**Already collected (Do NOT ask again):**
${Object.entries(answers).map(([k, v]) => { const { sanitizeFormAnswer } = require('./security'); return `- ${k}: ${sanitizeFormAnswer(String(v))}`; }).join('\n') || 'None yet.'}

**Instructions for Form Mode:**
1. Focus on collecting the NEXT missing field.
2. Once all fields are collected, thank them and inform them that you've saved their details for our team to review.`
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:291',message:'Form instructions created from in_progress',data:{formId:form.id,formName:form.name,nextField:missingFields[0]?.label,instructionsLength:formInstructions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          break;
        }
      }
    }
    
    // If no in_progress form found, check if current message triggers a new form
    if (!hasActiveForm) {
      const defaultFormMode = (settings.default_form_mode || 'conversational') as 'conversational' | 'inline'
      
      for (const form of activeForms) {
        // Logic to detect if a form is triggered
        const isTriggered = userMessage && isFormTriggered(userMessage, form.description, form.name)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:303',message:'Form trigger check in prompt generation',data:{formId:form.id,formName:form.name,isTriggered,hasUserMessage:!!userMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        if (isTriggered) {
          const submission = await getFormSubmission(leadId, form.id)
          const answers = submission?.answers || {}
          const missingFields = form.fields.filter((f: any) => !answers[f.key])
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:306',message:'Form triggered - checking submission',data:{formId:form.id,formName:form.name,existingAnswersCount:Object.keys(answers).length,missingFieldsCount:missingFields.length,allFieldsCount:form.fields.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion

          if (missingFields.length > 0) {
            // Determine form mode: form-specific or global default
            const formMode = (form.form_mode || defaultFormMode) as 'conversational' | 'inline'
            
            if (formMode === 'inline') {
              // For inline forms, AI should ask permission first
              hasActiveForm = true
              formInstructions = `
### INLINE FORM AVAILABLE: ${form.name}
The user is interested in ${form.name}. You have a fillable form available that can collect this information quickly.

**CRITICAL INSTRUCTION:**
1. **Ask the user for permission** to show them a form. Say something like: "Would you like to fill out a quick form? It will help me assist you better."
2. **Wait for their agreement** (yes, sure, ok, etc.) before proceeding.
3. **DO NOT** show the form or ask questions yet - just ask for permission.
4. If they agree, you will be instructed to show the form in the next turn.

**Form Details:**
- Form Name: ${form.name}
- Fields to collect: ${form.fields.map((f: any) => f.label).join(', ')}
- Total fields: ${form.fields.length}

**Important:** Only ask for permission. Do not start asking questions or showing the form yet.`
            } else {
              // Conversational mode - ask questions step by step
              hasActiveForm = true
              console.log('[FORM DEBUG] New form triggered:', form.name, 'missing fields:', missingFields.length, 'next field:', missingFields[0]?.label)
              formInstructions = `
### ACTIVE CONVERSATIONAL FORM: ${form.name}
The user is interested in ${form.name}. Your mission is to collect the information naturally through conversation.

**CRITICAL INSTRUCTION:**
1. **Ask ONLY the NEXT missing question.** Do NOT list multiple questions.
2. **Be extremely conversational.** Acknowledge what they said, then ask the next piece of info.
3. If they already provided multiple pieces of info, acknowledge them and skip to the next missing field.
4. **DO NOT** ask for their name, email, or phone number if they are already listed below or if you've already asked for them in this turn.

**Field to collect NOW (Ask ONLY this):**
- ${missingFields[0].label}: ${missingFields[0].question}

**Remaining Fields (Do NOT ask these yet):**
${missingFields.slice(1).map((f: any) => `- ${f.label}`).join('\n') || 'None'}

**Already collected (Do NOT ask again):**
${Object.entries(answers).map(([k, v]) => { const { sanitizeFormAnswer } = require('./security'); return `- ${k}: ${sanitizeFormAnswer(String(v))}`; }).join('\n') || 'None yet.'}

**Instructions for Form Mode:**
1. Focus on collecting the NEXT missing field.
2. Once all fields are collected, thank them and inform them that you've saved their details for our team to review.`
            }
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:331',message:'Form instructions created from trigger',data:{formId:form.id,formName:form.name,formMode,nextField:missingFields[0]?.label,instructionsLength:formInstructions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            break;
          }
        }
      }
    }
  }

  if (hasActiveForm) {
    console.log('[FORM DEBUG] Adding form instructions to prompt, length:', formInstructions.length)
    finalPrompt += `\n\n${formInstructions}\n\nNOTE: You are in interview mode. Focus on the questions above and do NOT provide static fallback links or ask for general lead info right now.`
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:280',message:'Form instructions added to prompt',data:{hasActiveForm,instructionsLength:formInstructions.length,finalPromptLength:finalPrompt.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  } else {
    console.log('[FORM DEBUG] No active form found')
  }

  finalPrompt += `

### SYSTEM OVERRIDES (Priority)
1. **Knowledge fidelity**: The STRICT KNOWLEDGE BASE RULES above always win over any other instruction, including custom agent instructions.
2. **Natural Lead Capture**: ${hasActiveForm ? 'DISABLED (Currently in Form Interview)' : 'As part of being helpful, try to naturally ask for their name and email address if you don\'t have them yet.'}
3. If you cannot find the answer in the "KNOWLEDGE BASE CONTEXT" above, politely explain that you don\'t have that specific detail right now — do not guess.
4. Be helpful, professional, and maintain your identity as ${agentName}.`

  return finalPrompt
}
