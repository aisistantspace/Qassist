#!/usr/bin/env node
/**
 * Builds wordlist.json from Buki di oro word list.
 * Usage: node scripts/build-papiamentu-wordlist.js [path-to-buki_di_oro_word_list.json]
 * Or set PAPIAMENTU_SOURCE_DIR to the directory containing buki_di_oro_word_list.json
 */
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const defaultSourcePath = path.join(
  projectRoot,
  '..', 'Kompai Gov AI', 'Papiamentu Controll check sys', 'buki_di_oro_word_list.json'
)
const sourcePath = process.argv[2] || process.env.PAPIAMENTU_SOURCE_PATH || defaultSourcePath
const outPath = path.join(projectRoot, 'lib', 'papiamentu', 'data', 'wordlist.json')

if (!fs.existsSync(sourcePath)) {
  console.error('Source file not found:', sourcePath)
  console.error('Usage: node scripts/build-papiamentu-wordlist.js <path-to-buki_di_oro_word_list.json>')
  process.exit(1)
}

console.log('Reading', sourcePath)
const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))

const words = new Set()
for (const key of Object.keys(data)) {
  if (key.length !== 1 || !Array.isArray(data[key])) continue
  for (const entry of data[key]) {
    if (!entry || typeof entry.word !== 'string') continue
    const w = entry.word.trim()
    if (!w) continue
    words.add(w.toLowerCase())
    if (w.endsWith('nan') && w.length > 4) {
      const base = w.slice(0, -3).toLowerCase()
      if (base) words.add(base)
    }
  }
}

const sorted = [...words].sort()
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(sorted), 'utf8')
console.log('Wrote', sorted.length, 'words to', outPath)
