/**
 * Detect which insurance product the customer is asking about and keep RAG
 * from mixing travel, health, auto, home, and life content.
 */

export interface KbEntryForProductFilter {
  id: string
  title: string
  content: string
  tags?: string[]
  similarity?: number
}

export type InsuranceProduct =
  | 'travel'
  | 'health'
  | 'auto'
  | 'home'
  | 'life'
  | 'claim'
  | 'general'

const INTENT_PATTERNS: Record<InsuranceProduct, RegExp[]> = {
  travel: [
    /\bseguro\s+di\s+biahe\b/i,
    /\bseguro\s+de\s+viaje\b/i,
    /\bbiahe(ro|nan)?\b/i,
    /\btravel\s+insurance\b/i,
    /\breisverzekering\b/i,
    /\bkortlopende\s+reis\b/i,
    /\bdoorlopende\s+reis\b/i,
    /\bdoorlopend(e)?\b/i,
    /\bsingle[\s-]?trip\b/i,
    /\bmulti[\s-]?trip\b/i,
    /\bannuleringsverzekering\b/i,
    /\bkanselashon(\s+di\s+biahe)?\b/i,
    /\btake\s+off\s+with\s+ennia\b/i,
    /\btrip\s+cancellation\b/i,
    /\bwintersport\b/i,
    /\bwatersport\b/i,
    /\bgolfsport\b/i,
    /\breis\b/i,
    /\bviaje\b/i,
    /\bvacation\b/i,
  ],
  health: [
    /\bseguro\s+di\s+sal[uú]\b/i,
    /\bhealth\s+insurance\b/i,
    /\bmedimigra\b/i,
    /\bzorgverzekering\b/i,
    /\bzorgplan\b/i,
    /\bmedische\s+zorg\b/i,
    /\bgarantiekarte?\b/i,
    /\bgarantiebrief\b/i,
    /\bkarta\s+di\s+garante\b/i,
    /\bprestador\b/i,
    /\bprestaci[oó]n\s+de\s+salud\b/i,
  ],
  auto: [
    /\bseguro\s+di\s+outo\b/i,
    /\bcar\s+insurance\b/i,
    /\bautoverzekering\b/i,
    /\bmotorverzekering\b/i,
    /\bwa\s+verzekering\b/i,
    /\bvehicle\b/i,
  ],
  home: [
    /\bseguro\s+di\s+kas\b/i,
    /\bhome\s+insurance\b/i,
    /\bwoonverzekering\b/i,
    /\bideal\s+home\b/i,
    /\binboedel\b/i,
    /\bproperty\s+insurance\b/i,
  ],
  life: [
    /\bseguro\s+di\s+bida\b/i,
    /\blife\s+insurance\b/i,
    /\blevensverzekering\b/i,
    /\bedukashon\s+plan\b/i,
    /\beducation\s+plan\b/i,
  ],
  claim: [
    /\bklaim\b/i,
    /\bclaim\b/i,
    /\breklam(o|ashon)\b/i,
    /\bschade\s+melden\b/i,
    /\bdamage\s+report\b/i,
    /\baksidente\b/i,
    /\baccident\b/i,
  ],
  general: [],
}

const PRODUCT_POSITIVE: Record<InsuranceProduct, string[]> = {
  travel: [
    'seguro di biahe', 'travel insurance', 'reisverzekering', 'reis', 'biahe',
    'single-trip', 'doorlopend', 'doorlopende', 'kortlopende', 'annulerings',
    'kanselashon', 'take off', 'trip cancellation', 'during the trip',
    'during biahe', 'tijdens de reis', 'wereldwijde dekking', 'worldwide coverage',
    'bagahe', 'baggage', 'repatri', 'wintersport', 'watersport',
  ],
  health: [
    'seguro di salú', 'health insurance', 'medimigra', 'zorgverzekering',
    'garantiekarte', 'garantiebrief', 'karta di garante', '24/7', 'prestador',
    'provider choice', 'keuzevrijheid', 'local health', 'salú na kòrsou',
  ],
  auto: ['seguro di outo', 'car insurance', 'autoverzekering', 'motor', 'wa '],
  home: ['seguro di kas', 'home insurance', 'woonverzekering', 'ideal home', 'inboedel'],
  life: ['seguro di bida', 'life insurance', 'levensverzekering', 'education plan'],
  claim: ['klaim', 'claim', 'schade melden', 'reklamo', 'damage report'],
  general: [],
}

