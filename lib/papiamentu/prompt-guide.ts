/**
 * Papiamentu language guide for AI system prompt injection.
 * Based on Buki di Oro — Ortografia i Lista di palabra Papiamentu (FPI, 2009)
 *
 * When the detected language is PA (Papiamentu), this compact guide is injected
 * into the system prompt so the LLM generates better Papiamentu BEFORE the
 * correction layer even runs.
 */

import { getCanonicalPhrases, getTranslations } from './load-data'

let cachedGuide: string | null = null

export function getPapiamentuPromptGuide(): string {
  if (cachedGuide) return cachedGuide

  const translations = getTranslations()
  const phrases = getCanonicalPhrases()

  // Sample vocabulary examples
  const vocabExamples: string[] = []
  const entries = Object.entries(translations)
  for (let i = 0; i < Math.min(12, entries.length); i++) {
    const [pa, info] = entries[i]
    vocabExamples.push(`  ${pa} (${info.class}) = ${info.nl}`)
  }

  // Key phrases
  const keyPhrases = phrases.slice(0, 15)

  cachedGuide = `
### PAPIAMENTU LANGUAGE GUIDE — Buki di Oro (Official Curaçao Orthography 2009)

You MUST follow these rules exactly when writing Papiamentu:

**ALPHABET & LETTERS (Chapter I):**
- 26 basic letters + 4 modified vowels (è, ò, ù, ü) + 1 modified consonant (ñ)
- 4 digraphs that MUST NEVER be split: ch, dj, sh, zj

**RESTRICTED LETTERS (Chapter II) — THIS IS CRITICAL:**
- Letters c, j, q, x are ONLY used in:
  - Digraphs: ch, dj, zj
  - Mathematics/chemistry terms
  - Proper names: Cornelio, Jacobo, Aquiles, Xiomara
  - Foreign words kept intact: centerfielder, joyeria
- In ALL regular Papiamentu words: USE 'k' NOT 'c'
  - kasa (not casa), koló (not color), kurason (not curason)
  - kuchara (not cuchara), kome (not come)
- USE 'sh' for the sh-sound: obligashon (not obligacion), nashon, pashon
- Nicknames adapt: Kai (from Carlos), Koni (from Cornelia), Shoma (from Xiomara)

**VOWELS — è vs e, ò vs o, ù vs u, ü:**
- è = open e (tèr, skèr, kèlki, kalmèki)
- ò = open o (ròm, kòpi, sòpi, tòrnu)
- ù = Dutch u sound (bùs, kùr, trùk, kontrolùr)
- ü = Dutch uu sound (hür, stür, minüt, partitür)

**ACCENT MARKS (Chapter III):**
- Acute accent (á, é, í, ó, ú) marks stress on:
  - Skèrpi words ending in vowel: piská, karné, sintí, kachó
  - Grave words ending in consonant: fásil, difísil, hóben
  - Esdrúhulo words: último, sílaba, página, úniko
- NO acute if syllable already has grave accent (è, ò, ù)
- NO acute on words ending in diphthong: kabai, Kòrsou, kukui
- NO acute on grave words ending in -el, -en, -er: baiskel, mangel, koper
- Suffixes -mente/-nan preserve original accent: íntimamente, piskánan

**DAYS (Chapter X — ALWAYS lowercase):**
djadumingu, djaluna, djamars, djárason, djaweps, djabièrnè, djasabra

**MONTHS (Chapter X — ALWAYS lowercase):**
yanüari, febrüari, mart, aprel, mei, yüni, yüli, ougùstùs, sèptèmber, òktober, novèmber, desèmber

**NUMERALS (Chapter VII):**
un, dos, tres, kuater, sinku, seis, shete, ocho, nuebe, dies
diesun (11), diessinku (15), binti (20), trinta (30), shen (100), dosshen (200)
mil, mion, bion are written SEPARATELY: sinku mil, un mion

**CAPITALIZATION (Chapter V):**
- Capitalize: proper names, geographic names, titles, start of sentences
- Do NOT capitalize: days, months, languages, nationalities
  - chines, ingles, franses, hulandes, spañó, papiamentu

**CONTRACTIONS (Chapter IX):**
- Prefer full forms: "mi ta bai" not "mi te"
- Apostrophe for elision: t'asina, p'esei, dun'é, sak'i papel

**FOREIGN WORDS (Chapter XI):**
- Unadapted words keep original spelling: leuk, gewoon, safe
- Adapted words follow PA orthography: buldòk, bòikòt, winshil

**KEY GREETINGS:**
- Bon bini (Welcome), Bon dia, Bon tardi, Bon nochi
- Ayo (Goodbye), Danki (Thank you), Por fabor (Please)
- Sòri (Sorry), Kon ta bai? (How are you?)

**GRAMMAR BASICS:**
- "ta" = present tense: Mi ta traha (I work/am working)
- "a" = past tense: Mi a kome (I ate)
- "lo" = future: Mi lo bai (I will go)
- "-nan" = plural: kasnan, muhénan, piskánan
- SVO word order (Subject-Verb-Object)

**COMMON EXPRESSIONS:**
${keyPhrases.slice(0, 10).map(p => `- ${p}`).join('\n')}

**VOCABULARY:**
${vocabExamples.join('\n')}

CRITICAL: Do NOT use Spanish or Dutch spelling in Papiamentu. Always use k (not c), sh (not ci/si for sh-sound), and follow Curaçao orthography consistently. Days and months are ALWAYS lowercase.
`

  return cachedGuide
}
