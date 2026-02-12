/**
 * Phrase-level validation for Papiamentu.
 * Based on Buki di Oro orthography rules.
 *
 * After individual words are corrected, this module scans the reassembled text
 * for near-matches to canonical phrases and common errors, then corrects them.
 *
 * Rules applied:
 *   - Spanish greetings → Papiamentu equivalents
 *   - Common phrase misspellings (Bon beni → Bon bini)
 *   - Days/months: enforce lowercase + correct Buki di Oro spelling
 *   - Contraction patterns: normalize apostrophe usage
 */

import { getCanonicalPhrases, getSpanishToPaMap } from './load-data'

export interface PhraseCorrection {
  from: string
  to: string
}

export interface PhraseCorrectionResult {
  corrected: string
  changed: boolean
  corrections: PhraseCorrection[]
}

// ── Phrase index (lazy-built) ───────────────────────────────────────

let phraseMap: Map<string, string> | null = null

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?¿¡;:'"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPhraseMap(): Map<string, string> {
  if (phraseMap) return phraseMap
  phraseMap = new Map()

  const phrases = getCanonicalPhrases()
  for (const phrase of phrases) {
    const norm = normalize(phrase)
    if (norm.length >= 3) {
      phraseMap.set(norm, phrase)
    }
  }

  return phraseMap
}

// ── Common misspellings / Spanish → Papiamentu patterns ─────────────

const GREETING_FIXES: [RegExp, string][] = [
  // "Bon beni" / "Bon bieni" → "Bon bini"
  [/\bbon\s+ben[ie]\b/gi, 'Bon bini'],
  // "Bon tarde" → "Bon tardi"
  [/\bbon\s+tarde\b/gi, 'Bon tardi'],
  // "Bon noche" → "Bon nochi"
  [/\bbon\s+noche\b/gi, 'Bon nochi'],
  // "Por favor" (Spanish) → "Por fabor"
  [/\bpor\s+favor\b/gi, 'Por fabor'],
  // "Gracias" (Spanish) → "Danki"
  [/\bgracias\b/gi, 'Danki'],
  // "Buenos dias" (Spanish) → "Bon dia"
  [/\bbuenos?\s+dias?\b/gi, 'Bon dia'],
  // "Buenas tardes" (Spanish) → "Bon tardi"
  [/\bbuenas?\s+tardes?\b/gi, 'Bon tardi'],
  // "Buenas noches" (Spanish) → "Bon nochi"
  [/\bbuenas?\s+noches?\b/gi, 'Bon nochi'],
  // "De nada" (Spanish) → "Nada" (common)
  [/\bde\s+nada\b/gi, 'Nada'],
  // "Lo siento" (Spanish) → "Sòri"
  [/\blo\s+siento\b/gi, 'Sòri'],
]

// ── Buki di Oro official day spellings (Chapter X) ──────────────────
// These fix common misspellings from AI models

const DAY_FIXES: [RegExp, string][] = [
  [/\bdjadomingo\b/gi, 'djadumingu'],
  [/\bdjadomingu\b/gi, 'djadumingu'],
  [/\bdiarason\b/gi, 'djárason'],
  [/\bdjarason\b/gi, 'djárason'],
  [/\bdjawieps\b/gi, 'djaweps'],
  [/\bdjabièrne\b/gi, 'djabièrnè'],
  [/\bdjabierne\b/gi, 'djabièrnè'],
]

// ── Buki di Oro official month spellings (Chapter X) ────────────────

