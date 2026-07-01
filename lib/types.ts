export interface Lead {
  id?: string
  name: string
  email: string
  phone?: string
  consent: boolean
  source_page: string
  utm_params?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }
  tags?: string[]
  created_at?: string
}

export type FormMode = 'conversational' | 'inline'

export interface FormField {
  key: string
  label: string
  question: string
  type: 'text' | 'number' | 'email' | 'select' | 'date'
  options?: string[] // For select type
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  formData?: {
    formId: string
    formName: string
    fields: FormField[]
    mode: 'inline' | 'conversational'
  }
}

export interface Conversation {
  id?: string
  lead_id: string
  messages: Message[]
  turn_count: number
  status: 'active' | 'completed' | 'escalated'
  language: 'EN' | 'NL' | 'ES' | 'PA'
  created_at?: string
  updated_at?: string
}

export interface ChatRequest {
  message: string
  conversationId?: string
  leadId: string
  language: 'EN' | 'NL' | 'ES' | 'PA'
  /** When true, the user explicitly picked a language (flag) — server honors it over auto-detect */
  languageExplicit?: boolean
  channel?: 'web' | 'whatsapp' | 'telegram'
  triggerFormId?: string
  tenantId?: string
  slug?: string
}

export interface ChatResponse {
  message: string
  conversationId: string
  shouldShowBooking: boolean
  turnCount: number
  languageUsed?: 'EN' | 'NL' | 'ES' | 'PA'
  formData?: {
    formId: string
    formName: string
    fields: FormField[]
    mode: 'inline' | 'conversational'
  }
}

export interface EventLog {
  id?: string
  event_type: 'wa_click' | 'assistant_open' | 'chat_started' | 'book_click' | 'form_submit'
  lead_id?: string
  metadata?: Record<string, any>
  created_at?: string
}

export const VISITOR_CATEGORIES = [
  'Investor',
  'Pensionado',
  'Rentier',
  'Digital-Nomad',
  'Employment',
  'General-Inquiry',
] as const

export type VisitorCategory = typeof VISITOR_CATEGORIES[number]


