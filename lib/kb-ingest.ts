/**
 * Shared helpers for ingesting content into the knowledge base.
 */

import { detectLanguageFromText } from '@/lib/rag'
export { chunkText } from '@/lib/file-processing'

/** Detect language from a page/document (use full text sample, not tiny chunks). */
export function detectLanguageForKbContent(text: string): 'EN' | 'NL' | 'ES' | 'PA' {
  const sample = text.slice(0, 2500)
  return detectLanguageFromText(sample)
}

/** Clean scraped HTML text while preserving paragraph breaks for chunking. */
export function cleanWebContent(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
