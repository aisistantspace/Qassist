'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  PaperAirplaneIcon, 
  XMarkIcon, 
  EllipsisHorizontalIcon,
  HomeIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowPathIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'
import InlineForm from './InlineForm'
import type { FormField } from '@/lib/types'
import { enniaTheme, isEnniaBrand } from '@/lib/demo-themes/ennia'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  formData?: {
    formId: string
    formName: string
    fields: FormField[]
    mode: 'inline'
  }
}

interface BrandingConfig {
  company_name: string
  agent_name: string
  agent_avatar_url: string
  primary_color: string
  welcome_message: string
  developer_branding_enabled: boolean
  logo_url?: string
  widget_title?: string
}

interface Props {
  onLeadCaptured?: (leadId: string) => void
  onClose?: () => void
  embedded?: boolean
  theme?: 'light' | 'dark'
  primaryColor?: string
  suggestedMessages?: string[]
  initialMessages?: string[]
  placeholder?: string
  disclaimer?: string
  defaultLanguage?: ChatLanguage
}

function resolveInitialLanguage(
  langParam: string | undefined,
  tenantSlug: string | null,
  defaultLanguage?: ChatLanguage
): ChatLanguage {
  const codes = ['EN', 'NL', 'ES', 'PA'] as const
  if (langParam && codes.includes(langParam as ChatLanguage)) return langParam as ChatLanguage
  if (defaultLanguage) return defaultLanguage
  if (tenantSlug?.toLowerCase() === 'ennia') return 'PA'
  return 'EN'
}

function welcomeForLanguage(
  lang: ChatLanguage,
  agent: string,
  brandingWelcome?: string,
  initialMessages?: string[]
): string {
  const welcomeByLang: Record<ChatLanguage, string> = {
    EN: initialMessages?.[0] || brandingWelcome || `Hi! I'm ${agent}. How can I help you today?`,
    NL: `Hallo! Ik ben ${agent}, je assistent. Hoe kan ik je helpen?`,
    ES: `¡Hola! Soy ${agent}, tu asistente. ¿Cómo te puedo ayudar hoy?`,
    PA: PA_WELCOME(agent),
  }
  return welcomeByLang[lang] || welcomeByLang.EN
}

// Default values while loading
const DEFAULT_AVATAR = "https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50"
const DEFAULT_PRIMARY_COLOR = "#3A7D7D"

type ChatLanguage = 'EN' | 'NL' | 'ES' | 'PA'

const LANGUAGES: { code: ChatLanguage; name: string }[] = [
  { code: 'EN', name: 'English' },
  { code: 'NL', name: 'Nederlands' },
  { code: 'ES', name: 'Español' },
  { code: 'PA', name: 'Papiamentu' },
]

const PLACEHOLDERS: Record<ChatLanguage, string> = {
  EN: 'Type your message...',
  NL: 'Stel je vraag...',
  ES: 'Escribe tu pregunta...',
  PA: 'Skribí bo pregunta...',
}

const PA_WELCOME = (agentName: string) =>
  `Bon dia! 👋 Mi ta ${agentName}, bo asistente. Kon mi por yudabo awe?`

// URL regex: do not include trailing ), ], > so links stay clickable
const URL_SPLIT_REGEX = /(https?:\/\/[^\s)\]\}>]+)/g
const URL_TEST_REGEX = /^https?:\/\/[^\s)\]\}>]+$/

