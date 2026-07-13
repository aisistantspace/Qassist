/**
 * Single outbound gate for all customer-facing Papiamentu on the SERVER.
 * Do not import this from client components — uses Node fs via load-data.
 */

import { correctPapiamentu } from './index'
import type { CorrectPapiamentuOptions } from './types'

export function ensurePapiamentuOutbound(
  text: string,
  options: CorrectPapiamentuOptions = {}
): string {
  if (!text || typeof text !== 'string') return text || ''
  const { corrected } = correctPapiamentu(text, { locale: 'pap-CW', ...options })
  return corrected
}

/** Correct a batch of PA strings (e.g. UI copy maps). */
export function ensurePapiamentuOutboundMap<T extends Record<string, string>>(
  map: T,
  options: CorrectPapiamentuOptions = {}
): T {
  const out = { ...map }
  for (const key of Object.keys(out) as (keyof T)[]) {
    const value = out[key]
    if (typeof value === 'string') {
      out[key] = ensurePapiamentuOutbound(value, options) as T[keyof T]
    }
  }
  return out
}
