/**
 * Papiamentu correction layer – single entry point.
 * Orchestrates: tokenize -> spell (mark only) -> orthography -> variant -> reassemble.
 */

import type { CorrectPapiamentuOptions, CorrectPapiamentuResult, CorrectionChange } from './types'
import { tokenize, reassemble } from './tokenize'
import type { Token } from './tokenize'
import { isKnownWord } from './spell'
import { applyOrthography } from './orthography'
import { normalizeVariant } from './variant'

export type { CorrectPapiamentuOptions, CorrectPapiamentuResult, CorrectionChange }

export function correctPapiamentu(
  text: string,
  options: CorrectPapiamentuOptions = {}
): CorrectPapiamentuResult {
  const locale = options.locale ?? 'pap-CW'
  const changes: CorrectionChange[] = []

  if (!text || typeof text !== 'string') {
    return { corrected: text || '', changes }
  }

  const tokens = tokenize(text)
  const output: Token[] = []

  for (const token of tokens) {
    if (token.type === 'sep') {
      output.push(token)
      continue
    }

    let word = token.value
    // Spell: only correct words that are in Buki di oro (or base without -nan). Unknown words left unchanged.
    if (!isKnownWord(word)) {
      output.push({ type: 'word', value: word })
      continue
    }

    const orth = applyOrthography(word)
    if (orth.changed) {
      word = orth.corrected
      changes.push({ from: token.value, to: word, type: 'orthography' })
    }

    const variant = normalizeVariant(word, locale)
    if (variant.changed) {
      changes.push({ from: word, to: variant.corrected, type: 'variant' })
      word = variant.corrected
    }

    output.push({ type: 'word', value: word })
  }

  const corrected = reassemble(output)
  return {
    corrected,
    changes: changes.length > 0 ? changes : undefined,
  }
}