const PRODUCT_NEGATIVE: Record<InsuranceProduct, string[]> = {
  travel: [
    'medimigra', 'seguro di salú', 'health insurance', 'zorgverzekering',
    'garantiekarte', 'garantiebrief', 'karta di garante', 'prestador di salú',
    'prestación de salud', 'freedom to choose', 'keuzevrijheid', 'ideal home',
    'woonverzekering', 'autoverzekering', 'levensverzekering', 'life insurance',
    'car insurance', 'seguro di kas', 'seguro di outo', 'seguro di bida',
    'atenshon spesialisá na kòrsou', 'choose your health',
  ],
  health: [
    'reisverzekering', 'travel insurance', 'seguro di biahe', 'single-trip',
    'doorlopende reis', 'annuleringsverzekering', 'kanselashon di biahe',
    'wintersport', 'baggage', 'bagahe perdí',
  ],
  auto: [
    'reisverzekering', 'travel insurance', 'seguro di biahe', 'medimigra',
    'health insurance', 'woonverzekering', 'life insurance',
  ],
  home: [
    'reisverzekering', 'travel insurance', 'seguro di biahe', 'medimigra',
    'autoverzekering', 'car insurance',
  ],
  life: [
    'reisverzekering', 'travel insurance', 'seguro di biahe', 'medimigra',
    'autoverzekering', 'woonverzekering',
  ],
  claim: [],
  general: [],
}

const PRODUCT_LABELS: Record<InsuranceProduct, string> = {
  travel: 'travel insurance (seguro di biahe / reisverzekering)',
  health: 'health insurance (seguro di salú / Medimigra)',
  auto: 'car insurance (seguro di outo)',
  home: 'home insurance (seguro di kas)',
  life: 'life insurance (seguro di bida)',
  claim: 'claims (klaim / schade melden)',
  general: 'insurance (general)',
}

const PRODUCT_SEARCH_EXPANSION: Record<InsuranceProduct, string> = {
  travel:
    'travel insurance reisverzekering single-trip doorlopende reis annuleringsverzekering trip cancellation worldwide coverage baggage repatriation seguro di biahe',
  health:
    'health insurance Medimigra zorgverzekering medical care seguro di salú',
  auto: 'car insurance autoverzekering motor vehicle seguro di outo',
  home: 'home insurance woonverzekering Ideal Home property seguro di kas',
  life: 'life insurance levensverzekering education plan seguro di bida',
  claim: 'claim klaim schade melden damage report accident',
  general: 'ENNIA insurance products services verzekeringen particulieren travel reis health zorg home woon car auto life levensverzekering offerings',
}

export function detectServicesOverviewQuery(query: string): boolean {
  if (!query?.trim()) return false
  return (
    /\bwelke\s+diensten\b/i.test(query) ||
    /\bwat\s+bieden\b/i.test(query) ||
    /\bwelke\s+verzekeringen\b/i.test(query) ||
    /\bwhat\s+services\b/i.test(query) ||
    /\bwhat\s+do\s+you\s+offer\b/i.test(query) ||
    /\bwhich\s+insurance\b/i.test(query) ||
    /\bqu[eé]\s+servicios\b/i.test(query) ||
    /\bkiko\s+servisionan\b/i.test(query) ||
    /\bkiko\s+seguro(nan)?\s+bo\s+tin\b/i.test(query) ||
    /\bproduct(en)?\s+(bieden|aanbieden)\b/i.test(query) ||
    /\binsurance\s+products\b/i.test(query) ||
    /\balle\s+verzekeringen\b/i.test(query)
  )
}

export function detectInsuranceProductIntent(query: string): InsuranceProduct | null {
  if (!query?.trim()) return null

  if (detectServicesOverviewQuery(query)) return 'general'

  const scores: Record<InsuranceProduct, number> = {
    travel: 0,
    health: 0,
    auto: 0,
    home: 0,
    life: 0,
    claim: 0,
    general: 0,
  }

  for (const [product, patterns] of Object.entries(INTENT_PATTERNS) as [
    InsuranceProduct,
    RegExp[],
  ][]) {
    if (product === 'general') continue
    for (const pattern of patterns) {
      if (pattern.test(query)) scores[product] += 2
    }
  }

  // Strong discriminators
  if (/\bseguro\s+di\s+biahe\b/i.test(query)) scores.travel += 5
  if (/\bbiahe\b/i.test(query) && !/\bsal[uú]\b/i.test(query)) scores.travel += 3
  if (/\bsal[uú]\b/i.test(query) && !/\bbiahe\b/i.test(query)) scores.health += 4
  if (/\bmedimigra\b/i.test(query)) scores.health += 5
  if (/\bkotisashon\b/i.test(query) && /\bbiahe\b/i.test(query)) scores.travel += 2

  const ranked = (Object.entries(scores) as [InsuranceProduct, number][])
    .filter(([p]) => p !== 'general')
    .sort((a, b) => b[1] - a[1])

  const [topProduct, topScore] = ranked[0]
  const [, secondScore] = ranked[1] || ['general', 0]

  if (topScore === 0) return null
  if (topScore === secondScore) return null // ambiguous
  return topProduct
}

export function getProductSearchExpansion(product: InsuranceProduct): string {
  return PRODUCT_SEARCH_EXPANSION[product] || PRODUCT_SEARCH_EXPANSION.general
}

export function getProductLabel(product: InsuranceProduct): string {
  return PRODUCT_LABELS[product]
}

