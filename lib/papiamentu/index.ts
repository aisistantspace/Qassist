/**
 * Papiamentu correction layer – single entry point.
 *
 * Pipeline:
 *   0. URLs (https://...) are NEVER modified — split out and passed through verbatim
 *   1. (Pre-pass) Phrase-level fixes on raw text (greetings, Spanish→Papiamentu)
 *   2. Tokenize
 *   3. Per word:
 *      a. Variant normalization (Aruba → Curaçao)
 *      b. Orthography transform (c→k, cion→shon, etc.)
 *      c. If still unknown AND not already corrected → fuzzy spell suggestion
 *   4. Reassemble
 *
 * Unknown words are actively corrected instead of skipped.
 */

import type { CorrectPapiamentuOptions, CorrectPapiamentuResult, CorrectionChange } from './types'
import { tokenize, reassemble } from './tokenize'
import type { Token } from './tokenize'
import { isKnownWord, suggestCorrection } from './spell'
import { applyOrthography } from './orthography'
import { normalizeVariant } from './variant'
import { correctPhrases } from './phrases'

export type { CorrectPapiamentuOptions, CorrectPapiamentuResult, CorrectionChange }

/** HTTP(S) URLs must never be spell-checked or orthography-corrected (e.g. .com → .kom). */
const URL_SEGMENT = /(https?:\/\/[^\s)\]>]+)/gi

// Short words (≤2 chars) and common grammar particles should not be "corrected"
const SKIP_WORDS = new Set([
  'a', 'e', 'i', 'o', 'u',
  'di', 'ku', 'na', 'pa', 'ta', 'un', 'bo', 'mi', 'su', 'si', 'no',
  'ya', 'ma', 'ni', 'ke', 'sa', 'lo', 'por', 'te', 'of', 'den',
  'nan', 'nos', 'nan', 'abo', 'dje', 'kas', 'bon', 'kon',
])

function preserveCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement
  // ALL CAPS
  if (original === original.toUpperCase() && original !== original.toLowerCase()) {
    return replacement.toUpperCase()
  }
  // Title Case
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function correctPapiamentu(
  text: string,
  options: CorrectPapiamentuOptions = {}
): CorrectPapiamentuResult {
  if (!text || typeof text !== 'string') {
    return { corrected: text || '', changes: undefined }
  }

  const parts = text.split(URL_SEGMENT)
  if (parts.length === 1) {
    return correctPapiamentuText(text, options)
  }

  const changes: CorrectionChange[] = []
  const corrected = parts.map((part, index) => {
    if (index % 2 === 1) return part
    const result = correctPapiamentuText(part, options)
    if (result.changes) changes.push(...result.changes)
    return result.corrected
  }).join('')

  return {
    corrected,
    changes: changes.length > 0 ? changes : undefined,
  }
}

function correctPapiamentuText(
  text: string,
  options: CorrectPapiamentuOptions = {}
): CorrectPapiamentuResult {
  const locale = options.locale ?? 'pap-CW'
  const changes: CorrectionChange[] = []

  if (!text || typeof text !== 'string') {
    return { corrected: text || '', changes: undefined }
  }

  // ── Step 1: Phrase-level pre-pass (greetings, Spanish→Papiamentu) ──
  // Run BEFORE word-level corrections so phrases like "Bon beni" and "Buenos dias"
  // get fixed before fuzzy spell can mangle them
  let workingText = text
  const phraseResult = correctPhrases(workingText)
  if (phraseResult.changed && phraseResult.corrections.length > 0) {
    workingText = phraseResult.corrected
    for (const pc of phraseResult.corrections) {
      changes.push({ from: pc.from, to: pc.to, type: 'spelling' })
    }
  }

  // ── Step 2: Tokenize ──
  const tokens = tokenize(workingText)
  const output: Token[] = []

  for (const token of tokens) {
    if (token.type === 'sep') {
      output.push(token)
      continue
    }

    const original = token.value
    let word = original
    let alreadyCorrected = false

    // Skip very short words and grammar particles
    if (SKIP_WORDS.has(word.toLowerCase()) || word.length <= 1) {
      output.push({ type: 'word', value: word })
      continue
    }

    // Skip contractions (words with apostrophe) — these follow Buki di Oro Chapter IX
    if (word.includes("'")) {
      output.push({ type: 'word', value: word })
      continue
    }

    // ── Step 3a: Variant normalization (Aruba → Curaçao) ──
    const variant = normalizeVariant(word, locale)
    if (variant.changed) {
      changes.push({ from: word, to: variant.corrected, type: 'variant' })
      word = variant.corrected
      alreadyCorrected = true  // Don't let spell check undo this
    }

    // ── Step 3b: Orthography transform ──
    const orth = applyOrthography(word)
    if (orth.changed) {
      changes.push({ from: word, to: orth.corrected, type: 'orthography' })
      word = orth.corrected
      alreadyCorrected = true  // Orthography changes are authoritative
    }

    // ── Step 3c: If still unknown AND not already corrected → fuzzy spell ──
    if (!alreadyCorrected && !isKnownWord(word)) {
      const suggestion = suggestCorrection(word)
      if (suggestion && suggestion.distance <= 1) {
        // Only apply distance-1 corrections (very conservative for AI-generated text)
        const corrected = preserveCase(word, suggestion.suggestion)
        changes.push({ from: word, to: corrected, type: 'spelling' })
        word = corrected
      }
      // Distance 2 corrections are too risky on short/unknown words — leave as-is
    }

    output.push({ type: 'word', value: word })
  }

  const corrected = reassemble(output)
  return {
    corrected,
    changes: changes.length > 0 ? changes : undefined,
  }
}
