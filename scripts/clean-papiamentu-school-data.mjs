#!/usr/bin/env node
/**
 * Post-merge cleaner for school/OCR Papiamentu data.
 * Removes multi-word OCR junk, Spanish/Dutch meta lines, and polluted wordlist entries.
 *
 * Usage: node scripts/clean-papiamentu-school-data.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, 'lib', 'papiamentu', 'data')

const SPANISH_DUTCH_META =
  /\b(enseñar|ensenar|el uso|la '|uitleg|correcto|spelling|cómo|como se|relación|relacionan|palabra\?|¿|¡|leer|schrijven|oefening|opdracht)\b/i

const PA_LETTER = /[a-zàèéìòùüñáíóú]/i

function isCleanLemma(raw) {
  if (!raw || typeof raw !== 'string') return false
  let w = raw.trim()
  w = w.replace(/^[\s\-•*▪"'«»]+/, '').replace(/[",;:.!?]+$/, '').trim()
  if (w.length < 2 || w.length > 40) return false
  if (/\s/.test(w)) return false
  if (/[?]/.test(w)) return false
  if (/^\d+$/.test(w)) return false
  if (SPANISH_DUTCH_META.test(w)) return false
  if (!PA_LETTER.test(w)) return false
  // Reject obvious English/Spanish UI junk
  if (/^(the|and|or|with|from|page|tema|siman|grande|fiesta)$/i.test(w)) return false
  return true
}

function normalizeLemma(raw) {
  return raw
    .trim()
    .replace(/^[\s\-•*▪"'«»]+/, '')
    .replace(/[",;:.!?]+$/, '')
    .trim()
    .toLowerCase()
}

function isCleanPhrase(text) {
  if (!text || typeof text !== 'string') return false
  const t = text.trim()
  if (t.length < 6 || t.length > 200) return false
  if (SPANISH_DUTCH_META.test(t)) return false
  if (/[¿¡]/.test(t)) return false
  // Prefer phrase that looks like PA (has common PA markers) OR short schooling phrases
  const paHints = /\b(ta|ku|di|bo|mi|nos|nan|pa|kon|bon|por|yuda|skucha|skirbi|papiamentu|kiko|undá|aki)\b/i
  if (!paHints.test(t) && t.split(/\s+/).length > 6) return false
  if (!PA_LETTER.test(t)) return false
  return true
}

function isCleanRule(text) {
  if (!text || typeof text !== 'string') return false
  const t = text.trim()
  if (t.length < 10 || t.length > 300) return false
  if (SPANISH_DUTCH_META.test(t)) return false
  if (/[¿¡]/.test(t)) return false
  // Keep rules that look like PA instruction/grammar
  return PA_LETTER.test(t)
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function cleanVocabulary() {
  const file = path.join(DATA, 'school-grande-vocabulary.json')
  if (!fs.existsSync(file)) {
    console.warn('skip vocab — missing')
    return { before: 0, after: 0 }
  }
  const data = loadJson(file)
  const before = (data.words || []).length
  const seen = new Map()
  for (const entry of data.words || []) {
    const raw = typeof entry === 'string' ? entry : entry.word
    if (!isCleanLemma(raw)) continue
    const lemma = normalizeLemma(raw)
    if (!lemma || seen.has(lemma)) {
      if (seen.has(lemma) && typeof entry === 'object') {
        const existing = seen.get(lemma)
        existing.grades = [...new Set([...(existing.grades || []), ...(entry.grades || [])])]
        existing.levels = [...new Set([...(existing.levels || []), ...(entry.levels || [])])]
      }
      continue
    }
    if (typeof entry === 'object') {
      seen.set(lemma, {
        word: lemma,
        levels: entry.levels || [],
        grades: entry.grades || [],
        sources: entry.sources || [],
      })
    } else {
      seen.set(lemma, { word: lemma, levels: [], grades: [], sources: [] })
    }
  }
  const words = [...seen.values()].sort((a, b) => a.word.localeCompare(b.word))
  data.words = words
  data.cleaned_at = new Date().toISOString()
  data.metadata = {
    ...(data.metadata || {}),
    cleaned: true,
    note: 'Lemmas only — multi-word OCR junk removed',
    word_count: words.length,
  }
  writeJson(file, data)
  // Legacy mirror
  const legacy = path.join(DATA, 'book-vocabulary.json')
  if (fs.existsSync(legacy)) writeJson(legacy, data)
  return { before, after: words.length }
}

function cleanPhrases() {
  const file = path.join(DATA, 'school-grande-phrases.json')
  if (!fs.existsSync(file)) return { phrasesBefore: 0, phrasesAfter: 0, rulesBefore: 0, rulesAfter: 0 }
  const data = loadJson(file)
  const phrasesBefore = (data.phrases || []).length
  const rulesBefore = (data.conversation_rules || []).length

  const phraseSeen = new Set()
  const phrases = []
  for (const p of data.phrases || []) {
    const text = typeof p === 'string' ? p : p.pa
    if (!isCleanPhrase(text)) continue
    const key = text.toLowerCase().replace(/\s+/g, ' ').trim()
    if (phraseSeen.has(key)) continue
    phraseSeen.add(key)
    if (typeof p === 'string') phrases.push({ pa: text.trim(), type: 'cleaned' })
    else phrases.push({ ...p, pa: text.trim() })
  }

  const ruleSeen = new Set()
  const rules = []
  for (const r of data.conversation_rules || []) {
    const text = r.text || r
    if (!isCleanRule(String(text))) continue
    const key = String(text).toLowerCase().replace(/\s+/g, ' ').trim()
    if (ruleSeen.has(key)) continue
    ruleSeen.add(key)
    rules.push(typeof r === 'object' ? { ...r, text: String(text).trim() } : { text: String(text).trim() })
  }

  data.phrases = phrases
  data.conversation_rules = rules
  data.cleaned_at = new Date().toISOString()
  data.metadata = {
    ...(data.metadata || {}),
    cleaned: true,
    phrase_count: phrases.length,
    conversation_rule_count: rules.length,
  }
  writeJson(file, data)
  const legacy = path.join(DATA, 'fiesta-phrases.json')
  if (fs.existsSync(legacy)) writeJson(legacy, data)
  return {
    phrasesBefore,
    phrasesAfter: phrases.length,
    rulesBefore,
    rulesAfter: rules.length,
  }
}

function cleanGrammar() {
  const file = path.join(DATA, 'school-grande-grammar.json')
  if (!fs.existsSync(file)) return { before: 0, after: 0 }
  const data = loadJson(file)
  const before = (data.rules || []).length
  const seen = new Set()
  const rules = []
  for (const r of data.rules || []) {
    const text = r.text || r
    if (!isCleanRule(String(text))) continue
    const key = String(text).toLowerCase().replace(/\s+/g, ' ').trim()
    if (seen.has(key)) continue
    seen.add(key)
    rules.push(typeof r === 'object' ? { ...r, text: String(text).trim() } : { text: String(text).trim() })
  }
  data.rules = rules
  data.cleaned_at = new Date().toISOString()
  writeJson(file, data)
  return { before, after: rules.length }
}

function cleanTeacherGuide() {
  const file = path.join(DATA, 'school-teacher-guide.json')
  if (!fs.existsSync(file)) return {}
  const data = loadJson(file)
  const cleanList = (arr) => {
    const seen = new Set()
    const out = []
    for (const item of arr || []) {
      const text = item.text || item
      if (!isCleanRule(String(text))) continue
      const key = String(text).toLowerCase().replace(/\s+/g, ' ').trim()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(typeof item === 'object' ? { ...item, text: String(text).trim() } : { text: String(text).trim() })
    }
    return out
  }
  const stats = {
    objectives: { before: (data.lesson_objectives || []).length },
    notes: { before: (data.teaching_notes || []).length },
    ortho: { before: (data.orthography_teaching || []).length },
    methodology: { before: (data.methodology || []).length },
  }
  data.lesson_objectives = cleanList(data.lesson_objectives)
  data.teaching_notes = cleanList(data.teaching_notes)
  data.orthography_teaching = cleanList(data.orthography_teaching)
  data.methodology = cleanList(data.methodology)
  stats.objectives.after = data.lesson_objectives.length
  stats.notes.after = data.teaching_notes.length
  stats.ortho.after = data.orthography_teaching.length
  stats.methodology.after = data.methodology.length
  data.cleaned_at = new Date().toISOString()
  writeJson(file, data)
  return stats
}

function cleanWordlist() {
  const file = path.join(DATA, 'wordlist.json')
  const words = loadJson(file)
  const before = words.length
  const seen = new Set()
  const cleaned = []
  for (const w of words) {
    if (!isCleanLemma(w)) continue
    const lemma = normalizeLemma(w)
    if (seen.has(lemma)) continue
    seen.add(lemma)
    cleaned.push(lemma)
  }
  cleaned.sort((a, b) => a.localeCompare(b))
  writeJson(file, cleaned)
  return { before, after: cleaned.length }
}

function main() {
  console.log('Cleaning Papiamentu school/OCR data…')
  const vocab = cleanVocabulary()
  console.log(`Vocabulary: ${vocab.before} → ${vocab.after}`)
  const phrases = cleanPhrases()
  console.log(
    `Phrases: ${phrases.phrasesBefore} → ${phrases.phrasesAfter}; rules: ${phrases.rulesBefore} → ${phrases.rulesAfter}`
  )
  const grammar = cleanGrammar()
  console.log(`Grammar: ${grammar.before} → ${grammar.after}`)
  const teacher = cleanTeacherGuide()
  console.log('Teacher guide:', JSON.stringify(teacher))
  const wordlist = cleanWordlist()
  console.log(`Wordlist: ${wordlist.before} → ${wordlist.after}`)

  const report = {
    cleaned_at: new Date().toISOString(),
    vocab,
    phrases,
    grammar,
    teacher,
    wordlist,
  }
  writeJson(path.join(DATA, 'book-extract', 'clean-report.json'), report)
  console.log('Wrote book-extract/clean-report.json')
}

main()
