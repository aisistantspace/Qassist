/**
 * Spell-check & fuzzy correction for Papiamentu.
 *
 * - isKnownWord(): fast O(1) lookup (kept for pipeline fast-path)
 * - suggestCorrection(): Levenshtein-based fuzzy match when word is unknown
 *
 * Strategy:
 *   1. Direct lookup in wordset (+ strip -nan suffix)
 *   2. If unknown → narrow candidates to words sharing 1-2 letter prefix
 *   3. Levenshtein distance ≤ 2 (prefer distance 1)
 *   4. Return best match or null
 */

import { getWordSet } from './load-data'

// ── Levenshtein distance (no deps) ──────────────────────────────────

function levenshtein(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la

  // Early exit: if length difference > max useful distance, skip
  if (Math.abs(la - lb) > 2) return 3

  const prev = new Array<number>(lb + 1)
  const curr = new Array<number>(lb + 1)

  for (let j = 0; j <= lb; j++) prev[j] = j

  for (let i = 1; i <= la; i++) {
    curr[0] = i
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      )
    }
    for (let j = 0; j <= lb; j++) prev[j] = curr[j]
  }
  return prev[lb]
}

// ── Prefix index (lazy-built once) ──────────────────────────────────

let prefixIndex: Map<string, string[]> | null = null

function getPrefixIndex(): Map<string, string[]> {
  if (prefixIndex) return prefixIndex
  const set = getWordSet()
  prefixIndex = new Map()

  for (const word of set) {
    if (word.length < 2) continue
    const p1 = word[0]
    const p2 = word.slice(0, 2)
    // Index by 1-char prefix
    if (!prefixIndex.has(p1)) prefixIndex.set(p1, [])
    prefixIndex.get(p1)!.push(word)
    // Index by 2-char prefix (separate key with : to avoid collisions)
    const key2 = ':' + p2
    if (!prefixIndex.has(key2)) prefixIndex.set(key2, [])
    prefixIndex.get(key2)!.push(word)
  }
  return prefixIndex
}

// ── Common Papiamentu suffixes ──────────────────────────────────────

const SUFFIXES = ['nan', 'mentu', 'shon', 'dor', 'mente', 'oso', 'ista']

function stripSuffix(word: string): string | null {
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length > suf.length + 2) {
      return word.slice(0, -suf.length)
    }
  }
  return null
}

// ── Accent normalization helpers ────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ñ': 'n',
}

function stripAccents(s: string): string {
  let out = ''
  for (const ch of s) {
    out += ACCENT_MAP[ch] || ch
  }
  return out
}

// ── Public API ──────────────────────────────────────────────────────

export function isKnownWord(word: string): boolean {
  const set = getWordSet()
  const lower = word.toLowerCase()
  if (set.has(lower)) return true
  // Check without -nan plural suffix
  if (lower.endsWith('nan') && lower.length > 4) {
    const base = lower.slice(0, -3)
    if (set.has(base)) return true
  }
  return false
}

export interface SpellSuggestion {
  suggestion: string
  distance: number
}

/**
 * Suggest a correction for an unknown word.
 * Returns the best match from the wordlist within Levenshtein distance ≤ 2,
 * or null if no good match is found.
 */
export function suggestCorrection(word: string): SpellSuggestion | null {
  const set = getWordSet()
  const lower = word.toLowerCase()

  // 1. Already known? No suggestion needed.
  if (set.has(lower)) return null

  // 2. Try stripping suffix — if base is known, word is likely correct
  const stripped = stripSuffix(lower)
  if (stripped && set.has(stripped)) return null

  // 3. Try accent-stripped version — common error is missing/wrong accents
  const noAccent = stripAccents(lower)
  if (noAccent !== lower && set.has(noAccent)) {
    return { suggestion: noAccent, distance: 1 }
  }

  // 4. Build candidate set from prefix index (same 2-char prefix, falling back to 1-char)
  const idx = getPrefixIndex()
  const p2key = ':' + lower.slice(0, 2)
  let candidates = idx.get(p2key)
  if (!candidates || candidates.length < 5) {
    // Fall back to 1-char prefix for more candidates
    candidates = idx.get(lower[0]) || []
  }

  // 5. Also check candidates starting with accent-stripped first letter
  const stripped1 = stripAccents(lower[0])
  if (stripped1 !== lower[0]) {
    const extra = idx.get(stripped1) || []
    candidates = [...candidates, ...extra]
  }

  // 6. Filter candidates by reasonable length (within ±2 of target)
  const targetLen = lower.length
  const filtered = candidates.filter(c =>
    Math.abs(c.length - targetLen) <= 2
  )

  // 7. Find best Levenshtein match
  let bestWord: string | null = null
  let bestDist = 3 // max distance we accept + 1

  for (const candidate of filtered) {
    const d = levenshtein(lower, candidate)
    if (d < bestDist) {
      bestDist = d
      bestWord = candidate
      if (d === 1) break // distance 1 is already great
    }
  }

  if (bestWord && bestDist <= 2) {
    return { suggestion: bestWord, distance: bestDist }
  }

  // 8. Last resort: try accent-stripped comparison against all prefix candidates
  if (noAccent !== lower) {
    for (const candidate of filtered) {
      const candNoAccent = stripAccents(candidate)
      if (candNoAccent === noAccent) {
        return { suggestion: candidate, distance: 1 }
      }
    }
  }

  return null
}
