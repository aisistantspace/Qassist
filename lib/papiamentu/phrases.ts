/**
 * Phrase-level validation for Papiamentu.
 * Based on Buki di Oro orthography rules.
 *
 * After individual words are corrected, this module scans the reassembled text
 * for near-matches to canonical phrases and common errors, then corrects them.
 *
 * Rules applied:
 *   - Spanish greetings → Papiamentu equivalents
 *   - Common phrase misspellings (Bon beni → Bon bini)
 *   - Days/months: enforce lowercase + correct Buki di Oro spelling
 *   - Contraction patterns: normalize apostrophe usage
 */

import { getCanonicalPhrases, getSpanishToPaMap, getInsurancePhraseFixes } from './load-data'

export interface PhraseCorrection {
  from: string
  to: string
}

export interface PhraseCorrectionResult {
  corrected: string
  changed: boolean
  corrections: PhraseCorrection[]
}

// ── Phrase index (lazy-built) ───────────────────────────────────────

let phraseMap: Map<string, string> | null = null

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?¿¡;:'"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPhraseMap(): Map<string, string> {
  if (phraseMap) return phraseMap
  phraseMap = new Map()

  const phrases = getCanonicalPhrases()
  for (const phrase of phrases) {
    const norm = normalize(phrase)
    if (norm.length >= 3) {
      phraseMap.set(norm, phrase)
    }
  }

  return phraseMap
}

// ── Common misspellings / Spanish → Papiamentu patterns ─────────────

const GREETING_FIXES: [RegExp, string][] = [
  // "Bon beni" / "Bon bieni" → "Bon bini"
  [/\bbon\s+ben[ie]\b/gi, 'Bon bini'],
  // "Bon tarde" → "Bon tardi"
  [/\bbon\s+tarde\b/gi, 'Bon tardi'],
  // "Bon noche" → "Bon nochi"
  [/\bbon\s+noche\b/gi, 'Bon nochi'],
  // "Por favor" (Spanish) → "Por fabor"
  [/\bpor\s+favor\b/gi, 'Por fabor'],
  // "Gracias" (Spanish) → "Danki"
  [/\bgracias\b/gi, 'Danki'],
  // "Buenos dias" (Spanish) → "Bon dia"
  [/\bbuenos?\s+dias?\b/gi, 'Bon dia'],
  // "Buenas tardes" (Spanish) → "Bon tardi"
  [/\bbuenas?\s+tardes?\b/gi, 'Bon tardi'],
  // "Buenas noches" (Spanish) → "Bon nochi"
  [/\bbuenas?\s+noches?\b/gi, 'Bon nochi'],
  // "De nada" (Spanish) → "Nada" (common)
  [/\bde\s+nada\b/gi, 'Nada'],
  // "Lo siento" (Spanish) → "Sòri"
  [/\blo\s+siento\b/gi, 'Sòri'],
  // "Con mi por" (misspelled "How can I") → "Kon mi por"
  [/\bcon\s+mi\s+por\b/gi, 'Kon mi por'],
  // Spanish "equipo" (team) — NOT "ekipá" (verb: to equip)
  [/\bequipo\b/gi, 'ekipo'],
  [/\be\s+ekipá\b/gi, 'e ekipo'],
  [/\bku\s+e\s+ekipá\b/gi, 'ku e ekipo'],
  [/\bnos\s+ekipá\b/gi, 'nos ekipo'],
  // Common misspellings
  [/\bnomber\b/gi, 'nòmber'],
  [/\bcon\s+mi\s+por\s+yuda\s+bo\b/gi, 'kon mi por yudabo'],
  [/\bmi\s+por\s+yuda\s+bo\b/gi, 'mi por yudabo'],
  // Identity / greeting — force Ami + Demi (never Mi ta / Dami / ENNIA Assistant)
  [/\bMi\s+ta\s+Dami\b/g, 'Ami ta Demi'],
  [/\bmi\s+ta\s+dami\b/gi, 'Ami ta Demi'],
  [/\bAmi\s+ta\s+Dami\b/g, 'Ami ta Demi'],
  [/\bami\s+ta\s+dami\b/gi, 'Ami ta Demi'],
  [/\bMi\s+ta\s+Demi\b/g, 'Ami ta Demi'],
  [/\bmi\s+ta\s+demi\b/gi, 'Ami ta Demi'],
  [/\bMi\s+ta\s+ENNIA\s+Assistant\b/gi, 'Ami ta Demi'],
  [/\bAmi\s+ta\s+ENNIA\s+Assistant\b/gi, 'Ami ta Demi'],
  [/\bMi\s+ta\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñüèòùà\-]+),\s*bo\s+asistente\b/g, 'Ami ta $1, bo asistente'],
]

