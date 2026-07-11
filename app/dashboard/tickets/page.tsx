'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { EyeIcon } from '@heroicons/react/24/outline'
import ActionMenu from '@/components/dashboard/ActionMenu'
import { ui } from '@/lib/dashboard-ui'

interface Ticket {
  id: string
  lead_id: string
  turn_count: number
  status: string
  language: string
  intent: string | null
  department: string | null
  priority: string | null
  routing_reason: string | null
  routed_at: string | null
  customer_verified: boolean
  created_at: string
  updated_at: string
  lead?: {
    name: string
    email: string
    policy_number?: string
  }
}

const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
  service: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Service' },
  inquiry: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Inquiry' },
}

const deptBadge: Record<string, { bg: string; text: string; label: string }> = {
  claims: { bg: 'bg-red-100', text: 'text-red-700', label: 'Claims' },
  support: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Support' },
  sales: { bg: 'bg-green-100', text: 'text-green-700', label: 'Sales' },
  billing: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Billing' },
  general: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'General' },
}

const priorityBadge: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
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
  const [statusFilter, setStatusFilter] = useState<string>('escalated')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [typeFilter, statusFilter, deptFilter])

  async function fetchTickets() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter === 'escalated') {
        params.set('escalated', 'true')
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (deptFilter !== 'all') params.set('department', deptFilter)

      const fetches = typeFilter === 'all'
        ? [
            fetch(`/api/dashboard/conversations?intent=service&${params}`),
            fetch(`/api/dashboard/conversations?intent=inquiry&${params}`),
            fetch(`/api/dashboard/conversations?${params}`),
          ]
        : [fetch(`/api/dashboard/conversations?intent=${typeFilter}&${params}`)]

      const responses = await Promise.all(fetches)
      let all: Ticket[] = []
      for (const res of responses) {
        if (res.ok) {
          const data = await res.json()
          all = all.concat(data.conversations || [])
        }
      }

      // Deduplicate (priority sort done server-side)
      const seen = new Set<string>()
      all = all.filter(t => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })

      // Apply status filter client-side for non-escalated views
      if (statusFilter !== 'all' && statusFilter !== 'escalated') {
        all = all.filter(t => t.status === statusFilter)
      } else if (statusFilter === 'escalated') {
        all = all.filter(t => t.status === 'escalated')
      }

      // Apply department filter client-side
      if (deptFilter !== 'all') {
        all = all.filter(t => t.department === deptFilter)
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
        <h1 className={ui.pageTitle}>Tickets</h1>
        <p className={ui.pageSubtitle}>Escalation queue — pick up routed conversations by department</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Open</div>
          <div className="text-2xl font-bold text-green-600">{openCount}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Waiting for Human</div>
          <div className="text-2xl font-bold text-amber-600">{waitingCount}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-2xl font-bold text-gray-600">{resolvedCount}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Service / Inquiry</div>
          <div className="text-2xl font-bold text-orange-600">
            {serviceCount} <span className="text-gray-400 font-normal">/</span> <span className="text-sky-600">{inquiryCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={ui.filterCard}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="all">All Departments</option>
              <option value="claims">Claims</option>
              <option value="support">Support</option>
              <option value="sales">Sales</option>
              <option value="billing">Billing</option>
              <option value="general">General</option>
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
      <div className={ui.tableShell}>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gray-50 mb-4">
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
                const db = ticket.department ? deptBadge[ticket.department] : null
                const pb = ticket.priority ? priorityBadge[ticket.priority] : null
                return (
                  <div key={ticket.id} className={`p-4 space-y-2 ${ticket.priority === 'urgent' ? 'bg-red-50/40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-gray-400">#{shortId(ticket.id)}</span>
                        {ticket.customer_verified && (
                          <span title="Verified customer" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">{ticket.lead?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{ticket.lead?.email || 'No email'}</div>
                    {ticket.lead?.policy_number && (
                      <div className="text-xs text-gray-500">Policy #{ticket.lead.policy_number}</div>
                    )}
                    {ticket.routing_reason && (
                      <div className="text-xs text-amber-700">{ticket.routing_reason}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>{ticket.turn_count} messages</span>
                      <span>·</span>
                      <span>{ticket.language}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${ts.bg} ${ts.text}`}>
                          {ts.label}
                        </span>
                        {db && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${db.bg} ${db.text}`}>
                            {db.label}
                          </span>
                        )}
                        {pb && pb.label !== 'Medium' && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${pb.bg} ${pb.text}`}>
                            {pb.label}
                          </span>
                        )}
                        {tb && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${tb.bg} ${tb.text}`}>
                            {tb.label}
                          </span>
                        )}
                      </div>
                      <ActionMenu
                        items={[
                          { label: 'View ticket', icon: EyeIcon, href: `/dashboard/conversations/${ticket.id}` },
                        ]}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>Ticket</th>
                    <th className={ui.th}>Contact</th>
                    <th className={ui.th}>Department</th>
                    <th className={ui.th}>Priority</th>
                    <th className={ui.th}>Status</th>
                    <th className={ui.th}>Type</th>
                    <th className={ui.th}>Reason</th>
                    <th className={ui.th}>Waiting</th>
                    <th className={ui.th}>Created</th>
                    <th className={`${ui.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((ticket) => {
                    const ts = ticketStatus(ticket.status)
                    const tb = ticket.intent ? typeBadge[ticket.intent] : null
                    const db = ticket.department ? deptBadge[ticket.department] : null
                    const pb = ticket.priority ? priorityBadge[ticket.priority] : null
                    return (
                      <tr key={ticket.id} className={`${ui.row} ${ticket.priority === 'urgent' ? 'bg-red-50/40' : ticket.priority === 'high' ? 'bg-orange-50/30' : ''}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-gray-500">#{shortId(ticket.id)}</span>
                            {ticket.customer_verified && (
                              <span title="Verified customer" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600">
                                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{ticket.lead?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{ticket.lead?.email || 'No email'}</div>
                          {ticket.lead?.policy_number && (
                            <div className="text-xs text-gray-400">Policy #{ticket.lead.policy_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {db ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${db.bg} ${db.text}`}>
                              {db.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {pb ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${pb.bg} ${pb.text}`}>
                              {pb.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${ts.bg} ${ts.text}`}>
                            {ts.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {tb ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${tb.bg} ${tb.text}`}>
                              {tb.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-[160px] truncate" title={ticket.routing_reason || ''}>
                          {ticket.routing_reason || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {ticket.routed_at
                            ? format(new Date(ticket.routed_at), 'MMM d, HH:mm')
                            : format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                        </td>
                        <td className={`${ui.td} text-right`}>
                          <ActionMenu
                            items={[
                              { label: 'View ticket', icon: EyeIcon, href: `/dashboard/conversations/${ticket.id}` },
                            ]}
                          />
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
