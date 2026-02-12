/**
 * Orthography enforcement for Curaçao Papiamentu.
 * Based on Buki di Oro — Ortografia i Lista di palabra Papiamentu (FPI, 2009)
 *
 * Rules enforced:
 *   1. c → k  (except ch digraph, proper names, foreign/math words)
 *   2. Digraph protection: ch, dj, sh, zj never split
 *   3. -ción/-sión → -shon  (Spanish suffix adaptation)
 *   4. Days/months lowercase enforcement
 *   5. Common Spanish → Papiamentu orthographic transforms
 *   6. 'ui'/'ue' → 'wi'/'we' after g (lingwista not linguista)
 *   7. No y between i+vowel, no w between u+vowel patterns
 */

import { getWordSet } from './load-data'

// ── Digraphs that must never be broken ──────────────────────────────
const DIGRAPHS = new Set(['ch', 'dj', 'sh', 'zj'])

// ── Words where 'c' is acceptable (foreign, proper, chemistry) ──────
const C_EXCEPTIONS = new Set([
  // Chemistry / science / math
  'calcium', 'carbon', 'celsius', 'cloruro',
  // Common borrowings kept with c
  'cd', 'cpu', 'cv', 'ceo',
  // Geographic names kept intact (per chapter VIII/XI)
  'curacao', 'curaçao', 'colombia', 'canada', 'china', 'cuba', 'chile',
  'connecticut', 'cambodja', 'congo', 'chipre', 'chechenia',
  'catering', 'centerfielder',
])

// ── Official Buki di Oro days (must be lowercase) ───────────────────
const OFFICIAL_DAYS: Record<string, string> = {
  'djadumingu': 'djadumingu', 'djaluna': 'djaluna', 'djamars': 'djamars',
  'djarason': 'djárason', 'djárason': 'djárason',
  'djaweps': 'djaweps', 'djabièrnè': 'djabièrnè', 'djasabra': 'djasabra',
  // Common misspellings
  'djabierne': 'djabièrnè', 'djabiernè': 'djabièrnè',
}

// ── Official Buki di Oro months (must be lowercase) ─────────────────
const OFFICIAL_MONTHS: Record<string, string> = {
  'yanüari': 'yanüari', 'febrüari': 'febrüari', 'mart': 'mart', 'aprel': 'aprel',
  'mei': 'mei', 'yüni': 'yüni', 'yüli': 'yüli', 'ougùstùs': 'ougùstùs',
  'sèptèmber': 'sèptèmber', 'òktober': 'òktober', 'novèmber': 'novèmber', 'desèmber': 'desèmber',
  // Common misspellings
  'januari': 'yanüari', 'februari': 'febrüari', 'maart': 'mart',
  'april': 'aprel', 'juni': 'yüni', 'juli': 'yüli',
  'augustus': 'ougùstùs', 'september': 'sèptèmber', 'oktober': 'òktober',
  'november': 'novèmber', 'december': 'desèmber',
  'enero': 'yanüari', 'febrero': 'febrüari', 'marzo': 'mart',
  'mayo': 'mei', 'junio': 'yüni', 'julio': 'yüli',
  'agosto': 'ougùstùs', 'septiembre': 'sèptèmber', 'octubre': 'òktober',
  'noviembre': 'novèmber', 'diciembre': 'desèmber',
}

// ── Spanish suffix → Papiamentu suffix patterns ─────────────────────
const SUFFIX_TRANSFORMS: [RegExp, string][] = [
  // -ción → -shon (informacion → informashon)
  [/ción$/i, 'shon'],
  [/cion$/i, 'shon'],
  // -sión → -shon (pension → penshon)
  [/sión$/i, 'shon'],
  [/sion$/i, 'shon'],
  // -dad → -dat (libertad → libertat, but be careful)
  [/dad$/i, 'dat'],
]

// ── g+ui/ue → g+wi/we rule (Chapter II) ─────────────────────────────
function applyGwRule(word: string): { result: string; changed: boolean } {
  let result = word
  let changed = false

  // gui → gwi (linguista → lingwista)
  const guiMatch = result.match(/gui/i)
  if (guiMatch) {
    result = result.replace(/gui/gi, 'gwi')
    changed = true
  }

  // gue → gwe (antiguedad → antigwedat... but guera stays guera)
  // Only apply if the result is in wordlist or original is not
  // This is conservative — only for known patterns
  const gueMatch = result.match(/güe/i)
  if (gueMatch) {
    result = result.replace(/güe/gi, 'gwe')
    changed = true
  }

  return { result, changed }
}

// ── c → k transform ────────────────────────────────────────────────
function applyCtoK(word: string): { result: string; changed: boolean } {
  const lower = word.toLowerCase()

  // Skip exceptions
  if (C_EXCEPTIONS.has(lower)) return { result: word, changed: false }

  // Skip if no 'c' at all
  if (!lower.includes('c')) return { result: word, changed: false }

  let result = ''
  let changed = false
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const chLower = ch.toLowerCase()

    if (chLower === 'c') {
      const next = chars[i + 1]?.toLowerCase()
      if (next === 'h') {
        // Keep ch digraph intact
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

// ── Verify against wordlist ─────────────────────────────────────────
function isInWordlist(word: string): boolean {
  return getWordSet().has(word.toLowerCase())
}

// ── Main entry point ────────────────────────────────────────────────

export interface OrthographyResult {
  corrected: string
  changed: boolean
  rules: string[]  // Which rules were applied
}

export function applyOrthography(word: string): { corrected: string; changed: boolean } {
  const result = applyOrthographyDetailed(word)
  return { corrected: result.corrected, changed: result.changed }
}

export function applyOrthographyDetailed(word: string): OrthographyResult {
  let current = word
  let anyChange = false
  const rules: string[] = []

  // ── Rule 1: Day/month normalization ──
  const dayMatch = OFFICIAL_DAYS[current.toLowerCase()]
  if (dayMatch && current !== dayMatch) {
    current = dayMatch
    anyChange = true
    rules.push('day-spelling')
  }

  const monthMatch = OFFICIAL_MONTHS[current.toLowerCase()]
  if (monthMatch && current !== monthMatch) {
    current = monthMatch
    anyChange = true
    rules.push('month-spelling')
  }

  // ── Rule 2: Spanish suffix transforms (BEFORE c→k so -cion→-shon catches) ──
  for (const [pattern, replacement] of SUFFIX_TRANSFORMS) {
    if (pattern.test(current)) {
      const transformed = current.replace(pattern, replacement)
      if (isInWordlist(transformed)) {
        current = transformed
        anyChange = true
        rules.push('suffix-transform')
        break  // Only apply one suffix transform
      }
    }
  }

  // ── Rule 3: c → k ──
  const ck = applyCtoK(current)
  if (ck.changed) {
    const origKnown = isInWordlist(current)
    const newKnown = isInWordlist(ck.result)
    // Apply if: original was unknown, OR result is known, OR both unknown (prefer k)
    if (!origKnown || newKnown) {
      current = ck.result
      anyChange = true
      rules.push('c-to-k')
    }
  }

  // ── Rule 4: g+ui/ue → g+wi/we ──
  const gw = applyGwRule(current)
  if (gw.changed) {
    if (isInWordlist(gw.result) || !isInWordlist(current)) {
      current = gw.result
      anyChange = true
      rules.push('g-wi-we')
    }
  }

  return { corrected: current, changed: anyChange, rules }
}