/** English/Dutch tokens where standalone "of"/"y" must not be rewritten to PA. */
const EN_NL_PROTECT = new Set([
  'the', 'and', 'or', 'of', 'to', 'for', 'with', 'from', 'this', 'that', 'you', 'your',
  'is', 'are', 'was', 'were', 'have', 'has', 'will', 'can', 'should', 'would',
  'please', 'click', 'here', 'link', 'email', 'phone', 'address', 'name',
  'insurance', 'claim', 'policy', 'quote', 'home', 'auto', 'health',
  'de', 'het', 'een', 'van', 'voor', 'met', 'niet', 'zijn', 'wordt', 'worden',
  'verzekering', 'schade', 'polis',
])

const PA_CONTEXT_HINT =
  /\b(ta|ku|di|bo|mi|nos|nan|pa|kon|bon|por|yuda|skucha|skirbi|papiamentu|kiko|ami|demi|seguro|kas|bai|tin|sa|den|mas|tambe|awe|aki|danki|fabor)\b/i

function looksLikePapiamentuContext(text: string): boolean {
  const tokens = text.toLowerCase().match(/[a-záéíóúñüèòùàâêîôûäëïöÿ]+/gi) || []
  if (tokens.length === 0) return false
  let paHits = 0
  let enNlHits = 0
  for (const t of tokens) {
    if (EN_NL_PROTECT.has(t)) enNlHits++
    if (PA_CONTEXT_HINT.test(t) || /shon$|mentu$|á$|ò|è|ù|ñ/.test(t)) paHits++
  }
  // Prefer PA when clear PA markers exist and EN/NL is not dominant
  return paHits >= 2 || (paHits >= 1 && enNlHits <= paHits)
}

/** Conjunction fixes only when text is predominantly PA (avoids mangling EN/NL fragments). */
function applyPaOnlyConjunctionFixes(text: string, corrections: PhraseCorrection[]): string {
  if (!looksLikePapiamentuContext(text)) return text
  let result = text
  // Standalone Spanish "y" → PA "i" (not inside English/Dutch-heavy text)
  result = result.replace(/\by\b/gi, (match, offset, full) => {
    const before = full.slice(Math.max(0, offset - 24), offset)
    const after = full.slice(offset + match.length, offset + match.length + 24)
    const window = `${before} ${after}`
    const hasEnNlNeighbor = [...(window.match(/[a-záéíóúñüèòùàâêîôûäëïöÿ]+/gi) || [])].some((w) =>
      EN_NL_PROTECT.has(w.toLowerCase())
    )
    if (hasEnNlNeighbor && !PA_CONTEXT_HINT.test(window)) return match
    if (match.toLowerCase() !== 'i') corrections.push({ from: match, to: 'i' })
    return match[0] === 'Y' ? 'I' : 'i'
  })
  // English/Spanish "of" → PA "òf" only in PA context (not "of the...")
  result = result.replace(/\bof\b/gi, (match, offset, full) => {
    const after = full.slice(offset + match.length, offset + match.length + 16)
    if (/^\s+(the|a|an|this|that|your|our|de|het|een)\b/i.test(after)) return match
    corrections.push({ from: match, to: 'òf' })
    return 'òf'
  })
  return result
}

