/**
 * Expand user queries with insurance/product synonyms so vector search matches
 * KB chunks regardless of response language (EN scrape, PA question, etc.).
 */

const PA_TERM_EXPANSIONS: { pattern: RegExp; terms: string }[] = [
  { pattern: /\bseguro(nan)?\b/i, terms: 'insurance policy coverage premium' },
  { pattern: /\bbiahe?(ro)?\b/i, terms: 'travel trip vacation single-trip travel insurance' },
  { pattern: /\breis(verzekering)?\b/i, terms: 'travel trip travel insurance reis single-trip' },
  { pattern: /\bpolisa|pòlisa\b/i, terms: 'policy insurance' },
  { pattern: /\bklaim\b/i, terms: 'claim insurance accident damage' },
  { pattern: /\bkotisashon\b/i, terms: 'quote price premium calculate' },
  { pattern: /\bprèis\b/i, terms: 'price premium quote' },
  { pattern: /\bdekking\b/i, terms: 'coverage insurance' },
  { pattern: /\bkanselashon\b/i, terms: 'cancellation trip cancel annuleringsverzekering' },
  { pattern: /\bdoorlopend|tur\s+aña\b/i, terms: 'multi-trip annual travel insurance doorlopende reisverzekering' },
  { pattern: /\bmediko|salú\b/i, terms: 'medical health care insurance medimigra' },
  { pattern: /\brepatriashon\b/i, terms: 'repatriation medical evacuation' },
  { pattern: /\bmi\s+ke\s+sa\b/i, terms: 'information about' },
  { pattern: /\bkiko\b/i, terms: 'what information' },
]

const UNIVERSAL_INSURANCE_PATTERNS: { pattern: RegExp; terms: string }[] = [
  { pattern: /\btravel\b/i, terms: 'single-trip travel insurance vacation trip coverage' },
  { pattern: /\breis\b/i, terms: 'travel insurance reisverzekering trip' },
  { pattern: /\bviaje\b/i, terms: 'travel insurance trip seguro de viaje' },
  { pattern: /\binsurance\b/i, terms: 'policy coverage premium seguro' },
  { pattern: /\bseguro\b/i, terms: 'insurance policy coverage' },
  { pattern: /\bclaim\b/i, terms: 'claim damage accident report' },
  { pattern: /\bklaim\b/i, terms: 'claim insurance' },
  { pattern: /\bquote\b/i, terms: 'premium price calculate policy' },
  { pattern: /\bhome\b/i, terms: 'home house property insurance woon' },
  { pattern: /\bcar\b|auto\b/i, terms: 'vehicle car motor insurance' },
  { pattern: /\blife\b/i, terms: 'life insurance policy' },
  { pattern: /\bhealth\b|care\b/i, terms: 'health medical care insurance' },
]

export function expandKbSearchQuery(query: string, responseLanguage?: string): string {
  const parts: string[] = [query]

  for (const { pattern, terms } of PA_TERM_EXPANSIONS) {
    if (pattern.test(query)) parts.push(terms)
  }
  for (const { pattern, terms } of UNIVERSAL_INSURANCE_PATTERNS) {
    if (pattern.test(query)) parts.push(terms)
  }

  if (responseLanguage === 'PA' && parts.length === 1) {
    parts.push('insurance travel seguro biahe policy coverage')
  }

  return parts.join(' ')
}
