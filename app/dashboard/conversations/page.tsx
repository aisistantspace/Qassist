'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Conversation {
  id: string
  lead_id: string
  turn_count: number
  status: string
  language: string
  intent: string | null
  department: string | null
  priority: string | null
  customer_verified: boolean
  created_at: string
  lead?: {
    name: string
    email: string
  }
}

const intentBadge: Record<string, { bg: string; text: string; label: string }> = {
  sales: { bg: 'bg-green-100', text: 'text-green-700', label: 'Sales' },
  service: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Service' },
  inquiry: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inquiry' },
}

const deptBadge: Record<string, { bg: string; text: string; label: string }> = {
  claims: { bg: 'bg-red-100', text: 'text-red-700', label: 'Claims' },
  support: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Support' },
  sales: { bg: 'bg-green-100', text: 'text-green-700', label: 'Sales' },
  billing: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Billing' },
  general: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'General' },
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [filter, intentFilter])

  async function fetchConversations() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (intentFilter !== 'all') params.set('intent', intentFilter)
      const qs = params.toString()
      const url = `/api/dashboard/conversations${qs ? `?${qs}` : ''}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      conv.lead?.name?.toLowerCase().includes(searchLower) ||
      conv.lead?.email?.toLowerCase().includes(searchLower) ||
      conv.id.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-600 mt-2">View and manage all chat conversations</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="all">All Conversations</option>
              <option value="active">Active</option>
              <option value="escalated">Escalated (High Intent)</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Intent
            </label>
            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="all">All Intents</option>
              <option value="sales">Sales</option>
              <option value="service">Service</option>
              <option value="inquiry">Inquiry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No conversations found
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="p-4 space-y-2">
                  <div className="font-medium text-gray-900">{conv.lead?.name || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{conv.lead?.email || 'No email'}</div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>{conv.turn_count} turns</span>
                    <span>·</span>
                    <span>{conv.language}</span>
                    <span>·</span>
                    <span>{format(new Date(conv.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conv.status === 'active' ? 'bg-green-100 text-green-800' :
                        conv.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {conv.status}
                      </span>
                      {conv.intent && intentBadge[conv.intent] && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${intentBadge[conv.intent].bg} ${intentBadge[conv.intent].text}`}>
                          {intentBadge[conv.intent].label}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/conversations/${conv.id}`}
                      className="text-primary-600 text-sm font-medium min-h-[44px] flex items-center"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Turns
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Language
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Intent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => {
                const db = conv.department ? deptBadge[conv.department] : null
                return (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="font-medium text-gray-900">
                        {conv.lead?.name || 'Unknown'}
                      </div>
                      {conv.customer_verified && (
                        <span title="Verified customer" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {conv.lead?.email || 'No email'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {conv.turn_count} turns
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {conv.language}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      conv.status === 'active' ? 'bg-green-100 text-green-800' :
                      conv.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {db ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${db.bg} ${db.text}`}>
                        {db.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {conv.intent && intentBadge[conv.intent] ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${intentBadge[conv.intent].bg} ${intentBadge[conv.intent].text}`}>
                        {intentBadge[conv.intent].label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {format(new Date(conv.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/conversations/${conv.id}`}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Conversations</div>
          <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {conversations.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Escalated</div>
          <div className="text-2xl font-bold text-orange-600">
            {conversations.filter(c => c.status === 'escalated').length}
          </div>
        </div>
      </div>
    </div>
  )
}


