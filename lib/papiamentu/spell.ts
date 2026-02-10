/**
 * Spell-check: is word in Buki di oro list?
 * Conservative: we do not suggest replacements for unknown words.
 */

import { getWordSet } from './load-data'

export function isKnownWord(word: string): boolean {
  const set = getWordSet()
  const lower = word.toLowerCase()
  if (set.has(lower)) return true
  if (lower.endsWith('nan') && lower.length > 4) {
    const base = lower.slice(0, -3)
    if (set.has(base)) return true
  }
  return false
}