// ── Verb + object pronoun merges (Buki di Oro Chapter IX style) ─────
// AI often writes "yuda bo" instead of fused "yudabo"

const PRONOUN_MERGE_FIXES: [RegExp, string][] = [
  [/\byuda\s+bo\b/gi, 'yudabo'],
  [/\bmanda\s+bo\b/gi, 'mandabo'],
  [/\bkontakta\s+bo\b/gi, 'kontaktabo'],
  [/\binforma\s+bo\b/gi, 'informabo'],
  [/\bsegurá\s+bo\b/gi, 'segurabo'],
  [/\bsegura\s+bo\b/gi, 'segurabo'],
  [/\beksplika\s+bo\b/gi, 'eksplikabo'],
  [/\bastè\s+bo\b/gi, 'astèbo'],
  [/\bayuda\s+bo\b/gi, 'yudabo'],
]

// ── Buki di Oro official day spellings (Chapter X) ──────────────────
// These fix common misspellings from AI models

const DAY_FIXES: [RegExp, string][] = [
  [/\bdjadomingo\b/gi, 'djadumingu'],
  [/\bdjadomingu\b/gi, 'djadumingu'],
  [/\bdiarason\b/gi, 'djárason'],
  [/\bdjarason\b/gi, 'djárason'],
  [/\bdjawieps\b/gi, 'djaweps'],
  [/\bdjabièrne\b/gi, 'djabièrnè'],
  [/\bdjabierne\b/gi, 'djabièrnè'],
]

// ── Buki di Oro official month spellings (Chapter X) ────────────────

const MONTH_FIXES: [RegExp, string][] = [
  // Dutch → Papiamentu
  [/\bjanuary?\b/gi, 'yanüari'],
  [/\bfebruary?\b/gi, 'febrüari'],
  [/\bmaa?rt\b/gi, 'mart'],
  [/\bjuni\b/gi, 'yüni'],
  [/\bjuli\b/gi, 'yüli'],
  [/\baugustus\b/gi, 'ougùstùs'],
  // Spanish → Papiamentu
  [/\benero\b/gi, 'yanüari'],
  [/\bfebrero\b/gi, 'febrüari'],
  [/\bmarzo\b/gi, 'mart'],
  [/\bmayo\b/gi, 'mei'],
  [/\bjunio\b/gi, 'yüni'],
  [/\bjulio\b/gi, 'yüli'],
  [/\bagosto\b/gi, 'ougùstùs'],
  [/\bseptiembre\b/gi, 'sèptèmber'],
  [/\boctubre\b/gi, 'òktober'],
  [/\bnoviembre\b/gi, 'novèmber'],
  [/\bdiciembre\b/gi, 'desèmber'],
]

// ── Spanish imperative / multi-word phrase fixes ─────────────────────
// AI models frequently generate these Spanish constructions in PA output.
// Must run BEFORE word-level substitution so multi-word patterns are caught intact.

