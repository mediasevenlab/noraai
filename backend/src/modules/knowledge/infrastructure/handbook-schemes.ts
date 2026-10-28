import { readFile } from 'node:fs/promises'
import path from 'node:path'

const FILES = path.join(import.meta.dir, '../../../../assets/knowledge/sprav/files')

const MIME: Record<string, string> = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** A scheme file name from the shipped handbook. Anything else is refused. */
export function schemeFileName(name: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(name)) return null
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (!MIME[ext]) return null
  return name
}

export async function readHandbookScheme(name: string) {
  const file = schemeFileName(name)
  if (!file) return null
  const full = path.resolve(FILES, file)
  if (path.dirname(full) !== path.resolve(FILES)) return null
  try {
    const bytes = await readFile(full)
    return { bytes, mime: MIME[file.toLowerCase().split('.').pop() ?? ''] ?? 'application/octet-stream' }
  } catch {
    return null
  }
}
