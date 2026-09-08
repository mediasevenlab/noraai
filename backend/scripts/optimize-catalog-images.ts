import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { encodeJpeg, encodeWebp } from '../src/modules/meals/infrastructure/sharp-meal-image'

const catalogRoots = [
  path.resolve(import.meta.dir, '../../webapp/public/diary'),
  path.resolve(import.meta.dir, '../../webapp/public/rations'),
]

const cardSpec = { maxEdge: 480, quality: 72, effort: 6 }
const fullSpec = { maxEdge: 960, quality: 78, effort: 6 }
const jpegSpec = { maxEdge: 1280, quality: 80, effort: 6 }

async function listJpegFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listJpegFiles(absolute)))
      continue
    }
    if (/\.jpe?g$/i.test(entry.name) && !entry.name.startsWith('.')) {
      files.push(absolute)
    }
  }
  return files
}

async function optimizeFile(file: string) {
  const original = await readFile(file)
  const cardPath = file.replace(/\.[^.]+$/, '.card.webp')
  const webpPath = file.replace(/\.[^.]+$/, '.webp')
  const card = await encodeWebp(original, cardSpec)
  const full = await encodeWebp(original, fullSpec)
  const jpeg = await encodeJpeg(original, jpegSpec)
  await writeFile(cardPath, card)
  await writeFile(webpPath, full)
  const jpegOut = jpeg.length < original.length ? jpeg : original
  if (jpegOut !== original) await writeFile(file, jpegOut)
  return {
    file: path.basename(file),
    original: original.length,
    jpeg: jpegOut.length,
    card: card.length,
    webp: full.length,
  }
}

const files = (await Promise.all(catalogRoots.map((dir) => listJpegFiles(dir)))).flat().sort()
if (files.length === 0) {
  throw new Error('No catalog JPEGs found')
}

let originalTotal = 0
let outputTotal = 0
for (const file of files) {
  const result = await optimizeFile(file)
  originalTotal += result.original
  outputTotal += result.jpeg + result.card + result.webp
  const before = (result.original / 1024).toFixed(1)
  const card = (result.card / 1024).toFixed(1)
  const webp = (result.webp / 1024).toFixed(1)
  const jpeg = (result.jpeg / 1024).toFixed(1)
  console.log(`${result.file}: ${before}KB → jpg ${jpeg}KB, card ${card}KB, webp ${webp}KB`)
}

console.log(
  `optimized ${files.length} images, source ${(originalTotal / 1024).toFixed(0)}KB, written ${(outputTotal / 1024).toFixed(0)}KB including variants`,
)
