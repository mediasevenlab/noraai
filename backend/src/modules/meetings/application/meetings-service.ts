import type { MeetingSummary } from '@web-app-demo/contracts'

import { MeetingFailure } from '../domain/errors'
import {
  acceptedMeetingAudio,
  chosenMeetingTitle,
  cleanMeetingTitle,
  formatMeetingTranscript,
  meetingChatContext,
  meetingSpeakerCount,
  meetingStepsForStage,
  renameMeetingSpeaker,
  type MeetingJob,
  type MeetingSegment,
  type MeetingStep,
} from '../domain/transcript'
import type { MeetingAudioStore, MeetingTranscriber, MeetingsRepository, StoredMeeting } from './ports'

const maxAudioBytes = 256 * 1024 * 1024

type MeetingView = StoredMeeting & {
  stage: string
  progress: number
  etaSeconds: number | null
  elapsedSeconds: number | null
  steps: MeetingStep[]
}

function storedProgress(meeting: StoredMeeting): Pick<MeetingView, 'stage' | 'progress' | 'etaSeconds' | 'elapsedSeconds' | 'steps'> {
  if (meeting.status === 'ready') return { stage: 'ready', progress: 100, etaSeconds: 0, elapsedSeconds: null, steps: [] }
  if (meeting.status === 'failed') return { stage: 'failed', progress: 0, etaSeconds: null, elapsedSeconds: null, steps: [] }
  if (meeting.status === 'queued') {
    return { stage: 'queued', progress: 0, etaSeconds: null, elapsedSeconds: 0, steps: meetingStepsForStage('queued') }
  }
  return { stage: 'running', progress: 0, etaSeconds: null, elapsedSeconds: null, steps: meetingStepsForStage('running') }
}

function liveProgress(job: MeetingJob): Pick<MeetingView, 'stage' | 'progress' | 'etaSeconds' | 'elapsedSeconds' | 'steps'> {
  const stage = job.stage || job.status
  return {
    stage,
    progress: job.progress,
    etaSeconds: job.etaSeconds,
    elapsedSeconds: job.elapsedSeconds,
    steps:
      job.steps.length > 0
        ? job.steps
        : stage === 'ready' || stage === 'failed'
          ? []
          : meetingStepsForStage(stage),
  }
}

function summary(meeting: MeetingView): MeetingSummary {
  return {
    id: meeting.id,
    title: meeting.title,
    fileName: meeting.fileName,
    status: meeting.status,
    speakers: meeting.speakers,
    stage: meeting.stage,
    progress: meeting.progress,
    etaSeconds: meeting.etaSeconds,
    error: meeting.error,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  }
}

function detail(meeting: MeetingView) {
  return {
    ...summary(meeting),
    transcript: meeting.transcript,
    segments: meeting.segments,
    elapsedSeconds: meeting.elapsedSeconds,
    steps: meeting.steps,
  }
}

function audioMime(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4'
  if (ext === 'webm') return 'audio/webm'
  if (ext === 'ogg') return 'audio/ogg'
  if (ext === 'aac') return 'audio/aac'
  return 'application/octet-stream'
}

const missingRecording = 'Запись не сохранилась, загрузите её ещё раз'
const stoppedTranscript = 'Расшифровка прервана'

const pendingTranscriptions = new Set<Promise<void>>()

/** Tests wait until a recording has been handed to the worker. */
export async function settleMeetingTranscriptions() {
  while (pendingTranscriptions.size > 0) {
    await Promise.all([...pendingTranscriptions])
  }
}

function trackTranscription(work: Promise<void>) {
  const tracked = work.then(
    () => undefined,
    () => undefined,
  )
  pendingTranscriptions.add(tracked)
  void tracked.finally(() => {
    pendingTranscriptions.delete(tracked)
  })
}

