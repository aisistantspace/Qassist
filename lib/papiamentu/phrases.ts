/**
 * Phrase-level validation for Papiamentu.
 *
 * After individual words are corrected, this module scans the reassembled text
 * for near-matches to canonical phrases and replaces them with the correct form.
 *
 * Focuses on high-confidence replacements:
 *   - Greetings (Bon bini, Bon dia, etc.)
 *   - Common expressions (Por fabor, Danki, etc.)
 *   - Days, months, colors
 *   - Known Papiamentu phrases from Palabricks and core-phrases
 */

import { getCanonicalPhrases } from './load-data'

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
      // Store normalized → canonical
      phraseMap.set(norm, phrase)
    }
  }

  return phraseMap
}

// ── Common misspellings of key greetings/phrases ────────────────────
// These are intentional pattern matches for very common errors

const GREETING_FIXES: [RegExp, string][] = [
  // "Bon beni" / "Bon bieni" → "Bon bini"
  [/\bbon\s+ben[ie]\b/gi, 'Bon bini'],
  // "Bon tardi" is correct, but "Bon tarde" → "Bon tardi"
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
]

// ── Main entry point ────────────────────────────────────────────────

export function correctPhrases(text: string): PhraseCorrectionResult {
  const corrections: PhraseCorrection[] = []
  let result = text

  // 1. Apply known greeting/phrase pattern fixes
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

  // 2. Scan for phrases that are almost-but-not-quite canonical
  // We check multi-word sequences from the text against our phrase map
  const map = buildPhraseMap()
  const words = result.split(/\s+/)

  // Check 2-word, 3-word, and 4-word windows
  for (let windowSize = 4; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(' ')
      const normWindow = normalize(window)

      // Exact match to canonical phrase (case correction)
      const canonical = map.get(normWindow)
      if (canonical && window !== canonical) {
        // Only replace if case is wrong (don't replace correct phrases)
        const windowLower = window.toLowerCase()
        const canonicalLower = canonical.toLowerCase()
        if (windowLower === canonicalLower && window !== canonical) {
          // Case mismatch only — correct it
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
