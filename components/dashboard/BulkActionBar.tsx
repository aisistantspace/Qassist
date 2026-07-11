'use client'

import type { ReactNode } from 'react'

interface BulkActionBarProps {
  count: number
  itemLabel?: string
  onClearSelection: () => void
  children: ReactNode
}

export default function BulkActionBar({
  count,
  itemLabel = 'item',
  onClearSelection,
  children,
}: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-primary-600 text-white text-sm font-bold">
          {count}
        </span>
        <span className="text-sm font-medium text-gray-900">
          {count} {itemLabel}{count !== 1 ? 's' : ''} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
        >
          Clear selection
        </button>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
