'use client'

import { useState, FormEvent } from 'react'
import type { FormField } from '@/lib/types'

interface InlineFormProps {
  formId: string
  formName: string
  fields: FormField[]
  leadId: string
  existingAnswers?: Record<string, any>
  onSubmit?: (eligibilityResults?: string) => void
}

export default function InlineForm({
  formId,
  formName,
  fields,
  leadId,
  existingAnswers = {},
  onSubmit,
}: InlineFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(existingAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [eligibilityResults, setEligibilityResults] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
    setSubmitError(null)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      const value = formData[field.key]
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        newErrors[field.key] = `${field.label} is required`
        return
      }
      
      // Email validation
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          newErrors[field.key] = 'Please enter a valid email address'
        }
      }
      
      // Number validation
      if (field.type === 'number') {
        if (isNaN(Number(value))) {
          newErrors[field.key] = 'Please enter a valid number'
        }
      }
      
      // Date validation
      if (field.type === 'date') {
        if (value && isNaN(Date.parse(value))) {
          newErrors[field.key] = 'Please enter a valid date'
        }
      }
      
      // Select validation
      if (field.type === 'select' && field.options) {
        if (!field.options.includes(value)) {
          newErrors[field.key] = 'Please select a valid option'
        }
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          leadId,
          answers: formData,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }
      
      // Store eligibility results if available
      if (data.eligibilityResults) {
        setEligibilityResults(data.eligibilityResults)
        setIsSubmitted(true)
        // Pass results to parent callback
        onSubmit?.(data.eligibilityResults)
      } else {
        // Call onSubmit callback if provided
        onSubmit?.()
      }
      
      // Show success message (could be handled by parent component)
      // For now, we'll just clear the form
      setFormData({})
    } catch (error: any) {
      console.error('Error submitting form:', error)
      setSubmitError(error.message || 'Failed to submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If eligibility results are available, show them instead of form
  if (isSubmitted && eligibilityResults) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Eligibility Results</h3>
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-700">{eligibilityResults}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{formName}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              <span className="text-red-500 ml-1">*</span>
            </label>
            
            {field.type === 'select' ? (
              <select
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors[field.key] ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select {field.label}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                type="date"
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.question}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors[field.key] ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.question}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors[field.key] ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
            )}
            
            {errors[field.key] && (
              <p className="text-red-500 text-xs mt-1">{errors[field.key]}</p>
            )}
          </div>
        ))}
        
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{submitError}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
