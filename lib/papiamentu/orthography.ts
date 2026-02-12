/**
 * Orthography enforcement for Curaçao Papiamentu.
 *
 * Rules derived from Buki di oro + Ortografia Papiamentu (1983):
 *   1. c → k  (except in 'ch' digraph, foreign/proper words)
 *   2. Digraph protection: ch, dj, sh, zj are never split
 *   3. Common Aruba-orthography patterns → Curaçao standard
 *   4. Accent normalization for common errors
 */

import { getWordSet } from './load-data'

// ── Protected digraphs ──────────────────────────────────────────────
const DIGRAPHS = ['ch', 'dj', 'sh', 'zj']

// ── Foreign / loan words where 'c' is acceptable ────────────────────
// Keep short to avoid false positives; extend as needed
const C_EXCEPTIONS = new Set([
  // Chemistry / science
  'calcium', 'carbon', 'celsius', 'cloruro',
  // Common borrowings kept with 'c'
  'cd', 'cpu', 'cv', 'ceo',
  // Proper names / places (checked as lowercase)
  'curacao', 'colombia', 'canada', 'china', 'cuba',
  'catering',
])

// ── Aruba-style patterns → Curaçao ─────────────────────────────────
// These are orthographic transforms (not variant-mapping, which maps different words)
const ORTHO_PATTERNS: [RegExp, string][] = [
  // Aruba 'cion' → Curaçao 'shon'  (e.g. informacion → informashon)
  [/cion$/i, 'shon'],
  // Aruba 'sion' → Curaçao 'shon'  (e.g. pension → penshon ... but careful)
  [/sion$/i, 'shon'],
]

// ── c → k transform ────────────────────────────────────────────────

function applyCtoK(word: string): { result: string; changed: boolean } {
  const lower = word.toLowerCase()

  // Skip if the word is a known exception
  if (C_EXCEPTIONS.has(lower)) return { result: word, changed: false }

  // Skip if word doesn't contain 'c' at all
  if (!lower.includes('c')) return { result: word, changed: false }

  let result = ''
  let changed = false
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const chLower = ch.toLowerCase()

    if (chLower === 'c') {
      // Check if this 'c' is part of 'ch' digraph
      const next = chars[i + 1]?.toLowerCase()
      if (next === 'h') {
        // Keep 'ch' digraph intact
        result += ch
      } else {
        // Replace c with k (preserve case)
        result += ch === 'C' ? 'K' : 'k'
        changed = true
      }
    } else {
      result += ch
    }
  }

  return { result, changed }
}

// ── Verify result against wordlist ──────────────────────────────────

function isInWordlist(word: string): boolean {
  const set = getWordSet()
  return set.has(word.toLowerCase())
}

// ── Main entry point ────────────────────────────────────────────────

export function applyOrthography(word: string): { corrected: string; changed: boolean } {
  let current = word
  let anyChange = false

  // 1. Apply c → k rule
  const ck = applyCtoK(current)
  if (ck.changed) {
    // Only apply if the result is a known word OR the original was not known
    // (if original IS known, don't break it)
    const origKnown = isInWordlist(current)
    const newKnown = isInWordlist(ck.result)

    if (!origKnown || newKnown) {
      current = ck.result
      anyChange = true
    }
  }

  // 2. Apply Aruba-style orthographic patterns
  for (const [pattern, replacement] of ORTHO_PATTERNS) {
    if (pattern.test(current)) {
      const transformed = current.replace(pattern, replacement)
      // Only apply if result is in the wordlist (avoid false corrections)
      if (isInWordlist(transformed)) {
        current = transformed
        anyChange = true
      }
    }
  }

  return { corrected: current, changed: anyChange }
}