export function createMeetingsService(options: {
  repository: MeetingsRepository
  transcriber?: MeetingTranscriber
  audio?: MeetingAudioStore
}) {
  async function present(meeting: MeetingView) {
    return {
      ...detail(meeting),
      hasAudio: options.audio ? await options.audio.has(meeting.id) : false,
    }
  }
  async function refresh(meeting: StoredMeeting): Promise<MeetingView> {
    const current = { ...meeting, ...storedProgress(meeting) }
    if (!options.transcriber || !meeting.jobId) return current
    if (meeting.status !== 'queued' && meeting.status !== 'running') return current
    try {
      const job = await options.transcriber.status(meeting.jobId)
      const latest = await options.repository.find(meeting.userId, meeting.id)
      if (latest?.status === 'failed' && latest.error === 'Расшифровка прервана') {
        return { ...latest, ...storedProgress(latest) }
      }
      const live = { ...current, ...liveProgress(job), transcript: job.transcript, segments: job.segments }
      if (job.status === meeting.status && !job.transcript && !job.error) return live
      const next = await options.repository.update(meeting.userId, meeting.id, {
        status: job.status,
        transcript: job.transcript,
        segments: job.segments,
        error: job.status === 'failed' ? job.error || 'Расшифровка не получилась' : '',
      })
      return { ...(next ?? meeting), ...liveProgress(job), status: job.status, transcript: job.transcript, segments: job.segments }
    } catch {
      return current
    }
  }

  async function stopWorker(jobId: string) {
    try {
      await options.transcriber?.cancel?.(jobId)
    } catch {
      // The card already stopped, or the meeting is gone.
    }
  }

  function handOff(
    userId: string,
    meetingId: string,
    file: { name: string; mime: string; bytes: Buffer },
    speakers: number | null,
  ) {
    const transcriber = options.transcriber
    if (!transcriber) return
    trackTranscription((async () => {
      let jobId = ''
      try {
        jobId = await transcriber.submit(file, speakers)
      } catch (error) {
        const latest = await options.repository.find(userId, meetingId)
        if (!latest || latest.status === 'failed') return
        const message = error instanceof Error ? error.message : 'Сервис расшифровки не ответил'
        await options.repository.update(userId, meetingId, { status: 'failed', error: message })
        return
      }
      const claimed = await options.repository.claimJob(userId, meetingId, jobId)
      if (!claimed) await stopWorker(jobId)
    })())
  }

  return {
    async list(userId: string) {
      const meetings = await options.repository.list(userId)
      const refreshed = await Promise.all(meetings.map((meeting) => refresh(meeting)))
      return { meetings: refreshed.map(summary) }
    },
    async get(userId: string, meetingId: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      return present(await refresh(meeting))
    },
    async renameSpeaker(userId: string, meetingId: string, from: string, to: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      if (meeting.status !== 'ready') throw new MeetingFailure('bad_request', 'Имя можно задать, когда текст готов')
      let segments: MeetingSegment[]
      try {
        segments = renameMeetingSpeaker(meeting.segments, from, to)
      } catch (error) {
        throw new MeetingFailure('bad_request', error instanceof Error ? error.message : 'Введите имя спикера')
      }
      const updated = await options.repository.update(userId, meetingId, {
        transcript: formatMeetingTranscript(segments),
        segments,
      })
      const row = updated ?? { ...meeting, segments, transcript: formatMeetingTranscript(segments) }
      return present({ ...row, ...storedProgress(row) })
    },
    async renameTitle(userId: string, meetingId: string, title: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      let next: string
      try {
        next = cleanMeetingTitle(title)
      } catch (error) {
        throw new MeetingFailure('bad_request', error instanceof Error ? error.message : 'Введите название')
      }
      const updated = await options.repository.update(userId, meetingId, { title: next })
      const row = updated ?? { ...meeting, title: next }
      return present({ ...row, ...storedProgress(row) })
    },
    async chatContext(userId: string, meetingIds: readonly string[], query: string) {
      const ids = [...new Set(meetingIds)].slice(0, 1)
      const rows = []
      for (const meetingId of ids) {
        const meeting = await options.repository.find(userId, meetingId)
        if (meeting?.status === 'ready') rows.push({ title: meeting.title, segments: meeting.segments })
      }
      return meetingChatContext(rows, query)
    },
    async remove(userId: string, meetingId: string) {
      const removed = await options.repository.remove(userId, meetingId)
      if (!removed) throw new MeetingFailure('not_found', 'Встреча не найдена')
      await options.audio?.remove(meetingId)
      return { ok: true as const }
    },
    async readAudio(userId: string, meetingId: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      const bytes = options.audio ? await options.audio.read(meetingId) : null
      if (!bytes) throw new MeetingFailure('bad_request', missingRecording)
      return { bytes, fileName: meeting.fileName, mime: audioMime(meeting.fileName) }
    },
    async retry(userId: string, meetingId: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      if (meeting.status === 'queued' || meeting.status === 'running') {
        throw new MeetingFailure('bad_request', 'Сначала остановите расшифровку')
      }
      if (!options.transcriber) throw new MeetingFailure('unavailable', 'Сервис расшифровки не настроен')
      const bytes = options.audio ? await options.audio.read(meetingId) : null
      if (!bytes) throw new MeetingFailure('bad_request', missingRecording)
      const jobId = await options.transcriber.submit(
        { name: meeting.fileName, mime: audioMime(meeting.fileName), bytes },
        meeting.speakers,
      )
      const updated = await options.repository.update(userId, meetingId, {
        status: 'queued',
        jobId,
        transcript: '',
        segments: [],
        error: '',
      })
      const row = updated ?? { ...meeting, status: 'queued' as const, jobId, transcript: '', segments: [], error: '' }
      return present({ ...row, ...storedProgress(row) })
    },
    async cancel(userId: string, meetingId: string) {
      const meeting = await options.repository.find(userId, meetingId)
      if (!meeting) throw new MeetingFailure('not_found', 'Встреча не найдена')
      if (meeting.status !== 'queued' && meeting.status !== 'running') {
        return present({ ...meeting, ...storedProgress(meeting) })
      }
      if (meeting.jobId) {
        try {
          await options.transcriber?.cancel?.(meeting.jobId)
        } catch {
          // The card still stops. A later poll must not bring the job back.
        }
      }
      const updated = await options.repository.update(userId, meetingId, {
        status: 'failed',
        error: stoppedTranscript,
      })
      const row = updated ?? { ...meeting, status: 'failed' as const, error: stoppedTranscript }
      return present({ ...row, ...storedProgress(row) })
    },
    async submit(
      userId: string,
      file: { name: string; mime: string; bytes: Buffer },
      speakersValue: unknown,
      titleValue?: unknown,
    ) {
      if (!acceptedMeetingAudio(file.name, file.mime)) {
        throw new MeetingFailure('bad_request', 'Нужна запись mp3, m4a, wav или webm')
      }
      if (file.bytes.length === 0) {
        throw new MeetingFailure('bad_request', 'Файл пустой')
      }
      if (file.bytes.length > maxAudioBytes) {
        throw new MeetingFailure('bad_request', 'Файл больше 256 МБ')
      }
      let speakers: number | null
      try {
        speakers = meetingSpeakerCount(speakersValue)
      } catch (error) {
        throw new MeetingFailure('bad_request', error instanceof Error ? error.message : 'Число спикеров — от 1 до 20')
      }
      if (!options.transcriber) {
        throw new MeetingFailure('unavailable', 'Сервис расшифровки не настроен')
      }
      let title: string
      try {
        title = chosenMeetingTitle(titleValue, file.name)
      } catch (error) {
        throw new MeetingFailure('bad_request', error instanceof Error ? error.message : 'Название — от 1 до 120 символов')
      }
      const created = await options.repository.create({
        userId,
        title,
        fileName: file.name.slice(0, 180),
        speakers,
        status: 'queued',
        jobId: null,
        error: '',
      })
      if (options.audio) {
        try {
          await options.audio.save(created.id, file.bytes)
        } catch (error) {
          console.error('meeting audio save failed', error instanceof Error ? error.message : error)
          const failed = await options.repository.update(userId, created.id, {
            status: 'failed',
            error: 'Не удалось сохранить запись',
          })
          const row = failed ?? { ...created, status: 'failed' as const, error: 'Не удалось сохранить запись' }
          return present({ ...row, ...storedProgress(row) })
        }
      }
      handOff(userId, created.id, file, speakers)
      return present({ ...created, ...storedProgress(created) })
    },
  }
}

export type MeetingsService = ReturnType<typeof createMeetingsService>

export type { MeetingSegment }
