import { expect, test } from 'bun:test'

import type { MeetingJob } from '../domain/transcript'
import type { MeetingAudioStore, MeetingTranscriber, MeetingsRepository, StoredMeeting } from './ports'
import { createMeetingsService } from './meetings-service'

function job(partial: Partial<MeetingJob> & Pick<MeetingJob, 'status'>): MeetingJob {
  return {
    transcript: '',
    segments: [],
    error: '',
    stage: partial.status,
    progress: partial.status === 'ready' ? 100 : 0,
    etaSeconds: null,
    elapsedSeconds: null,
    steps: [],
    ...partial,
  }
}

function memoryAudio(): MeetingAudioStore & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>()
  return {
    files,
    async save(meetingId, bytes) {
      files.set(meetingId, Buffer.from(bytes))
    },
    async read(meetingId) {
      return files.get(meetingId) ?? null
    },
    async has(meetingId) {
      return files.has(meetingId)
    },
    async remove(meetingId) {
      files.delete(meetingId)
    },
  }
}

function memoryRepository(): MeetingsRepository & { rows: StoredMeeting[] } {
  const rows: StoredMeeting[] = []
  return {
    rows,
    async list(userId) {
      return rows.filter((row) => row.userId === userId)
    },
    async find(userId, meetingId) {
      return rows.find((row) => row.userId === userId && row.id === meetingId) ?? null
    },
    async create(input) {
      const now = new Date('2026-10-26T08:00:00.000Z')
      const row: StoredMeeting = {
        id: `00000000-0000-7000-8000-00000000000${rows.length + 1}`,
        userId: input.userId,
        title: input.title,
        fileName: input.fileName,
        status: input.status,
        jobId: input.jobId,
        speakers: input.speakers,
        transcript: '',
        segments: [],
        error: input.error,
        createdAt: now,
        updatedAt: now,
      }
      rows.push(row)
      return row
    },
    async update(userId, meetingId, patch) {
      const row = rows.find((item) => item.userId === userId && item.id === meetingId)
      if (!row) return null
      Object.assign(row, patch, { updatedAt: new Date('2026-10-26T08:05:00.000Z') })
      return row
    },
    async remove(userId, meetingId) {
      const index = rows.findIndex((item) => item.userId === userId && item.id === meetingId)
      if (index < 0) return false
      rows.splice(index, 1)
      return true
    },
  }
}

test('an audio file becomes a queued meeting and later the speaker text', async () => {
  const repository = memoryRepository()
  let stored = false
  const transcriber: MeetingTranscriber = {
    async submit() {
      stored = true
      return 'job-7'
    },
    async status() {
      return job({
        status: 'ready',
        transcript: '[00:00:01] Спикер 1: Добрый день',
        segments: [{ speaker: 'Спикер 1', start: 1, end: 4, text: 'Добрый день' }],
      })
    },
  }
  const service = createMeetingsService({ repository, transcriber })
  const created = await service.submit('user-1', { name: 'Планёрка.mp3', mime: 'audio/mpeg', bytes: Buffer.from('audio') }, '2')
  expect(stored).toBe(true)
  expect(created.title).toBe('Планёрка')
  const named = await service.submit(
    'user-1',
    { name: 'Планёрка.mp3', mime: 'audio/mpeg', bytes: Buffer.from('audio') },
    null,
    'Собрание отдела',
  )
  expect(named.title).toBe('Собрание отдела')
  expect(created.status).toBe('queued')
  expect(created.speakers).toBe(2)
  const opened = await service.get('user-1', created.id)
  expect(opened.status).toBe('ready')
  expect(opened.transcript).toBe('[00:00:01] Спикер 1: Добрый день')
  expect(opened.segments).toHaveLength(1)
})

test('a text file never reaches the transcription queue', async () => {
  const service = createMeetingsService({
    repository: memoryRepository(),
    transcriber: {
      async submit() {
        throw new Error('should not submit')
      },
      async status() {
        throw new Error('should not poll')
      },
    },
  })
  await expect(
    service.submit('user-1', { name: 'notes.txt', mime: 'text/plain', bytes: Buffer.from('hi') }, null),
  ).rejects.toThrow('mp3, m4a, wav или webm')
})

test('another person cannot open the meeting', async () => {
  const repository = memoryRepository()
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job'
      },
      async status() {
        return job({ status: 'queued' })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  await expect(service.get('user-2', created.id)).rejects.toThrow('не найдена')
})

test('a running transcript reports percent and remaining time without waiting for the text', async () => {
  const repository = memoryRepository()
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job-live'
      },
      async status() {
        return job({ status: 'running', stage: 'transcribing', progress: 40, etaSeconds: 120 })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  const opened = await service.get('user-1', created.id)
  expect(opened.status).toBe('running')
  expect(opened.stage).toBe('transcribing')
  expect(opened.progress).toBe(40)
  expect(opened.etaSeconds).toBe(120)
  expect(opened.transcript).toBe('')
  expect(opened.steps.find((step) => step.id === 'transcribing')?.state).toBe('current')
})

