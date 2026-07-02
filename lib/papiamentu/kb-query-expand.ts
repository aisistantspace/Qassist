/**
 * Expand user queries with insurance/product synonyms so vector search matches
 * KB chunks regardless of response language (EN scrape, PA question, etc.).
 * Product-aware: travel questions must NOT pull health/auto/home chunks.
 */

import {
  detectInsuranceProductIntent,
  detectServicesOverviewQuery,
  getProductSearchExpansion,
  type InsuranceProduct,
} from '../insurance-product-intent'

/** Only expand when the query already signals that product — no cross-product bleed */
const CONTEXTUAL_EXPANSIONS: {
  pattern: RegExp
  terms: string
  products?: InsuranceProduct[]
}[] = [
  {
    pattern: /\bbiahe?(ro)?\b/i,
    terms: 'travel trip vacation single-trip travel insurance reis reisverzekering',
    products: ['travel'],
  },
  {
    pattern: /\breis(verzekering)?\b/i,
    terms: 'travel trip travel insurance reis single-trip doorlopende',
    products: ['travel'],
  },
  {
    pattern: /\bpolisa|pòlisa\b/i,
    terms: 'policy insurance pòlisa',
  },
  {
    pattern: /\bklaim\b/i,
    terms: 'claim insurance accident damage schade melden',
    products: ['claim'],
  },
  {
    pattern: /\bkotisashon\b/i,
    terms: 'quote price premium calculate offerte',
  },
  {
    pattern: /\bprèis\b/i,
    terms: 'price premium quote prèis',
  },
  {
    pattern: /\bkanselashon\b/i,
    terms: 'cancellation trip cancel annuleringsverzekering travel',
    products: ['travel'],
  },
  {
    pattern: /\bdoorlopend|tur\s+aña\b/i,
    terms: 'multi-trip annual travel insurance doorlopende reisverzekering',
    products: ['travel'],
  },
  {
    pattern: /\bseguro\s+di\s+sal[uú]\b/i,
    terms: 'health insurance Medimigra zorgverzekering medical care',
    products: ['health'],
  },
  {
    pattern: /\bmedimigra\b/i,
    terms: 'health insurance medical care zorg',
    products: ['health'],
  },
  {
    pattern: /\bseguro\s+di\s+kas\b/i,
    terms: 'home insurance woonverzekering Ideal Home property',
    products: ['home'],
  },
  {
    pattern: /\bseguro\s+di\s+outo\b/i,
    terms: 'car insurance autoverzekering motor vehicle',
    products: ['auto'],
  },
  {
    pattern: /\bseguro\s+di\s+bida\b/i,
    terms: 'life insurance levensverzekering education plan',
    products: ['life'],
  },
  {
    pattern: /\brepatriashon\b/i,
    terms: 'repatriation medical evacuation travel',
    products: ['travel'],
  },
  {
    pattern: /\bmi\s+ke\s+sa\b/i,
    terms: 'information about',
  },
  {
    pattern: /\bkiko\b/i,
    terms: 'what information',
  },
  {
    pattern: /\bdiensten\b/i,
    terms: 'services verzekeringen insurance products ENNIA offerings particulieren',
  },
  {
    pattern: /\bverzekeringen\b/i,
    terms: 'insurance products ENNIA reis woon auto leven zorg',
  },
  {
    pattern: /\bservicios\b/i,
    terms: 'services insurance products seguros ENNIA',
  },
]

export function expandKbSearchQuery(query: string, responseLanguage?: string): string {
  const parts: string[] = [query]
  const product = detectInsuranceProductIntent(query)

  if (product) {
    parts.push(getProductSearchExpansion(product))
  } else if (detectServicesOverviewQuery(query)) {
    parts.push(getProductSearchExpansion('general'))
  }

  for (const { pattern, terms, products } of CONTEXTUAL_EXPANSIONS) {
    if (!pattern.test(query)) continue
    if (product && products && !products.includes(product)) continue
    if (product && products === undefined && product !== 'general') {
      // Generic expansion — skip if we have a specific product and this isn't tagged for it
      if (/\bseguro\b/i.test(pattern.source) && product !== 'travel') continue
    }
    parts.push(terms)
  }

  // Bare "seguro" without product — light expansion only (no health/travel mix)
  if (/\bseguro(nan)?\b/i.test(query) && !product) {
    parts.push('insurance policy ENNIA')
  }

  if (responseLanguage === 'PA' && parts.length === 1) {
    parts.push('insurance seguro ENNIA policy')
  }

  return [...new Set(parts.join(' ').split(/\s+/))].join(' ')
}
