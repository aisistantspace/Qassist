/**
 * Load Papiamentu data from lib/papiamentu/data/.
 * Lazy-load, single load per process.
 */

import path from 'path'
import fs from 'fs'

let wordSet: Set<string> | null = null
let wordArray: string[] | null = null
let orthography: Record<string, unknown> | null = null
let arubaToCuracao: Record<string, string> | null = null
let corePhrases: Record<string, unknown> | null = null
let translations: Record<string, { nl: string; class: string; [key: string]: unknown }> | null = null
let canonicalPhrases: string[] | null = null
let spanishToPa: Record<string, string> | null = null
let insuranceVocab: {
  words?: string[]
  spanish_to_pa?: Record<string, string>
  phrase_fixes?: { pattern: string; replacement: string }[]
  demo_phrases?: string[]
} | null = null

function loadInsuranceVocabFile(): {
  words?: string[]
  spanish_to_pa?: Record<string, string>
  phrase_fixes?: { pattern: string; replacement: string }[]
  demo_phrases?: string[]
  kb_glossary?: { title: string; content: string; tags: string[] }[]
} {
  if (insuranceVocab) return insuranceVocab
  try {
    const filePath = path.join(dataDir(), 'insurance-vocabulary.json')
    insuranceVocab = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    insuranceVocab = {}
  }
  return insuranceVocab ?? {}
}

/** Extra accepted words for insurance demo (merged into spell-check). */
export function getInsuranceWordSet(): Set<string> {
  const data = loadInsuranceVocabFile()
  return new Set((data.words || []).map((w) => w.toLowerCase()))
}

export function getInsurancePhraseFixes(): { pattern: string; replacement: string }[] {
  return loadInsuranceVocabFile().phrase_fixes || []
}

export function getInsuranceDemoPhrases(): string[] {
  return loadInsuranceVocabFile().demo_phrases || []
}

function dataDir(): string {
  return path.join(process.cwd(), 'lib', 'papiamentu', 'data')
}

export function getWordSet(): Set<string> {
  if (wordSet) return wordSet
  const arr = getWordArray()
  wordSet = new Set(arr.map((w) => w.toLowerCase()))
  for (const w of getInsuranceWordSet()) {
    wordSet.add(w)
  }
  return wordSet
}

export function getWordArray(): string[] {
  if (wordArray) return wordArray
  const filePath = path.join(dataDir(), 'wordlist.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  wordArray = JSON.parse(raw) as string[]
  return wordArray
}

export function getOrthography(): Record<string, unknown> {
  if (orthography) return orthography
  const filePath = path.join(dataDir(), 'orthography.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  orthography = JSON.parse(raw) as Record<string, unknown>
  return orthography
}

export function getArubaToCuracaoMap(): Record<string, string> {
  if (arubaToCuracao) return arubaToCuracao
  const filePath = path.join(dataDir(), 'aruba-to-curacao.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw) as { map?: Record<string, string> }
  arubaToCuracao = data.map || {}
  return arubaToCuracao
}

export function getCorePhrases(): Record<string, unknown> {
  if (corePhrases) return corePhrases
  const filePath = path.join(dataDir(), 'core-phrases.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  corePhrases = JSON.parse(raw) as Record<string, unknown>
  return corePhrases
}

export function getTranslations(): Record<string, { nl: string; class: string; [key: string]: unknown }> {
  if (translations) return translations
  const filePath = path.join(dataDir(), 'papiamentu-dutch.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw) as { translations?: Record<string, { nl: string; class: string; [key: string]: unknown }> }
  translations = data.translations || {}
  return translations
}

/**
 * Load Spanish-to-Papiamentu word substitution map.
 * Used by the phrase pre-pass to replace common Spanish words with PA equivalents.
 */
export function getSpanishToPaMap(): Record<string, string> {
  if (spanishToPa) return spanishToPa
  try {
    const filePath = path.join(dataDir(), 'spanish-to-pa.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw) as Record<string, string>
    // Filter out non-string values (like _comment)
    spanishToPa = {}
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string' && !k.startsWith('_')) {
        spanishToPa[k.toLowerCase()] = v
      }
    }
  } catch {
    spanishToPa = {}
  }
  const insuranceMap = loadInsuranceVocabFile().spanish_to_pa || {}
  for (const [k, v] of Object.entries(insuranceMap)) {
    if (typeof v === 'string') {
      spanishToPa![k.toLowerCase()] = v
    }
  }
  return spanishToPa
}

/**
 * Load all canonical Papiamentu phrases from core-phrases.json and palabricks-phrases.json.
 * Returns a flat array of phrase strings (greetings, common, days, months, scraped phrases, etc.)
 */
export function getCanonicalPhrases(): string[] {
  if (canonicalPhrases) return canonicalPhrases

  const phrases: string[] = []

  // Load core-phrases.json
  const coreData = getCorePhrases() as {
    greetings?: Record<string, string>
    common?: Record<string, string>
    numbers?: Record<string, string>
    days?: Record<string, string>
    months?: Record<string, string>
    colors?: Record<string, string>
    phrases?: Array<{ pa: string }>
  }

  // Extract all values from structured sections
  for (const section of ['greetings', 'common', 'days', 'months', 'colors'] as const) {
    const obj = coreData[section]
    if (obj && typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        if (typeof val === 'string' && val.length > 1) {
          phrases.push(val)
        }
      }
    }
  }

  // Extract phrases array
  if (Array.isArray(coreData.phrases)) {
    for (const p of coreData.phrases) {
      if (p.pa && typeof p.pa === 'string') {
        phrases.push(p.pa)
      }
    }
  }

  // Load palabricks-phrases.json
  try {
    const filePath = path.join(dataDir(), 'palabricks-phrases.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw) as { phrases?: Array<{ pa: string }> }
    if (Array.isArray(data.phrases)) {
      for (const p of data.phrases) {
        if (p.pa && typeof p.pa === 'string') {
          phrases.push(p.pa)
        }
      }
    }
  } catch {
    // palabricks-phrases.json is optional
  }

  // Insurance demo phrases
  for (const phrase of getInsuranceDemoPhrases()) {
    if (phrase.length > 1) phrases.push(phrase)
  }

  canonicalPhrases = phrases
  return canonicalPhrases
}
