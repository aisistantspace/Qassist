/**
 * Canonical Papiamentu UI copy for chat / lead capture.
 * All strings are run through ensurePapiamentuOutbound so customers always
 * see layer-checked orthography (Ami ta Demi, etc.).
 */

import { ensurePapiamentuOutbound } from './outbound'

const AGENT_NAME = 'Demi'

function pa(s: string): string {
  return ensurePapiamentuOutbound(s)
}

/** Welcome when language is PA (ENNIA / general). */
export const PA_WELCOME = pa(
  `Bon dia! 👋 Ami ta ${AGENT_NAME}, bo asistente. Kon mi por yudabo awe?`
)

export function paWelcomeWithName(firstName?: string): string {
  const name = firstName?.trim()
  return pa(
    `Bon dia${name ? ` ${name}` : ''}! 👋 Ami ta ${AGENT_NAME}, bo asistente. Kon mi por yudabo?`
  )
}

export const PA_PLACEHOLDER = pa('Skribí bo pregunta...')

export const PA_AGENT_NAME = AGENT_NAME

export const PA_LEAD_CAPTURE = {
  askName: pa('Bon dia! 👋 Ami ta Demi, bo asistente. Pa kuminsá, kua ta bo nòmber?'),
  askPhone: (name: string) =>
    pa(`Hopi gusto di konosebo, ${name}! Kua ta bo number di telefòn?`),
  askEmail: pa('Eksèlente! I kua ta bo email address?'),
  consentDone: pa(
    'Perfèkt! Mi tin bo informashon. Door di chatia ku mi, bo ta konsinti risibi follow-upnan. Kon mi por yudabo awe?'
  ),
  invalidPhone: pa(
    'Esei no ta parse un number di telefòn válido. Por fabor verifiká? (ehèmpel: 599-123-4567)'
  ),
  invalidEmail: pa(
    'Esei no ta parse un email address válido. Por fabor verifiká? (ehèmpel: john@example.com)'
  ),
} as const

export const PA_ROUTING = {
  form: (formName: string, url: string) =>
    pa(`Bo por kompletá nos ${formName} aki: ${url}`),
  claim: (url: string) => pa(`Bo por entregá bo klaim aki: ${url}`),
  quote: (url: string) => pa(`Bo por tuma un kotisashon òf apliká aki: ${url}`),
  billing: (url: string) => pa(`Bo por maneha fakturashon aki: ${url}`),
  support: (url: string) => pa(`Bo por tuma kontakto ku nos soporte aki: ${url}`),
  continue: (url: string) => pa(`Bo por kontinuá aki: ${url}`),
} as const

export const PA_BOOKING_CTA = (ctaText: string, url: string) =>
  pa(`\n\nKla pa tuma e siguiente paso? ${ctaText}: ${url}`)
