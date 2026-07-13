#!/usr/bin/env node
/**
 * Merge Grande 3–6 school book OCR into the Papiamentu correction layer.
 *
 * Writes:
 *   school-grande-vocabulary.json  → spell-check (getWordSet)
 *   school-grande-phrases.json     → phrase matching (getCanonicalPhrases)
 *   school-grande-grammar.json     → AI prompt guide supplement
 *   palabricks-phrases.json        → append new school phrases (deduped)
 *   wordlist.json                  → always updated
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'lib', 'papiamentu', 'data')
const PAGES_DIR = path.join(DATA_DIR, 'book-extract', 'pages')
const VOCAB_OUT = path.join(DATA_DIR, 'school-grande-vocabulary.json')
const PHRASES_OUT = path.join(DATA_DIR, 'school-grande-phrases.json')
const GRAMMAR_OUT = path.join(DATA_DIR, 'school-grande-grammar.json')
const TEACHER_GUIDE_OUT = path.join(DATA_DIR, 'school-teacher-guide.json')
const PALABRICKS_PATH = path.join(DATA_DIR, 'palabricks-phrases.json')
const WORDLIST_PATH = path.join(DATA_DIR, 'wordlist.json')
const REPORT_PATH = path.join(DATA_DIR, 'book-extract', 'merge-report.json')

// Legacy paths (still written for compatibility)
const LEGACY_VOCAB = path.join(DATA_DIR, 'book-vocabulary.json')
const LEGACY_PHRASES = path.join(DATA_DIR, 'fiesta-phrases.json')

const PA_WORD = /[\wàèéìòùüñáíóúÀÈÉÌÒÙÜÑÁÍÓÚ'-]+/gu

function normalizeWord(w) {
  return w.trim().toLowerCase()
}

function isValidPaWord(w) {
  if (!w || w.length < 2 || w.length > 40) return false
  if (/\s/.test(w)) return false
  if (/[?]/.test(w)) return false
  if (/^\d+$/.test(w)) return false
  if (/^[A-E][12]$/i.test(w)) return false
  if (/^(tema|siman|grande|fiesta)$/i.test(w)) return false
  if (/\b(enseñar|ensenar|uitleg|cómo|¿|¡)\b/i.test(w)) return false
  return /[a-zàèéìòùüñáíóú]/i.test(w)
}

function splitSentences(text) {
  if (!text || typeof text !== 'string') return []
  return text
    .split(/(?<=[.!?])\s+|\n+|(?<=;)\s+/)
    .map((s) => s.replace(/^[\s•\-*▪]+/, '').trim())
    .filter((s) => s.length >= 6 && /[a-zàèéìòùüñáíóú]/i.test(s))
}

function parseVocabLine(line) {
  const trimmed = line.trim().replace(/[,;]\s*$/, '')
  const m = trimmed.match(/^(.+?)\s*,\s*([A-E][12])\s*$/i)
  if (m) return { word: m[1].trim(), level: m[2].toUpperCase() }
  if (trimmed && !trimmed.includes(',') && isValidPaWord(trimmed)) {
    return { word: trimmed, level: null }
  }
  return null
}

function loadPages() {
  if (!fs.existsSync(PAGES_DIR)) {
    console.error('No extracted pages. Run: npm run pa:extract-book')
    process.exit(1)
  }
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json') && !f.includes('.error'))
  if (files.length === 0) {
    console.error('No page JSON files found. Run: npm run pa:extract-book')
    process.exit(1)
  }
  return files.sort().map((f) => JSON.parse(fs.readFileSync(path.join(PAGES_DIR, f), 'utf8')))
}

function addPhrase(set, text, meta) {
  const t = text.trim()
  if (t.length < 6) return
  set.set(normalizePhraseKey(t), { pa: t, ...meta })
}

function normalizePhraseKey(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function main() {
  const pages = loadPages()

  const vocabMap = new Map()
  const phraseMap = new Map()
  const conversationRules = new Map()
  const grammarRules = new Map()
  const lessonObjectives = new Map()
  const teachingNotes = new Map()
  const orthographyTeaching = new Map()
  const methodology = new Map()
  const readingByGrade = { '3': [], '4': [], '5': [], '6': [], unknown: [] }
  let studentPages = 0
  let teacherPages = 0

  const addRule = (map, text, meta) => {
    const t = text.trim()
    if (t.length < 10) return
    map.set(normalizePhraseKey(t), { text: t, ...meta })
  }

  for (const page of pages) {
    const source = page.source_file || `page-${page.index}`
    const bookRole = page.book_role || (/^IMG202607091/i.test(source) ? 'teacher' : 'student')
    if (bookRole === 'teacher') teacherPages++
    else studentPages++
    const grade = page.grade && /^[3-6]$/.test(String(page.grade)) ? String(page.grade) : 'unknown'
    const section = page.section || page.page_type || 'other'

    const addVocab = (word, level) => {
      if (!word || !isValidPaWord(word)) return
      const key = normalizeWord(word)
      if (!vocabMap.has(key)) {
        vocabMap.set(key, {
          word: word.trim(),
          levels: new Set(),
          grades: new Set(),
          sources: [],
        })
      }
      const rec = vocabMap.get(key)
      if (level) rec.levels.add(level.toUpperCase())
      rec.grades.add(grade)
      if (!rec.sources.includes(source)) rec.sources.push(source)
    }

    for (const entry of page.words || []) {
      const word = typeof entry === 'string' ? entry : entry.word
      const level = typeof entry === 'object' ? entry.level : null
      addVocab(word, level)
    }

    if (page.page_type === 'vocabulary_list' || section === 'vocabulary') {
      for (const line of (page.raw_text || '').split('\n')) {
        const parsed = parseVocabLine(line)
        if (parsed) addVocab(parsed.word, parsed.level)
      }
    }

    for (const phrase of page.phrases || []) {
      for (const s of splitSentences(phrase)) {
        addPhrase(phraseMap, s, { source, grade, section, type: 'conversation' })
      }
    }

    for (const rule of page.conversation_rules || []) {
      const t = rule.trim()
      if (t.length >= 10) {
        conversationRules.set(normalizePhraseKey(t), { text: t, source, grade })
        addPhrase(phraseMap, t, { source, grade, section: 'Regla di kòmbersashon', type: 'rule' })
      }
    }

    for (const para of page.paragraphs || []) {
      readingByGrade[grade].push({ text: para, source, section })
      for (const s of splitSentences(para)) {
        addPhrase(phraseMap, s, { source, grade, section: 'Mi por lesa', type: 'reading' })
      }
    }

    for (const rule of page.grammar_rules || []) {
      const t = rule.trim()
      if (t.length >= 15) {
        grammarRules.set(normalizePhraseKey(t), {
          text: t,
          source,
          grade,
          section,
          book_role: bookRole,
        })
      }
    }

    for (const item of page.lesson_objectives || []) {
      addRule(lessonObjectives, item, { source, grade, section, book_role: bookRole })
    }
    for (const item of page.teaching_notes || []) {
      addRule(teachingNotes, item, { source, grade, section, book_role: bookRole })
    }
    for (const item of page.orthography_teaching || []) {
      addRule(orthographyTeaching, item, { source, grade, section, book_role: bookRole })
      if (item.trim().length >= 15) {
        grammarRules.set(normalizePhraseKey(item.trim()), {
          text: item.trim(),
          source,
          grade,
          section,
          book_role: bookRole,
          type: 'orthography',
        })
      }
    }
    for (const item of page.methodology || []) {
      addRule(methodology, item, { source, grade, section, book_role: bookRole })
    }

    if (page.page_type === 'grammar' && page.raw_text) {
      for (const s of splitSentences(page.raw_text)) {
        if (s.length >= 20) grammarRules.set(normalizePhraseKey(s), { text: s, source, grade, section })
      }
    }

    for (const q of page.questions || []) {
      for (const s of splitSentences(q)) {
        addPhrase(phraseMap, s, { source, grade, section: 'Bo a komprendé', type: 'question' })
      }
    }

    // Fallback: mine phrases from raw_text on conversation/reading pages
    const mineTypes = ['conversation', 'reading', 'comprehension', 'lesson_plan', 'teacher_guide', 'methodology']
    if (mineTypes.includes(page.page_type) && page.raw_text) {
      for (const s of splitSentences(page.raw_text)) {
        if (s.length >= 12 && s.length < 300) {
          addPhrase(phraseMap, s, { source, grade, section, type: page.page_type })
        }
      }
    }
  }

  const vocabulary = [...vocabMap.values()]
    .map((v) => ({
      word: v.word,
      levels: [...v.levels].sort(),
      grades: [...v.grades].sort(),
      sources: v.sources,
    }))
    .sort((a, b) => a.word.localeCompare(b.word, 'pap'))

  const phrases = [...phraseMap.values()].sort((a, b) => a.pa.localeCompare(b.pa, 'pap'))
  const rules = [...conversationRules.values()]
  const grammar = [...grammarRules.values()]

  const meta = {
    source: 'Fiesta di idioma — Grande 3–6 student books + teacher guide',
    series: 'Fiesta di idioma',
    grades: ['3', '4', '5', '6'],
    merged_at: new Date().toISOString(),
    page_count: pages.length,
    student_page_count: studentPages,
    teacher_page_count: teacherPages,
  }

  const vocabDoc = { metadata: { ...meta, word_count: vocabulary.length }, words: vocabulary }
  const phrasesDoc = {
    metadata: {
      ...meta,
      phrase_count: phrases.length,
      conversation_rule_count: rules.length,
      reading_passage_count: Object.values(readingByGrade).flat().length,
    },
    phrases,
    conversation_rules: rules,
    reading_by_grade: readingByGrade,
  }
  const grammarDoc = {
    metadata: { ...meta, rule_count: grammar.length },
    rules: grammar,
  }
  const teacherGuideDoc = {
    metadata: {
      ...meta,
      lesson_objective_count: lessonObjectives.size,
      teaching_note_count: teachingNotes.size,
      orthography_teaching_count: orthographyTeaching.size,
      methodology_count: methodology.size,
    },
    lesson_objectives: [...lessonObjectives.values()],
    teaching_notes: [...teachingNotes.values()],
    orthography_teaching: [...orthographyTeaching.values()],
    methodology: [...methodology.values()],
  }

  fs.writeFileSync(VOCAB_OUT, JSON.stringify(vocabDoc, null, 2), 'utf8')
  fs.writeFileSync(PHRASES_OUT, JSON.stringify(phrasesDoc, null, 2), 'utf8')
  fs.writeFileSync(GRAMMAR_OUT, JSON.stringify(grammarDoc, null, 2), 'utf8')
  fs.writeFileSync(TEACHER_GUIDE_OUT, JSON.stringify(teacherGuideDoc, null, 2), 'utf8')
  fs.writeFileSync(LEGACY_VOCAB, JSON.stringify(vocabDoc, null, 2), 'utf8')
  fs.writeFileSync(LEGACY_PHRASES, JSON.stringify(phrasesDoc, null, 2), 'utf8')

  // Append school phrases to palabricks-phrases.json (deduped)
  let palabricksAdded = 0
  if (fs.existsSync(PALABRICKS_PATH)) {
    const palabricks = JSON.parse(fs.readFileSync(PALABRICKS_PATH, 'utf8'))
    const existing = new Set((palabricks.phrases || []).map((p) => normalizePhraseKey(p.pa || '')))
    for (const p of phrases) {
      const key = normalizePhraseKey(p.pa)
      if (!existing.has(key)) {
        palabricks.phrases = palabricks.phrases || []
        palabricks.phrases.push({ pa: p.pa, source: 'school-grande' })
        existing.add(key)
        palabricksAdded++
      }
    }
    palabricks.metadata = palabricks.metadata || {}
    palabricks.metadata.school_grande_merged_at = meta.merged_at
    fs.writeFileSync(PALABRICKS_PATH, JSON.stringify(palabricks, null, 2), 'utf8')
  }

  // Always update wordlist
  let wordlistAdded = 0
  if (fs.existsSync(WORDLIST_PATH)) {
    const existing = new Set(JSON.parse(fs.readFileSync(WORDLIST_PATH, 'utf8')))
    const before = existing.size
    for (const v of vocabulary) {
      existing.add(normalizeWord(v.word))
      for (const token of v.word.match(PA_WORD) || []) {
        if (token.length > 2 && isValidPaWord(token)) existing.add(normalizeWord(token))
      }
    }
    for (const p of phrases) {
      for (const token of p.pa.match(PA_WORD) || []) {
        const clean = normalizeWord(token)
        if (clean.length > 2 && isValidPaWord(clean)) existing.add(clean)
      }
    }
    const sorted = [...existing].sort()
    fs.writeFileSync(WORDLIST_PATH, JSON.stringify(sorted), 'utf8')
    wordlistAdded = sorted.length - before
  }

  const report = {
    merged_at: meta.merged_at,
    source: meta.source,
    pages_processed: pages.length,
    vocabulary_entries: vocabulary.length,
    canonical_phrases: phrases.length,
    conversation_rules: rules.length,
    grammar_rules: grammar.length,
    teacher_lesson_objectives: lessonObjectives.size,
    teacher_teaching_notes: teachingNotes.size,
    teacher_orthography_points: orthographyTeaching.size,
    teacher_methodology: methodology.size,
    student_pages: studentPages,
    teacher_pages: teacherPages,
    palabricks_phrases_added: palabricksAdded,
    wordlist_new_words: wordlistAdded,
    outputs: [VOCAB_OUT, PHRASES_OUT, GRAMMAR_OUT, TEACHER_GUIDE_OUT, PALABRICKS_PATH, WORDLIST_PATH],
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')

  console.log('Fiesta di idioma merge complete:')
  console.log(`  Pages:       ${pages.length} (${studentPages} student, ${teacherPages} teacher)`)
  console.log(`  Vocabulary:  ${vocabulary.length} → school-grande-vocabulary.json`)
  console.log(`  Phrases:     ${phrases.length} → school-grande-phrases.json`)
  console.log(`  Conv. rules: ${rules.length}`)
  console.log(`  Grammar:     ${grammar.length} → school-grande-grammar.json`)
  console.log(`  Teacher:     ${lessonObjectives.size} objectives, ${orthographyTeaching.size} orthography points → school-teacher-guide.json`)
  console.log(`  Palabricks:  +${palabricksAdded} phrases`)
  console.log(`  Wordlist:    +${wordlistAdded} words`)
}

main()
