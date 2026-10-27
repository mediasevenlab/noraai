import type { MeetingJob, MeetingSegment } from '../domain/transcript'

export type MeetingStatus = 'queued' | 'running' | 'ready' | 'failed'

export type StoredMeeting = {
  id: string
  userId: string
  title: string
  fileName: string
  status: MeetingStatus
  jobId: string | null
  speakers: number | null
  transcript: string
  segments: MeetingSegment[]
  error: string
  createdAt: Date
  updatedAt: Date
}

export type MeetingsRepository = {
  list(userId: string): Promise<StoredMeeting[]>
  find(userId: string, meetingId: string): Promise<StoredMeeting | null>
  create(input: {
    userId: string
    title: string
    fileName: string
    speakers: number | null
    status: MeetingStatus
    jobId: string | null
    error: string
  }): Promise<StoredMeeting>
  update(
    userId: string,
    meetingId: string,
    patch: Partial<Pick<StoredMeeting, 'status' | 'jobId' | 'title' | 'transcript' | 'segments' | 'error'>>,
  ): Promise<StoredMeeting | null>
  remove(userId: string, meetingId: string): Promise<boolean>
}

export type MeetingAudioStore = {
  save(meetingId: string, bytes: Buffer): Promise<void>
  read(meetingId: string): Promise<Buffer | null>
  has(meetingId: string): Promise<boolean>
  remove(meetingId: string): Promise<void>
}

export type MeetingTranscriber = {
  submit(file: { name: string; mime: string; bytes: Buffer }, speakers: number | null): Promise<string>
  status(jobId: string): Promise<MeetingJob>
  cancel?(jobId: string): Promise<void>
}
