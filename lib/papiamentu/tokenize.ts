/**
 * Tokenize text into words and separators for reassembly.
 * Preserves punctuation and whitespace.
 */

export type Token = { type: 'word'; value: string } | { type: 'sep'; value: string }

const WORD_REGEX = /[a-zA-Zàèìòùäëïöüáéíóúñèòùü\-]+/g

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
