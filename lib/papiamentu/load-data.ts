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
let bookVocabulary: { words?: { word: string; levels?: string[]; grades?: string[] }[] } | null = null
let schoolPhrases: {
  phrases?: { pa: string; type?: string; grade?: string }[]
  conversation_rules?: { text: string }[]
} | null = null
let schoolGrammar: { rules?: { text: string; grade?: string }[] } | null = null
let schoolTeacherGuide: {
  lesson_objectives?: { text: string }[]
  teaching_notes?: { text: string }[]
  orthography_teaching?: { text: string }[]
  methodology?: { text: string }[]
} | null = null

function schoolVocabPath(): string {
  const primary = path.join(dataDir(), 'school-grande-vocabulary.json')
  if (fs.existsSync(primary)) return primary
  return path.join(dataDir(), 'book-vocabulary.json')
}

function schoolPhrasesPath(): string {
  const primary = path.join(dataDir(), 'school-grande-phrases.json')
  if (fs.existsSync(primary)) return primary
  return path.join(dataDir(), 'fiesta-phrases.json')
}

function schoolGrammarPath(): string {
  return path.join(dataDir(), 'school-grande-grammar.json')
}

function schoolTeacherGuidePath(): string {
  return path.join(dataDir(), 'school-teacher-guide.json')
}

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

function loadSchoolVocabularyFile(): { words?: { word: string; levels?: string[]; grades?: string[] }[] } {
  if (bookVocabulary) return bookVocabulary
  try {
    bookVocabulary = JSON.parse(fs.readFileSync(schoolVocabPath(), 'utf8'))
  } catch {
    bookVocabulary = { words: [] }
  }
  return bookVocabulary ?? { words: [] }
}

function loadSchoolPhrasesFile(): {
  phrases?: { pa: string; type?: string; grade?: string }[]
  conversation_rules?: { text: string }[]
} {
  if (schoolPhrases) return schoolPhrases
  try {
    schoolPhrases = JSON.parse(fs.readFileSync(schoolPhrasesPath(), 'utf8'))
  } catch {
    schoolPhrases = { phrases: [], conversation_rules: [] }
  }
  return schoolPhrases ?? { phrases: [], conversation_rules: [] }
}

function loadSchoolGrammarFile(): { rules?: { text: string; grade?: string }[] } {
  if (schoolGrammar) return schoolGrammar
  try {
    schoolGrammar = JSON.parse(fs.readFileSync(schoolGrammarPath(), 'utf8'))
  } catch {
    schoolGrammar = { rules: [] }
  }
  return schoolGrammar ?? { rules: [] }
}

function loadSchoolTeacherGuideFile(): {
  lesson_objectives?: { text: string }[]
  teaching_notes?: { text: string }[]
  orthography_teaching?: { text: string }[]
  methodology?: { text: string }[]
} {
  if (schoolTeacherGuide) return schoolTeacherGuide
  try {
    schoolTeacherGuide = JSON.parse(fs.readFileSync(schoolTeacherGuidePath(), 'utf8'))
  } catch {
    schoolTeacherGuide = {}
  }
  return schoolTeacherGuide ?? {}
}

/** Words from Fiesta di idioma Grande 3–6 vocabulary lists. */
export function getBookVocabularyWords(): string[] {
  const data = loadSchoolVocabularyFile()
  return (data.words || []).map((w) => w.word).filter(Boolean)
}

/** Alias — school Grande 3–6 vocabulary. */
export function getSchoolGrandeVocabularyWords(): string[] {
  return getBookVocabularyWords()
}

/** Canonical phrases from school reading + conversation (Grande 3–6). */
export function getFiestaPhrases(): string[] {
  return getSchoolGrandePhrases()
}

export function getSchoolGrandePhrases(): string[] {
  const data = loadSchoolPhrasesFile()
  const fromPhrases = (data.phrases || [])
    .map((p) => (typeof p === 'string' ? p : p.pa))
    .filter((s): s is string => typeof s === 'string' && s.length > 1)
  const fromRules = (data.conversation_rules || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 1)
  return [...fromPhrases, ...fromRules]
}

