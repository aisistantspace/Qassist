'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeftIcon, PencilIcon, TrashIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface Conversation {
  id: string
  messages: any[]
  turn_count: number
  status: string
  language: string
  created_at: string
}

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
  notes: string | null
  conversations: Conversation[]
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({})

  useEffect(() => {
    if (params.id) {
      fetchLead(params.id as string)
    }
  }, [params.id])

  async function fetchLead(id: string) {
    try {
      const response = await fetch(`/api/dashboard/leads/${id}`)
      if (response.ok) {
        const data = await response.json()
        setLead(data.lead)
        setEditedLead(data.lead)
      } else {
        router.push('/dashboard/leads')
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!lead) return

    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedLead),
      })

      if (response.ok) {
        const data = await response.json()
        setLead(data.data)
        setIsEditing(false)
        alert('Lead updated successfully!')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    }
  }

  async function handleDelete() {
    if (!lead) return
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/dashboard/leads')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead')
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-red-600 font-bold'
    if (score >= 40) return 'text-orange-600'
    return 'text-gray-600'
  }

  function getScoreLabel(score: number) {
    if (score >= 70) return '🔥 Hot'
    if (score >= 40) return '⚡ Warm'
    return '❄️ Cold'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading lead details...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Lead not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/leads')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-gray-600 mt-1">Lead Details</p>
          </div>
        </div>
        <div className="flex gap-3">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PhoneIcon className="w-5 h-5" />
              Call
            </a>
          )}
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5" />
            Email
          </a>
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="w-5 h-5" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditedLead(lead)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedLead.name || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                ) : (
                  <div className="font-medium text-gray-900">{lead.name}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedLead.email || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                ) : (
                  <div className="font-medium text-gray-900">{lead.email}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedLead.phone || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                ) : (
                  <div className="font-medium text-gray-900">{lead.phone || 'N/A'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                {isEditing ? (
                  <select
                    value={editedLead.status || lead.status}
                    onChange={(e) => setEditedLead({ ...editedLead, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="booked">Booked</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                ) : (
                  <div className="font-medium text-gray-900 capitalize">{lead.status}</div>
                )}
              </div>
            </div>
          </div>

          {/* Service Details */}
          {(lead.service_interest || lead.visa_type || lead.nationality) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Service Details</h2>
              <div className="grid grid-cols-2 gap-4">
                {lead.service_interest && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Service Interest</label>
                    <div className="font-medium text-gray-900">{lead.service_interest}</div>
                  </div>
                )}
                {lead.visa_type && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Visa Type</label>
                    <div className="font-medium text-gray-900">{lead.visa_type}</div>
                  </div>
                )}
                {lead.nationality && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Nationality</label>
                    <div className="font-medium text-gray-900">{lead.nationality}</div>
                  </div>
                )}
                {lead.country_residence && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Country of Residence</label>
                    <div className="font-medium text-gray-900">{lead.country_residence}</div>
                  </div>
                )}
                {lead.applying_from && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Applying From</label>
                    <div className="font-medium text-gray-900">{lead.applying_from}</div>
                  </div>
                )}
                {lead.num_applicants && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Number of Applicants</label>
                    <div className="font-medium text-gray-900">{lead.num_applicants}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversations */}
          {lead.conversations && lead.conversations.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Conversations</h2>
              <div className="space-y-4">
                {lead.conversations.map((conv) => (
                  <div key={conv.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {format(new Date(conv.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {conv.turn_count} turns • {conv.language} • {conv.status}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Conversation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Score */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Lead Score</h2>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(lead.lead_score)}`}>
                {lead.lead_score}
              </div>
              <div className="text-sm text-gray-600">{getScoreLabel(lead.lead_score)}</div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Sync Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mailchimp</span>
                <span className={lead.synced_to_mailchimp ? 'text-green-600' : 'text-gray-400'}>
                  {lead.synced_to_mailchimp ? '✓ Synced' : '○ Not Synced'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">HubSpot</span>
                <span className={lead.synced_to_hubspot ? 'text-blue-600' : 'text-gray-400'}>
                  {lead.synced_to_hubspot ? '✓ Synced' : '○ Not Synced'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Notes</h2>
            {isEditing ? (
              <textarea
                value={editedLead.notes || ''}
                onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 h-32"
                placeholder="Add notes about this lead..."
              />
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {lead.notes || 'No notes added yet.'}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>{' '}
                <span className="text-gray-900">{format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
