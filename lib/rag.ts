import { getSupabaseAdmin } from './supabase'
import { generateEmbedding, getAgentSettings } from './openai'
import { getBrandingConfig } from './branding'
import { getPapiamentuPromptGuide } from './papiamentu/prompt-guide'

export interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: 'FAQ' | 'Service' | 'Blog' | 'Policy'
  language: 'EN' | 'NL' | 'ES' | 'PA'
  tags: string[]
  embedding?: number[]
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

// Perform vector similarity search (optional tenantId for multi-tenant)
export async function searchKnowledgeBase(
  query: string,
  language: string,
  limit: number = 5,
  tenantId?: string
): Promise<KnowledgeBaseEntry[]> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const queryEmbedding = await generateEmbedding(query)

    const { data, error } = await supabaseAdmin.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      filter_tenant_id: tid,
      match_threshold: 0.7,
      match_count: limit,
      filter_language: language,
    })

    if (error) {
      console.error('Error searching knowledge base:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in searchKnowledgeBase:', error)
    return []
  }
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

// Build context from retrieved knowledge base entries
export function buildContext(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return 'No relevant information found in the knowledge base.'
  }

  return entries
    .map(
      (entry, idx) =>
        `[Source ${idx + 1}: ${entry.title}]\n${entry.content}\n`
    )
    .join('\n')
}

// Helper to check if a form should be triggered based on user message
export function isFormTriggered(userMessage: string, formDescription: string, formName: string): boolean {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:174',message:'isFormTriggered called',data:{userMessage:userMessage.substring(0,100),formName,formDescription:formDescription.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const lowerMsg = userMessage.toLowerCase()
  const lowerDesc = formDescription.toLowerCase()
  const lowerName = formName.toLowerCase()
  
  // Direct name mention
  if (lowerMsg.includes(lowerName)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:180',message:'Form triggered by name match',data:{formName,matched:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return true
  }
  
  // Significant word overlap with description
  const descWords = lowerDesc.split(/\W+/).filter(w => w.length > 3)
  const matchCount = descWords.filter(w => lowerMsg.includes(w)).length
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:186',message:'Form trigger keyword analysis',data:{formName,descWordsCount:descWords.length,matchCount,threshold:descWords.length>0?matchCount/descWords.length:0,matched:descWords.length>0&&(matchCount/descWords.length>=0.25||matchCount>=2)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // If more than 25% of description words are in message, or at least 2 words if description is short
  if (descWords.length > 0 && (matchCount / descWords.length >= 0.25 || matchCount >= 2)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:187',message:'Form triggered by keyword match',data:{formName,matched:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return true
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rag.ts:189',message:'Form not triggered',data:{formName,matched:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return false
}

export async function generateSystemPrompt(
  context: string,
  language: string,
  leadId?: string,
  userMessage?: string,
  tenantId?: string
): Promise<string> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  const settings = await getAgentSettings(tid)
  const branding = await getBrandingConfig(tid)
  
  const languageMap: Record<string, string> = {
    EN: 'English',
    NL: 'Dutch',
    ES: 'Spanish',
    PA: 'Papiamento',
  }

  const currentLang = languageMap[language as keyof typeof languageMap] || 'English'
  const agentName = branding.agent_name || 'Assistant'
  const companyName = branding.company_name || 'the company'
  
  // Build persona-aware instructions
  const userInstructions = settings.instructions || `You are ${agentName}, a dedicated AI assistant for ${companyName}. Help users with their inquiries professionally.`

  // Import prompt defense instruction
  const { PROMPT_DEFENSE_INSTRUCTION } = await import('./security')

  let finalPrompt = `${PROMPT_DEFENSE_INSTRUCTION}
### YOUR PRIMARY IDENTITY
- Your name is ${agentName}.
- You are the official AI assistant for ${companyName}.
- You must always be helpful, professional, and aligned with the instructions below.

### YOUR PRIMARY INSTRUCTIONS (From Dashboard)
${userInstructions}

### CRITICAL LANGUAGE INSTRUCTION
- **You MUST respond ONLY in ${currentLang}.**
- The user is speaking ${currentLang}, and you must match them perfectly.
${language === 'PA' ? getPapiamentuPromptGuide() : ''}
### CRITICAL LINK RULE
- **When you include any URL (e.g. booking link, website), NEVER wrap it in parentheses or brackets.** Output the raw URL so it stays clickable (e.g. "Book here: https://..." not "Book here: (https://...)"). Links must work when the user clicks them.

### KNOWLEDGE BASE CONTEXT (Use this to answer questions)
${context}

### FALLBACK RESOURCES
- ${branding.booking_url ? `Book an Appointment: ${branding.booking_url}` : ''}
- Company Website: ${branding.company_website || '#'}`

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
1. **Natural Lead Capture**: ${hasActiveForm ? 'DISABLED (Currently in Form Interview)' : 'As part of being helpful, try to naturally ask for their name and email address if you don\'t have them yet.'}
2. If you cannot find the answer in the "KNOWLEDGE BASE CONTEXT" above, politely explain that you don\'t have that specific detail right now.
3. Be helpful, professional, and maintain your identity as ${agentName}.`

  return finalPrompt
}
