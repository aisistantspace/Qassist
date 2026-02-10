'use client'

import { useState, useEffect } from 'react'
import KnowledgeBaseForm from '@/components/KnowledgeBaseForm'
import KnowledgeBaseList from '@/components/KnowledgeBaseList'

export interface KnowledgeBaseEntry {
  id?: string
  title: string
  content: string
  category: 'FAQ' | 'Service' | 'Blog' | 'Policy'
  language: 'EN' | 'NL' | 'ES' | 'PA'
  tags: string[]
  created_at?: string
  updated_at?: string
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/knowledge-base')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch entries')
      }
      
      const data = await response.json()
      setEntries(data.entries || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entries')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave(entry: KnowledgeBaseEntry) {
    setError(null)
    setSuccessMessage(null)

    try {
      // Generate embedding on the server
      const response = await fetch('/api/admin/knowledge-base', {
        method: entry.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save entry')
      }

      setSuccessMessage(entry.id ? 'Entry updated successfully!' : 'Entry created successfully!')
      setSelectedEntry(null)
      await fetchEntries()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save entry')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    setError(null)
    try {
      const response = await fetch(`/api/admin/knowledge-base?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete entry')
      }
      
      setSuccessMessage('Entry deleted successfully!')
      await fetchEntries()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
    }
  }

  function handleEdit(entry: KnowledgeBaseEntry) {
    setSelectedEntry(entry)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setSelectedEntry(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Knowledge Base Management
          </h1>
          <p className="text-gray-600">
            Add, edit, or delete content that powers the AI assistant
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedEntry ? 'Edit Entry' : 'Add New Entry'}
              </h2>
              <KnowledgeBaseForm
                entry={selectedEntry}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Existing Entries ({entries.length})
              </h2>
              
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading entries...
                </div>
              ) : (
                <KnowledgeBaseList
                  entries={entries}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Creating Content</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Keep answers concise (2-3 sentences) for better AI responses</li>
            <li>Include a call-to-action to book consultation for case-specific help</li>
            <li>Add content in all 4 languages for multilingual support</li>
            <li>Use relevant tags to improve search accuracy</li>
            <li>Embeddings are generated automatically when you save</li>
          </ul>
        </div>
      </div>
    </div>
  )
}



