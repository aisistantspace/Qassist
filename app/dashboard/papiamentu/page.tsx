'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Correction {
  id: string
  tenant_id: string | null
  from_text: string
  to_text: string
  change_type: 'spelling' | 'orthography' | 'variant'
  context: string | null
  created_at: string
}

const changeTypeBadge: Record<string, { bg: string; text: string; label: string }> = {
  spelling: { bg: 'bg-red-100', text: 'text-red-700', label: 'Spelling' },
  orthography: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Orthography' },
  variant: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Variant' },
}

export default function PapiamentuPage() {
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')
  const [bookStatus, setBookStatus] = useState<{
    imageCount: number
    extractedPages: number
    bookVocabulary: { word_count: number; merged_at: string | null; grades?: string[] }
    schoolPhrases: { phrase_count: number; conversation_rules: number; merged_at: string | null }
    schoolGrammar: { rule_count: number; merged_at: string | null }
  } | null>(null)
  const [mergingBook, setMergingBook] = useState(false)
  const [bookMessage, setBookMessage] = useState('')

  useEffect(() => {
    fetchCorrections()
    fetchBookStatus()
  }, [])

  async function fetchCorrections() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/papiamentu/corrections?limit=200')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load corrections')
        return
      }
      const data = await res.json()
      setCorrections(data.corrections || [])
    } catch (err) {
      setError('Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  async function fetchBookStatus() {
    try {
      const res = await fetch('/api/papiamentu/book-extract')
      if (res.ok) setBookStatus(await res.json())
    } catch {
      // optional status
    }
  }

  async function mergeBookExtract() {
    setMergingBook(true)
    setBookMessage('')
    try {
      const res = await fetch('/api/papiamentu/book-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Merge failed')
      setBookMessage(
        data.mergeReport
          ? `Merged ${data.mergeReport.vocabulary_entries} words, ${data.mergeReport.canonical_phrases} phrases, ${data.mergeReport.conversation_rules} conversation rules (+${data.mergeReport.wordlist_new_words} in wordlist)`
          : data.message
      )
      fetchBookStatus()
    } catch (err: unknown) {
      setBookMessage(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setMergingBook(false)
    }
  }

  async function seedPaGlossary() {
    setSeeding(true)
    setSeedMessage('')
    try {
      const res = await fetch('/api/papiamentu/seed-glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seed failed')
      setSeedMessage(data.message || `Seeded ${data.created} PA glossary entries`)
    } catch (err: unknown) {
      setSeedMessage(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = filterType === 'all'
    ? corrections
    : corrections.filter(c => c.change_type === filterType)

  // Stats
  const totalCorrections = corrections.length
  const spellingCount = corrections.filter(c => c.change_type === 'spelling').length
  const orthographyCount = corrections.filter(c => c.change_type === 'orthography').length
  const variantCount = corrections.filter(c => c.change_type === 'variant').length

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Papiamentu Layer</h1>
            <p className="text-gray-600">AI correction engine — Buki di Oro &amp; official Curaçao orthography</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 mb-6">
        <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wider mb-3">How the Papiamentu Layer Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="text-sm font-medium text-amber-900">Detect Language</p>
              <p className="text-xs text-amber-700 mt-0.5">Chat responses in Papiamentu are automatically identified</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="text-sm font-medium text-amber-900">Correct &amp; Normalize</p>
              <p className="text-xs text-amber-700 mt-0.5">Spelling, orthography, and Aruba→Curaçao variants fixed</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="text-sm font-medium text-amber-900">Self-Learning Log</p>
              <p className="text-xs text-amber-700 mt-0.5">When enabled, corrections are logged for review below</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grande 3–6 school books → Papiamentu layer */}
      <div className="bg-white border border-teal-200 rounded-lg p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Fiesta di idioma — Grande 3–6 school books</h3>
        <p className="text-sm text-gray-600 mb-4">
          Official Curaçao primary-school Papiamentu (Grande 3, 4, 5, 6). Photos in{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">Papiamentu book images/</code> are OCR&apos;d and merged into
          vocabulary, phrases, conversation rules, and grammar — exactly where the correction layer reads them.
        </p>
        {bookStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Photos</div>
              <div className="font-bold text-gray-900">{bookStatus.imageCount}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">OCR pages</div>
              <div className="font-bold text-gray-900">{bookStatus.extractedPages}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">School words</div>
              <div className="font-bold text-teal-700">{bookStatus.bookVocabulary.word_count}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Phrases</div>
              <div className="font-bold text-teal-700">{bookStatus.schoolPhrases.phrase_count}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Conv. rules</div>
              <div className="font-bold text-teal-700">{bookStatus.schoolPhrases.conversation_rules}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Grammar</div>
              <div className="font-bold text-teal-700">{bookStatus.schoolGrammar.rule_count}</div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={mergeBookExtract}
            disabled={mergingBook || !bookStatus?.extractedPages}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
          >
            {mergingBook ? 'Merging…' : 'Merge school books into layer'}
          </button>
        </div>
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <p><strong>Where data goes:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li><code className="bg-gray-100 px-1 rounded">school-grande-vocabulary.json</code> + <code className="bg-gray-100 px-1 rounded">wordlist.json</code> → spell-check</li>
            <li><code className="bg-gray-100 px-1 rounded">school-grande-phrases.json</code> + <code className="bg-gray-100 px-1 rounded">palabricks-phrases.json</code> → phrase correction</li>
            <li><code className="bg-gray-100 px-1 rounded">school-grande-grammar.json</code> + <code className="bg-gray-100 px-1 rounded">school-teacher-guide.json</code> → AI prompt guide</li>
          </ul>
          <p className="pt-2">
            <strong>Step 1</strong> (local): <code className="bg-gray-100 px-1 rounded">npm run pa:extract-book</code> — OCR student + teacher books (~461 pages, resumable).
            <strong> Step 2</strong>: merge above or <code className="bg-gray-100 px-1 rounded">npm run pa:merge-book</code>.
          </p>
        </div>
        {bookMessage && <p className="mt-3 text-sm text-gray-700">{bookMessage}</p>}
      </div>

      {/* Demo: PA insurance glossary for RAG */}
      <div className="bg-white border border-amber-200 rounded-lg p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Insurance demo — Papiamentu knowledge base</h3>
        <p className="text-sm text-gray-600 mb-4">
          Seed {17} Papiamentu insurance glossary entries (seguro di biahe, klaim, pòlisa, etc.) into the KB.
          Combined with ENNIA crawl data, the bot can answer in Papiamentu using facts from any language.
        </p>
        <button
          type="button"
          onClick={seedPaGlossary}
          disabled={seeding}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
        >
          {seeding ? 'Seeding…' : 'Seed PA insurance glossary'}
        </button>
        {seedMessage && (
          <p className="mt-3 text-sm text-gray-700">{seedMessage}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600">Total Corrections</div>
          <div className="text-2xl font-bold text-gray-900">{totalCorrections}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600">Spelling</div>
          <div className="text-2xl font-bold text-red-600">{spellingCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600">Orthography</div>
          <div className="text-2xl font-bold text-amber-600">{orthographyCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600">Variant</div>
          <div className="text-2xl font-bold text-blue-600">{variantCount}</div>
        </div>
      </div>

      {/* Filter + info */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Correction Log</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalCorrections === 0
                ? 'No corrections logged yet. Enable self-learning in Settings → Papiamentu, then chat in Papiamentu to see corrections appear here.'
                : `Showing ${filtered.length} correction${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 text-sm"
          >
            <option value="all">All Types</option>
            <option value="spelling">Spelling</option>
            <option value="orthography">Orthography</option>
            <option value="variant">Variant</option>
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading corrections...</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchCorrections}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-amber-50 mb-4">
              <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No corrections yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              The Papiamentu correction layer runs automatically on every Papiamentu chat response.
              Enable <strong>Self-Learning</strong> in Settings to log corrections here for review.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {filtered.map((c) => {
                const badge = changeTypeBadge[c.change_type] || changeTypeBadge.spelling
                return (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(c.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="line-through text-red-500 font-mono bg-red-50 px-1.5 py-0.5 rounded">{c.from_text}</span>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      <span className="text-green-700 font-mono bg-green-50 px-1.5 py-0.5 rounded font-medium">{c.to_text}</span>
                    </div>
                    {c.context && (
                      <p className="text-xs text-gray-400 truncate">Context: {c.context}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corrected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((c) => {
                    const badge = changeTypeBadge[c.change_type] || changeTypeBadge.spelling
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="line-through text-red-500 font-mono text-sm bg-red-50 px-1.5 py-0.5 rounded">{c.from_text}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-700 font-mono text-sm bg-green-50 px-1.5 py-0.5 rounded font-medium">{c.to_text}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {c.context || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {format(new Date(c.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
