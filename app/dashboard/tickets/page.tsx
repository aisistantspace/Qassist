'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Ticket {
  id: string
  lead_id: string
  turn_count: number
  status: string
  language: string
  intent: string | null
  created_at: string
  updated_at: string
  lead?: {
    name: string
    email: string
  }
}

const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
  service: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Service' },
  inquiry: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Inquiry' },
}

// Map conversation status to service-desk language
function ticketStatus(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'active':
      return { label: 'Open', bg: 'bg-green-100', text: 'text-green-700' }
    case 'escalated':
      return { label: 'Waiting for Human', bg: 'bg-amber-100', text: 'text-amber-700' }
    case 'completed':
      return { label: 'Resolved', bg: 'bg-gray-100', text: 'text-gray-600' }
    default:
      return { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
  }
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [typeFilter, statusFilter])

  async function fetchTickets() {
    setLoading(true)
    try {
      // Fetch service + inquiry conversations
      const fetches = typeFilter === 'all'
        ? [
            fetch('/api/dashboard/conversations?intent=service'),
            fetch('/api/dashboard/conversations?intent=inquiry'),
          ]
        : [fetch(`/api/dashboard/conversations?intent=${typeFilter}`)]

      const responses = await Promise.all(fetches)
      let all: Ticket[] = []
      for (const res of responses) {
        if (res.ok) {
          const data = await res.json()
          all = all.concat(data.conversations || [])
        }
      }

      // Deduplicate and sort by date desc
      const seen = new Set<string>()
      all = all
        .filter(t => {
          if (seen.has(t.id)) return false
          seen.add(t.id)
          return true
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Apply status filter client-side
      if (statusFilter !== 'all') {
        all = all.filter(t => t.status === statusFilter)
      }

      setTickets(all)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tickets.filter(t => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      t.lead?.name?.toLowerCase().includes(s) ||
      t.lead?.email?.toLowerCase().includes(s) ||
      t.id.toLowerCase().includes(s)
    )
  })

  const openCount = tickets.filter(t => t.status === 'active').length
  const waitingCount = tickets.filter(t => t.status === 'escalated').length
  const resolvedCount = tickets.filter(t => t.status === 'completed').length
  const serviceCount = tickets.filter(t => t.intent === 'service').length
  const inquiryCount = tickets.filter(t => t.intent === 'inquiry').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
        <p className="text-gray-600 mt-2">Service desk — support requests and customer inquiries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Open</div>
          <div className="text-2xl font-bold text-green-600">{openCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Waiting for Human</div>
          <div className="text-2xl font-bold text-amber-600">{waitingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-2xl font-bold text-gray-600">{resolvedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Service / Inquiry</div>
          <div className="text-2xl font-bold text-orange-600">
            {serviceCount} <span className="text-gray-400 font-normal">/</span> <span className="text-sky-600">{inquiryCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="all">All Types</option>
              <option value="service">Service Requests</option>
              <option value="inquiry">Inquiries</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="active">Open</option>
              <option value="escalated">Waiting for Human</option>
              <option value="completed">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or ticket ID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Tickets list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mb-4">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No tickets yet</h3>
            <p className="text-gray-500 text-sm">
              Service and inquiry conversations will appear here once visitors chat with the AI assistant.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {filtered.map((ticket) => {
                const ts = ticketStatus(ticket.status)
                const tb = ticket.intent ? typeBadge[ticket.intent] : null
                return (
                  <div key={ticket.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">#{shortId(ticket.id)}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">{ticket.lead?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{ticket.lead?.email || 'No email'}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>{ticket.turn_count} messages</span>
                      <span>·</span>
                      <span>{ticket.language}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${ts.bg} ${ts.text}`}>
                          {ts.label}
                        </span>
                        {tb && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${tb.bg} ${tb.text}`}>
                            {tb.label}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/conversations/${ticket.id}`}
                        className="text-primary-600 text-sm font-medium min-h-[44px] flex items-center"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((ticket) => {
                    const ts = ticketStatus(ticket.status)
                    const tb = ticket.intent ? typeBadge[ticket.intent] : null
                    return (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-gray-500">#{shortId(ticket.id)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{ticket.lead?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{ticket.lead?.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4">
                          {tb ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${tb.bg} ${tb.text}`}>
                              {tb.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${ts.bg} ${ts.text}`}>
                            {ts.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{ticket.turn_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{ticket.language}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/conversations/${ticket.id}`}
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
    </div>
  )
}
