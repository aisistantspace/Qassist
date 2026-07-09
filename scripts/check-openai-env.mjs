#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
    process.env[key] = val
  }
}
const key = process.env.OPENAI_API_KEY || ''
console.log(key.length > 20 ? `OPENAI_API_KEY ok (${key.length} chars)` : 'OPENAI_API_KEY missing or too short')
process.exit(key.length > 20 ? 0 : 1)
