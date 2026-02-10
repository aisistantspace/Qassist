/**
 * Multi-provider LLM abstraction.
 *
 * Supports any OpenAI-compatible API via the `openai` npm package
 * by changing the baseURL.  Built-in provider presets cover
 * OpenAI, Ollama (local), LM Studio (local), Groq, Together AI,
 * OpenRouter (routes to Anthropic/Google/Meta/etc.), and Custom.
 */

import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

export type LLMProviderKey =
  | 'openai'
  | 'ollama'
  | 'lmstudio'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'custom'

export interface LLMProviderPreset {
  key: LLMProviderKey
  label: string
  baseURL: string
  envKey: string                     // env var that holds the API key
  models: { value: string; label: string }[]
  requiresApiKey: boolean
  description: string
}

export const LLM_PROVIDERS: LLMProviderPreset[] = [
  {
    key: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    requiresApiKey: true,
    description: 'GPT-4o, GPT-4o-mini and other OpenAI models',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, affordable)' },
      { value: 'gpt-4o', label: 'GPT-4o (Most capable)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
    ],
  },
  {
    key: 'ollama',
    label: 'Ollama (Local)',
    baseURL: 'http://localhost:11434/v1',
    envKey: '',
    requiresApiKey: false,
    description: 'Run models locally via Ollama (llama3, mistral, etc.)',
    models: [
      { value: 'llama3.2', label: 'Llama 3.2' },
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'llama3', label: 'Llama 3' },
      { value: 'mistral', label: 'Mistral 7B' },
      { value: 'mixtral', label: 'Mixtral 8x7B' },
      { value: 'phi3', label: 'Phi-3' },
      { value: 'gemma2', label: 'Gemma 2' },
      { value: 'qwen2.5', label: 'Qwen 2.5' },
      { value: 'deepseek-r1', label: 'DeepSeek R1' },
      { value: 'codellama', label: 'Code Llama' },
    ],
  },
  {
    key: 'lmstudio',
    label: 'LM Studio (Local)',
    baseURL: 'http://localhost:1234/v1',
    envKey: '',
    requiresApiKey: false,
    description: 'Run models locally via LM Studio',
    models: [
      { value: 'local-model', label: 'Currently loaded model' },
    ],
  },
  {
    key: 'groq',
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    envKey: 'GROQ_API_KEY',
    requiresApiKey: true,
    description: 'Ultra-fast inference (Llama, Mixtral, Gemma)',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
  {
    key: 'together',
    label: 'Together AI',
    baseURL: 'https://api.together.xyz/v1',
    envKey: 'TOGETHER_API_KEY',
    requiresApiKey: true,
    description: 'Run open-source models in the cloud',
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo' },
      { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Turbo' },
      { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Turbo' },
      { value: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', label: 'DeepSeek R1 70B' },
    ],
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    requiresApiKey: true,
    description: 'Access 200+ models (Anthropic, Google, Meta, etc.) via one API',
    models: [
      { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Anthropic)' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Anthropic)' },
      { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku (Anthropic)' },
      { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Google)' },
      { value: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro (Google)' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (Meta)' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (via OpenRouter)' },
    ],
  },
  {
    key: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseURL: '',
    envKey: '',
    requiresApiKey: false,
    description: 'Any endpoint that implements the OpenAI chat completions API',
    models: [],
  },
]

export function getProviderPreset(key: string): LLMProviderPreset | undefined {
  return LLM_PROVIDERS.find((p) => p.key === key)
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface LLMConfig {
  provider: LLMProviderKey
  baseURL?: string | null
  apiKey?: string | null
  model?: string
}

/**
 * Build an OpenAI-SDK client pointing at the chosen provider.
 * Priority for API key:
 *   1. Explicit `apiKey` in config (from agent_settings.llm_api_key)
 *   2. Environment variable for the provider (e.g. GROQ_API_KEY)
 *   3. OPENAI_API_KEY as ultimate fallback (useful when provider stores key in env)
 * For local providers (ollama, lmstudio) no key is required.
 */
export function createLLMClient(config: LLMConfig): OpenAI {
  const preset = getProviderPreset(config.provider)
  const baseURL =
    config.baseURL || preset?.baseURL || 'https://api.openai.com/v1'

  // Resolve API key
  let apiKey = config.apiKey || ''
  if (!apiKey && preset?.envKey) {
    apiKey = process.env[preset.envKey] || ''
  }
  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY || ''
  }
  // Local providers don't need a key; pass a dummy to satisfy the SDK
  if (!apiKey && !preset?.requiresApiKey) {
    apiKey = 'not-needed'
  }

  return new OpenAI({ apiKey, baseURL })
}
