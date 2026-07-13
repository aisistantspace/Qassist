'use client'

import { useState, useEffect, useRef } from 'react'
import type { Lead, Message, ChatResponse } from '@/lib/types'
import InlineForm from './InlineForm'

interface RecentConversation {
  id: string
  messages: any[]
  updatedAt: string
  status: string
}

interface ChatWidgetProps {
  lead: Lead
  embedded?: boolean
  initialLanguage?: 'EN' | 'NL' | 'ES' | 'PA'
  recentConversation?: RecentConversation | null
}

interface BrandingConfig {
  company_name: string
  agent_name: string
  booking_url?: string
}

const LANGUAGES = [
  { code: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'NL', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'PA', name: 'Papiamentu', flag: '🇨🇼' },
]

const DEFAULT_BOOKING_URL = 'https://www.getprobooking.com/livinginparadise/Immigration-Advice?utm_source=ai-assistant&utm_medium=chat&utm_campaign=assistant'

// URL regex: do not include trailing ), ], > so links stay clickable
const URL_SPLIT_REGEX = /(https?:\/\/[^\s)\]\}>]+)/g
const URL_TEST_REGEX = /^https?:\/\/[^\s)\]\}>]+$/
function MessageContent({ content }: { content: string }) {
  const parts = content.split(URL_SPLIT_REGEX)
  return (
    <>
      {parts.map((part, i) =>
        URL_TEST_REGEX.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-primary-600 hover:opacity-80">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function ChatWidget({ lead, embedded = false, initialLanguage = 'EN', recentConversation }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(recentConversation?.id || null)
  const [language, setLanguage] = useState<'EN' | 'NL' | 'ES' | 'PA'>(initialLanguage)
  const [languageExplicit, setLanguageExplicit] = useState(initialLanguage !== 'EN')
  const [showBooking, setShowBooking] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [branding, setBranding] = useState<BrandingConfig | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch branding on mount
  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/settings/branding?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setBranding({
          company_name: data.company_name || 'My Company',
          agent_name: data.agent_name || 'Assistant',
          booking_url: data.booking_url,
        })
      }
    } catch (error) {
      console.error('Error fetching branding:', error)
      // Set defaults on error
      setBranding({
        company_name: 'My Company',
        agent_name: 'Assistant',
      })
    }
  }

  useEffect(() => {
    // Only send greeting once branding is loaded
    if (!branding) return

    // If resuming a previous conversation, load those messages
    if (recentConversation?.messages?.length) {
      const resumed: Message[] = recentConversation.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
        formData: m.formData,
      }))
      const firstName = lead.name ? lead.name.split(' ')[0] : ''
      setMessages([
        {
          role: 'assistant',
          content: `Welcome back${firstName ? `, ${firstName}` : ''}! I have our previous conversation loaded. How can I help you today?`,
          timestamp: new Date().toISOString(),
        },
        ...resumed,
      ])
      setConversationId(recentConversation.id)
    } else {
      // Send initial greeting
      const greeting = getGreeting(language)
      setMessages([
        {
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
        },
      ])
    }

    // Track chat started
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'chat_started',
        lead_id: lead.id,
        metadata: { language, resumed: !!recentConversation?.id },
      }),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, branding])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function getGreeting(lang: string): string {
    const firstName = lead.name ? lead.name.split(' ')[0] : 'there'
    const agentName = branding?.agent_name || 'Assistant'
    const greetings = {
      EN: `Hi ${firstName}! 👋 I'm ${agentName}, your assistant. How can I help you today?`,
      NL: `Hallo ${firstName}! 👋 Ik ben ${agentName}, je assistent. Hoe kan ik je helpen?`,
      ES: `¡Hola ${firstName}! 👋 Soy ${agentName}, tu asistente. ¿Cómo te puedo ayudar hoy?`,
      PA: `Bon dia${firstName ? ` ${firstName}` : ''}! 👋 Ami ta Demi, bo asistente. Kon mi por yudabo?`,
    }
    return greetings[lang as keyof typeof greetings] || greetings.EN
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          leadId: lead.id,
          language,
          languageExplicit,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data: ChatResponse = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        formData: data.formData,
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationId(data.conversationId)
      setTurnCount(data.turnCount)
      if (data.languageUsed && !languageExplicit) setLanguage(data.languageUsed)
      
      if (data.shouldShowBooking) {
        setShowBooking(true)
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact us directly.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function handleBookingClick() {
    // Track booking click
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'book_click',
        lead_id: lead.id,
        metadata: { source: 'chat_widget', turn_count: turnCount },
      }),
    })

    const bookingUrl = branding?.booking_url || DEFAULT_BOOKING_URL
    window.open(bookingUrl, '_blank')
  }

  return (
    <div className={`flex flex-col ${embedded ? 'h-screen' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="bg-primary-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{branding?.company_name || 'AI Assistant'}</h3>
            <p className="text-xs opacity-90">{branding?.agent_name || 'Assistant'}</p>
          </div>
          <div className="flex gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as 'EN' | 'NL' | 'ES' | 'PA')
                  setLanguageExplicit(true)
                }}
                className={`text-xl hover:scale-110 transition-transform ${
                  language === lang.code ? 'scale-125' : 'opacity-60'
                }`}
                title={lang.name}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scroll">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.formData && message.formData.mode === 'inline' ? (
              lead.id ? (
                <div className="max-w-[90%]">
                  <InlineForm
                    formId={message.formData.formId}
                    formName={message.formData.formName}
                    fields={message.formData.fields}
                    leadId={lead.id}
                    onSubmit={async (eligibilityResults?: string) => {
                      // Add acknowledgment message after form submission
                      const ackMessage: Message = {
                        role: 'assistant',
                        content: eligibilityResults 
                          ? eligibilityResults + '\n\nThank you for completing the eligibility test! How else can I help you?'
                          : 'Thank you for submitting the form! I\'ve saved your information. How else can I help you?',
                        timestamp: new Date().toISOString(),
                      }
                      setMessages(prev => [...prev, ackMessage])
                    }}
                  />
                </div>
              ) : (
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white text-gray-900 shadow">
                  <p className="text-sm">Unable to load form. Please refresh the page.</p>
                </div>
              )
            ) : (
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 shadow'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap"><MessageContent content={message.content} /></p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 shadow rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        {showBooking && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4 shadow-md">
            <p className="text-sm text-gray-800 mb-2">
              <strong>Ready for personalized guidance?</strong> Book a consultation to discuss your specific case and get started with your Curaçao residency.
            </p>
            <button
              onClick={handleBookingClick}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
            >
              📅 Book Immigration Consultation
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'EN' ? 'Type your question...' : language === 'NL' ? 'Stel je vraag...' : language === 'ES' ? 'Escribe tu pregunta...' : 'Skribí bo pregunta...'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}


