#!/usr/bin/env node
/**
 * Extract text from Grande 3–6 school book photos (Fiesta di idioma series).
 * Uses OpenAI vision → structured JSON per page for merge script.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BOOK_DIR = path.join(ROOT, 'Papiamentu book images')
const EXTRACT_DIR = path.join(ROOT, 'lib', 'papiamentu', 'data', 'book-extract')
const PAGES_DIR = path.join(EXTRACT_DIR, 'pages')
const MANIFEST_PATH = path.join(EXTRACT_DIR, 'manifest.json')

const EXTRACTION_PROMPT = `You extract text from a photo of a Curaçao Papiamentu SCHOOL book page.

Context: These are official primary-school books "Fiesta di idioma" for Grande (grade) 3, 4, 5, and 6.
They teach correct Curaçao Papiamentu orthography (FPI / Buki di Oro style): reading, conversation, vocabulary, grammar.

Return ONLY valid JSON (no markdown):
{
  "page_type": "vocabulary_list|reading|conversation|grammar|exercise|comprehension|cover|index|other",
  "book_series": "Fiesta di idioma",
  "grade": "3|4|5|6|null",
  "theme": "Tema N title or null",
  "week": "Siman N or null",
  "section": "Skucha i papia|Mi por lesa|Bo a komprendé|vocabulary|Regla di kòmbersashon|null",
  "page_numbers": ["4","5"],
  "words": [{"word": "full papiamentu entry", "level": "A1|A2|B1|B2|C1|C2|D1|D2|E1|E2|null"}],
  "phrases": ["complete sentences or bullet points in Papiamentu"],
  "conversation_rules": ["Regla di kòmbersashon lines — full rule text"],
  "grammar_rules": ["orthography or grammar instruction lines"],
  "paragraphs": ["reading passage paragraphs — full text"],
  "questions": ["comprehension questions if present"],
  "raw_text": "ALL readable text verbatim, preserve line breaks"
}

CRITICAL rules:
- Preserve Curaçao spelling exactly: è ò ù ü ñ and acute accents á é í ó ú.
- Use "i" not Spanish "y" for "and".
- Vocabulary lines like "transformá, C1" or "trapa awa, A2" → words array (multi-word entries stay together).
- "Skucha i papia" bullets → phrases array.
- "Mi por lesa" reading text → paragraphs array AND split key sentences into phrases.
- "Regla di kòmbersashon" box → conversation_rules array.
- Grammar/orthography instructions → grammar_rules array.
- Do NOT translate to Dutch or English.
- If unreadable: page_type "other", empty arrays.
`

function loadEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, envFile)
    if (!fs.existsSync(envPath)) continue
    const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      // Prefer .env.local over empty inherited env vars
      if (!process.env[key] || key === 'OPENAI_API_KEY') {
        process.env[key] = val
      }
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { limit: Infinity, start: 0, resume: false, model: 'gpt-4o-mini' }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10)
    else if (args[i] === '--start') opts.start = parseInt(args[++i], 10)
    else if (args[i] === '--resume') opts.resume = true
    else if (args[i] === '--model') opts.model = args[++i]
  }
  return opts
}

function listImages() {
  if (!fs.existsSync(BOOK_DIR)) {
    console.error('Book folder not found:', BOOK_DIR)
    process.exit(1)
  }
  return fs
    .readdirSync(BOOK_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
}

async function resizeForVision(inputPath) {
  const buf = await sharp(inputPath)
    .rotate()
    .resize({ width: 1600, height: 2200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  return buf.toString('base64')
}

async function extractPage(client, imagePath, model, attempt = 1) {
  const b64 = await resizeForVision(imagePath)
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all Papiamentu text from this Grande 3-6 school book page.' },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' },
          },
        ],
      },
    ],
  })
  const content = response.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(content)
  } catch (parseErr) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000))
      return extractPage(client, imagePath, model, attempt + 1)
    }
    // Last resort: wrap raw text only
    return {
      page_type: 'other',
      book_series: 'Fiesta di idioma',
      grade: null,
      raw_text: content.slice(0, 50000),
      words: [],
      phrases: [],
      conversation_rules: [],
      grammar_rules: [],
      paragraphs: [],
      _parse_error: String(parseErr.message || parseErr),
    }
  }
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { started_at: null, updated_at: null, total_images: 0, processed: 0, pages: [] }
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}

function saveManifest(manifest) {
  manifest.updated_at = new Date().toISOString()
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8')
}

async function main() {
  loadEnv()
  const opts = parseArgs()

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is required (set in .env.local)')
    process.exit(1)
  }

  fs.mkdirSync(PAGES_DIR, { recursive: true })

  const images = listImages()
  const slice = images.slice(opts.start, opts.start + opts.limit)
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const manifest = loadManifest()
  manifest.total_images = images.length
  manifest.source = 'Fiesta di idioma — Grande 3-6 school books'
  if (!manifest.started_at) manifest.started_at = new Date().toISOString()

  console.log(`Grande 3-6 school books: ${images.length} images, processing ${slice.length}`)

  let done = 0
  let skipped = 0

  for (let i = 0; i < slice.length; i++) {
    const file = slice[i]
    const globalIndex = opts.start + i
    const outName = `${String(globalIndex + 1).padStart(4, '0')}_${file.replace(/\.[^.]+$/, '')}.json`
    const outPath = path.join(PAGES_DIR, outName)

    if (opts.resume && fs.existsSync(outPath)) {
      skipped++
      continue
    }

    const imagePath = path.join(BOOK_DIR, file)
    process.stdout.write(`[${globalIndex + 1}/${images.length}] ${file} ... `)

    try {
      const extracted = await extractPage(client, imagePath, opts.model)
      const record = {
        index: globalIndex + 1,
        source_file: file,
        extracted_at: new Date().toISOString(),
        ...extracted,
      }
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2), 'utf8')

      const existing = manifest.pages.findIndex((p) => p.source_file === file)
      const entry = {
        index: globalIndex + 1,
        source_file: file,
        output_file: outName,
        page_type: extracted.page_type || 'other',
        grade: extracted.grade || null,
        section: extracted.section || null,
        word_count: (extracted.words || []).length,
        phrase_count: (extracted.phrases || []).length,
      }
      if (existing >= 0) manifest.pages[existing] = entry
      else manifest.pages.push(entry)

      manifest.processed = manifest.pages.length
      saveManifest(manifest)
      done++
      console.log(`ok (G${extracted.grade || '?'}, ${extracted.page_type})`)
    } catch (err) {
      console.log('FAILED:', err.message)
      fs.writeFileSync(
        path.join(PAGES_DIR, `${outName}.error.txt`),
        String(err.stack || err),
        'utf8'
      )
    }

    await new Promise((r) => setTimeout(r, 350))
  }

  console.log(`\nDone: ${done} extracted, ${skipped} skipped.`)
  console.log('Next: npm run pa:merge-book')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
