'use client'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-12 px-6 text-center">
      {icon && <div className="flex justify-center mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
