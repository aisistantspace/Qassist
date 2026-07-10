import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const DATA_DIR = path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'book-extract')

function readJsonSafe(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

export async function GET() {
  const manifest = readJsonSafe(path.join(DATA_DIR, 'manifest.json'))
  const mergeReport = readJsonSafe(path.join(DATA_DIR, 'merge-report.json'))
  const bookVocab = readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'school-grande-vocabulary.json'))
    || readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'book-vocabulary.json'))
  const schoolPhrases = readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'school-grande-phrases.json'))
    || readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'fiesta-phrases.json'))
  const schoolGrammar = readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'school-grande-grammar.json'))
  const teacherGuide = readJsonSafe(path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'school-teacher-guide.json'))

  const imageDir = path.join(process.cwd(), 'Papiamentu book images')
  let imageCount = 0
  if (fs.existsSync(imageDir)) {
    imageCount = fs.readdirSync(imageDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length
  }

  let pageFiles = 0
  const pagesDir = path.join(DATA_DIR, 'pages')
  if (fs.existsSync(pagesDir)) {
    pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json')).length
  }

  return NextResponse.json({
    imageCount,
    extractedPages: pageFiles,
    manifest,
    mergeReport,
    bookVocabulary: {
      word_count: bookVocab?.metadata?.word_count ?? bookVocab?.words?.length ?? 0,
      merged_at: bookVocab?.metadata?.merged_at ?? null,
      grades: bookVocab?.metadata?.grades ?? ['3', '4', '5', '6'],
    },
    schoolPhrases: {
      phrase_count: schoolPhrases?.metadata?.phrase_count ?? schoolPhrases?.phrases?.length ?? 0,
      conversation_rules: schoolPhrases?.conversation_rules?.length ?? 0,
      merged_at: schoolPhrases?.metadata?.merged_at ?? null,
    },
    schoolGrammar: {
      rule_count: schoolGrammar?.metadata?.rule_count ?? schoolGrammar?.rules?.length ?? 0,
      merged_at: schoolGrammar?.metadata?.merged_at ?? null,
    },
    teacherGuide: {
      lesson_objectives: teacherGuide?.metadata?.lesson_objective_count ?? teacherGuide?.lesson_objectives?.length ?? 0,
      orthography_points: teacherGuide?.metadata?.orthography_teaching_count ?? teacherGuide?.orthography_teaching?.length ?? 0,
      teaching_notes: teacherGuide?.metadata?.teaching_note_count ?? teacherGuide?.teaching_notes?.length ?? 0,
      merged_at: teacherGuide?.metadata?.merged_at ?? null,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || 'merge'

    if (action !== 'merge') {
      return NextResponse.json(
        {
          error:
            'Only merge is supported via API. Run extraction locally: npm run pa:extract-book',
        },
        { status: 400 }
      )
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'merge-papiamentu-book-extract.mjs')
    const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
      cwd: process.cwd(),
      timeout: 120000,
    })

    const mergeReport = readJsonSafe(path.join(DATA_DIR, 'merge-report.json'))

    return NextResponse.json({
      success: true,
      message: 'Book extract merged into Papiamentu layer',
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      mergeReport,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Merge failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
