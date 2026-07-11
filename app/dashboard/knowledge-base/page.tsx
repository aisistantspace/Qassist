'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'

interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: string
  language: string
  tags: string[]
  created_at: string
  source_document_id?: string
}

interface KBStats {
  total: number
  fromUploads: number
  manual: number
}

interface Document {
  id: string
  filename: string
  file_type: string
  file_size: number
  status: string
  chunk_count: number
  created_at: string
}

interface AgentSettings {
  instructions: string
  openai_model: string
  temperature: number
  max_tokens: number
  llm_provider: string
  llm_base_url: string
  llm_api_key: string
}

const LLM_PROVIDERS = [
  {
    key: 'openai', label: 'OpenAI', description: 'GPT-4o, GPT-4o-mini',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, affordable)' },
      { value: 'gpt-4o', label: 'GPT-4o (Most capable)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    key: 'ollama', label: 'Ollama (Local)', description: 'Run models locally via Ollama',
    models: [
      { value: 'llama3.2', label: 'Llama 3.2' },
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'llama3', label: 'Llama 3' },
      { value: 'mistral', label: 'Mistral 7B' },
      { value: 'mixtral', label: 'Mixtral 8x7B' },
      { value: 'phi3', label: 'Phi-3' },
      { value: 'gemma2', label: 'Gemma 2' },
      { value: 'qwen2.5', label: 'Qwen 2.5' },
      { value: 'deepseek-r1', label: 'DeepSeek R1' },
    ],
  },
  {
    key: 'lmstudio', label: 'LM Studio (Local)', description: 'Run models locally via LM Studio',
    models: [{ value: 'local-model', label: 'Currently loaded model' }],
  },
  {
    key: 'groq', label: 'Groq', description: 'Ultra-fast inference',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
  {
    key: 'together', label: 'Together AI', description: 'Open-source models in the cloud',
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo' },
      { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Turbo' },
      { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B' },
      { value: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', label: 'DeepSeek R1 70B' },
    ],
  },
  {
    key: 'openrouter', label: 'OpenRouter', description: '200+ models (Anthropic, Google, Meta, etc.)',
    models: [
      { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Anthropic)' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Anthropic)' },
      { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku (Anthropic)' },
      { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Google)' },
      { value: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro (Google)' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (Meta)' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (via OpenRouter)' },
    ],
  },
  {
    key: 'custom', label: 'Custom (OpenAI-compatible)', description: 'Any OpenAI-compatible endpoint',
    models: [],
  },
]

/* ---- Confirm Modal Component ---- */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'files' | 'scrape' | 'agent' | 'chunks'>('agent')
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [kbStats, setKbStats] = useState<KBStats>({ total: 0, fromUploads: 0, manual: 0 })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Bulk selection state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())

  // Agent Settings state
  const [agentSettings, setAgentSettings] = useState<AgentSettings>({
    instructions: '',
    openai_model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 500,
    llm_provider: 'openai',
    llm_base_url: '',
    llm_api_key: '',
  })

  // Manual entry form
  const [manualForm, setManualForm] = useState({
    title: '',
    content: '',
    category: 'FAQ',
    language: 'EN',
    tags: '',
  })

  // File upload
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  // Website scrape
  const [scrapeUrl, setScrapeUrl] = useState('')

  // Website crawl
  const [crawlUrl, setCrawlUrl] = useState('')
  const [crawlMaxPages, setCrawlMaxPages] = useState(25)
  const [crawlMaxDepth, setCrawlMaxDepth] = useState(3)
  const [crawling, setCrawling] = useState(false)
  const [crawlResults, setCrawlResults] = useState<{
    pagesScraped: number
    totalChunks: number
    results: { url: string; title: string; chunks: number; error?: string }[]
    message: string
  } | null>(null)

  useEffect(() => {
    fetchData()
    fetchAgentSettings()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const prefill = params.get('prefill')
      const lang = params.get('lang')
      if (prefill) {
        setActiveTab('manual')
        setManualForm((prev) => ({
          ...prev,
          title: prefill.length > 80 ? `${prefill.slice(0, 77)}...` : prefill,
          content: `Question customers asked:\n"${prefill}"\n\nAnswer:\n`,
          language: lang && ['EN', 'NL', 'ES', 'PA'].includes(lang) ? lang : prev.language,
        }))
      }
    }
  }, [])

  const fetchData = async () => {
    try {
      const [entriesRes, docsRes] = await Promise.all([
        fetch('/api/admin/knowledge-base'),
        fetch('/api/documents'),
      ])

      if (entriesRes.ok) {
        const data = await entriesRes.json()
        setEntries(data.entries || [])
        if (data.stats) {
          setKbStats(data.stats)
        }
      }

      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setAgentSettings(data)
      }
    } catch (error) {
      console.error('Error fetching agent settings:', error)
    }
  }

  const handleSaveAgentSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentSettings),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      showMessage('success', 'AI instructions saved successfully!')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save AI settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // Manual Entry Handlers
  const handleAddManualEntry = async () => {
    if (!manualForm.title || !manualForm.content) {
      showMessage('error', 'Title and content are required')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          tags: manualForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      if (!res.ok) throw new Error('Failed to add entry')

      showMessage('success', 'Entry added successfully!')
      setManualForm({ title: '', content: '', category: 'FAQ', language: 'EN', tags: '' })
      fetchData()
    } catch (error) {
      showMessage('error', 'Failed to add entry')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          const res = await fetch(`/api/admin/knowledge-base?id=${id}`, {
            method: 'DELETE',
          })
          if (!res.ok) throw new Error('Failed to delete')
          showMessage('success', 'Entry deleted')
          selectedEntries.delete(id)
          setSelectedEntries(new Set(selectedEntries))
          fetchData()
        } catch (error) {
          showMessage('error', 'Failed to delete entry')
        }
      },
    })
  }

  const handleBulkDeleteEntries = () => {
    const count = selectedEntries.size
    if (count === 0) return
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} ${count === 1 ? 'Entry' : 'Entries'}`,
      message: `Are you sure you want to delete ${count} selected ${count === 1 ? 'entry' : 'entries'}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          const ids = Array.from(selectedEntries)
          await Promise.all(
            ids.map(id =>
              fetch(`/api/admin/knowledge-base?id=${id}`, { method: 'DELETE' })
            )
          )
          showMessage('success', `${count} ${count === 1 ? 'entry' : 'entries'} deleted`)
          setSelectedEntries(new Set())
          fetchData()
        } catch (error) {
          showMessage('error', 'Failed to delete some entries')
          fetchData()
        }
      },
    })
  }

  // File Upload Handlers
  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showMessage('error', 'Please select files to upload')
      return
    }

    setUploading(true)
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error(`Failed to upload ${file.name}`)
      }

      showMessage('success', `${selectedFiles.length} file(s) uploaded successfully!`)
      setSelectedFiles(null)
      fetchData()
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document and all its chunks? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: 'DELETE',
          })
          if (!res.ok) throw new Error('Failed to delete')
          showMessage('success', 'Document deleted')
          selectedDocuments.delete(id)
          setSelectedDocuments(new Set(selectedDocuments))
          fetchData()
        } catch (error) {
          showMessage('error', 'Failed to delete document')
        }
      },
    })
  }

  const handleBulkDeleteDocuments = () => {
    const count = selectedDocuments.size
    if (count === 0) return
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} ${count === 1 ? 'Document' : 'Documents'}`,
      message: `Are you sure you want to delete ${count} selected ${count === 1 ? 'document' : 'documents'} and all their chunks? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          const ids = Array.from(selectedDocuments)
          await Promise.all(
            ids.map(id =>
              fetch(`/api/documents/${id}`, { method: 'DELETE' })
            )
          )
          showMessage('success', `${count} ${count === 1 ? 'document' : 'documents'} deleted`)
          setSelectedDocuments(new Set())
          fetchData()
        } catch (error) {
          showMessage('error', 'Failed to delete some documents')
          fetchData()
        }
      },
    })
  }

  // Toggle helpers for bulk selection
  const toggleEntry = (id: string) => {
    const next = new Set(selectedEntries)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedEntries(next)
  }

  const toggleDocument = (id: string) => {
    const next = new Set(selectedDocuments)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedDocuments(next)
  }

  const toggleAllEntries = (ids: string[]) => {
    if (ids.every(id => selectedEntries.has(id))) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(ids))
    }
  }

  const toggleAllDocuments = (ids: string[]) => {
    if (ids.every(id => selectedDocuments.has(id))) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(ids))
    }
  }

  // Website Scrape Handler
  const handleScrapeWebsite = async () => {
    if (!scrapeUrl) {
      showMessage('error', 'Please enter a URL')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape website')
      }

      showMessage('success', data.message || 'Website scraped successfully!')
      setScrapeUrl('')
      fetchData()
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to scrape website')
    } finally {
      setUploading(false)
    }
  }

  // Website Crawl Handler
  const handleCrawlWebsite = async () => {
    if (!crawlUrl) {
      showMessage('error', 'Please enter a URL')
      return
    }

    setCrawling(true)
    setCrawlResults(null)
    try {
      const res = await fetch('/api/scrape/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl, maxPages: crawlMaxPages, maxDepth: crawlMaxDepth }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Crawl failed')
      }

      setCrawlResults(data)
      showMessage('success', data.message || 'Website crawled successfully!')
      fetchData()
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to crawl website')
    } finally {
      setCrawling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: ClockIcon, text: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Ready' },
      done: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Ready' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Error' },
      error: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Error' },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading knowledge base...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-2">
            Add content for your AI assistant to learn from - text entries, files, or websites
          </p>
        </div>
        <Link
          href="/dashboard/knowledge-gaps"
          className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 text-sm font-medium shrink-0"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
          View knowledge gaps
        </Link>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <XCircleIcon className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('files')}
          className="bg-white p-4 rounded-lg shadow border border-gray-200 text-left hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <CloudArrowUpIcon className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{kbStats.fromUploads}</p>
              <p className="text-sm text-gray-600">From Uploads</p>
            </div>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('manual')}
          className="bg-white p-4 rounded-lg shadow border border-gray-200 text-left hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{kbStats.manual}</p>
              <p className="text-sm text-gray-600">Manual Entries</p>
            </div>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('chunks')}
          className="bg-white p-4 rounded-lg shadow border border-gray-200 text-left hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{kbStats.total}</p>
              <p className="text-sm text-gray-600">Total Chunks</p>
            </div>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-8 pb-2 min-w-0">
          {[
            { id: 'agent', label: 'AI Instructions', icon: CommandLineIcon },
            { id: 'manual', label: 'Manual Entry', icon: DocumentTextIcon },
            { id: 'files', label: 'Upload Files', icon: CloudArrowUpIcon },
            { id: 'scrape', label: 'Scrape Website', icon: GlobeAltIcon },
            { id: 'chunks', label: 'All Data Chunks', icon: GlobeAltIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* AI Agent Tab */}
      {activeTab === 'agent' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <CommandLineIcon className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">AI Agent Configuration</h2>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt / Instructions
              </label>
              <textarea
                value={agentSettings.instructions}
                onChange={(e) =>
                  setAgentSettings({ ...agentSettings, instructions: e.target.value })
                }
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Enter instructions for the AI agent..."
              />
              <p className="text-sm text-gray-500 mt-1">
                These instructions guide how the AI behaves and responds to users.
              </p>
            </div>

            {/* LLM Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <select
                value={agentSettings.llm_provider || 'openai'}
                onChange={(e) => {
                  const prov = LLM_PROVIDERS.find(p => p.key === e.target.value)
                  const firstModel = prov?.models[0]?.value || ''
                  setAgentSettings({
                    ...agentSettings,
                    llm_provider: e.target.value,
                    openai_model: firstModel,
                    llm_base_url: '',
                    llm_api_key: '',
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.key} value={p.key}>{p.label} — {p.description}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                {(() => {
                  const prov = LLM_PROVIDERS.find(p => p.key === (agentSettings.llm_provider || 'openai'))
                  const models = prov?.models || []
                  if (models.length === 0) {
                    return (
                      <input
                        type="text"
                        value={agentSettings.openai_model}
                        onChange={(e) => setAgentSettings({ ...agentSettings, openai_model: e.target.value })}
                        placeholder="Enter model name (e.g. my-model)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                      />
                    )
                  }
                  return (
                    <select
                      value={agentSettings.openai_model}
                      onChange={(e) => setAgentSettings({ ...agentSettings, openai_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                    >
                      {models.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  )
                })()}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Creativity (Temperature): {agentSettings.temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={agentSettings.temperature}
                  onChange={(e) =>
                    setAgentSettings({
                      ...agentSettings,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Focused (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>
            </div>

            {/* Custom endpoint / API key (show for providers that need it or custom) */}
            {(['custom', 'ollama', 'lmstudio'].includes(agentSettings.llm_provider || 'openai') || agentSettings.llm_base_url) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base URL (OpenAI-compatible endpoint)
                </label>
                <input
                  type="text"
                  value={agentSettings.llm_base_url || ''}
                  onChange={(e) => setAgentSettings({ ...agentSettings, llm_base_url: e.target.value })}
                  placeholder={
                    agentSettings.llm_provider === 'ollama' ? 'http://localhost:11434/v1' :
                    agentSettings.llm_provider === 'lmstudio' ? 'http://localhost:1234/v1' :
                    'https://your-endpoint.com/v1'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for default provider URL.</p>
              </div>
            )}

            {!['ollama', 'lmstudio'].includes(agentSettings.llm_provider || 'openai') && agentSettings.llm_provider !== 'openai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key (optional — falls back to env var)
                </label>
                <input
                  type="password"
                  value={agentSettings.llm_api_key || ''}
                  onChange={(e) => setAgentSettings({ ...agentSettings, llm_api_key: e.target.value })}
                  placeholder="sk-... or leave empty to use environment variable"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {agentSettings.llm_provider === 'groq' ? 'Set GROQ_API_KEY in .env, or enter key here.' :
                   agentSettings.llm_provider === 'together' ? 'Set TOGETHER_API_KEY in .env, or enter key here.' :
                   agentSettings.llm_provider === 'openrouter' ? 'Set OPENROUTER_API_KEY in .env, or enter key here.' :
                   'Enter API key or set in environment variables.'}
                </p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveAgentSettings}
              disabled={savingSettings}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {savingSettings ? (
                <>
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save AI Instructions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Add Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Add Manual Entry</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="e.g., How do I reset my password?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="Enter the detailed answer or information..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                  >
                    <option value="FAQ">FAQ</option>
                    <option value="Service">Service</option>
                    <option value="Blog">Blog</option>
                    <option value="Policy">Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={manualForm.language}
                    onChange={(e) => setManualForm({ ...manualForm, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                  >
                    <option value="EN">English</option>
                    <option value="NL">Dutch</option>
                    <option value="ES">Spanish</option>
                    <option value="PA">Papiamentu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={manualForm.tags}
                    onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <button
                onClick={handleAddManualEntry}
                disabled={uploading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                {uploading ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>

          {/* Entries List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Manual Entries ({entries.length})</h2>
              {entries.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && entries.every(e => selectedEntries.has(e.id))}
                    onChange={() => toggleAllEntries(entries.map(e => e.id))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Select all
                </label>
              )}
            </div>

            {/* Bulk action bar */}
            {selectedEntries.size > 0 && (
              <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-red-800">{selectedEntries.size} selected</span>
                <button
                  onClick={handleBulkDeleteEntries}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete selected
                </button>
                <button
                  onClick={() => setSelectedEntries(new Set())}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No manual entries yet. Add one above!</p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 transition-colors ${selectedEntries.has(entry.id) ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 hover:border-primary-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleEntry(entry.id)}
                          className="w-4 h-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {entry.category}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {entry.language}
                            </span>
                            {entry.tags.map((tag) => (
                              <span key={tag} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 ml-7">{entry.content}</p>
                    <p className="text-xs text-gray-400 mt-2 ml-7">
                      Added {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Files Tab */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Upload Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.csv"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
                >
                  Click to select files
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  PDF, TXT, DOC, DOCX, CSV files supported
                </p>
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="mt-4 text-sm text-gray-700">
                    {selectedFiles.length} file(s) selected
                  </div>
                )}
              </div>

              <button
                onClick={handleFileUpload}
                disabled={uploading || !selectedFiles || selectedFiles.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <CloudArrowUpIcon className="w-5 h-5" />
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {(() => {
              const fileDocs = documents.filter(d => d.file_type !== 'url')
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Uploaded Files ({fileDocs.length})</h2>
                    {fileDocs.length > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={fileDocs.length > 0 && fileDocs.every(d => selectedDocuments.has(d.id))}
                          onChange={() => toggleAllDocuments(fileDocs.map(d => d.id))}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Select all
                      </label>
                    )}
                  </div>

                  {/* Bulk action bar */}
                  {selectedDocuments.size > 0 && activeTab === 'files' && (
                    <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <span className="text-sm font-medium text-red-800">{selectedDocuments.size} selected</span>
                      <button
                        onClick={handleBulkDeleteDocuments}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete selected
                      </button>
                      <button
                        onClick={() => setSelectedDocuments(new Set())}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {fileDocs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No files uploaded yet. Upload some above!</p>
                  ) : (
                    <div className="space-y-3">
                      {fileDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`border rounded-lg p-4 transition-colors ${selectedDocuments.has(doc.id) ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 hover:border-primary-300'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.has(doc.id)}
                                onChange={() => toggleDocument(doc.id)}
                                className="w-4 h-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <div>
                                <h3 className="font-semibold text-gray-900">{doc.filename}</h3>
                                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                  <span>{doc.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                                  <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                                  <span>{doc.chunk_count} chunks</span>
                                </div>
                                <div className="mt-2">
                                  {getStatusBadge(doc.status)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Scrape Website Tab */}
      {activeTab === 'scrape' && (
        <div className="space-y-6">
          {/* Crawl Website — the main feature */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 border-2 border-primary-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary-50 rounded-lg">
                <GlobeAltIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Crawl Entire Website</h2>
                <p className="text-sm text-gray-500">Automatically discover and import all pages from a website</p>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Pages: {crawlMaxPages}
                </label>
                <input
                  type="range"
                  min="5"
                  max="125"
                  step="5"
                  value={crawlMaxPages}
                  onChange={(e) => setCrawlMaxPages(parseInt(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 pages</span>
                  <span>125 pages</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Depth: {crawlMaxDepth}
                </label>
                <input
                  type="range"
                  min="1"
                  max="125"
                  step="1"
                  value={crawlMaxDepth}
                  onChange={(e) => setCrawlMaxDepth(parseInt(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 level</span>
                  <span>125 levels</span>
                </div>
              </div>

              <button
                onClick={handleCrawlWebsite}
                disabled={crawling || !crawlUrl}
                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {crawling ? (
                  <>
                    <ClockIcon className="w-5 h-5 animate-spin" />
                    Crawling website... This may take a few minutes
                  </>
                ) : (
                  <>
                    <GlobeAltIcon className="w-5 h-5" />
                    Crawl Website
                  </>
                )}
              </button>
            </div>

            {/* Crawl Results */}
            {crawlResults && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    {crawlResults.pagesScraped} pages crawled
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {crawlResults.totalChunks} knowledge entries created
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {crawlResults.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {r.error ? (
                        <XCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-gray-700 truncate flex-1" title={r.url}>
                        {r.title || r.url}
                      </span>
                      {r.chunks > 0 && (
                        <span className="text-xs text-gray-400 shrink-0">{r.chunks} chunks</span>
                      )}
                      {r.error && (
                        <span className="text-xs text-red-400 shrink-0">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Single Page Scrape — secondary option */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Scrape Single Page</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page URL
                </label>
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="https://example.com/specific-page"
                />
              </div>

              <button
                onClick={handleScrapeWebsite}
                disabled={uploading || !scrapeUrl}
                className="w-full bg-gray-600 text-white py-2.5 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 text-sm"
              >
                <GlobeAltIcon className="w-4 h-4" />
                {uploading ? 'Scraping...' : 'Scrape Single Page'}
              </button>
            </div>
          </div>

          {/* Scraped Sites List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {(() => {
              const urlDocs = documents.filter(d => d.file_type === 'url')
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Scraped Websites ({urlDocs.length})
                    </h2>
                    {urlDocs.length > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={urlDocs.length > 0 && urlDocs.every(d => selectedDocuments.has(d.id))}
                          onChange={() => toggleAllDocuments(urlDocs.map(d => d.id))}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Select all
                      </label>
                    )}
                  </div>

                  {/* Bulk action bar */}
                  {selectedDocuments.size > 0 && activeTab === 'scrape' && (
                    <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <span className="text-sm font-medium text-red-800">{selectedDocuments.size} selected</span>
                      <button
                        onClick={handleBulkDeleteDocuments}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete selected
                      </button>
                      <button
                        onClick={() => setSelectedDocuments(new Set())}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {urlDocs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No websites scraped yet. Use the crawler above!</p>
                  ) : (
                    <div className="space-y-3">
                      {urlDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`border rounded-lg p-4 transition-colors ${selectedDocuments.has(doc.id) ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 hover:border-primary-300'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.has(doc.id)}
                                onChange={() => toggleDocument(doc.id)}
                                className="w-4 h-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{doc.filename}</h3>
                                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                  <span>{doc.chunk_count} chunks</span>
                                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-2">
                                  {getStatusBadge(doc.status)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* All Data Chunks Tab */}
      {activeTab === 'chunks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">All AI Data Chunks ({entries.length})</h2>
              {entries.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && entries.every(e => selectedEntries.has(e.id))}
                    onChange={() => toggleAllEntries(entries.map(e => e.id))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Select all
                </label>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-6">
              These are the individual pieces of information the AI uses to answer questions.
            </p>

            {/* Bulk action bar */}
            {selectedEntries.size > 0 && activeTab === 'chunks' && (
              <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-red-800">{selectedEntries.size} selected</span>
                <button
                  onClick={handleBulkDeleteEntries}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete selected
                </button>
                <button
                  onClick={() => setSelectedEntries(new Set())}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data chunks found. Add some content via files, URLs, or manual entries!</p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 transition-colors ${selectedEntries.has(entry.id) ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 hover:border-primary-300 bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleEntry(entry.id)}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{entry.title || 'Untitled Chunk'}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">
                              {entry.language}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full uppercase">
                              {entry.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Chunk"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed bg-white p-3 rounded border border-gray-100 ml-7">
                      {entry.content}
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 ml-7">
                      ID: {entry.id} • Added {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}