const SPANISH_PHRASE_FIXES: [RegExp, string][] = [
  // "házmelo saber" / "házmelo sa" → "laga mi sa" (let me know)
  [/\bh[aá]zmelo\s+saber\b/gi, 'laga mi sa'],
  [/\bh[aá]zmelo\s+sa\b/gi, 'laga mi sa'],
  // "hágamelo saber" / "hágamelo sa" → "laga mi sa" (formal let me know)
  [/\bh[aá]gamelo\s+saber\b/gi, 'laga mi sa'],
  [/\bh[aá]gamelo\s+sa\b/gi, 'laga mi sa'],
  // "déjame saber" / "dejame saber" → "laga mi sa"
  [/\bd[eé]jame\s+saber\b/gi, 'laga mi sa'],
  // "no dude(n) en" → "no duda di" (don't hesitate to)
  [/\bno\s+dude[ns]?\s+en\b/gi, 'no duda di'],
  // "estoy aquí para" → "mi ta aki pa" (I'm here to)
  [/\bestoy\s+aqu[ií]\s+para\b/gi, 'mi ta aki pa'],
  // "estamos aquí para" → "nos ta aki pa" (we're here to)
  [/\bestamos\s+aqu[ií]\s+para\b/gi, 'nos ta aki pa'],
  // "con gusto" → "ku gusto" (with pleasure)
  [/\bcon\s+gusto\b/gi, 'ku gusto'],
  // Spanish "con" (with) + noun → PA "ku"
  [/\bcon\s+(?!mi\b)([a-záéíóúñüèòù]+)\b/gi, 'ku $1'],
  // "si tiene(s)" → "si bo tin" (if you have)
  [/\bsi\s+tienes?\b/gi, 'si bo tin'],
  // Chatbot: contact the team (ekipá = equip verb — wrong)
  [/\bmi\s+por\s+kontakt[aá]\s+e\s+ekip[aá]\s+pa\s+bo\b/gi, 'mi por tuma kontakto ku e ekipo pa bo'],
  [/\bmi\s+por\s+kontakt[aá]\s+e\s+ekip[aá]\b/gi, 'mi por tuma kontakto ku e ekipo'],
  [/\bkontakt[aá]\s+e\s+ekip[aá]\s+pa\s+bo\b/gi, 'tuma kontakto ku e ekipo pa bo'],
  [/\bkontakt[aá]\s+e\s+ekip[aá]\b/gi, 'tuma kontakto ku e ekipo'],
  [/\bmi\s+por\s+kontakt[aá]\s+e\s+team\s+pa\s+bo\b/gi, 'mi por tuma kontakto ku e team pa bo'],
  // Link CTAs — Spanish "visita" / English "visit" → Papiamentu "bishitá"
  [/\bvisita(r|ndo)?\s+(el|la|di|e)\s+link\b/gi, 'bishitá e link'],
  [/\bvisita(r|ndo)?\s+link\b/gi, 'bishitá e link'],
  [/\bvisite\s+(el|la|di|e)\s+link\b/gi, 'bishitá e link'],
  [/\bvisit(ing)?\s+(the\s+)?link\b/gi, 'bishitá e link'],
  [/\bclick\s+(on\s+)?(the\s+)?link\b/gi, 'bishitá e link'],
  [/\bklik\s+(op\s+)?(de\s+)?link\b/gi, 'bishitá e link'],
  [/\bvisita(r)?\s+(el|la)\s+/gi, 'bishitá e '],
  [/\bel\s+link\b/gi, 'e link'],
  [/\bla\s+link\b/gi, 'e link'],
]

// ── Standalone-nan plural merging ────────────────────────────────────
// AI models sometimes write PA plurals as two words: "servisio nan" instead of "servisionan".
// This map merges the most common cases back into correct PA plurals.

const NAN_PLURAL_FIXES: Record<string, string> = {
  'servisio': 'servisionan',
  'produkto': 'produktonan',
  'seguro': 'seguronan',
  'kliente': 'klientenan',
  'dokumento': 'dokumentonan',
  'pregunta': 'preguntanan',
  'persona': 'personanan',
  'informashon': 'informashonnan',
  'kondishon': 'kondishonnan',
  'opshon': 'opshonnan',
  'obligashon': 'obligashonnan',
  'situashon': 'situashonnan',
  'organisashon': 'organisashonnan',
  'protekshon': 'protekshonnan',
  'aplikashon': 'aplikashonnan',
  'riesgo': 'riesgonan',
  'famia': 'famianan',
  'trabou': 'trabounan',
}

// ── Contraction normalization (Chapter IX) ──────────────────────────
// Accept common contractions as valid — don't "correct" them

const VALID_CONTRACTIONS = new Set([
  "t'asina", "t'ami", "t'e", "t'ei", "t'aden",
  "n'", "p'esei", "p'é",
  "dun'é", "hañ'é", "lag'e", "lag'é",
  "sak'i", "kash'i", "ko'i", "ka'i", "blek'i",
  "ta'ata", "ta'ta", "ta'a", "ta'atin", "ta'tin",
  "betr'i", "botr'i", "bendr'i", "bòndr'i", "kambr'i",
])

