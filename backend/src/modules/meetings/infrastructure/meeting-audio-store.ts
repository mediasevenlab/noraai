import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { MeetingAudioStore } from '../application/ports'

export function createMeetingAudioStore(root = path.join(process.cwd(), 'uploads', 'meetings')): MeetingAudioStore {
  function file(meetingId: string) {
    return path.join(root, meetingId)
  }

  return {
    async save(meetingId, bytes) {
      await mkdir(root, { recursive: true })
      await writeFile(file(meetingId), bytes)
    },
    async read(meetingId) {
      try {
        return await readFile(file(meetingId))
      } catch {
        return null
      }
    },
    async has(meetingId) {
      try {
        await access(file(meetingId))
        return true
      } catch {
        return false
      }
    },
    async remove(meetingId) {
      await rm(file(meetingId), { force: true })
    },
  }
}
