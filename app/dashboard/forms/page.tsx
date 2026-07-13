'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  TableCellsIcon,
  WrenchScrewdriverIcon,
  CloudArrowDownIcon,
  GlobeAltIcon,
  XMarkIcon,
  ArrowPathIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import ToastBanner from '@/components/dashboard/ToastBanner'

interface FormField {
  key: string
  label: string
  question: string
  type: 'text' | 'number' | 'email' | 'select' | 'date'
  options?: string[]
}

interface AIResponseConfig {
  thresholds?: {
    minAge?: number
    maxAge?: number
    minIncome?: number
    restrictedCountries?: string[]
  }
  rules?: Array<{
    field: string
    operator: string
    value: any
    message: string
  }>
  instructions?: string
}

interface FormDefinition {
  id: string
  name: string
  description: string
  fields: FormField[]
  is_active: boolean
  form_mode?: 'conversational' | 'inline' | null
  enable_ai_response?: boolean
  ai_response_config?: AIResponseConfig | null
  email_automation_enabled?: boolean
  email_automation_recipients?: string | null
  use_mode?: 'inline' | 'link' | 'disabled'
  external_url?: string | null
  notification_emails?: string | null
  created_at: string
}

interface FormSubmission {
  id: string
  form_id: string
  lead_id: string
  answers: Record<string, any>
  status: 'in_progress' | 'completed'
  created_at: string
  form_name?: string
  lead_name?: string
  lead_email?: string
}

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'submissions'>('builder')
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [googleUrl, setGoogleUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [defaultFormMode, setDefaultFormMode] = useState<'conversational' | 'inline'>('conversational')
  const [currentForm, setCurrentForm] = useState<Partial<FormDefinition>>({
    name: '',
    description: '',
    fields: [],
    is_active: true,
    enable_ai_response: false,
    ai_response_config: null,
    email_automation_enabled: false,
    email_automation_recipients: '',
    use_mode: 'inline',
    external_url: '',
    notification_emails: ''
  })
  const [showLinkModal, setShowLinkModal] = useState<string | null>(null)
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null)
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchForms()
    fetchSubmissions()
    fetchDefaultFormMode()
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const fetchDefaultFormMode = async () => {
    try {
      const res = await fetch('/api/settings/agent')
      if (res.ok) {
        const data = await res.json()
        setDefaultFormMode(data.default_form_mode || 'conversational')
      }
    } catch (error) {
      console.error('Error fetching default form mode:', error)
    }
  }

  const fetchForms = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forms')
      if (res.ok) {
        const data = await res.json()
        setForms(data.forms || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to load forms.')
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
      setError('Connection error. Failed to load forms.')
    } finally {
      setLoading(false)
    }
  }

  const seedInsuranceTemplates = async () => {
    try {
      const res = await fetch('/api/forms/seed-insurance', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Insurance templates seeded.')
        fetchForms()
      } else {
        alert(data.error || 'Failed to seed templates')
      }
    } catch {
      alert('Failed to seed insurance templates')
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/forms/submissions')
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    }
  }

  const getFormLink = (formId: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    return `${baseUrl}/chat?form=${formId}`
  }

  const copyToClipboard = async (formId: string) => {
    const link = getFormLink(formId)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedFormId(formId)
      setTimeout(() => setCopiedFormId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedFormId(formId)
      setTimeout(() => setCopiedFormId(null), 2000)
    }
  }

  const handleSaveForm = async () => {
    if (!currentForm.name || !currentForm.description) return

    try {
      const method = currentForm.id ? 'PATCH' : 'POST'
      const url = currentForm.id ? `/api/forms/${currentForm.id}` : '/api/forms'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentForm)
      })

      if (res.ok) {
        setIsEditing(false)
        setCurrentForm({ name: '', description: '', fields: [], is_active: true, form_mode: null, enable_ai_response: false, ai_response_config: null, email_automation_enabled: false, email_automation_recipients: '', use_mode: 'inline', external_url: '', notification_emails: '' })
        fetchForms()
      }
    } catch (error) {
      console.error('Error saving form:', error)
    }
  }

  const handleDeleteForm = async () => {
    if (!deleteFormId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/forms/${deleteFormId}`, { method: 'DELETE' })
      if (res.ok) {
        setToast({ type: 'success', message: 'Form deleted.' })
        fetchForms()
      } else {
        setToast({ type: 'error', message: 'Failed to delete form.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong while deleting.' })
    } finally {
      setDeleteLoading(false)
      setDeleteFormId(null)
    }
  }

  const addField = () => {
    const newField: FormField = {
      key: '',
      label: '',
      question: '',
      type: 'text',
      options: undefined
    }
    setCurrentForm(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }))
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...(currentForm.fields || [])]
    newFields[index] = { ...newFields[index], ...updates }
    setCurrentForm(prev => ({ ...prev, fields: newFields }))
  }

  const removeField = (index: number) => {
    const newFields = [...(currentForm.fields || [])]
    newFields.splice(index, 1)
    setCurrentForm(prev => ({ ...prev, fields: newFields }))
  }

  const handleImport = async () => {
    if (!googleUrl) return
    setImportLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleUrl })
      })
      
      const data = await res.json()

      if (res.ok) {
        // Use the structured fields from the API
        const importedFields = data.fields || []

        setCurrentForm({
          name: data.title || 'Imported Google Form',
          description: data.description || `Conversational interview based on the form "${data.title || 'Untitled'}"`,
          fields: importedFields,
          is_active: true,
          form_mode: null,
          use_mode: 'inline',
          external_url: ''
        })
        
        setIsImporting(false)
        setIsEditing(true)
        setGoogleUrl('')
        setError(null)
      } else {
        // API returned an error (private form, not a google form, etc.)
        setError(data.error || 'Failed to import form. Please check the URL.')
      }
    } catch (error) {
      console.error('Error importing form:', error)
      setError('An error occurred during import. Please check your connection.')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <p className="text-sm text-gray-600">Create and manage dynamic AI-driven interviews</p>
        <div className="flex gap-3">
          {!isEditing && activeTab === 'builder' && (
            <button
              onClick={seedInsuranceTemplates}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Seed Insurance Templates
            </button>
          )}
          {!isEditing && activeTab === 'builder' && (
            <button
              onClick={() => {
                // Open import modal logic here
                setIsImporting(true)
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <CloudArrowDownIcon className="w-5 h-5 text-gray-500" />
              Import from Google Form
            </button>
          )}
          {!isEditing && activeTab === 'builder' && (
            <button
              onClick={() => {
                setCurrentForm({ name: '', description: '', fields: [], is_active: true, form_mode: null, enable_ai_response: false, ai_response_config: null, email_automation_enabled: false, email_automation_recipients: '', use_mode: 'inline', external_url: '', notification_emails: '' })
                setIsEditing(true)
              }}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Form
            </button>
          )}
        </div>
      </div>

      {toast && <ToastBanner type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* Default Form Mode Setting */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Default Form Mode</h2>
        <p className="text-sm text-gray-600 mb-4">Set the default presentation mode for all forms. Each form can override this setting individually.</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex-1">
            <input
              type="radio"
              name="default_form_mode"
              value="conversational"
              checked={defaultFormMode === 'conversational'}
              onChange={async () => {
                try {
                  const res = await fetch('/api/settings/agent', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ default_form_mode: 'conversational' }),
                  })
                  if (res.ok) {
                    setDefaultFormMode('conversational')
                  }
                } catch (error) {
                  console.error('Error updating default form mode:', error)
                }
              }}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">Conversational (Step-by-Step)</div>
              <div className="text-xs text-gray-500">AI asks questions one at a time in conversation</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex-1">
            <input
              type="radio"
              name="default_form_mode"
              value="inline"
              checked={defaultFormMode === 'inline'}
              onChange={async () => {
                try {
                  const res = await fetch('/api/settings/agent', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ default_form_mode: 'inline' }),
                  })
                  if (res.ok) {
                    setDefaultFormMode('inline')
                  }
                } catch (error) {
                  console.error('Error updating default form mode:', error)
                }
              }}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">Inline (Fillable Card)</div>
              <div className="text-xs text-gray-500">Show a fillable form card in the chat</div>
            </div>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">Current default: <span className="font-medium">{defaultFormMode === 'conversational' ? 'Conversational' : 'Inline'}</span></p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-8 pb-2 min-w-0">
          <button
            onClick={() => setActiveTab('builder')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'builder' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <WrenchScrewdriverIcon className="w-5 h-5 shrink-0" />
              Form Definitions
            </div>
            {activeTab === 'builder' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'submissions' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TableCellsIcon className="w-5 h-5 shrink-0" />
              Collected Submissions
            </div>
            {activeTab === 'submissions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
        </nav>
      </div>

      {!isEditing && !isImporting && error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <div className="p-1.5 bg-red-100 rounded-full">
            <XMarkIcon className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Action Required</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <button 
            onClick={fetchForms}
            className="text-xs font-bold uppercase tracking-wider hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn flex flex-col">
            <div className="p-6 sm:p-8 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-primary-100 rounded-lg shrink-0">
                    <GlobeAltIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 truncate">Import Google Form</h2>
                </div>
                <button
                  onClick={() => setIsImporting(false)}
                  className="flex min-w-[44px] min-h-[44px] items-center justify-center -mr-2 text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Paste the public link to your Google Form. We'll automatically extract the questions to create a conversational version.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Form URL</label>
                  <input
                    type="text"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 text-gray-900 placeholder-gray-400 min-h-[44px]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 pt-0 flex gap-3 shrink-0 border-t border-gray-100 mt-auto">
              <button
                onClick={() => setIsImporting(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading || !googleUrl}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {importLoading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Start Import'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {currentForm.id ? 'Edit Form' : 'New Conversational Form'}
            </h2>
            <button 
              onClick={() => setIsEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
              <input
                type="text"
                value={currentForm.name}
                onChange={e => setCurrentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Residency Eligibility Check"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Description</label>
              <p className="text-xs text-gray-500 mb-2">When should the AI use this form? Describe the intent.</p>
              <textarea
                value={currentForm.description}
                onChange={e => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. User asks about moving to Curacao, residency permits, or living on the island long-term."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-24 bg-gray-50 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Form Presentation Mode</label>
              <p className="text-xs text-gray-500 mb-3">How should this form be presented? Leave as "Use Global Default" to use the default setting above.</p>
              <select
                value={currentForm.form_mode === null ? 'default' : currentForm.form_mode}
                onChange={e => setCurrentForm(prev => ({ 
                  ...prev, 
                  form_mode: e.target.value === 'default' ? null : (e.target.value as 'conversational' | 'inline')
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 text-gray-900"
              >
                <option value="default">Use Global Default ({defaultFormMode === 'conversational' ? 'Conversational' : 'Inline'})</option>
                <option value="conversational">Conversational (Step-by-Step)</option>
                <option value="inline">Inline (Fillable Card)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {currentForm.form_mode === null 
                  ? `Using global default: ${defaultFormMode === 'conversational' ? 'Conversational' : 'Inline'}`
                  : `Custom mode: ${currentForm.form_mode === 'conversational' ? 'Conversational' : 'Inline'}`
                }
              </p>
            </div>

            {/* Enable AI Auto-Answer Toggle */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Auto-Answer</h3>
                  <p className="text-sm text-gray-600">Enable AI to automatically generate a response when this form is submitted.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{currentForm.enable_ai_response ? 'Enabled' : 'Disabled'}</span>
                  <input
                    type="checkbox"
                    checked={currentForm.enable_ai_response || false}
                    onChange={(e) => setCurrentForm(prev => ({ ...prev, enable_ai_response: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
            </div>

            {/* Email automation: send completed submissions to external parties */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email automation</h3>
              <p className="text-sm text-gray-600 mb-4">When this form is completed (e.g. by a client in chat), send the submission by email to a business or person.</p>
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentForm.email_automation_enabled || false}
                    onChange={(e) => setCurrentForm(prev => ({ ...prev, email_automation_enabled: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Send submission by email when completed</span>
                </label>
              </div>
              {currentForm.email_automation_enabled && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Recipient email(s)</label>
                  <input
                    type="text"
                    value={currentForm.email_automation_recipients || ''}
                    onChange={(e) => setCurrentForm(prev => ({ ...prev, email_automation_recipients: e.target.value }))}
                    placeholder="e.g. partner@business.com, other@example.com"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated. Each will receive the full form submission when completed.</p>
                </div>
              )}

              {/* Notification emails - alert only, no form data */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notification emails (alert only)</label>
                <input
                  type="text"
                  value={currentForm.notification_emails || ''}
                  onChange={(e) => setCurrentForm(prev => ({ ...prev, notification_emails: e.target.value }))}
                  placeholder="e.g. you@company.com, admin@company.com"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated. These recipients will receive a brief notification that the form was submitted (no form data included).
                </p>
              </div>
            </div>

            {/* Form Behavior: How chatbot uses this form */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chatbot Form Behavior</h3>
              <p className="text-sm text-gray-600 mb-4">Choose how the chatbot should use this form when a user's query matches.</p>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="use_mode"
                    value="inline"
                    checked={currentForm.use_mode === 'inline'}
                    onChange={() => setCurrentForm(prev => ({ ...prev, use_mode: 'inline' }))}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Inline</span>
                      Auto-trigger in chat
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Form appears inside the chat when user asks a matching question. Best for in-app data collection.</p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="use_mode"
                    value="link"
                    checked={currentForm.use_mode === 'link'}
                    onChange={() => setCurrentForm(prev => ({ ...prev, use_mode: 'link' }))}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Link</span>
                      Show external URL
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Chatbot mentions the form and provides a link. Use for external forms (Google Forms, Typeform, etc).</p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="use_mode"
                    value="disabled"
                    checked={currentForm.use_mode === 'disabled'}
                    onChange={() => setCurrentForm(prev => ({ ...prev, use_mode: 'disabled' }))}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Disabled</span>
                      Not used by chatbot
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Form exists but chatbot won't trigger or mention it. Use for drafts or archived forms.</p>
                  </div>
                </label>
              </div>
              
              {currentForm.use_mode === 'link' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">External Form URL</label>
                  <input
                    type="url"
                    value={currentForm.external_url || ''}
                    onChange={(e) => setCurrentForm(prev => ({ ...prev, external_url: e.target.value }))}
                    placeholder="https://forms.google.com/... or https://typeform.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">The chatbot will include this link when mentioning the form.</p>
                </div>
              )}
            </div>

            {/* AI Response Configuration Section - Show when enable_ai_response is true */}
            {currentForm.enable_ai_response && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Response Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">Configure the criteria and instructions that the AI will use to generate a response for this form.</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Age</label>
                      <input
                        type="number"
                        value={currentForm.ai_response_config?.thresholds?.minAge || ''}
                        onChange={e => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined
                          setCurrentForm(prev => ({
                            ...prev,
                            ai_response_config: {
                              ...(prev.ai_response_config || {}),
                              thresholds: {
                                ...(prev.ai_response_config?.thresholds || {}),
                                minAge: value
                              }
                            }
                          }))
                        }}
                        placeholder="e.g. 18"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Maximum Age</label>
                      <input
                        type="number"
                        value={currentForm.ai_response_config?.thresholds?.maxAge || ''}
                        onChange={e => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined
                          setCurrentForm(prev => ({
                            ...prev,
                            ai_response_config: {
                              ...(prev.ai_response_config || {}),
                              thresholds: {
                                ...(prev.ai_response_config?.thresholds || {}),
                                maxAge: value
                              }
                            }
                          }))
                        }}
                        placeholder="e.g. 65"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Income (USD/month)</label>
                    <input
                      type="number"
                        value={currentForm.ai_response_config?.thresholds?.minIncome || ''}
                        onChange={e => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined
                          setCurrentForm(prev => ({
                            ...prev,
                            ai_response_config: {
                              ...(prev.ai_response_config || {}),
                              thresholds: {
                                ...(prev.ai_response_config?.thresholds || {}),
                                minIncome: value
                              }
                            }
                          }))
                        }}
                      placeholder="e.g. 2000"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Restricted Countries (comma-separated)</label>
                    <input
                      type="text"
                      value={currentForm.ai_response_config?.thresholds?.restrictedCountries?.join(', ') || ''}
                      onChange={e => {
                        const countries = e.target.value.split(',').map(c => c.trim().toLowerCase()).filter(c => c.length > 0)
                        setCurrentForm(prev => ({
                          ...prev,
                          ai_response_config: {
                            ...(prev.ai_response_config || {}),
                            thresholds: {
                              ...(prev.ai_response_config?.thresholds || {}),
                              restrictedCountries: countries.length > 0 ? countries : undefined
                            }
                          }
                        }))
                      }}
                      placeholder="e.g. iran, north korea, syria"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Countries that may face additional restrictions</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">Interview Fields (Questions)</label>
                <button
                  onClick={addField}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {currentForm.fields?.map((field, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                    <button
                      onClick={() => removeField(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Database Key (unique, lowercase)</label>
                        <input
                          type="text"
                          value={field.key}
                          onChange={e => updateField(index, { key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          placeholder="e.g. monthly_income"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
                        <select
                          value={field.type}
                          onChange={e => {
                            const newType = e.target.value as FormField['type']
                            updateField(index, { 
                              type: newType,
                              // Clear options if not select type
                              options: newType === 'select' ? (field.options || []) : undefined
                            })
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="select">Select (Dropdown)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Human Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(index, { label: e.target.value })}
                          placeholder="e.g. Monthly Income"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      {field.type === 'select' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma-separated)</label>
                          <input
                            type="text"
                            value={field.options?.join(', ') || ''}
                            onChange={e => {
                              const options = e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
                              updateField(index, { options: options.length > 0 ? options : undefined })
                            }}
                            placeholder="e.g. Option 1, Option 2, Option 3"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Question for AI to ask</label>
                      <textarea
                        value={field.question}
                        onChange={e => updateField(index, { question: e.target.value })}
                        placeholder="e.g. Approximately how much is your stable monthly income in USD or EUR?"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm h-16 bg-gray-50 text-gray-900 placeholder-gray-400"
                      />
                    </div>
                  </div>
                ))}
                {(currentForm.fields?.length || 0) === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
                    No questions added yet. Click "Add Question" to begin.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm"
              >
                {currentForm.id ? 'Save Changes' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'builder' ? (
        <div className="space-y-4">
          {forms.map(form => (
            <div key={form.id} className={`bg-white rounded-lg shadow-sm border p-6 flex justify-between items-center group transition-all ${
              form.use_mode === 'disabled' ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:border-primary-300'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-lg">{form.name}</h3>
                  {/* Status badge based on use_mode */}
                  {form.use_mode === 'inline' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Inline</span>
                  )}
                  {form.use_mode === 'link' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Link</span>
                  )}
                  {(form.use_mode === 'disabled' || (!form.use_mode && !form.is_active)) && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{form.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                  <span>{form.fields.length} questions</span>
                  <span>Created {format(new Date(form.created_at), 'MMM d, yyyy')}</span>
                  {form.use_mode === 'link' && form.external_url && (
                    <span className="text-blue-500 truncate max-w-[200px]" title={form.external_url}>
                      {form.external_url}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLinkModal(form.id)}
                  className={`p-2 rounded-lg transition-all ${
                    form.is_active
                      ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                      : 'text-gray-300 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!form.is_active}
                  title="Copy form link"
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCurrentForm(form)
                    setIsEditing(true)
                  }}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteFormId(form.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          
          {/* Link Modal */}
          {showLinkModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Form Link</h3>
                  <button
                    onClick={() => setShowLinkModal(null)}
                    className="flex min-w-[44px] min-h-[44px] items-center justify-center -mr-2 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Copy this link to place on your website. When clicked, it will open the chat with this form automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input
                    type="text"
                    value={getFormLink(showLinkModal)}
                    readOnly
                    className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm min-h-[44px]"
                  />
                  <button
                    onClick={() => copyToClipboard(showLinkModal)}
                    className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium min-h-[44px] shrink-0"
                  >
                    {copiedFormId === showLinkModal ? (
                      <>
                        <CheckIcon className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="w-5 h-5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowLinkModal(null)}
                    className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium min-h-[44px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {forms.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No forms yet</h3>
              <p className="text-gray-500 mt-1">Start by creating your first conversational interview.</p>
              <button
                onClick={() => {
                  setCurrentForm({ name: '', description: '', fields: [], is_active: true, form_mode: null, enable_ai_response: false, ai_response_config: null, email_automation_enabled: false, email_automation_recipients: '', use_mode: 'inline', external_url: '', notification_emails: '' })
                  setIsEditing(true)
                }}
                className="mt-6 text-primary-600 font-medium hover:underline"
              >
                + Create Form
              </button>
            </div>
          )}
          {loading && <div className="text-center py-10 text-gray-500">Loading forms...</div>}
        </div>
      ) : (
        /* Submissions View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {submissions.length === 0 ? (
            <div className="px-6 py-20 text-center text-gray-500">No submissions collected yet.</div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-200">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-4 space-y-2">
                    <div className="font-bold text-gray-900">{sub.lead_name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500">{sub.lead_email}</div>
                    <span className="inline-block px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full border border-primary-100">
                      {sub.form_name}
                    </span>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {Object.entries(sub.answers).slice(0, 3).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span> {String(value)}
                        </div>
                      ))}
                      {Object.keys(sub.answers).length > 3 && (
                        <div className="text-gray-400">+{Object.keys(sub.answers).length - 3} more</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">{format(new Date(sub.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Form</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Answers</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{sub.lead_name || 'Anonymous'}</div>
                          <div className="text-xs text-gray-500">{sub.lead_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full border border-primary-100">
                            {sub.form_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs overflow-hidden">
                            <div className="grid grid-cols-1 gap-1">
                              {Object.entries(sub.answers).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-gray-500 font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                                  <span className="text-gray-900">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(sub.created_at), 'MMM d, HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteFormId}
        title="Delete form"
        message="This permanently removes the form and its configuration. Submissions may still exist in your database."
        confirmLabel="Delete form"
        loading={deleteLoading}
        onConfirm={handleDeleteForm}
        onCancel={() => !deleteLoading && setDeleteFormId(null)}
      />
    </div>
  )
}

function ClipboardDocumentListIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18 4.5h-2.25a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 15.75 18.75Zm-2.25-13.5h-3.75a1.125 1.125 0 0 1-1.125-1.125V3.75A1.125 1.125 0 0 1 9.75 2.625h3.75a1.125 1.125 0 0 1 1.125 1.125v.75a1.125 1.125 0 0 1-1.125 1.125Z" />
    </svg>
  )
}

