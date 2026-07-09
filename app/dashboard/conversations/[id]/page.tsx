'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { HandThumbUpIcon, HandThumbDownIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import ToastBanner from '@/components/dashboard/ToastBanner'

// Component to render text with clickable links
const MessageContent = ({ content, isUser }: { content: string, isUser: boolean }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80 ${
                isUser ? 'text-white font-medium' : 'text-blue-600 font-medium'
              }`}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
};

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface ConversationDetail {
  id: string
  lead_id: string
  messages: Message[]
  turn_count: number
  status: string
  language: string
  notes: string | null
  department?: string | null
  priority?: string | null
  routing_reason?: string | null
  assigned_to?: string | null
  routed_at?: string | null
  customer_verified?: boolean
  created_at: string
  lead: {
    name: string
    email: string
    phone: string
    policy_number?: string
    account_number?: string
    metadata?: Record<string, unknown>
    service_interest?: string
    visa_type?: string
    num_applicants?: number
    nationality?: string
    country_residence?: string
    applying_from?: string
  }
}

interface FormSubmissionRow {
  id: string
  form_id: string
  answers: Record<string, unknown>
  status: string
  created_at: string
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [staffEmail, setStaffEmail] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchConversation(params.id as string)
    }
  }, [params.id])

  async function fetchConversation(id: string) {
    try {
      const response = await fetch(`/api/dashboard/conversations/${id}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data.conversation)
        setFormSubmissions(data.formSubmissions || [])
        setNotes(data.conversation.notes || '')
        setStaffEmail(data.conversation.assigned_to || '')
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveNotes() {
    if (!conversation) return

    try {
      const response = await fetch(`/api/dashboard/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        alert('Notes saved successfully!')
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    }
  }

  async function handleRating(value: number) {
    if (!conversation) return

    try {
      const response = await fetch('/api/dashboard/rate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          rating: value,
        }),
      })

      if (response.ok) {
        setRating(value)
        alert('Rating saved!')
      }
    } catch (error) {
      console.error('Error rating conversation:', error)
    }
  }

  async function handleStaffAction(action: 'assign' | 'resolve' | 'in_progress') {
    if (!conversation) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/dashboard/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, staffEmail: staffEmail || 'Staff' }),
      })
      if (response.ok) {
        const data = await response.json()
        setConversation({ ...conversation, ...data.data })
      }
    } catch (error) {
      console.error('Error updating conversation:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteConversation() {
    if (!conversation) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/dashboard/conversations/${conversation.id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/dashboard/conversations')
      } else {
        setToast({ type: 'error', message: 'Could not delete this conversation.' })
        setDeleteModalOpen(false)
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong while deleting.' })
      setDeleteModalOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleMarkHumanContact() {
    if (!conversation) return
    if (!confirm('Mark this conversation as a human contact request? This will mark the lead as hot and send a notification.')) return

    try {
      const response = await fetch('/api/admin/process-human-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          sendEmails: true,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.detected > 0) {
          alert('Human contact request processed! Lead has been marked as hot.')
          // Refresh the page to show updated lead score
          window.location.reload()
        } else {
          alert('No human contact request detected in this conversation. The lead may have already been processed.')
        }
      } else {
        throw new Error(data.error || 'Failed to process human contact request')
      }
    } catch (error: any) {
      console.error('Error marking human contact:', error)
      alert(`Failed to process: ${error.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading conversation...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Conversation not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          ← Go Back
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-700 mb-4"
          >
            ← Back to Conversations
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Conversation Details</h1>
        </div>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shrink-0"
        >
          <TrashIcon className="w-4 h-4" />
          Delete conversation
        </button>
      </div>

      {toast && <ToastBanner type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Conversation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Messages</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {conversation.messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <MessageContent content={message.content} isUser={message.role === 'user'} />
                    <p className="text-xs mt-1 opacity-70">
                      {format(new Date(message.timestamp), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Rate this Conversation</h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleRating(1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  rating === 1
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <HandThumbUpIcon className="w-5 h-5" />
                Good Response
              </button>
              <button
                onClick={() => handleRating(-1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  rating === -1
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <HandThumbDownIcon className="w-5 h-5" />
                Poor Response
              </button>
            </div>
          </div>

          {/* Human Contact Request */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Human Contact</h2>
            <p className="text-sm text-gray-600 mb-4">
              If this conversation contains a request for human contact or email, mark it here to process the automation.
            </p>
            <button
              onClick={handleMarkHumanContact}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <UserGroupIcon className="w-5 h-5" />
              Mark as Human Contact Request
            </button>
          </div>
        </div>

        {/* Right Column - Details & Notes */}
        <div className="space-y-6">
          {/* Lead Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Lead Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="font-medium text-gray-900">{conversation.lead.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium text-gray-900">{conversation.lead.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Phone</div>
                <div className="font-medium text-gray-900">{conversation.lead.phone || 'N/A'}</div>
              </div>
              {conversation.lead.policy_number && (
                <div>
                  <div className="text-sm text-gray-600">Policy #</div>
                  <div className="font-medium text-gray-900">{conversation.lead.policy_number}</div>
                </div>
              )}
              {conversation.lead.account_number && (
                <div>
                  <div className="text-sm text-gray-600">Account #</div>
                  <div className="font-medium text-gray-900">{conversation.lead.account_number}</div>
                </div>
              )}
            </div>

            {(conversation.lead.service_interest || conversation.lead.visa_type || conversation.lead.nationality) && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Service Interest</h3>
                {conversation.lead.service_interest && (
                  <div>
                    <div className="text-xs text-gray-500">Service</div>
                    <div className="text-sm font-medium text-gray-900">{conversation.lead.service_interest}</div>
                  </div>
                )}
                {conversation.lead.visa_type && (
                  <div>
                    <div className="text-xs text-gray-500">Visa Type</div>
                    <div className="text-sm font-medium text-gray-900">{conversation.lead.visa_type}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {conversation.lead.nationality && (
                    <div>
                      <div className="text-xs text-gray-500">Nationality</div>
                      <div className="text-sm font-medium text-gray-900">{conversation.lead.nationality}</div>
                    </div>
                  )}
                  {conversation.lead.num_applicants && (
                    <div>
                      <div className="text-xs text-gray-500">Applicants</div>
                      <div className="text-sm font-medium text-gray-900">{conversation.lead.num_applicants}</div>
                    </div>
                  )}
                </div>
                {conversation.lead.country_residence && (
                  <div>
                    <div className="text-xs text-gray-500">Current Residence</div>
                    <div className="text-sm font-medium text-gray-900">{conversation.lead.country_residence}</div>
                  </div>
                )}
                {conversation.lead.applying_from && (
                  <div>
                    <div className="text-xs text-gray-500">Applying From</div>
                    <div className="text-sm font-medium text-gray-900">{conversation.lead.applying_from}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Routing & Pickup */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Routing & Pickup</h2>
            <div className="space-y-3 mb-4">
              {conversation.department && (
                <div>
                  <div className="text-sm text-gray-600">Department</div>
                  <div className="font-medium text-gray-900 capitalize">{conversation.department}</div>
                </div>
              )}
              {conversation.priority && (
                <div>
                  <div className="text-sm text-gray-600">Priority</div>
                  <div className="font-medium text-gray-900 capitalize">{conversation.priority}</div>
                </div>
              )}
              {conversation.routing_reason && (
                <div>
                  <div className="text-sm text-gray-600">Routing reason</div>
                  <div className="text-sm text-gray-900">{conversation.routing_reason}</div>
                </div>
              )}
              {conversation.assigned_to && (
                <div>
                  <div className="text-sm text-gray-600">Assigned to</div>
                  <div className="font-medium text-gray-900">{conversation.assigned_to}</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="Your name or email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900"
              />
              <button
                onClick={() => handleStaffAction('assign')}
                disabled={actionLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
              >
                Assign to me
              </button>
              <button
                onClick={() => handleStaffAction('resolve')}
                disabled={actionLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
              >
                Mark resolved
              </button>
            </div>
          </div>

          {/* Form submissions */}
          {formSubmissions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Form Submissions</h2>
              <div className="space-y-3">
                {formSubmissions.map((sub) => (
                  <div key={sub.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900 mb-1">Form {sub.form_id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500 mb-2">{format(new Date(sub.created_at), 'MMM d, HH:mm')}</div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(sub.answers, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Meta */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Metadata</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  conversation.status === 'active' ? 'bg-green-100 text-green-800' :
                  conversation.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.status}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Language</div>
                <div className="font-medium text-gray-900">{conversation.language}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Turn Count</div>
                <div className="font-medium text-gray-900">{conversation.turn_count} messages</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Started</div>
                <div className="font-medium text-gray-900">
                  {format(new Date(conversation.created_at), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900 placeholder-gray-400"
              placeholder="Add notes about this conversation..."
            />
            <button
              onClick={handleSaveNotes}
              className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete conversation"
        message="This permanently removes all messages in this chat. The linked lead record stays unless you delete it from Leads."
        confirmLabel="Delete conversation"
        loading={deleteLoading}
        onConfirm={handleDeleteConversation}
        onCancel={() => !deleteLoading && setDeleteModalOpen(false)}
      />
    </div>
  )
}


