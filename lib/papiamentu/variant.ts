/**
 * Variant normalization: Aruba -> Curaçao when locale is pap-CW.
 */

import { getArubaToCuracaoMap } from './load-data'

export function normalizeVariant(word: string, locale: string): { corrected: string; changed: boolean } {
  if (locale !== 'pap-CW') return { corrected: word, changed: false }
  const map = getArubaToCuracaoMap()
  const lower = word.toLowerCase()
  const mapped = map[lower] ?? map[word] ?? null
  if (!mapped) return { corrected: word, changed: false }
  const capitalized = word.length > 0 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()
  const corrected = capitalized && mapped.length > 0
    ? mapped[0].toUpperCase() + mapped.slice(1)
    : mapped
  return { corrected, changed: true }
}
