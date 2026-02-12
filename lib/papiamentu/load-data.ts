/**
 * Load Papiamentu data from lib/papiamentu/data/.
 * Lazy-load, single load per process.
 */

import path from 'path'
import fs from 'fs'

let wordSet: Set<string> | null = null
let orthography: Record<string, unknown> | null = null
let arubaToCuracao: Record<string, string> | null = null
let corePhrases: Record<string, unknown> | null = null
let translations: Record<string, { nl: string; class: string; [key: string]: unknown }> | null = null

function dataDir(): string {
  return path.join(process.cwd(), 'lib', 'papiamentu', 'data')
}

export function getWordSet(): Set<string> {
  if (wordSet) return wordSet
  const filePath = path.join(dataDir(), 'wordlist.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  const arr = JSON.parse(raw) as string[]
  wordSet = new Set(arr.map((w) => w.toLowerCase()))
  return wordSet
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
