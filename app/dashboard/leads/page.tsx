'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { EllipsisVerticalIcon, PhoneIcon, EnvelopeIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: string
  lead_score: number
  created_at: string
  synced_to_mailchimp: boolean
  synced_to_hubspot: boolean
  service_interest: string
  visa_type: string
  num_applicants: number
  nationality: string
  country_residence: string
  applying_from: string
  temperature: 'hot' | 'warm' | 'cold'
}

const tempBadge: Record<string, { bg: string; text: string; label: string }> = {
  hot: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hot' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Warm' },
  cold: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Cold' },
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [temperatureFilter, setTemperatureFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, temperatureFilter])

  async function fetchLeads() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('acquisition', 'true')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (temperatureFilter !== 'all') params.set('temperature', temperatureFilter)
      const url = `/api/dashboard/leads?${params.toString()}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchLeads()
        setOpenDropdown(null)
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown]
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone?.toLowerCase().includes(searchLower)
    )
  })

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-red-600 font-bold' // Hot
    if (score >= 40) return 'text-orange-600' // Warm
    return 'text-gray-600' // Cold
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-600 mt-2">
          People interested in acquiring a product or service — quotes, registration, forms, or clear buy intent. General info chats are not listed here.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <select
              value={temperatureFilter}
              onChange={(e) => setTemperatureFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900"
            >
              <option value="all">All Temperatures</option>
              <option value="hot">Hot (70+)</option>
              <option value="warm">Warm (40-69)</option>
              <option value="cold">Cold (&lt;40)</option>
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
              placeholder="Search by name, email, or phone..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedLeads.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => {
                setSelectedLeads(new Set())
                setSelectAll(false)
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear selection
            </button>
          </div>
          <div className="flex gap-3">
            <select
              onChange={async (e) => {
                const newStatus = e.target.value
                if (newStatus && confirm(`Update ${selectedLeads.size} lead(s) to status "${newStatus}"?`)) {
                  try {
                    const promises = Array.from(selectedLeads).map(leadId =>
                      fetch(`/api/dashboard/leads/${leadId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                      })
                    )
                    await Promise.all(promises)
                    fetchLeads()
                    setSelectedLeads(new Set())
                    setSelectAll(false)
                  } catch (error) {
                    console.error('Error updating leads:', error)
                    alert('Failed to update some leads')
                  }
                }
                e.target.value = ''
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900"
            >
              <option value="">Update Status...</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
            <button
              onClick={async () => {
                if (confirm(`Delete ${selectedLeads.size} lead(s)? This action cannot be undone.`)) {
                  try {
                    const promises = Array.from(selectedLeads).map(leadId =>
                      fetch(`/api/dashboard/leads/${leadId}`, {
                        method: 'DELETE',
                      })
                    )
                    await Promise.all(promises)
                    fetchLeads()
                    setSelectedLeads(new Set())
                    setSelectAll(false)
                  } catch (error) {
                    console.error('Error deleting leads:', error)
                    alert('Failed to delete some leads')
                  }
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Hot</div>
          <div className="text-2xl font-bold text-red-600">
            {leads.filter(l => l.temperature === 'hot').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Warm</div>
          <div className="text-2xl font-bold text-amber-600">
            {leads.filter(l => l.temperature === 'warm').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Cold</div>
          <div className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.temperature === 'cold').length}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leads found
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                      {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-lg font-semibold ${getScoreColor(lead.lead_score)}`}>
                        {lead.lead_score}
                      </span>
                      <div className="flex gap-1">
                        {lead.temperature && tempBadge[lead.temperature] && (
                          <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tempBadge[lead.temperature].bg} ${tempBadge[lead.temperature].text}`}>
                            {tempBadge[lead.temperature].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(lead.service_interest || lead.visa_type) && (
                    <div className="text-sm text-gray-600">
                      {lead.service_interest && <span className="font-medium">{lead.service_interest}</span>}
                      {lead.visa_type && <span className="italic ml-1">{lead.visa_type}</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-gray-50 text-gray-900 min-h-[44px]"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="booked">Booked</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                    <span className="text-xs text-gray-500">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-primary-600 text-sm font-medium min-h-[44px] flex items-center"
                    >
                      View Details
                    </Link>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="text-sm text-gray-600 min-h-[44px] flex items-center">
                        Call
                      </a>
                    )}
                    <a href={`mailto:${lead.email}`} className="text-sm text-gray-600 min-h-[44px] flex items-center">
                      Email
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredLeads.length > 0}
                    onChange={(e) => {
                      setSelectAll(e.target.checked)
                      if (e.target.checked) {
                        setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
                      } else {
                        setSelectedLeads(new Set())
                      }
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Interest & Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Synced
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedLeads)
                        if (e.target.checked) {
                          newSelected.add(lead.id)
                        } else {
                          newSelected.delete(lead.id)
                        }
                        setSelectedLeads(newSelected)
                        setSelectAll(newSelected.size === filteredLeads.length && filteredLeads.length > 0)
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                    {lead.phone && (
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(lead.service_interest || lead.visa_type) ? (
                      <div className="text-sm">
                        {lead.service_interest && (
                          <div className="text-gray-900 font-medium">{lead.service_interest}</div>
                        )}
                        {lead.visa_type && (
                          <div className="text-gray-600 italic">{lead.visa_type}</div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {lead.nationality && (
                            <span>🏳️ {lead.nationality}</span>
                          )}
                          {lead.num_applicants && (
                            <span>👥 {lead.num_applicants} app.</span>
                          )}
                          {lead.country_residence && (
                            <span>🏠 Lives: {lead.country_residence}</span>
                          )}
                          {lead.applying_from && (
                            <span>📍 Applying from: {lead.applying_from}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No details captured yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-lg font-semibold ${getScoreColor(lead.lead_score)}`}>
                      {lead.lead_score}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.temperature && tempBadge[lead.temperature] && (
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tempBadge[lead.temperature].bg} ${tempBadge[lead.temperature].text}`}>
                          {tempBadge[lead.temperature].label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-900"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="booked">Booked</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className={lead.synced_to_mailchimp ? 'text-green-600' : 'text-gray-400'}>
                      {lead.synced_to_mailchimp ? '✓' : '○'} Mailchimp
                    </div>
                    <div className={lead.synced_to_hubspot ? 'text-blue-600' : 'text-gray-400'}>
                      {lead.synced_to_hubspot ? '✓' : '○'} HubSpot
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(lead.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative" ref={(el) => { dropdownRefs.current[lead.id] = el }}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === lead.id ? null : lead.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Actions"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                      
                      {openDropdown === lead.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                          <a
                            href={`/dashboard/leads/${lead.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <EyeIcon className="w-4 h-4" />
                            View Details
                          </a>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setOpenDropdown(null)}
                            >
                              <PhoneIcon className="w-4 h-4" />
                              Call
                            </a>
                          )}
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                            Email
                          </a>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </Link>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


