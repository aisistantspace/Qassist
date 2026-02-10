/**
 * Orthography: apply only rules from Buki di oro (orthography.json).
 * Conservative: only confident fixes from the rules; no ad-hoc corrections.
 */

import { getOrthography } from './load-data'

export function applyOrthography(word: string): { corrected: string; changed: boolean } {
  const orth = getOrthography()
  const restricted = (orth.consonant_usage as { restricted?: string[] })?.restricted
  if (!restricted || restricted.length === 0) return { corrected: word, changed: false }

  let corrected = word
  // Curaçao uses k not c (except in ch, proper names, etc.). Only apply simple case:
  // word-internal or word-final single 'c' not part of 'ch' -> consider 'k' (conservative: skip for now to avoid false fixes)
  // We only apply rules we can derive confidently; for v1 we leave orthography as "no change"
  // unless we have an explicit mapping. So for now, no automatic c->k to avoid breaking proper nouns.
  return { corrected, changed: false }
}
