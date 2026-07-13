'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { EnvelopeIcon, PhoneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

interface HotLead {
  id: string
  name: string
  email: string
  phone: string
  lead_score: number
  status: string
  created_at: string
  last_contacted: string | null
  conversations: Array<{
    id: string
    turn_count: number
    status: string
    language: string
  }>
}

const secondaryButtonClass =
  'px-4 py-2 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center'

export default function HotLeadsPage() {
  const [hotLeads, setHotLeads] = useState<HotLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHotLeads()
    const interval = setInterval(fetchHotLeads, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchHotLeads() {
    try {
      const response = await fetch('/api/scoring/hot-leads')
      if (response.ok) {
        const data = await response.json()
        setHotLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Error fetching hot leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsContacted(leadId: string) {
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'contacted',
          last_contacted: new Date().toISOString(),
        }),
      })
      if (response.ok) fetchHotLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-600">High-intent leads (score 70+)</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          Loading hot leads...
        </div>
      ) : hotLeads.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-500 mb-2">No hot leads at the moment</p>
          <p className="text-sm text-gray-400">
            Hot leads (score 70+) will appear here automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hotLeads.map((lead) => {
            const mostRecentConv = lead.conversations[0]
            const needsAction = lead.status !== 'contacted' && lead.status !== 'qualified'

            return (
              <div key={lead.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
                        <span className="text-2xl font-bold text-gray-900 tabular-nums">
                          {lead.lead_score}
                        </span>
                        <span
                          className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                            needsAction ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4 shrink-0 text-gray-400" />
                          <span>{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 shrink-0 text-gray-400" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 shrink-0 text-gray-400" />
                          <span>
                            {lead.conversations.length} conversation{lead.conversations.length !== 1 ? 's' : ''},{' '}
                            {lead.conversations.reduce((sum, c) => sum + c.turn_count, 0)} turns
                            {mostRecentConv && ` · ${mostRecentConv.language}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 shrink-0">
                      <div>Created {format(new Date(lead.created_at), 'MMM d, HH:mm')}</div>
                      {lead.last_contacted && (
                        <div className="mt-1 text-gray-600">
                          Contacted {format(new Date(lead.last_contacted), 'MMM d, HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                    <Link
                      href={`/dashboard/conversations/${mostRecentConv?.id}`}
                      className="flex-1 min-w-[140px] text-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      View Conversation
                    </Link>
                    <a href={`mailto:${lead.email}`} className={secondaryButtonClass}>
                      Email
                    </a>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className={secondaryButtonClass}>
                        Call
                      </a>
                    )}
                    {needsAction && (
                      <button onClick={() => markAsContacted(lead.id)} className={secondaryButtonClass}>
                        Mark Contacted
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


