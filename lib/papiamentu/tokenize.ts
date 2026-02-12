/**
 * Tokenize Papiamentu text into words and separators for reassembly.
 * Preserves punctuation and whitespace.
 *
 * Handles:
 *   - All Papiamentu vowels: a,e,è,i,o,ò,u,ù,ü + accented á,é,í,ó,ú
 *   - Modified consonant: ñ
 *   - Hyphens within words (compound words)
 *   - Apostrophes within words (contractions: t'asina, sak'i, dun'é)
 */

export type Token = { type: 'word'; value: string } | { type: 'sep'; value: string }

// Regex matching Papiamentu words including:
// - All ASCII letters
// - Accented vowels: àáâäèéêëìíîïòóôöùúûüñ
// - Hyphen (compound words)
// - Apostrophe mid-word (contractions like t'asina, sak'i)
const WORD_REGEX = /[a-zA-ZàáâäèéêëìíîïòóôöùúûüñÑ](?:[a-zA-ZàáâäèéêëìíîïòóôöùúûüñÑ\-]|'(?=[a-zA-ZàáâäèéêëìíîïòóôöùúûüñÑ]))*/g

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  const re = new RegExp(WORD_REGEX.source, 'g')
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      tokens.push({ type: 'sep', value: text.slice(lastEnd, m.index) })
    }
    tokens.push({ type: 'word', value: m[0] })
    lastEnd = m.index + m[0].length
  }
  if (lastEnd < text.length) {
    tokens.push({ type: 'sep', value: text.slice(lastEnd) })
  }
  return tokens
}

export function reassemble(tokens: Token[]): string {
  return tokens.map((t) => t.value).join('')
}
