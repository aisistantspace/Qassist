/**
 * Golden regression tests for the Papiamentu correction layer.
 * Run: npm run pa:test
 */
import { correctPapiamentu } from '../lib/papiamentu/index'
import { ensurePapiamentuOutbound } from '../lib/papiamentu/outbound'
import { PA_WELCOME, PA_PLACEHOLDER, PA_AGENT_NAME } from '../lib/papiamentu/ui-copy'
import { isKnownWord } from '../lib/papiamentu/spell'
import { getWordSet } from '../lib/papiamentu/load-data'

let failed = 0
let passed = 0

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.error(`  ✗ ${msg}`)
  }
}

function assertEq(actual: string, expected: string, msg: string) {
  assert(actual === expected, `${msg}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
}

function assertIncludes(haystack: string, needle: string, msg: string) {
  if (haystack.includes(needle)) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.error(
      `  ✗ ${msg}\n      missing ${JSON.stringify(needle)} in ${JSON.stringify(haystack)}`
    )
  }
}

function assertNotIncludes(haystack: string, needle: string, msg: string) {
  if (!haystack.includes(needle)) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.error(`  ✗ ${msg}\n      unexpected ${JSON.stringify(needle)}`)
  }
}

console.log('\n=== Papiamentu golden suite ===\n')

console.log('URL preservation')
{
  const input =
    'Bo por bishitá e link aki: https://www.ennia.com/assets/img/logo.webp pa mas informashon.'
  const out = correctPapiamentu(input).corrected
  assertIncludes(out, 'https://www.ennia.com/assets/img/logo.webp', 'keeps ennia.com URL intact')
  assertNotIncludes(out, 'ennia.kom', 'does not rewrite .com → .kom')
}

console.log('\nIdentity / Ami ta Demi')
{
  assertIncludes(PA_WELCOME, 'Ami ta Demi', 'PA_WELCOME uses Ami ta Demi')
  assertNotIncludes(PA_WELCOME, 'Dami', 'PA_WELCOME does not say Dami')
  assertNotIncludes(PA_WELCOME, 'Mi ta Demi', 'PA_WELCOME uses Ami not Mi')
  assertEq(PA_AGENT_NAME, 'Demi', 'agent name is Demi')

  const fixed = correctPapiamentu('Bon dia! Mi ta Dami, bo asistente.').corrected
  assertIncludes(fixed, 'Ami ta Demi', 'Mi ta Dami → Ami ta Demi')

  const fixed2 = correctPapiamentu('Bon dia! Mi ta ENNIA Assistant, bo asistente.').corrected
  assertIncludes(fixed2, 'Ami ta Demi', 'ENNIA Assistant identity rewritten to Demi')
}

console.log('\nSpanish greetings & pronouns')
{
  assertEq(correctPapiamentu('Buenos dias').corrected, 'Bon dia', 'Buenos dias → Bon dia')
  assertIncludes(correctPapiamentu('mi por yuda bo').corrected, 'yudabo', 'yuda bo → yudabo')
  assertIncludes(correctPapiamentu('Por favor').corrected.toLowerCase(), 'por fabor', 'Por favor → Por fabor')
}

console.log('\nOrthography')
{
  const out = correctPapiamentu('informacion y obligacion').corrected.toLowerCase()
  assertIncludes(out, 'informashon', 'cion → shon')
  assertIncludes(out, 'obligashon', 'obligacion → obligashon')
}

console.log('\nConjunction scoping (y / of)')
{
  const pa = correctPapiamentu('Mi ta bai of bo ta keda aki i nos ta papia.').corrected.toLowerCase()
  assertIncludes(pa, 'òf', 'PA context: of → òf')

  const en = correctPapiamentu('Please click the link of the policy page.').corrected
  assertIncludes(en, ' of the ', 'EN fragment: of the preserved')
}

console.log('\nOutbound helper + placeholder')
{
  assertIncludes(ensurePapiamentuOutbound('Buenos dias! Mi ta Demi.'), 'Bon dia', 'outbound Spanish greeting')
  assertIncludes(ensurePapiamentuOutbound('Buenos dias! Mi ta Demi.'), 'Ami ta Demi', 'outbound Ami ta Demi')
  assert(PA_PLACEHOLDER.length > 0, 'placeholder non-empty')
  assertIncludes(PA_PLACEHOLDER.toLowerCase(), 'pregunta', 'placeholder is PA question prompt')
}

console.log('\nLexicon cleanliness')
{
  const set = getWordSet()
  assert(!set.has('- abò a yega di gana un kompetensia? kiko bo a gana?'), 'dirty OCR sentence not in wordset')
  assert(isKnownWord('demi'), 'demi is known word')
  assert(isKnownWord('ami'), 'ami is known word')
  assert(isKnownWord('yudabo'), 'yudabo is known or suffix-ok')
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
if (failed > 0) process.exit(1)