function entryText(entry: KbEntryForProductFilter): string {
  const tags = (entry.tags || []).join(' ')
  return `${entry.title} ${entry.content} ${tags}`.toLowerCase()
}

export function scoreEntryForProduct(
  entry: KbEntryForProductFilter,
  product: InsuranceProduct
): number {
  const text = entryText(entry)
  let score = 0

  for (const kw of PRODUCT_POSITIVE[product]) {
    if (text.includes(kw.toLowerCase())) score += 2
  }
  for (const kw of PRODUCT_NEGATIVE[product]) {
    if (text.includes(kw.toLowerCase())) score -= 4
  }

  // Tag-based hints from PA glossary seed
  const tags = (entry.tags || []).map((t) => t.toLowerCase())
  if (product === 'travel' && tags.includes('biahe')) score += 3
  if (product === 'health' && tags.includes('salú')) score += 3
  if (product === 'travel' && tags.includes('salú') && !tags.includes('biahe')) score -= 5
  if (product === 'travel' && tags.includes('product-travel')) score += 4
  if (product === 'health' && tags.includes('product-health')) score += 4
  if (product === 'travel' && tags.includes('product-health')) score -= 6
  if (product !== 'general' && product !== 'claim') {
    if (/produktonan i servisio|alle verzekeringen|all insurance products/i.test(text)) {
      score -= 3
    }
  }

  return score
}

/**
 * Rerank and drop KB chunks that belong to the wrong insurance product.
 */
export function filterKbEntriesByProductIntent<T extends KbEntryForProductFilter>(
  entries: T[],
  product: InsuranceProduct | null,
  limit: number
): T[] {
  if (!product || product === 'general' || product === 'claim' || !entries.length) {
    return entries.slice(0, limit)
  }

  const scored = entries.map((entry) => ({
    entry,
    productScore: scoreEntryForProduct(entry, product),
    vectorScore: entry.similarity ?? 0,
  }))

  const positive = scored.filter((s) => s.productScore > 0)
  const neutral = scored.filter((s) => s.productScore === 0)
  const negative = scored.filter((s) => s.productScore < 0)

  const ranked = [
    ...positive.sort((a, b) => b.productScore + b.vectorScore - (a.productScore + a.vectorScore)),
    ...neutral.sort((a, b) => b.vectorScore - a.vectorScore),
    ...negative.sort((a, b) => b.vectorScore - a.vectorScore),
  ]

  // Drop strongly wrong-product chunks unless we would have almost nothing
  let filtered = ranked.filter((s) => s.productScore >= -2).map((s) => s.entry)
  if (filtered.length < 3 && positive.length > 0) {
    filtered = positive.map((s) => s.entry)
  }
  if (filtered.length < 2) {
    filtered = ranked.slice(0, Math.max(2, limit)).map((s) => s.entry)
  }

  return filtered.slice(0, limit)
}

export function buildProductFidelityPromptBlock(product: InsuranceProduct | null): string {
  if (!product) return ''

  if (product === 'general') {
    return `### SERVICES / PRODUCT OVERVIEW (REQUIRED)
- The customer wants an **overview of services / insurance products**.
- List the main product lines found in the knowledge base (travel/reis, home/woon, car/auto, health/zorg, life, etc.).
- Do NOT say you lack information if any source mentions ENNIA products or verzekeringen.
- Keep the list factual — only products explicitly mentioned in the sources.`
  }

  const label = getProductLabel(product)

  const isolation: Record<InsuranceProduct, string> = {
    travel: `- The customer asked about **travel insurance** only.
- Use facts about trips, reisverzekering, coverage **during travel** (medical abroad, baggage, cancellation, repatriation).
- **DO NOT** describe Medimigra, local health plans, garantiekarte, provider choice in Curaçao, or 24/7 local medical networks — those are **health insurance**, not travel insurance.
- "Medical costs during a trip" ≠ "local health insurance on Curaçao".`,
    health: `- The customer asked about **health insurance** only. Do not describe travel/reis product features unless the source explicitly links them.`,
    auto: `- The customer asked about **car insurance** only. Do not mix travel or health product details.`,
    home: `- The customer asked about **home insurance** only. Do not mix travel or health product details.`,
    life: `- The customer asked about **life insurance** only. Do not mix other product lines.`,
    claim: `- Focus on the **claims process**. Use claim-related sources; do not pivot to unrelated product marketing.`,
    general: `- The customer wants an **overview of services / insurance products**.
- List the main product lines found in the knowledge base (travel, home, car, health, life, etc.).
- Do NOT say you lack information if any source mentions ENNIA products or verzekeringen.
- Keep the list factual — only products explicitly mentioned in the sources.`,
  }

  return `### PRODUCT SCOPE (HIGHEST PRIORITY — DO NOT MIX PRODUCTS)
The customer is asking about: **${label}**
${isolation[product]}
- If multiple sources appear below, use **only** sentences that match this product.
- Never combine features from different insurance types in one answer.`
}
