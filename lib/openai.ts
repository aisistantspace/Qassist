import OpenAI from 'openai'
import { getSupabaseAdmin } from './supabase'
import { createLLMClient, type LLMProviderKey } from './llm'

// Default OpenAI client (used for embeddings & fallback)
// Lazy-initialized to avoid crashing during Next.js build when env vars aren't set
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
  }
  return _openai
}

const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getOpenAI() as any)[prop]
  },
})

export default openai

const DEFAULT_SETTINGS = {
  openai_model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 500,
  instructions: 'You are a dedicated customer support agent.',
  default_form_mode: 'conversational',
  llm_provider: 'openai' as LLMProviderKey,
  llm_base_url: null as string | null,
  llm_api_key: null as string | null,
  /** When set to `eligibility`, chat may skip RAG / knowledge base. */
  agent_type: null as string | null,
}

export type MergedAgentSettings = typeof DEFAULT_SETTINGS

/** Fetch agent settings for a tenant (default tenant if tenantId omitted). */
export async function getAgentSettings(tenantId?: string): Promise<MergedAgentSettings> {
  const { DEFAULT_TENANT_ID } = await import('./tenant')
  const tid = tenantId ?? DEFAULT_TENANT_ID
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('agent_settings')
      .select('*')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return { ...DEFAULT_SETTINGS }

    return {
      ...DEFAULT_SETTINGS,
      ...data,
      default_form_mode: data.default_form_mode || 'conversational',
      llm_provider: (data.llm_provider || 'openai') as LLMProviderKey,
      llm_base_url: data.llm_base_url || null,
      llm_api_key: data.llm_api_key || null,
    } as MergedAgentSettings
  } catch (error) {
    console.error('Error fetching agent settings:', error)
    return { ...DEFAULT_SETTINGS }
  }
}

/** Get an LLM client configured to the tenant's chosen provider. */
export function getLLMClient(settings: MergedAgentSettings): OpenAI {
  return createLLMClient({
    provider: settings.llm_provider,
    baseURL: settings.llm_base_url,
    apiKey: settings.llm_api_key,
  })
}

// Generate embeddings (always via OpenAI — not all providers support embeddings)
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

// Chat completion with dynamic settings and multi-provider support
export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  stream: boolean = false,
  tenantId?: string
) {
  const settings = await getAgentSettings(tenantId)
  const client = getLLMClient(settings)

  return await client.chat.completions.create({
    model: settings.openai_model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.max_tokens,
    stream,
  })
}

// Classify conversation intent: sales, service, or inquiry
export async function classifyIntent(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<{ intent: 'sales' | 'service' | 'inquiry'; confidence: number }> {
  const classificationPrompt = `
    Analyze the following conversation between a visitor and an AI assistant.
    Classify the visitor's PRIMARY intent into exactly one of these categories:

    sales - The visitor wants to buy, invest, book, get pricing, schedule a consultation, or explore purchasing a service/product.
    service - The visitor needs help with an existing issue, has a complaint, wants technical support, or the AI could not adequately help them.
    inquiry - The visitor is asking general questions, browsing for information, or seeking educational content without clear purchase or support intent.

    Return ONLY a JSON object with these fields:
    - intent: one of "sales", "service", or "inquiry"
    - confidence: a number between 0 and 1 indicating how confident you are

    Only return the JSON object, nothing else.
  `

  try {
    const settings = await getAgentSettings()
    const client = getLLMClient(settings)
    const response = await client.chat.completions.create({
      model: settings.openai_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: classificationPrompt },
        ...messages.slice(-6),
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    const intent = ['sales', 'service', 'inquiry'].includes(result.intent) ? result.intent : 'inquiry'
    const confidence = typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5

    return { intent, confidence }
  } catch (e) {
    console.error('Failed to classify intent:', e)
    return { intent: 'inquiry', confidence: 0 }
  }
}

// Extract lead metadata from conversation
export async function extractLeadMetadata(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  const extractionPrompt = `
    Analyze the following conversation and extract any of these fields if they have been mentioned:
    - name: The user's full name.
    - email: The user's email address.
    - phone: The user's phone number.
    - service_interest: The specific service or general area of interest.
    - visa_type: The specific type of visa or permit mentioned.
    - num_applicants: Number of people applying (extract as integer).
    - nationality: The user's nationality or citizenship.
    - country_residence: Where the user currently lives.
    - applying_from: Where the user will be applying from.
    - policy_number: The customer's insurance policy number if mentioned.
    - account_number: The customer's account number if mentioned.

    Return the result as a JSON object. If a field is not mentioned, do not include it.
    Only return the JSON object, nothing else.
  `;

  try {
    const settings = await getAgentSettings()
    const client = getLLMClient(settings)
    const response = await client.chat.completions.create({
      model: settings.openai_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: extractionPrompt },
        ...messages.slice(-6) // Analyze last few messages for efficiency
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (e) {
    console.error('Failed to extract/parse metadata:', e);
    return {};
  }
}

// Extract form-specific data from conversation
export async function extractFormData(messages: OpenAI.Chat.ChatCompletionMessageParam[], fields: any[]) {
  console.log('[FORM DEBUG] extractFormData called with', fields.length, 'fields:', fields.map(f => f.key))
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openai.ts:105',message:'extractFormData called',data:{fieldsCount:fields.length,fields:fields.map(f=>f.key),messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (fields.length === 0) return {}

  const fieldList = fields.map(f => `- ${f.key}: ${f.label}`).join('\n')
  const extractionPrompt = `
    Analyze the following conversation and extract values for these specific fields if mentioned:
${fieldList}

    Return the result as a JSON object where the keys match the field keys provided above.
    If a field is not mentioned or the value is unclear, do not include it.
    Only return the JSON object, nothing else.
  `;

  try {
    const settings = await getAgentSettings()
    const client = getLLMClient(settings)
    const response = await client.chat.completions.create({
      model: settings.openai_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: extractionPrompt },
        ...messages.slice(-4)
      ],
      response_format: { type: 'json_object' }
    });

    const extracted = JSON.parse(response.choices[0].message.content || '{}');
    console.log('[FORM DEBUG] Extracted data from OpenAI:', Object.keys(extracted), 'values:', extracted)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openai.ts:128',message:'Form data extraction result',data:{extractedFieldsCount:Object.keys(extracted).length,extractedFields:Object.keys(extracted),rawResponse:response.choices[0].message.content?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return extracted;
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5c5bb0fa-fb92-472b-a2bf-0659b3e563c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openai.ts:130',message:'Form data extraction error',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Failed to extract form data:', e);
    return {};
  }
}