// Component to render text with clickable links
const MessageContent = ({ content, isUser }: { content: string, isUser: boolean }) => {
  const parts = content.split(URL_SPLIT_REGEX)

  return (
    <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (URL_TEST_REGEX.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80 ${
                isUser ? 'text-white font-medium' : 'text-blue-600 font-medium'
              }`}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

export default function ModernChatInterface({
  onLeadCaptured,
  onClose,
  embedded = false,
  theme = 'light',
  primaryColor: propPrimaryColor,
  suggestedMessages = [],
  initialMessages,
  placeholder,
  disclaimer,
  defaultLanguage: defaultLanguageProp,
}: Props) {
  const searchParams = useSearchParams()
  const tenantSlug = searchParams.get('slug') ?? searchParams.get('tenantSlug')
  const tenantId = searchParams.get('tenant') ?? searchParams.get('tenantId')
  const langParam = searchParams.get('lang')?.toUpperCase()
  const initialLang = resolveInitialLanguage(langParam, tenantSlug, defaultLanguageProp)
  const [branding, setBranding] = useState<BrandingConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<ChatLanguage>(initialLang)
  const [languageExplicit, setLanguageExplicit] = useState(!!langParam || initialLang !== 'EN')
  const [widgetSuggestions, setWidgetSuggestions] = useState<string[]>([])
  const [inputFocused, setInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'
  const primaryColor = propPrimaryColor || branding?.primary_color || DEFAULT_PRIMARY_COLOR
  const agentName = branding?.agent_name || 'Assistant'
  const avatarUrl = branding?.agent_avatar_url || DEFAULT_AVATAR
  const isEnnia = isEnniaBrand(branding?.company_name, primaryColor)
  const headerLogo = isEnnia
    ? enniaTheme.logo.white
    : branding?.logo_url || avatarUrl

  useEffect(() => {
    fetchBranding()
    fetchWidgetConfig()
  }, [tenantSlug, tenantId])

  useEffect(() => {
    if (langParam || !defaultLanguageProp) return
    setSelectedLanguage(defaultLanguageProp)
    setLanguageExplicit(defaultLanguageProp !== 'EN')
  }, [defaultLanguageProp, langParam])

  const fetchBranding = async () => {
    try {
      let url = '/api/settings/branding?t=' + Date.now()
      if (tenantSlug) url += '&slug=' + encodeURIComponent(tenantSlug)
      if (tenantId) url += '&tenant=' + encodeURIComponent(tenantId)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setBranding(data)

        const agent = data.agent_name || 'your assistant'
        const ennia = isEnniaBrand(data.company_name, data.primary_color)
        let lang = selectedLanguage
        if (ennia && !langParam) {
          lang = 'PA'
          setSelectedLanguage('PA')
          setLanguageExplicit(true)
        }

        if (messages.length === 0) {
          const welcome = welcomeForLanguage(lang, agent, data.welcome_message, initialMessages)
          setMessages([
            {
              role: 'assistant' as const,
              content: welcome,
              timestamp: new Date().toISOString(),
            },
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error)
    }
  }

  const fetchWidgetConfig = async () => {
    try {
      let url = '/api/settings/widget?t=' + Date.now()
      if (tenantSlug) url += '&slug=' + encodeURIComponent(tenantSlug)
      if (tenantId) url += '&tenant=' + encodeURIComponent(tenantId)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.suggested_messages && Array.isArray(data.suggested_messages) && data.suggested_messages.length > 0) {
          setWidgetSuggestions(data.suggested_messages)
        }
      }
    } catch (error) {
      console.error('Error fetching widget config:', error)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-trigger form from URL parameter
  useEffect(() => {
    const formId = searchParams.get('form')
    if (formId && leadId && !loading && messages.length > 0) {
      // Only trigger once - check if we've already triggered this form
      const hasTriggered = messages.some(msg => 
        msg.formData?.formId === formId
      )
      
      if (!hasTriggered) {
        // Small delay to ensure chat is ready
        const timer = setTimeout(() => {
          // Trigger the form with empty message
          sendMessage('', formId)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, searchParams, messages.length])

  const createLead = async () => {
    try {
      const body: Record<string, unknown> = {
        consent: true,
        source_page: window.location.pathname,
      }
      if (tenantSlug) body.slug = tenantSlug
      if (tenantId) body.tenantId = tenantId
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setLeadId(data.lead.id)
      onLeadCaptured?.(data.lead.id)

      // If returning customer with recent conversation, resume it
      if (data.existed && data.recentConversation?.id) {
        setConversationId(data.recentConversation.id)
        if (data.recentConversation.messages?.length > 0) {
          const resumedMessages: Message[] = data.recentConversation.messages.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp || new Date().toISOString(),
            formData: m.formData,
          }))
          setMessages(prev => {
            // Keep welcome message, then add resumed conversation
            const welcome = prev.length > 0 ? [prev[0]] : []
            return [
              ...welcome,
              { role: 'assistant' as const, content: `Welcome back! I have our previous conversation loaded.`, timestamp: new Date().toISOString() },
              ...resumedMessages,
            ]
          })
        }
      }

      return data.lead.id
    } catch (error) {
      console.error('Error creating lead:', error)
      return 'temp-lead'
    }
  }

  const handleLanguageSelect = (lang: ChatLanguage) => {
    setSelectedLanguage(lang)
    setLanguageExplicit(true)
    // Update welcome message when user switches before chatting
    if (messages.length === 1 && messages[0].role === 'assistant') {
      const agent = branding?.agent_name || 'Assistant'
      setMessages([
        {
          role: 'assistant',
          content: welcomeForLanguage(lang, agent, branding?.welcome_message, initialMessages),
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  const sendMessage = async (text: string, formId?: string) => {
    // Allow empty message if formId is provided (for auto-triggering forms)
    if (!text.trim() && !formId) return
    if (loading) return

    // Only add user message if there's actual text
    if (text.trim()) {
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
    }
    
    setLoading(true)

    try {
      // Lazy lead creation
      let currentLeadId = leadId
      if (!currentLeadId) {
        currentLeadId = await createLead()
      }

      const chatBody: Record<string, unknown> = {
        message: text,
        conversationId,
        leadId: currentLeadId,
        language: selectedLanguage,
        languageExplicit,
        triggerFormId: formId,
      }
      if (tenantSlug) chatBody.slug = tenantSlug
      if (tenantId) chatBody.tenantId = tenantId
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      })

      const data = await res.json()

      if (data.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          formData: data.formData,
        }
        setMessages(prev => [...prev, assistantMessage])
        setConversationId(data.conversationId)
        if (data.languageUsed && !languageExplicit) {
          setSelectedLanguage(data.languageUsed)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div 
      className={`flex flex-col h-full ${isDark ? 'bg-gray-900' : 'bg-white'}`}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="w-full shrink-0">
        <header
          className={`relative flex items-center justify-between px-4 sm:px-5 py-3.5 border-b ${
            isEnnia ? 'text-white' : 'text-black'
          }`}
          style={
            isEnnia
              ? { backgroundColor: enniaTheme.colors.greenDark, borderColor: enniaTheme.colors.greenDarker }
              : {
                  background:
                    'linear-gradient(0deg, rgba(0, 0, 0, 0.02) 0.44%, rgba(0, 0, 0, 0) 49.5%), #ffffff',
                }
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            {isEnnia ? (
              <img
                src={headerLogo}
                alt="ENNIA"
                className="h-7 w-auto shrink-0"
                width={enniaTheme.logo.whiteWidth}
                height={enniaTheme.logo.whiteHeight}
              />
            ) : (
              <>
                <div className="relative flex shrink-0 overflow-hidden rounded-full size-10 border border-gray-100">
                  <img src={avatarUrl} alt={agentName} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h1 className="font-semibold text-sm tracking-tight truncate text-gray-900">{agentName}</h1>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageSelect(lang.code)}
                className={`flex min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] items-center justify-center rounded-md transition-all ${
                  selectedLanguage === lang.code
                    ? isEnnia
                      ? 'scale-105 bg-white/15 ring-1 ring-white/25'
                      : 'scale-105 bg-gray-100 ring-1 ring-gray-200'
                    : isEnnia
                      ? 'opacity-70 hover:opacity-100 hover:bg-white/10'
                      : 'opacity-50 hover:opacity-100 hover:bg-gray-50'
                }`}
                title={lang.name}
                aria-label={`Switch to ${lang.name}`}
                aria-pressed={selectedLanguage === lang.code}
              >
                <span className="text-[11px] font-semibold tracking-wide leading-none">{lang.code}</span>
              </button>
            ))}
            <button
              className={`flex min-w-[44px] min-h-[44px] items-center justify-center rounded-md transition-all ${
                isEnnia
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-gray-500 opacity-90 hover:opacity-100 hover:bg-gray-100'
              }`}
              title="Open menu"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className={`flex min-w-[44px] min-h-[44px] items-center justify-center rounded-md transition-all ${
                  isEnnia
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 opacity-70 hover:opacity-100 hover:bg-gray-100'
                }`}
                title="Close chat"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Messages */}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-6 shadow-inner ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex flex-col gap-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
            >
              {msg.role === 'assistant' ? (
                <div className="flex flex-col gap-2 max-w-[85%]">
                  {msg.formData && msg.formData.mode === 'inline' ? (
                    <InlineForm
                      formId={msg.formData.formId}
                      formName={msg.formData.formName}
                      fields={msg.formData.fields}
                      leadId={leadId || 'temp'}
                      onSubmit={async () => {
                        const ackMessage: Message = {
                          role: 'assistant',
                          content: 'Thank you for submitting the form! I\'ve saved your information. How else can I help you?',
                          timestamp: new Date().toISOString(),
                        }
                        setMessages(prev => [...prev, ackMessage])
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                          <img src={avatarUrl} alt={agentName} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[12px] font-medium text-gray-900 tracking-tight">{agentName}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isDark ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
                        }`}
                        style={{ borderRadius: '18px 18px 18px 2px' }}
                      >
                        <MessageContent content={msg.content} isUser={false} />
                      </div>
                    </>
                  )}
                  
                  {i > 0 && (
                    <div className="flex items-center gap-3 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <HandThumbUpIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <HandThumbDownIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className="rounded-2xl px-4 py-2.5 text-white"
                    style={{ 
                      backgroundColor: primaryColor, 
                      borderRadius: '18px 18px 2px 18px' 
                    }}
                  >
                    <MessageContent content={msg.content} isUser={true} />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                  <img src={avatarUrl} alt={agentName} className="w-full h-full object-cover" />
                </div>
                <span className="text-[12px] font-medium text-gray-900 tracking-tight">{agentName}</span>
              </div>
              <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} style={{ borderRadius: '18px 18px 18px 2px' }}>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Messages */}
      {(suggestedMessages.length > 0 || widgetSuggestions.length > 0) && messages.length <= 5 && (
        <div className={`px-2 sm:px-4 py-2 flex flex-wrap gap-2 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {(suggestedMessages.length > 0 ? suggestedMessages : widgetSuggestions).map((suggestion, i) => (
            <button
              key={i}
              onClick={() => sendMessage(suggestion)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ borderColor: primaryColor + '40', borderWidth: '1px' }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className={`p-4 pb-[max(1rem,env(safe-area-inset-bottom))] relative z-50 shrink-0 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}
      >
        <div
          className="flex items-center gap-2 px-3 py-2.5 mx-2 sm:mx-4 mb-4 rounded-lg bg-white border transition-[border-color,box-shadow] duration-200 ease-out"
          style={{
            borderColor: inputFocused ? `${primaryColor}55` : '#e5e7eb',
            boxShadow: inputFocused
              ? `0 0 0 3px ${primaryColor}20`
              : '0 1px 2px 0 rgb(0 0 0 / 0.04)',
          }}
        >
          <button
            type="button"
            className="flex min-w-[44px] min-h-[44px] items-center justify-center -m-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Emoji"
          >
            <FaceSmileIcon className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={placeholder || PLACEHOLDERS[selectedLanguage]}
            rows={1}
            disabled={loading}
            className={`flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm resize-none py-0.5 max-h-40 overflow-y-auto leading-tight min-w-0 ${
              isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
            }`}
            style={{ fieldSizing: 'content' } as CSSProperties}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex min-w-[44px] min-h-[44px] items-center justify-center -m-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-md shrink-0"
            style={{ color: primaryColor }}
            aria-label="Send"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-2 flex items-center justify-center gap-1.5 opacity-80">
          {branding?.developer_branding_enabled && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-gray-400">
                <path d="M16 3.80316V12.1996C16 14.2987 14.2987 16 12.1996 16H3.79899C1.70127 16 0 14.2987 0 12.201V3.80177C0 1.70266 1.70266 0 3.80177 0H12.1968C14.2973 0 16 1.70266 16 3.80316Z" fill="currentColor"></path>
              </svg>
              <a target="_blank" href="https://astuteweb.agency" className="text-[11px] text-gray-400 font-medium hover:text-gray-600 transition-colors">
                Powered by Astute Web Agency
              </a>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
