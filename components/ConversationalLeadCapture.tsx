'use client'

import { useState, useEffect, useRef } from 'react'

interface ConversationalLeadCaptureProps {
  onComplete: (lead: { name: string; phone: string; email: string }) => void
  language: 'EN' | 'NL' | 'ES' | 'PA'
}

interface Message {
  role: 'assistant' | 'user'
  content: string
}

export default function ConversationalLeadCapture({ onComplete, language }: ConversationalLeadCaptureProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState<'name' | 'phone' | 'email' | 'complete'>('name')
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial greeting
    const greeting = getStepMessage('name', language)
    setMessages([{ role: 'assistant', content: greeting }])
  }, [language])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function getStepMessage(currentStep: string, lang: string): string {
    const messages: Record<string, Record<string, string>> = {
      name: {
        EN: "Hi! 👋 I'm your assistant. To get started, what's your name?",
        NL: "Hallo! 👋 Ik ben je assistent. Om te beginnen, wat is je naam?",
        ES: "¡Hola! 👋 Soy tu asistente. Para empezar, ¿cuál es tu nombre?",
        PA: "Bon dia! 👋 Mi ta bo asistente. Pa kuminsá, kua ta bo nòmber?",
      },
      phone: {
        EN: "Nice to meet you, {name}! What's your phone number?",
        NL: "Leuk je te ontmoeten, {name}! Wat is je telefoonnummer?",
        ES: "¡Encantado de conocerte, {name}! ¿Cuál es tu número de teléfono?",
        PA: "Hopi gusto di konosebo, {name}! Kua ta bo number di telefòn?",
      },
      email: {
        EN: "Great! And what's your email address?",
        NL: "Geweldig! En wat is je e-mailadres?",
        ES: "¡Genial! ¿Y cuál es tu dirección de correo electrónico?",
        PA: "Eksèlente! I kua ta bo email address?",
      },
      complete: {
        EN: "Perfect! I've got your information. By chatting with me, you consent to receive follow-ups about Curaçao immigration. Now, how can I help you today?",
        NL: "Perfect! Ik heb je informatie. Door met mij te chatten, ga je akkoord met het ontvangen van vervolgberichten over immigratie naar Curaçao. Hoe kan ik je vandaag helpen?",
        ES: "¡Perfecto! Tengo tu información. Al chatear conmigo, aceptas recibir seguimientos sobre inmigración a Curaçao. ¿Cómo puedo ayudarte hoy?",
        PA: "Perfèkt! Mi tin bo informashon. Door di chatia ku mi, bo ta konsinti risibi follow-upnan tokante imigrashon na Kòrsou. Con mi por yudabo awe?",
      },
    }

    const message = (messages[currentStep] && messages[currentStep][lang]) || (messages[currentStep] && messages[currentStep].EN) || ''
    return message.replace('{name}', leadData.name)
  }

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone(phone: string): boolean {
    // Accept various formats: 599-123-4567, +599 123 4567, 5991234567, etc.
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    return /^\+?\d{7,15}$/.test(cleaned)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])

    const value = input.trim()
    setInput('')

    // Process based on current step
    if (step === 'name') {
      setLeadData(prev => ({ ...prev, name: value }))
      const phoneMsg = getStepMessage('phone', language).replace('{name}', value)
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: phoneMsg }])
        setStep('phone')
      }, 500)
    } else if (step === 'phone') {
      if (!validatePhone(value)) {
        const errorMsg = {
          EN: "That doesn't look like a valid phone number. Could you please check it? (e.g., 599-123-4567)",
          NL: "Dat lijkt geen geldig telefoonnummer te zijn. Kun je het controleren? (bijv. 599-123-4567)",
          ES: "Ese no parece un número de teléfono válido. ¿Podrías verificarlo? (ej. 599-123-4567)",
          PA: "Esei no ta parse un number di telefòn válido. Por fabor verifiká? (ehèmpel: 599-123-4567)",
        }
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: errorMsg[language] }])
        }, 500)
        return
      }
      setLeadData(prev => ({ ...prev, phone: value }))
      const emailMsg = getStepMessage('email', language)
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: emailMsg }])
        setStep('email')
      }, 500)
    } else if (step === 'email') {
      if (!validateEmail(value)) {
        const errorMsg = {
          EN: "That doesn't look like a valid email address. Could you please check it? (e.g., john@example.com)",
          NL: "Dat lijkt geen geldig e-mailadres te zijn. Kun je het controleren? (bijv. john@example.com)",
          ES: "Esa no parece una dirección de correo válida. ¿Podrías verificarla? (ej. john@example.com)",
          PA: "Esei no ta parse un email address válido. Por fabor verifiká? (ehèmpel: john@example.com)",
        }
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: errorMsg[language] }])
        }, 500)
        return
      }
      setLeadData(prev => ({ ...prev, email: value }))
      const completeMsg = getStepMessage('complete', language)
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: completeMsg }])
        setStep('complete')
        // Wait a bit then call completion
        setTimeout(() => {
          onComplete({ ...leadData, email: value })
        }, 1000)
      }, 500)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scroll">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-900 shadow'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {step !== 'complete' && (
        <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                step === 'name'
                  ? 'Your name...'
                  : step === 'phone'
                  ? 'Your phone number...'
                  : 'Your email address...'
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  )
}


