/**
 * Expand Papiamentu user queries with English/Dutch insurance terms so vector
 * search can match KB chunks scraped in EN/NL (e.g. ENNIA /en/ pages).
 */

const PA_TERM_EXPANSIONS: { pattern: RegExp; terms: string }[] = [
  { pattern: /\bseguro(nan)?\b/i, terms: 'insurance policy coverage premium' },
  { pattern: /\bbiahe?(ro)?\b/i, terms: 'travel trip vacation single-trip travel insurance' },
  { pattern: /\breis(verzekering)?\b/i, terms: 'travel trip travel insurance reis single-trip' },
  { pattern: /\bpolisa|pòlisa\b/i, terms: 'policy insurance' },
  { pattern: /\bklaim\b/i, terms: 'claim insurance accident damage' },
  { pattern: /\bviahe\b/i, terms: 'travel trip' },
  { pattern: /\bkotisashon\b/i, terms: 'quote price premium calculate' },
  { pattern: /\bprèis\b/i, terms: 'price premium quote' },
  { pattern: /\bdekking\b/i, terms: 'coverage insurance' },
  { pattern: /\bmi\s+ke\s+sa\b/i, terms: 'information about' },
  { pattern: /\bkiko\b/i, terms: 'what information' },
]

export function expandKbSearchQuery(query: string, responseLanguage: string): string {
  if (responseLanguage !== 'PA') return query

  const parts: string[] = [query]
  for (const { pattern, terms } of PA_TERM_EXPANSIONS) {
    if (pattern.test(query)) {
      parts.push(terms)
    }
  }

  // Short PA questions often lack shared embedding overlap with English KB titles
  if (parts.length === 1) {
    parts.push('insurance travel policy coverage')
  }

  return parts.join(' ')
}
