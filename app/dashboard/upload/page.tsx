'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    setError(null)
    const uploaded: string[] = []

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const data = await response.json()
        uploaded.push(file.name)
        
        // Trigger processing
        await fetch('/api/upload/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: data.document.id }),
        })
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err)
        setError(`Failed to upload ${file.name}: ${err.message}`)
      }
    }

    setUploadedFiles(prev => [...prev, ...uploaded])
    setUploading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-gray-600 mt-2">
          Upload PDFs, Word documents, text files, or CSV to train your AI assistant
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <DocumentArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-primary-600 font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-lg text-gray-900 font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supported: PDF, DOCX, TXT, CSV (max 10MB per file)
            </p>
          </>
        )}
      </div>

      {/* Status */}
      {uploading && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Uploading and processing files...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium mb-2">
            ✓ Successfully uploaded {uploadedFiles.length} file(s):
          </p>
          <ul className="text-sm text-green-700 list-disc list-inside">
            {uploadedFiles.map((filename, idx) => (
              <li key={idx}>{filename}</li>
            ))}
          </ul>
          <p className="text-sm text-green-600 mt-3">
            Files are being processed and will appear in the knowledge base soon.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
        <ol className="space-y-3 text-gray-700">
          <li className="flex gap-3">
            <span className="font-bold text-primary-600">1.</span>
            <span>Upload your documents (PDF, Word, text, or CSV files)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary-600">2.</span>
            <span>We extract the text and intelligently chunk it into smaller pieces</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary-600">3.</span>
            <span>Each chunk gets embedded using OpenAI and stored in the knowledge base</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary-600">4.</span>
            <span>Your AI assistant can now answer questions based on these documents!</span>
          </li>
        </ol>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Tips for Best Results</h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>Use clear, well-formatted documents</li>
          <li>Remove unnecessary headers/footers</li>
          <li>One topic per document works best</li>
          <li>Add multiple languages separately</li>
          <li>Keep files under 10MB for faster processing</li>
        </ul>
      </div>
    </div>
  )
}


