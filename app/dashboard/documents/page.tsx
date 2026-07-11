'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { TrashIcon } from '@heroicons/react/24/outline'
import ActionMenu from '@/components/dashboard/ActionMenu'
import { ui } from '@/lib/dashboard-ui'

interface Document {
  id: string
  filename: string
  file_type: string
  file_size: number
  status: string
  chunk_count: number
  created_at: string
  processed_at: string | null
  error_message: string | null
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchDocuments()
    fetchStats()
  }, [])

  async function fetchDocuments() {
    setLoading(true)
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/documents/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? All related knowledge base entries will be removed.')) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDocuments()
        fetchStats()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-2">Manage uploaded documents and training data</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          + Upload New
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Documents</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_documents}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed_documents}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Chunks</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_chunks}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Size</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatFileSize(stats.total_size_bytes || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No documents uploaded yet</p>
            <Link
              href="/dashboard/upload"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Upload your first document →
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-200">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 space-y-2">
                  <div className="font-medium text-gray-900">{doc.filename}</div>
                  <div className="text-sm text-gray-500">{doc.file_type}</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-600">{formatFileSize(doc.file_size)}</span>
                    <span>·</span>
                    <span>{doc.chunk_count} chunks</span>
                    <span>·</span>
                    <span className="text-gray-500">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {doc.status}
                    </span>
                    <ActionMenu
                      items={[
                        { label: 'Delete document', icon: TrashIcon, destructive: true, onClick: () => handleDelete(doc.id) },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Chunks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{doc.filename}</div>
                    <div className="text-sm text-gray-500">{doc.file_type}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {doc.status}
                    </span>
                    {doc.error_message && (
                      <div className="text-xs text-red-600 mt-1">{doc.error_message}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {doc.chunk_count} chunks
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(doc.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className={`${ui.td} text-right`}>
                    <ActionMenu
                      items={[
                        { label: 'Delete document', icon: TrashIcon, destructive: true, onClick: () => handleDelete(doc.id) },
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
    </div>
  )
}


