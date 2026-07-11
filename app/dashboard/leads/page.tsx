'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { PhoneIcon, EnvelopeIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import BulkActionBar from '@/components/dashboard/BulkActionBar'
import ToastBanner from '@/components/dashboard/ToastBanner'
import ActionMenu from '@/components/dashboard/ActionMenu'
import { ui } from '@/lib/dashboard-ui'

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
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant?: 'danger' | 'warning' | 'primary'
    onConfirm: () => Promise<void>
  } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, temperatureFilter])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

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
    setConfirmModal({
      title: 'Delete lead',
      message: 'This permanently removes the lead and cannot be undone.',
      confirmLabel: 'Delete lead',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const response = await fetch(`/api/dashboard/leads/${leadId}`, { method: 'DELETE' })
          if (response.ok) {
            setToast({ type: 'success', message: 'Lead deleted.' })
            fetchLeads()
          } else {
            setToast({ type: 'error', message: 'Failed to delete lead.' })
          }
        } catch {
          setToast({ type: 'error', message: 'Something went wrong while deleting.' })
        } finally {
          setConfirmLoading(false)
          setConfirmModal(null)
        }
      },
    })
  }

  async function bulkDeleteLeads() {
    const ids = Array.from(selectedLeads)
    setConfirmModal({
      title: `Delete ${ids.length} lead${ids.length !== 1 ? 's' : ''}`,
      message: 'Selected leads will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete selected',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const results = await Promise.all(
            ids.map((leadId) => fetch(`/api/dashboard/leads/${leadId}`, { method: 'DELETE' }))
          )
          const failed = results.filter((r) => !r.ok).length
          if (failed > 0) {
            setToast({ type: 'error', message: `Failed to delete ${failed} lead(s).` })
          } else {
            setToast({ type: 'success', message: `Deleted ${ids.length} lead(s).` })
          }
          fetchLeads()
          setSelectedLeads(new Set())
          setSelectAll(false)
        } catch {
          setToast({ type: 'error', message: 'Something went wrong while deleting.' })
        } finally {
          setConfirmLoading(false)
          setConfirmModal(null)
        }
      },
    })
  }

  function promptBulkStatusUpdate(newStatus: string) {
    setConfirmModal({
      title: 'Update lead status',
      message: `Set ${selectedLeads.size} lead(s) to "${newStatus}"?`,
      confirmLabel: 'Update status',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const promises = Array.from(selectedLeads).map((leadId) =>
            fetch(`/api/dashboard/leads/${leadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            })
          )
          await Promise.all(promises)
          setToast({ type: 'success', message: `Updated ${selectedLeads.size} lead(s).` })
          fetchLeads()
          setSelectedLeads(new Set())
          setSelectAll(false)
        } catch {
          setToast({ type: 'error', message: 'Failed to update some leads.' })
        } finally {
          setConfirmLoading(false)
          setConfirmModal(null)
        }
      },
    })
  }

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
        <h1 className={ui.pageTitle}>Leads</h1>
        <p className={ui.pageSubtitle}>
          People interested in acquiring a product or service — quotes, registration, forms, or clear buy intent. General info chats are not listed here.
        </p>
      </div>

      <div className={ui.filterCard}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={ui.select}
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
              className={ui.select}
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
              className={ui.input}
            />
          </div>
        </div>
      </div>

      {toast && <ToastBanner type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* Bulk Actions Toolbar */}
      <BulkActionBar
        count={selectedLeads.size}
        itemLabel="lead"
        onClearSelection={() => {
          setSelectedLeads(new Set())
          setSelectAll(false)
        }}
      >
        <select
          onChange={(e) => {
            const newStatus = e.target.value
            if (newStatus) promptBulkStatusUpdate(newStatus)
            e.target.value = ''
          }}
          className={`${ui.select} w-auto`}
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
          type="button"
          onClick={bulkDeleteLeads}
          className={ui.btnDanger}
        >
          <TrashIcon className="w-4 h-4" />
          Delete selected
        </button>
      </BulkActionBar>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Hot</div>
          <div className="text-2xl font-bold text-red-600">
            {leads.filter(l => l.temperature === 'hot').length}
          </div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Warm</div>
          <div className="text-2xl font-bold text-amber-600">
            {leads.filter(l => l.temperature === 'warm').length}
          </div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Cold</div>
          <div className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.temperature === 'cold').length}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className={ui.tableShell}>
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
            <thead className={ui.tableHead}>
              <tr>
                <th className={`${ui.th} w-12`}>
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
                <th className={ui.th}>Contact</th>
                <th className={ui.th}>Interest & Details</th>
                <th className={ui.th}>Score</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Synced</th>
                <th className={ui.th}>Created</th>
                <th className={`${ui.th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={ui.row}>
                  <td className={ui.td}>
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
                  <td className={`${ui.td} text-right`}>
                    <ActionMenu
                      label={`Actions for ${lead.name}`}
                      items={[
                        { label: 'View details', icon: EyeIcon, href: `/dashboard/leads/${lead.id}` },
                        { label: 'Call', icon: PhoneIcon, href: `tel:${lead.phone}`, hidden: !lead.phone },
                        { label: 'Email', icon: EnvelopeIcon, href: `mailto:${lead.email}` },
                        { label: 'Edit', icon: PencilIcon, href: `/dashboard/leads/${lead.id}` },
                        { label: 'Delete', icon: TrashIcon, destructive: true, onClick: () => deleteLead(lead.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={confirmModal?.confirmLabel}
        variant={confirmModal?.variant || 'danger'}
        loading={confirmLoading}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => !confirmLoading && setConfirmModal(null)}
      />
    </div>
  )
}


