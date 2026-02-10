'use client'

import { useState, useEffect } from 'react'
import type { KnowledgeBaseEntry } from '@/app/admin/knowledge-base/page'

interface KnowledgeBaseFormProps {
  entry: KnowledgeBaseEntry | null
  onSave: (entry: KnowledgeBaseEntry) => void
  onCancel: () => void
}

export default function KnowledgeBaseForm({ entry, onSave, onCancel }: KnowledgeBaseFormProps) {
  const [formData, setFormData] = useState<KnowledgeBaseEntry>({
    title: '',
    content: '',
    category: 'FAQ',
    language: 'EN',
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setFormData(entry)
    } else {
      setFormData({
        title: '',
        content: '',
        category: 'FAQ',
        language: 'EN',
        tags: [],
      })
    }
  }, [entry])

  function handleAddTag() {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  function handleRemoveTag(tag: string) {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setFormData({
      title: '',
      content: '',
      category: 'FAQ',
      language: 'EN',
      tags: [],
    })
    setTagInput('')
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g., What is a pensionado permit?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content *
        </label>
        <textarea
          required
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Provide a clear, concise answer (2-3 sentences). Include a CTA to book consultation."
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.content.length} characters
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="FAQ">FAQ</option>
            <option value="Service">Service</option>
            <option value="Blog">Blog</option>
            <option value="Policy">Policy</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language *
          </label>
          <select
            required
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="EN">English</option>
            <option value="NL">Dutch (Nederlands)</option>
            <option value="ES">Spanish (Español)</option>
            <option value="PA">Papiamento</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add a tag and press Enter"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
        </button>
        
        {entry && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}



