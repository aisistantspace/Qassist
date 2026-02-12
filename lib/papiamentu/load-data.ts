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

function dataDir(): string {
  return path.join(process.cwd(), 'lib', 'papiamentu', 'data')
}

export function getWordSet(): Set<string> {
  if (wordSet) return wordSet
  const arr = getWordArray()
  wordSet = new Set(arr.map((w) => w.toLowerCase()))
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

  canonicalPhrases = phrases
  return canonicalPhrases
}