const MONTH_FIXES: [RegExp, string][] = [
  // Dutch → Papiamentu
  [/\bjanuary?\b/gi, 'yanüari'],
  [/\bfebruary?\b/gi, 'febrüari'],
  [/\bmaa?rt\b/gi, 'mart'],
  [/\bjuni\b/gi, 'yüni'],
  [/\bjuli\b/gi, 'yüli'],
  [/\baugustus\b/gi, 'ougùstùs'],
  // Spanish → Papiamentu
  [/\benero\b/gi, 'yanüari'],
  [/\bfebrero\b/gi, 'febrüari'],
  [/\bmarzo\b/gi, 'mart'],
  [/\bmayo\b/gi, 'mei'],
  [/\bjunio\b/gi, 'yüni'],
  [/\bjulio\b/gi, 'yüli'],
  [/\bagosto\b/gi, 'ougùstùs'],
  [/\bseptiembre\b/gi, 'sèptèmber'],
  [/\boctubre\b/gi, 'òktober'],
  [/\bnoviembre\b/gi, 'novèmber'],
  [/\bdiciembre\b/gi, 'desèmber'],
]

// ── Contraction normalization (Chapter IX) ──────────────────────────
// Accept common contractions as valid — don't "correct" them

const VALID_CONTRACTIONS = new Set([
  "t'asina", "t'ami", "t'e", "t'ei", "t'aden",
  "n'", "p'esei", "p'é",
  "dun'é", "hañ'é", "lag'e", "lag'é",
  "sak'i", "kash'i", "ko'i", "ka'i", "blek'i",
  "ta'ata", "ta'ta", "ta'a", "ta'atin", "ta'tin",
  "betr'i", "botr'i", "bendr'i", "bòndr'i", "kambr'i",
])

// ── Main entry point ────────────────────────────────────────────────

export function correctPhrases(text: string): PhraseCorrectionResult {
  const corrections: PhraseCorrection[] = []
  let result = text

  // 1. Apply greeting/phrase pattern fixes (Spanish → Papiamentu)
  for (const [pattern, replacement] of GREETING_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      result = result.replace(pattern, replacement)
      if (original.toLowerCase() !== replacement.toLowerCase()) {
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 2. Apply day spelling fixes
  for (const [pattern, replacement] of DAY_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      // Only fix if actually different
      if (original !== replacement) {
        result = result.replace(pattern, replacement)
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 3. Apply month spelling fixes
  for (const [pattern, replacement] of MONTH_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      if (original !== replacement) {
        result = result.replace(pattern, replacement)
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 4. Spanish → Papiamentu word substitution
  //    Replace common Spanish words the AI generates with their PA equivalents
  const spanishMap = getSpanishToPaMap()
  if (Object.keys(spanishMap).length > 0) {
    // Split on word boundaries, replace each Spanish word with its PA equivalent
    result = result.replace(/[a-záéíóúñüèòùàâêîôûäëïöÿ]+/gi, (match) => {
      const lower = match.toLowerCase()
      const replacement = spanishMap[lower]
      if (replacement && lower !== replacement.toLowerCase()) {
        // Preserve original casing
        let cased = replacement
        if (match === match.toUpperCase() && match !== match.toLowerCase()) {
          cased = replacement.toUpperCase()
        } else if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
          cased = replacement[0].toUpperCase() + replacement.slice(1)
        }
        corrections.push({ from: match, to: cased })
        return cased
      }
      return match
    })
  }

  // 5. Scan for phrases that need case correction
  const map = buildPhraseMap()
  const words = result.split(/\s+/)

  for (let windowSize = 4; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(' ')
      const normWindow = normalize(window)

      const canonical = map.get(normWindow)
      if (canonical && window !== canonical) {
        const windowLower = window.toLowerCase()
        const canonicalLower = canonical.toLowerCase()
        if (windowLower === canonicalLower && window !== canonical) {
          result = result.replace(window, canonical)
          corrections.push({ from: window, to: canonical })
        }
      }
    }
  }

  return {
    corrected: result,
    changed: corrections.length > 0,
    corrections,
  }
}

/**
 * Check if a word with apostrophe is a valid Papiamentu contraction
 * per Buki di Oro Chapter IX.
 */
export function isValidContraction(word: string): boolean {
  if (!word.includes("'")) return false
  return VALID_CONTRACTIONS.has(word.toLowerCase())
}