// ── Main entry point ────────────────────────────────────────────────

export function correctPhrases(text: string): PhraseCorrectionResult {
  const corrections: PhraseCorrection[] = []
  let result = text
  const paContext = looksLikePapiamentuContext(text)

  // Always fix Spanish greetings + identity — even on short/isolated strings
  for (const [pattern, replacement] of GREETING_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      result = result.replace(pattern, replacement)
      if (original.toLowerCase() !== replacement.toLowerCase()) {
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // English/Dutch-dominant fragments: stop after greeting/identity fixes
  if (!paContext) {
    return {
      corrected: result,
      changed: corrections.length > 0,
      corrections,
    }
  }

  // 0. Insurance demo phrase fixes (Spanish bleed → PA)
  for (const { pattern, replacement } of getInsurancePhraseFixes()) {
    try {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const match = result.match(regex)
      if (match) {
        const original = match[0]
        result = result.replace(regex, replacement)
        if (original.toLowerCase() !== replacement.toLowerCase()) {
          corrections.push({ from: original, to: replacement })
        }
      }
    } catch {
      /* skip invalid pattern */
    }
  }

  // 1. Greeting/identity already applied above

  // 1a. Scoped conjunction fixes (y→i, of→òf) only in PA-dominant text
  result = applyPaOnlyConjunctionFixes(result, corrections)

  // 1b. Apply Spanish imperative/phrase fixes (must run before word-level substitution)
  for (const [pattern, replacement] of SPANISH_PHRASE_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      result = result.replace(pattern, replacement)
      if (original.toLowerCase() !== replacement.toLowerCase()) {
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 1c. Fix chatbot self-referencing pronouns
  //     When the bot (mi/nos) is the subject and the verb ends with -mi suffix,
  //     it's saying "I help myself" instead of "I help you". Fix to -bo.
  //     e.g. "mi por yudami" → "mi por yudabo", "nos ta yudami" → "nos ta yudabo"
  result = result.replace(
    /\b((?:mi|nos)\s+(?:por|ta|lo|a)\s+)([a-záéíóúñüèòùàâêîôûäëïöÿ]+)(mi)\b/gi,
    (full, subject, verbStem, _suffix) => {
      const fixed = subject + verbStem + 'bo'
      corrections.push({ from: full.trim(), to: fixed.trim() })
      return fixed
    }
  )

  // 1d. Remove duplicate "bo" after fused verb+bo suffix
  //     e.g. "yudabo bo" → "yudabo", "kontaktabo bo" → "kontaktabo"
  result = result.replace(
    /\b([a-záéíóúñüèòùàâêîôûäëïöÿ]+bo)\s+bo\b/gi,
    (full, fused) => {
      corrections.push({ from: full.trim(), to: fused })
      return fused
    }
  )

  // 1d2. Merge separated verb + bo into fused pronoun suffix
  for (const [pattern, replacement] of PRONOUN_MERGE_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      result = result.replace(pattern, replacement)
      if (original.toLowerCase() !== replacement.toLowerCase()) {
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 1e. Remove duplicate consecutive phrases the AI sometimes stutters
  //     e.g. "Por fabor, Por fabor" → "Por fabor,"
  result = result.replace(/\b([\wáéíóúñüèòùàâêîôûäëïöÿ]+(?:\s+[\wáéíóúñüèòùàâêîôûäëïöÿ]+){0,3}),?\s+\1\b/gi, (full, phrase) => {
    corrections.push({ from: full, to: phrase })
    return phrase
  })

  // 2. Apply day spelling fixes
  for (const [pattern, replacement] of DAY_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      // Only fix if actually different
      if (original !== replacement) {
        result = result.replace(pattern, replacement)
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 3. Apply month spelling fixes
  for (const [pattern, replacement] of MONTH_FIXES) {
    const match = result.match(pattern)
    if (match) {
      const original = match[0]
      if (original !== replacement) {
        result = result.replace(pattern, replacement)
        corrections.push({ from: original, to: replacement })
      }
    }
  }

  // 4. Spanish → Papiamentu word substitution
  //    Replace common Spanish words the AI generates with their PA equivalents
  const spanishMap = getSpanishToPaMap()
  if (Object.keys(spanishMap).length > 0) {
    // Split on word boundaries, replace each Spanish word with its PA equivalent
    result = result.replace(/[a-záéíóúñüèòùàâêîôûäëïöÿ]+/gi, (match) => {
      const lower = match.toLowerCase()
      const replacement = spanishMap[lower]
      if (replacement && lower !== replacement.toLowerCase()) {
        // Preserve original casing
        let cased = replacement
        if (match === match.toUpperCase() && match !== match.toLowerCase()) {
          cased = replacement.toUpperCase()
        } else if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
          cased = replacement[0].toUpperCase() + replacement.slice(1)
        }
        corrections.push({ from: match, to: cased })
        return cased
      }
      return match
    })
  }

  // 5. Merge standalone "nan" plurals back into single PA words
  //    e.g. "servisio nan" → "servisionan"
  for (const [noun, plural] of Object.entries(NAN_PLURAL_FIXES)) {
    // Match noun + space(s) + nan (case insensitive, word boundary)
    const nanPattern = new RegExp(`\\b${noun}\\s+nan\\b`, 'gi')
    const nanMatch = result.match(nanPattern)
    if (nanMatch) {
      for (const original of nanMatch) {
        // Preserve leading case
        let cased = plural
        if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
          cased = plural[0].toUpperCase() + plural.slice(1)
        }
        result = result.replace(original, cased)
        corrections.push({ from: original, to: cased })
      }
    }
  }

  // 6. Fix incorrect -anan plurals on consonant-ending words
  //    PA rule: words ending in a consonant take -nan, not -anan
  //    e.g. "opshonanan" → "opshonnan", "informashonanan" → "informashonnan"
  result = result.replace(/\b([a-záéíóúñüèòùàâêîôûäëïöÿ]+[bcdfghjklmnpqrstvwxz])anan\b/gi, (full, stem) => {
    const fixed = stem + 'nan'
    corrections.push({ from: full, to: fixed })
    return fixed
  })

  // 7. Scan for phrases that need case correction
  const map = buildPhraseMap()
  const words = result.split(/\s+/)

  for (let windowSize = 4; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(' ')
      const normWindow = normalize(window)

      const canonical = map.get(normWindow)
      if (canonical && window !== canonical) {
        const windowLower = window.toLowerCase()
        const canonicalLower = canonical.toLowerCase()
        if (windowLower === canonicalLower && window !== canonical) {
          result = result.replace(window, canonical)
          corrections.push({ from: window, to: canonical })
        }
      }
    }
  }

  // 8. Punctuation cleanup
  //    Fix doubled/conflicting punctuation the AI sometimes generates
  const beforePunct = result
  result = result
    .replace(/\.\?/g, '?')       // ".?" → "?"
    .replace(/\.!/g, '!')         // ".!" → "!"
    .replace(/\?\./g, '?')        // "?." → "?"
    .replace(/!\.?/g, '!')        // "!." → "!"
    .replace(/([?!])\1+/g, '$1')  // "??" → "?", "!!" → "!"
    .replace(/\.{2,}/g, '.')      // ".." → "."
  if (result !== beforePunct) {
    corrections.push({ from: '(punctuation)', to: '(cleaned)' })
  }

  return {
    corrected: result,
    changed: corrections.length > 0,
    corrections,
  }
}

/**
 * Check if a word with apostrophe is a valid Papiamentu contraction
 * per Buki di Oro Chapter IX.
 */
export function isValidContraction(word: string): boolean {
  if (!word.includes("'")) return false
  return VALID_CONTRACTIONS.has(word.toLowerCase())
}
