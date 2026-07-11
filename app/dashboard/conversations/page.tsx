'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ChatBubbleLeftRightIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import BulkActionBar from '@/components/dashboard/BulkActionBar'
import EmptyState from '@/components/dashboard/EmptyState'
import ToastBanner from '@/components/dashboard/ToastBanner'
import ActionMenu from '@/components/dashboard/ActionMenu'
import { ui } from '@/lib/dashboard-ui'

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

type ConfirmState = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchConversations()
  }, [filter, intentFilter])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

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
        setSelected(new Set())
        setSelectAll(false)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      conv.lead?.name?.toLowerCase().includes(searchLower) ||
      conv.lead?.email?.toLowerCase().includes(searchLower) ||
      conv.id.toLowerCase().includes(searchLower)
    )
  })

  const completedCount = conversations.filter((c) => c.status === 'completed').length

  function clearSelection() {
    setSelected(new Set())
    setSelectAll(false)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectAll) {
      clearSelection()
    } else {
      setSelected(new Set(filteredConversations.map((c) => c.id)))
      setSelectAll(true)
    }
  }

  async function deleteConversations(ids: string[]) {
    setConfirmLoading(true)
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/dashboard/conversations/${id}`, { method: 'DELETE' }))
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        setToast({ type: 'error', message: `Failed to delete ${failed} conversation(s).` })
      } else {
        setToast({
          type: 'success',
          message: `Deleted ${ids.length} conversation${ids.length !== 1 ? 's' : ''}.`,
        })
      }
      await fetchConversations()
    } catch {
      setToast({ type: 'error', message: 'Something went wrong while deleting.' })
    } finally {
      setConfirmLoading(false)
      setConfirmModal(null)
    }
  }

  function promptDeleteSingle(id: string) {
    setConfirmModal({
      title: 'Delete conversation',
      message: 'This permanently removes the chat history. The linked lead record is kept unless you delete it separately.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteConversations([id]),
    })
  }

  function promptDeleteSelected() {
    setConfirmModal({
      title: `Delete ${selected.size} conversation${selected.size !== 1 ? 's' : ''}`,
      message: 'Selected conversations and their message history will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete selected',
      onConfirm: () => deleteConversations(Array.from(selected)),
    })
  }

  function promptClearCompleted() {
    const ids = conversations.filter((c) => c.status === 'completed').map((c) => c.id)
    setConfirmModal({
      title: 'Clear all completed',
      message: `Remove ${ids.length} completed conversation${ids.length !== 1 ? 's' : ''}? Message history will be permanently deleted.`,
      confirmLabel: 'Clear completed',
      onConfirm: () => deleteConversations(ids),
    })
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className={ui.pageTitle}>Conversations</h1>
          <p className={ui.pageSubtitle}>View and manage all chat conversations</p>
        </div>
        {completedCount > 0 && (
          <button
            type="button"
            onClick={promptClearCompleted}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shrink-0"
          >
            <TrashIcon className="w-4 h-4" />
            Clear {completedCount} completed
          </button>
        )}
      </div>

      {toast && <ToastBanner type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      <BulkActionBar count={selected.size} itemLabel="conversation" onClearSelection={clearSelection}>
        <button
          type="button"
          onClick={promptDeleteSelected}
          className={ui.btnDanger}
        >
          <TrashIcon className="w-4 h-4" />
          Delete selected
        </button>
      </BulkActionBar>

      <div className={ui.filterCard}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Intent</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
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

      <div className={ui.tableShell}>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={<ChatBubbleLeftRightIcon className="w-14 h-14" />}
            title="No conversations found"
            description={
              searchTerm
                ? 'Try a different search term or adjust your filters.'
                : 'When customers chat with your assistant, conversations will appear here.'
            }
          />
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(conv.id)}
                      onChange={() => toggleSelect(conv.id)}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Select conversation with ${conv.lead?.name || 'Unknown'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{conv.lead?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{conv.lead?.email || 'No email'}</div>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                        <span>{conv.turn_count} turns</span>
                        <span>·</span>
                        <span>{conv.language}</span>
                        <span>·</span>
                        <span>{format(new Date(conv.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            conv.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : conv.status === 'escalated'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {conv.status}
                        </span>
                        {conv.intent && intentBadge[conv.intent] && (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${intentBadge[conv.intent].bg} ${intentBadge[conv.intent].text}`}
                          >
                            {intentBadge[conv.intent].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-1 pl-8">
                    <ActionMenu
                      items={[
                        { label: 'View conversation', icon: EyeIcon, href: `/dashboard/conversations/${conv.id}` },
                        { label: 'Delete', icon: TrashIcon, destructive: true, onClick: () => promptDeleteSingle(conv.id) },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[760px]">
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={`${ui.th} w-10`}>
                      <input
                        type="checkbox"
                        checked={selectAll && filteredConversations.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label="Select all conversations"
                      />
                    </th>
                    <th className={ui.th}>Lead</th>
                    <th className={ui.th}>Turns</th>
                    <th className={ui.th}>Language</th>
                    <th className={ui.th}>Status</th>
                    <th className={ui.th}>Department</th>
                    <th className={ui.th}>Intent</th>
                    <th className={ui.th}>Date</th>
                    <th className={`${ui.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredConversations.map((conv) => {
                    const db = conv.department ? deptBadge[conv.department] : null
                    return (
                      <tr key={conv.id} className={`${ui.row} ${selected.has(conv.id) ? ui.rowSelected : ''}`}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(conv.id)}
                            onChange={() => toggleSelect(conv.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            aria-label={`Select ${conv.lead?.name || 'conversation'}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="font-medium text-gray-900">{conv.lead?.name || 'Unknown'}</div>
                            {conv.customer_verified && (
                              <span
                                title="Verified customer"
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{conv.lead?.email || 'No email'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{conv.turn_count} turns</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{conv.language}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              conv.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : conv.status === 'escalated'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
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
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${intentBadge[conv.intent].bg} ${intentBadge[conv.intent].text}`}
                            >
                              {intentBadge[conv.intent].label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {format(new Date(conv.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className={`${ui.td} text-right`}>
                          <ActionMenu
                            items={[
                              { label: 'View conversation', icon: EyeIcon, href: `/dashboard/conversations/${conv.id}` },
                              { label: 'Delete', icon: TrashIcon, destructive: true, onClick: () => promptDeleteSingle(conv.id) },
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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Total Conversations</div>
          <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {conversations.filter((c) => c.status === 'active').length}
          </div>
        </div>
        <div className={ui.statCard}>
          <div className="text-sm text-gray-600">Escalated</div>
          <div className="text-2xl font-bold text-orange-600">
            {conversations.filter((c) => c.status === 'escalated').length}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={confirmModal?.confirmLabel}
        loading={confirmLoading}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => !confirmLoading && setConfirmModal(null)}
      />
    </div>
  )
}