test('a finished speaker name is replaced in every line', async () => {
  const repository = memoryRepository()
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job-name'
      },
      async status() {
        return job({
          status: 'ready',
          transcript: '[00:00:01] Спикер 1: Добрый день',
          segments: [{ speaker: 'Спикер 1', start: 1, end: 4, text: 'Добрый день' }],
        })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  const opened = await service.get('user-1', created.id)
  const renamed = await service.renameSpeaker('user-1', opened.id, 'Спикер 1', 'Сурдин')
  expect(renamed.segments[0]?.speaker).toBe('Сурдин')
  expect(renamed.transcript).toContain('Сурдин: Добрый день')
  const again = await service.get('user-1', opened.id)
  expect(again.segments[0]?.speaker).toBe('Сурдин')
})

test('the title changes for the owner and the chat reads only that ready transcript', async () => {
  const repository = memoryRepository()
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job-title'
      },
      async status() {
        return job({ status: 'queued' })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  const renamed = await service.renameTitle('user-1', created.id, '  Разговор о Луне  ')
  expect(renamed.title).toBe('Разговор о Луне')
  await expect(service.renameTitle('user-2', created.id, 'Чужое')).rejects.toThrow('не найдена')
  await expect(service.renameTitle('user-1', created.id, '   ')).rejects.toThrow('Название')
  await repository.update('user-1', created.id, {
    status: 'ready',
    segments: [{ speaker: 'Спикер 1', start: 1, end: 4, text: 'Никто не высаживался на Луну.' }],
    transcript: 'Луна',
  })
  const other = await service.submit('user-2', { name: 'b.wav', mime: 'audio/wav', bytes: Buffer.from('y') }, null)
  await repository.update('user-2', other.id, {
    status: 'ready',
    segments: [{ speaker: 'Спикер 1', start: 1, end: 3, text: 'Секретный бюджет.' }],
    transcript: 'бюджет',
  })
  const context = await service.chatContext('user-1', [created.id, other.id], 'Кто говорил про Луну?')
  expect(context).toContain('Разговор о Луне')
  expect(context).toContain('высаживался')
  expect(context).not.toContain('бюджет')
})

test('a saved recording can be downloaded and transcribed again', async () => {
  const repository = memoryRepository()
  const audio = memoryAudio()
  const submitted: Buffer[] = []
  const service = createMeetingsService({
    repository,
    audio,
    transcriber: {
      async submit(file) {
        submitted.push(file.bytes)
        return `job-${submitted.length}`
      },
      async status() {
        return job({ status: 'queued' })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'Планёрка.mp3', mime: 'audio/mpeg', bytes: Buffer.from('audio') }, null)
  expect(created.hasAudio).toBe(true)
  const downloaded = await service.readAudio('user-1', created.id)
  expect(downloaded.bytes.toString()).toBe('audio')
  expect(downloaded.fileName).toBe('Планёрка.mp3')
  await repository.update('user-1', created.id, {
    status: 'ready',
    transcript: 'старый текст',
    segments: [{ speaker: 'Спикер 1', start: 0, end: 1, text: 'старый текст' }],
  })
  const again = await service.retry('user-1', created.id)
  expect(again.status).toBe('queued')
  expect(again.transcript).toBe('')
  expect(again.segments).toEqual([])
  expect(submitted[1]?.toString()).toBe('audio')
  await expect(service.retry('user-1', created.id)).rejects.toThrow('остановите')
})

test('a meeting without a saved recording cannot be transcribed again', async () => {
  const repository = memoryRepository()
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job'
      },
      async status() {
        return job({ status: 'queued' })
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  expect(created.hasAudio).toBe(false)
  await repository.update('user-1', created.id, { status: 'ready' })
  await expect(service.retry('user-1', created.id)).rejects.toThrow('не сохранилась')
})

test('stopping a running transcript marks it interrupted and asks the worker to stop', async () => {
  const repository = memoryRepository()
  const cancelled: string[] = []
  const service = createMeetingsService({
    repository,
    transcriber: {
      async submit() {
        return 'job-live'
      },
      async status() {
        return job({ status: 'running' })
      },
      async cancel(jobId) {
        cancelled.push(jobId)
      },
    },
  })
  const created = await service.submit('user-1', { name: 'a.wav', mime: 'audio/wav', bytes: Buffer.from('x') }, null)
  const stopped = await service.cancel('user-1', created.id)
  expect(cancelled).toEqual(['job-live'])
  expect(stopped.status).toBe('failed')
  expect(stopped.error).toBe('Расшифровка прервана')
  const opened = await service.get('user-1', created.id)
  expect(opened.status).toBe('failed')
})
