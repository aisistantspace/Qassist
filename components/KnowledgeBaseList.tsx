'use client'

import type { KnowledgeBaseEntry } from '@/app/admin/knowledge-base/page'

interface KnowledgeBaseListProps {
  entries: KnowledgeBaseEntry[]
  onEdit: (entry: KnowledgeBaseEntry) => void
  onDelete: (id: string) => void
}

const categoryColors = {
  FAQ: 'bg-blue-100 text-blue-800',
  Service: 'bg-green-100 text-green-800',
  Blog: 'bg-purple-100 text-purple-800',
  Policy: 'bg-orange-100 text-orange-800',
}

const languageFlags = {
  EN: '🇬🇧',
  NL: '🇳🇱',
  ES: '🇪🇸',
  PA: '🇨🇼',
}

export default function KnowledgeBaseList({ entries, onEdit, onDelete }: KnowledgeBaseListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No entries yet. Create your first entry!
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{languageFlags[entry.language]}</span>
                <span className={`text-xs px-2 py-1 rounded ${categoryColors[entry.category]}`}>
                  {entry.category}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{entry.title}</h3>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {entry.content}
          </p>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {entry.updated_at
                ? `Updated ${new Date(entry.updated_at).toLocaleDateString()}`
                : `Created ${entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(entry)}
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => entry.id && onDelete(entry.id)}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}



