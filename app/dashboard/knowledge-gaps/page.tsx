'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface UnansweredQuery {
  id: string
  query: string
  language: string | null
  frequency: number
  first_asked: string
  last_asked: string
  resolved: boolean
}

const langLabels: Record<string, string> = {
  EN: 'English',
  NL: 'Dutch',
  ES: 'Spanish',
  PA: 'Papiamentu',
}

export default function KnowledgeGapsPage() {
  const [queries, setQueries] = useState<UnansweredQuery[]>([])
  const [stats, setStats] = useState({ open: 0, total_asks: 0 })
  const [loading, setLoading] = useState(true)
  const [resolvedFilter, setResolvedFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [languageFilter, setLanguageFilter] = useState('all')

  useEffect(() => {
    fetchQueries()
  }, [resolvedFilter, languageFilter])

  async function fetchQueries() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (resolvedFilter === 'open') params.set('resolved', 'false')
      else if (resolvedFilter === 'resolved') params.set('resolved', 'true')
      if (languageFilter !== 'all') params.set('language', languageFilter)

      const res = await fetch(`/api/dashboard/unanswered-queries?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQueries(data.queries || [])
        setStats(data.stats || { open: 0, total_asks: 0 })
      }
    } catch (error) {
      console.error('Error fetching knowledge gaps:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleResolved(id: string, resolved: boolean) {
    try {
      const res = await fetch('/api/dashboard/unanswered-queries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved }),
      })
      if (res.ok) {
        fetchQueries()
      }
    } catch (error) {
      console.error('Error updating gap:', error)
    }
  }

  function prefillKbEntry(query: string, language: string | null) {
    const params = new URLSearchParams({
      prefill: query,
      ...(language ? { lang: language } : {}),
    })
    window.location.href = `/dashboard/knowledge-base?${params}`
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/knowledge-base" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Knowledge Base
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Gaps</h1>
        <p className="text-gray-600 mt-2">
          Questions customers asked that your knowledge base could not answer. Add content to close these gaps.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Open gaps</div>
          <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total unanswered asks</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_asks}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value as 'open' | 'resolved' | 'all')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="open">Open gaps</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="all">All languages</option>
              <option value="EN">English</option>
              <option value="NL">Dutch</option>
              <option value="ES">Spanish</option>
              <option value="PA">Papiamentu</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchQueries}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading knowledge gaps...</div>
        ) : queries.length === 0 ? (
          <div className="p-12 text-center">
            <QuestionMarkCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No gaps recorded yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              When a customer asks something not in your knowledge base, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queries.map((q) => (
              <div
                key={q.id}
                className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 ${
                  q.resolved ? 'bg-gray-50/50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 ${q.resolved ? 'line-through text-gray-500' : ''}`}>
                    {q.query}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    {q.language && (
                      <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                        {langLabels[q.language] || q.language}
                      </span>
                    )}
                    <span>Asked {q.frequency}×</span>
                    <span>Last: {format(new Date(q.last_asked), 'MMM d, yyyy HH:mm')}</span>
                    {q.resolved && (
                      <span className="text-green-600 font-medium">Resolved</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {!q.resolved && (
                    <button
                      onClick={() => prefillKbEntry(q.query, q.language)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add to KB
                    </button>
                  )}
                  <button
                    onClick={() => toggleResolved(q.id, !q.resolved)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border ${
                      q.resolved
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    {q.resolved ? 'Reopen' : 'Mark resolved'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
        <strong>Tip:</strong> Each gap shows the <strong>language tag</strong> the customer was using when they asked
        (EN, NL, ES, or PA). Add KB content in that language — or in English/Dutch/Spanish for Papiamentu, which can
        fall back and be translated.
      </div>
    </div>
  )
}
