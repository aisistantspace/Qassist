/**
 * Detect frustrated / abusive customer language and guide calm de-escalation.
 * Same behavior in every response language (EN, NL, ES, Papiamentu).
 */

const ABUSIVE_OR_HOSTILE_PATTERNS: RegExp[] = [
  // English
  /\bf+u+c+k+/i,
  /\bsh+i+t+/i,
  /\bass+h+o+l+e/i,
  /\bb+i+t+c+h/i,
  /\bdamn\b/i,
  /\bcrap\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\buseless\b/i,
  /\bwtf\b/i,
  /\bstfu\b/i,
  /\bgo to hell\b/i,
  /\bscrew you\b/i,

  // Dutch (common on Curaçao)
  /\bklote\b/i,
  /\bkut\b/i,
  /\btyfus\b/i,
  /\bkanker\b/i,
  /\btering\b/i,
  /\bdebiel\b/i,
  /\bidiot\b/i,
  /\brot op\b/i,

  // Spanish
  /\bputa\b/i,
  /\bputo\b/i,
  /\bmierda\b/i,
  /\bcabr[oó]n\b/i,
  /\bpendej[oa]\b/i,
  /\bidiota\b/i,
  /\bimbécil\b/i,
  /\bimbecil\b/i,
  /\bvete a la mierda\b/i,

  // Papiamentu / local mixed usage (Curaçao)
  /\bfok+\b/i,
  /\bfock\b/i,
  /\bshendi\b/i,
  /\bburiku\b/i,
  /\btonteria\b/i,
  /\bbestia\b/i,
  /\bkras+p*\b/i,
  /\bno\s+sabe\s+nada\b/i,
  /\bbo\s+ta\s+stupido\b/i,
  /\bbo\s+ta\s+idiot\b/i,
]

const THREAT_PATTERNS: RegExp[] = [
  /\b(i'?ll|i will)\s+(kill|hurt|sue)\b/i,
  /\bkill\s+you\b/i,
  /\bthreat(en)?\b/i,
]

export function containsAbusiveLanguage(text: string): boolean {
  if (!text?.trim()) return false
  return ABUSIVE_OR_HOSTILE_PATTERNS.some((p) => p.test(text))
}

export function containsThreatLanguage(text: string): boolean {
  if (!text?.trim()) return false
  return THREAT_PATTERNS.some((p) => p.test(text))
}

const DE_ESCALATION_BY_LANG: Record<string, string> = {
  EN: 'Example tone: "I understand you\'re frustrated. I\'m here to help — let me know what you need regarding your insurance, and I\'ll do my best to assist."',
  NL: 'Example tone: "Ik begrijp dat u gefrustreerd bent. Ik ben er om te helpen — vertel me waar u hulp bij nodig heeft met uw verzekering."',
  ES: 'Example tone: "Entiendo su frustración. Estoy aquí para ayudarle — dígame qué necesita sobre su seguro y haré lo posible por asistirle."',
  PA: 'Example tone: "Mi comprende bo ta frustrá. Mi ta yega pa yudabo — laga mi sa kiko bo mester tokante bo seguro i mi lo hasi mi mihó pa asistí bo."',
}

/**
 * Permanent system-prompt block — applies to all languages.
 */
export function getConductPromptBlock(language: string): string {
  const lang = language in DE_ESCALATION_BY_LANG ? language : 'EN'
  const example = DE_ESCALATION_BY_LANG[lang]

  return `### CUSTOMER CONDUCT (PROFANITY & HOSTILITY)
- If the customer uses profanity, insults, or hostile language, stay calm and professional.
- Do NOT mirror, repeat, or escalate with profanity.
- Briefly acknowledge frustration when appropriate, then redirect to how you can help.
- Do NOT lecture or shame the customer; one short boundary line is enough if needed.
- Continue answering factual questions from the knowledge base when possible.
- If language is threatening (violence, serious threats), calmly suggest speaking with the team and do not argue.
- Respond in the customer's language (${lang === 'PA' ? 'Papiamentu — Buki di Oro Curaçao orthography' : lang}).
${example}`
}

/**
 * Extra emphasis when the latest user message was flagged.
 */
export function getAbusiveMessageTurnNote(language: string): string {
  const lang = language in DE_ESCALATION_BY_LANG ? language : 'EN'
  return `### LATEST MESSAGE TONE
The customer's latest message may include frustrated or offensive language. Apply CUSTOMER CONDUCT rules on this turn. Respond in ${lang === 'PA' ? 'Papiamentu' : lang}.`
}