/** Conversation rules from school books (Regla di kòmbersashon). */
export function getSchoolConversationRules(): string[] {
  const data = loadSchoolPhrasesFile()
  return (data.conversation_rules || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 5)
}

/** Grammar notes from school books for prompt injection. */
export function getSchoolGrammarRules(): string[] {
  const data = loadSchoolGrammarFile()
  const meta = /\b(enseñar|ensenar|uitleg|cómo|¿|¡)\b/i
  const fromGrammar = (data.rules || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 10 && !meta.test(s))
  const orthography = getSchoolTeacherOrthographyRules()
  return [...orthography, ...fromGrammar].slice(0, 50)
}

/** Orthography teaching points from the teacher guide (highest authority for spelling). */
export function getSchoolTeacherOrthographyRules(): string[] {
  const data = loadSchoolTeacherGuideFile()
  const meta = /\b(enseñar|ensenar|uitleg|cómo|como se|¿|¡|spelling|correcto)\b/i
  return (data.orthography_teaching || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 10 && !meta.test(s))
    .slice(0, 20)
}

/** Lesson objectives from teacher guide — what "good" Papiamentu looks like per lesson. */
export function getSchoolTeacherLessonObjectives(): string[] {
  const data = loadSchoolTeacherGuideFile()
  return (data.lesson_objectives || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 10)
    .slice(0, 15)
}

/** Didactic methodology snippets from teacher guide. */
export function getSchoolTeacherMethodology(): string[] {
  const data = loadSchoolTeacherGuideFile()
  return (data.methodology || [])
    .map((r) => r.text)
    .filter((s) => typeof s === 'string' && s.length > 10)
    .slice(0, 10)
}

/** Sample school phrases for AI prompt (diverse, natural PA). */
export function getSchoolGrandePromptSamples(): string[] {
  const data = loadSchoolPhrasesFile()
  const meta = /\b(enseñar|ensenar|uitleg|cómo|¿|¡)\b/i
  const phrases = (data.phrases || [])
    .map((p) => (typeof p === 'string' ? p : p.pa))
    .filter(
      (s): s is string =>
        typeof s === 'string' && s.length >= 10 && s.length <= 120 && !meta.test(s)
    )
  const typed = (data.phrases || []).filter(
    (p) =>
      typeof p !== 'string' &&
      (p.type === 'reading' || p.type === 'conversation') &&
      typeof p.pa === 'string' &&
      !meta.test(p.pa)
  ) as { pa: string }[]
  const preferred = typed.map((p) => p.pa)
  const pool = preferred.length >= 8 ? preferred : phrases
  // Prefer natural PA chat-like samples
  const scored = pool
    .filter((p) => /\b(ta|ku|bo|mi|nos|bon|kon|por)\b/i.test(p))
    .slice(0, 15)
  return scored.length >= 6 ? scored : pool.slice(0, 15)
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
  for (const w of getBookVocabularyWords()) {
    const lower = w.toLowerCase().trim()
    // Skip polluted OCR leftovers (sentences masquerading as words)
    if (!lower || lower.length > 40 || /\s/.test(lower) || /[?]/.test(lower)) continue
    wordSet.add(lower)
  }
  // Always keep chat identity + common fused pronouns known so fuzzy spell cannot rewrite them
  wordSet.add('ami')
  wordSet.add('demi')
  wordSet.add('dami')
  for (const fused of [
    'yudabo',
    'mandabo',
    'kontaktabo',
    'informabo',
    'segurabo',
    'eksplikabo',
    'bishitá',
    'bishita',
  ]) {
    wordSet.add(fused)
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

  // Fiesta di idioma Grande 3–6 school book phrases
  for (const phrase of getSchoolGrandePhrases()) {
    if (phrase.length > 1) phrases.push(phrase)
  }

  canonicalPhrases = phrases
  return canonicalPhrases
}
