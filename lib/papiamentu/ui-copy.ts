/**
 * Canonical Papiamentu UI copy for chat / lead capture.
 *
 * IMPORTANT: This module is safe for client components. Do NOT import
 * correctPapiamentu / load-data here (those use Node fs).
 * Strings are curated + covered by `npm run pa:test`.
 * Server replies still go through ensurePapiamentuOutbound in API routes.
 */

export const PA_AGENT_NAME = 'Demi'

/** Welcome when language is PA (ENNIA / general). */
export const PA_WELCOME =
  `Bon dia! 👋 Ami ta ${PA_AGENT_NAME}, bo asistente. Kon mi por yudabo awe?`

export function paWelcomeWithName(firstName?: string): string {
  const name = firstName?.trim()
  return `Bon dia${name ? ` ${name}` : ''}! 👋 Ami ta ${PA_AGENT_NAME}, bo asistente. Kon mi por yudabo?`
}

export const PA_PLACEHOLDER = 'Skribí bo pregunta...'

export const PA_LEAD_CAPTURE = {
  askName: 'Bon dia! 👋 Ami ta Demi, bo asistente. Pa kuminsá, kua ta bo nòmber?',
  askPhone: (name: string) =>
    `Hopi gusto di konosebo, ${name}! Kua ta bo number di telefòn?`,
  askEmail: 'Eksèlente! I kua ta bo email address?',
  consentDone:
    'Perfèkt! Mi tin bo informashon. Door di chatia ku mi, bo ta konsinti risibi follow-upnan. Kon mi por yudabo awe?',
  invalidPhone:
    'Esei no ta parse un number di telefòn válido. Por fabor verifiká? (ehèmpel: 599-123-4567)',
  invalidEmail:
    'Esei no ta parse un email address válido. Por fabor verifiká? (ehèmpel: john@example.com)',
} as const

export const PA_ROUTING = {
  form: (formName: string, url: string) =>
    `Bo por kompletá nos ${formName} aki: ${url}`,
  claim: (url: string) => `Bo por entregá bo klaim aki: ${url}`,
  quote: (url: string) => `Bo por tuma un kotisashon òf apliká aki: ${url}`,
  billing: (url: string) => `Bo por maneha fakturashon aki: ${url}`,
  support: (url: string) => `Bo por tuma kontakto ku nos soporte aki: ${url}`,
  continue: (url: string) => `Bo por kontinuá aki: ${url}`,
} as const

export const PA_BOOKING_CTA = (ctaText: string, url: string) =>
  `\n\nKla pa tuma e siguiente paso? ${ctaText}: ${url}`

/** Light client-safe identity fixes (no Node fs / full corrector). */
export function normalizePaWelcomeClient(text: string): string {
  return text
    .replace(/\bMi ta Dami\b/gi, 'Ami ta Demi')
    .replace(/\bAmi ta Dami\b/gi, 'Ami ta Demi')
    .replace(/\bMi ta Demi\b/g, 'Ami ta Demi')
    .replace(/\bMi ta ENNIA Assistant\b/gi, 'Ami ta Demi')
    .replace(/\bAmi ta ENNIA Assistant\b/gi, 'Ami ta Demi')
}
