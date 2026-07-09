'use client'

import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ToastBannerProps {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}

export default function ToastBanner({ type, message, onDismiss }: ToastBannerProps) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm ${
        isSuccess
          ? 'border-green-200 bg-green-50 text-green-900'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
      role="status"
    >
      {isSuccess ? (
        <CheckCircleIcon className="w-5 h-5 shrink-0 text-green-600 mt-0.5" />
      ) : (
        <XCircleIcon className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
      )}
      <p className="text-sm flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded hover:bg-black/5"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
