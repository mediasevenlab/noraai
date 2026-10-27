import { Prisma } from '../../../generated/prisma/client'
import type { DbClient } from '../../../db'
import type { MeetingsRepository, StoredMeeting } from '../application/ports'
import { normalizeMeetingSegments } from '../domain/transcript'

type MeetingRow = {
  id: string
  userId: string
  title: string
  fileName: string
  status: StoredMeeting['status']
  jobId: string | null
  speakers: number | null
  transcript: string
  segments: unknown
  error: string
  createdAt: Date
  updatedAt: Date
}

function toStored(row: MeetingRow): StoredMeeting {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    fileName: row.fileName,
    status: row.status,
    jobId: row.jobId,
    speakers: row.speakers,
    transcript: row.transcript,
    segments: normalizeMeetingSegments(row.segments),
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function createMeetingsRepository(db: DbClient): MeetingsRepository {
  return {
    async list(userId) {
      const rows = await db.meeting.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })
      return rows.map((row) => toStored(row))
    },
    async find(userId, meetingId) {
      const row = await db.meeting.findFirst({ where: { id: meetingId, userId } })
      return row ? toStored(row) : null
    },
    async create(input) {
      const row = await db.meeting.create({
        data: {
          userId: input.userId,
          title: input.title,
          fileName: input.fileName,
          speakers: input.speakers,
          status: input.status,
          jobId: input.jobId,
          error: input.error,
        },
      })
      return toStored(row)
    },
    async update(userId, meetingId, patch) {
      const owned = await db.meeting.findFirst({ where: { id: meetingId, userId }, select: { id: true } })
      if (!owned) return null
      const row = await db.meeting.update({
        where: { id: meetingId },
        data: {
          status: patch.status,
          jobId: patch.jobId,
          title: patch.title,
          transcript: patch.transcript,
          error: patch.error,
          segments: patch.segments === undefined ? undefined : (patch.segments as Prisma.InputJsonValue),
        },
      })
      return toStored(row)
    },
    async claimJob(userId, meetingId, jobId) {
      const result = await db.meeting.updateMany({
        where: { id: meetingId, userId, status: { in: ['queued', 'running'] } },
        data: { jobId, status: 'queued', error: '' },
      })
      return result.count > 0
    },
    async remove(userId, meetingId) {
      const result = await db.meeting.deleteMany({ where: { id: meetingId, userId } })
      return result.count > 0
    },
  }
}
