import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { MeetingPartStore } from '../application/ports'

const segmentPattern = /^[A-Za-z0-9-]{1,80}$/

function segment(value: string) {
  if (!segmentPattern.test(value)) throw new Error('Загрузка не найдена')
  return value
}

export function createMeetingPartStore(root = path.join(process.cwd(), 'uploads', 'meetings')): MeetingPartStore {
  function incoming(userId: string) {
    return path.join(root, '.incoming', segment(userId))
  }

  function folder(userId: string, uploadId: string) {
    return path.join(incoming(userId), segment(uploadId))
  }

  function doneFile(userId: string, uploadId: string) {
    return path.join(incoming(userId), `${segment(uploadId)}.done`)
  }

  async function sweep(userId: string, keep: string) {
    const dir = incoming(userId)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    await Promise.all(entries.map(async (entry) => {
      if (entry.name === keep || entry.name === `${keep}.done`) return
      const full = path.join(dir, entry.name)
      try {
        const info = await stat(full)
        if (info.mtimeMs >= cutoff) return
        await rm(full, { recursive: true, force: true })
      } catch {
        // A leftover piece from a cancelled upload can wait for the next sweep.
      }
    }))
  }

  return {
    async save(userId, uploadId, index, bytes) {
      const dir = folder(userId, uploadId)
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, String(index)), bytes)
      await sweep(userId, segment(uploadId))
    },
    async read(userId, uploadId, index) {
      try {
        return await readFile(path.join(folder(userId, uploadId), String(index)))
      } catch {
        return null
      }
    },
    async finishedMeetingId(userId, uploadId) {
      try {
        const id = (await readFile(doneFile(userId, uploadId), 'utf8')).trim()
        return id || null
      } catch {
        return null
      }
    },
    async markFinished(userId, uploadId, meetingId) {
      await mkdir(incoming(userId), { recursive: true })
      await writeFile(doneFile(userId, uploadId), meetingId)
    },
    async removeChunks(userId, uploadId) {
      await rm(folder(userId, uploadId), { recursive: true, force: true })
    },
    async discard(userId, uploadId) {
      await rm(folder(userId, uploadId), { recursive: true, force: true })
      await rm(doneFile(userId, uploadId), { force: true })
    },
  }
}
