'use client'

import { useState } from 'react'
import type { Lead } from '@/lib/types'

interface RecentConversation {
  id: string
  messages: any[]
  updatedAt: string
  status: string
}

interface PreChatFormProps {
  onSubmit: (lead: Lead, recentConversation?: RecentConversation | null) => void
  embedded?: boolean
}

export default function PreChatForm({ onSubmit, embedded = false }: PreChatFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    consent: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    if (!formData.consent) {
      setError('Please agree to the terms to continue')
      return
    }

    setIsSubmitting(true)

    try {
      // Get UTM parameters from URL
      const params = new URLSearchParams(window.location.search)
      const utmParams = {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      }

      const lead: Lead = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        consent: formData.consent,
        source_page: window.location.pathname,
        utm_params: utmParams,
      }

      // Submit lead to API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit')
      }

      const data = await response.json()
      
      // Track event
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'form_submit',
          lead_id: data.lead.id,
          metadata: { source: 'pre_chat_form' },
        }),
      })

      onSubmit({ ...lead, id: data.lead.id }, data.recentConversation || null)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={embedded ? '' : ''}>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Let's Get Started
      </h2>
      <p className="text-gray-600 mb-6">
        Please provide your contact information to begin chatting
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="+599 123 4567"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="consent"
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="consent" className="text-sm text-gray-700">
            I agree to receive follow-up communications and understand this is for general information only, 
            not legal advice. I may be added to the newsletter. *
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Starting Chat...' : 'Start Chatting'}
        </button>
      </form>

      <p className="text-xs text-gray-500 mt-4 text-center">
        By continuing, you acknowledge that this assistant provides general information only.
      </p>
    </div>
  )
}



