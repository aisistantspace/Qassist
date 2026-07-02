import path from 'path'
import fs from 'fs'

export interface InsuranceKbEntry {
  title: string
  content: string
  tags: string[]
}

interface InsuranceVocabFile {
  demo_phrases?: string[]
  kb_glossary?: InsuranceKbEntry[]
}

let cached: InsuranceVocabFile | null = null

function loadInsuranceVocab(): InsuranceVocabFile {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'lib', 'papiamentu', 'data', 'insurance-vocabulary.json')
  cached = JSON.parse(fs.readFileSync(filePath, 'utf8')) as InsuranceVocabFile
  return cached
}

export const INSURANCE_PA_KB_ENTRIES: InsuranceKbEntry[] = loadInsuranceVocab().kb_glossary || []

export function getInsuranceDemoPhrases(): string[] {
  return loadInsuranceVocab().demo_phrases || []
}
