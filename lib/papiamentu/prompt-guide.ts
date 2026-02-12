/**
 * Papiamentu language guide for AI system prompt injection.
 *
 * When the detected language is PA (Papiamentu), this compact guide is injected
 * into the system prompt so the LLM generates better Papiamentu BEFORE the
 * correction layer even runs. This reduces the number of corrections needed.
 */

import { getCanonicalPhrases, getTranslations } from './load-data'

let cachedGuide: string | null = null

export function getPapiamentuPromptGuide(): string {
  if (cachedGuide) return cachedGuide

  // Build a compact guide from our data
  const translations = getTranslations()
  const phrases = getCanonicalPhrases()

  // Sample a few translation examples (vocabulary with word classes)
  const vocabExamples: string[] = []
  const entries = Object.entries(translations)
  for (let i = 0; i < Math.min(15, entries.length); i++) {
    const [pa, info] = entries[i]
    vocabExamples.push(`  ${pa} (${info.class}) = ${info.nl}`)
  }

  // Pick key phrases (greetings + a few conversational ones)
  const keyPhrases = phrases.slice(0, 20)

  cachedGuide = `
### PAPIAMENTU LANGUAGE GUIDE (Curaçao Standard)
You are responding in Papiamentu (Curaçao/Bonaire orthography). Follow these rules strictly:

**Orthography Rules:**
- Use 'k' instead of 'c' (e.g. "kasa" not "casa", "kurason" not "curason")
- Exception: keep 'ch' digraph (e.g. "chikito", "mucha")
- Use 'sh' for the sh-sound (e.g. "nashon", "abolishon")
- Protected digraphs: ch, dj, sh, zj — never split these
- Use Curaçao accent marks: è, ò, ù, ü (e.g. "Kòrsou", "djabièrne")
- ñ is a separate letter after n in the alphabet

**Key Greetings & Phrases:**
- Bon bini (Welcome)
- Bon dia (Good morning)
- Bon tardi (Good afternoon)
- Bon nochi (Good evening)
- Ayo (Goodbye)
- Danki (Thank you)
- Por fabor (Please)
- Sòri (Sorry)
- Kon ta? (How are you?)

**Common Expressions:**
${keyPhrases.slice(0, 12).map(p => `- ${p}`).join('\n')}

**Vocabulary Examples:**
${vocabExamples.join('\n')}

**Grammar Notes:**
- "ta" = present tense marker (Mi ta traha = I am working)
- "a" = past tense marker (Mi a kome = I ate)
- "lo" = future marker (Mi lo bai = I will go)
- "-nan" suffix = plural (kasnan = houses, muhénan = women)
- Word order is generally SVO (Subject-Verb-Object)

IMPORTANT: Do NOT mix Spanish or Dutch spelling into Papiamentu. Use Curaçao orthography consistently.
`

  return cachedGuide
}
