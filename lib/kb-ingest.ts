/**
 * Shared helpers for ingesting content into the knowledge base.
 */

import { detectLanguageFromText } from '@/lib/rag'
export { chunkText } from '@/lib/file-processing'

/** Infer KB language from URL path segments (ennia.com/en/, /nl/, etc.) */
export function detectLanguageFromUrl(url: string): 'EN' | 'NL' | 'ES' | 'PA' | null {
  try {
    const path = new URL(url).pathname.toLowerCase()
    if (/\/(en|english)(\/|$)/.test(path)) return 'EN'
    if (/\/(nl|dutch|nederlands)(\/|$)/.test(path)) return 'NL'
    if (/\/(es|spanish|espanol|español)(\/|$)/.test(path)) return 'ES'
    if (/\/(pap|papiamentu|papiamento)(\/|$)/.test(path)) return 'PA'
  } catch {
    /* ignore */
  }
  return null
}

/** Detect language from a page/document (prefer URL path, then text sample). */
export function detectLanguageForKbContent(
  text: string,
  sourceUrl?: string
): 'EN' | 'NL' | 'ES' | 'PA' {
  if (sourceUrl) {
    const fromUrl = detectLanguageFromUrl(sourceUrl)
    if (fromUrl) return fromUrl
  }
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
