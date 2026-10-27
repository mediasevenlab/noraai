export type MeetingSegment = {
  speaker: string
  start: number
  end: number
  text: string
}

const AUDIO_NAME = /\.(mp3|m4a|wav|webm|ogg|aac|mp4)$/i

export function acceptedMeetingAudio(name: string, mime: string): boolean {
  const type = mime.toLowerCase()
  return AUDIO_NAME.test(name) || type.startsWith('audio/') || type === 'video/webm' || type === 'video/mp4'
}

export function meetingTitle(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').trim()
  return (base || 'Встреча').slice(0, 120)
}

export function chosenMeetingTitle(custom: unknown, fileName: string): string {
  if (typeof custom !== 'string') return meetingTitle(fileName)
  const title = custom.replace(/\s+/g, ' ').trim()
  if (!title || title === 'Новая встреча') return meetingTitle(fileName)
  if (title.length > 120) throw new Error('Название — от 1 до 120 символов')
  return title
}

export function cleanMeetingTitle(value: string): string {
  const title = value.replace(/\s+/g, ' ').trim()
  if (!title || title.length > 120) throw new Error('Название — от 1 до 120 символов')
  return title
}

export function meetingSpeakerCount(value: unknown): number | null {
  if (value == null || value === '') return null
  const count = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Число спикеров — от 1 до 20')
  }
  return count
}

export function formatMeetingClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

export function formatMeetingTranscript(segments: readonly MeetingSegment[]): string {
  return segments
    .map((segment) => {
      const text = segment.text.trim()
      if (!text) return ''
      return `[${formatMeetingClock(segment.start)}] ${segment.speaker}: ${text}`
    })
    .filter(Boolean)
    .join('\n')
}

const diarizerSpeakerId = /^(?:speaker|spk)[_\s-]?\d+$/i

function speakerLabel(raw: string, order: Map<string, string>): string {
  const known = order.get(raw)
  if (known) return known
  const displayName = /^Спикер\s+\d+$/.test(raw) || (/[a-zа-яё]/.test(raw) && !diarizerSpeakerId.test(raw))
  if (displayName) {
    order.set(raw, raw)
    return raw
  }
  const used = new Set(order.values())
  let number = 1
  while (used.has(`Спикер ${number}`)) number += 1
  const next = `Спикер ${number}`
  order.set(raw, next)
  return next
}

export function renameMeetingSpeaker(segments: readonly MeetingSegment[], from: string, to: string): MeetingSegment[] {
  const source = from.trim()
  const name = to.trim()
  if (!source || !name) throw new Error('Введите имя спикера')
  if (name.length > 40) throw new Error('Имя спикера длиннее 40 знаков')
  if (!segments.some((segment) => segment.speaker === source)) throw new Error('Такого спикера в тексте нет')
  if (source === name) return segments.map((segment) => ({ ...segment }))
  return segments.map((segment) => (segment.speaker === source ? { ...segment, speaker: name } : { ...segment }))
}

export function normalizeMeetingSegments(value: unknown): MeetingSegment[] {
  if (!Array.isArray(value)) return []
  const order = new Map<string, string>()
  const segments: MeetingSegment[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const rawSpeaker =
      typeof record.speaker === 'string'
        ? record.speaker.trim()
        : typeof record.label === 'string'
          ? record.label.trim()
          : ''
    const text = typeof record.text === 'string' ? record.text.trim() : ''
    const start = typeof record.start === 'number' ? record.start : Number(record.start)
    const end = typeof record.end === 'number' ? record.end : Number(record.end)
    if (!rawSpeaker || !text || !Number.isFinite(start) || !Number.isFinite(end)) continue
    segments.push({
      speaker: speakerLabel(rawSpeaker, order),
      start,
      end,
      text,
    })
  }
  return segments
}

function recordOf(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload as Record<string, unknown>
}

export function parseMeetingJobId(payload: unknown): string {
  const record = recordOf(payload)
  const id = record.id ?? record.job_id ?? record.task_id ?? record.task
  if (typeof id !== 'string' || !id.trim()) return ''
  return id.trim()
}

export type MeetingJobState = 'queued' | 'running' | 'ready' | 'failed'

export type MeetingStep = {
  id: string
  state: 'pending' | 'current' | 'done'
  seconds: number | null
}

const meetingStepOrder = ['preparing', 'diarizing', 'transcribing'] as const

// Voice separation on the meetings GPU takes about 0.04s of waiting per 1s of audio.
const diarizeSecondsPerAudio = 0.04
const transcribeSecondsPerAudio = 0.02

export function estimateMeetingEta(input: {
  stage: string
  audioSeconds: number
  stageStartedAt: number | null
  audioDone: number
  nowSeconds: number
}): number | null {
  const audio = input.audioSeconds
  if (!Number.isFinite(audio) || audio < 2) return null
  const spent = input.stageStartedAt == null ? 0 : Math.max(0, input.nowSeconds - input.stageStartedAt)
  const transcribe = Math.max(2, audio * transcribeSecondsPerAudio)
  if (input.stage === 'preparing' || input.stage === 'queued') {
    return Math.round(2 + audio * diarizeSecondsPerAudio + transcribe)
  }
  if (input.stage === 'diarizing') {
    const expected = Math.max(3, audio * diarizeSecondsPerAudio)
    const remain = spent < expected ? expected - spent : Math.max(2, expected * 0.15)
    return Math.max(1, Math.round(remain + transcribe))
  }
  if (input.stage === 'transcribing') {
    const done = Math.max(0, input.audioDone)
    if (done >= 8 && spent >= 4) {
      const rate = done / spent
      return Math.max(1, Math.round(Math.max(0, audio - done) / rate))
    }
    return Math.max(2, Math.round(Math.max(0, audio - done) * transcribeSecondsPerAudio))
  }
  return null
}

export function meetingStepsForStage(stage: string): MeetingStep[] {
  const index = meetingStepOrder.indexOf(stage as (typeof meetingStepOrder)[number])
  return meetingStepOrder.map((id, position) => ({
    id,
    state: index < 0 ? 'pending' : position < index ? 'done' : position === index ? 'current' : 'pending',
    seconds: null,
  }))
}

export type MeetingJob = {
  status: MeetingJobState
  transcript: string
  segments: MeetingSegment[]
  error: string
  stage: string
  progress: number
  etaSeconds: number | null
  elapsedSeconds: number | null
  steps: MeetingStep[]
}

export function parseMeetingJob(payload: unknown): MeetingJob {
  const record = recordOf(payload)
  const raw = typeof record.status === 'string' ? record.status.toLowerCase() : ''
  const status: MeetingJobState =
    raw === 'ready' || raw === 'done' || raw === 'completed' || raw === 'succeeded'
      ? 'ready'
      : raw === 'failed' || raw === 'error'
        ? 'failed'
        : raw === 'running' || raw === 'processing' || raw === 'started'
          ? 'running'
          : 'queued'
  const segments = normalizeMeetingSegments(record.segments ?? record.turns)
  const transcript =
    typeof record.transcript === 'string' && record.transcript.trim()
      ? record.transcript.trim()
      : formatMeetingTranscript(segments)
  const error = typeof record.error === 'string' ? record.error : ''
  const stage = typeof record.stage === 'string' ? record.stage.trim().slice(0, 40) : ''
  const rawProgress = typeof record.progress === 'number' ? record.progress : Number.NaN
  const progress = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(100, Math.round(rawProgress)))
    : status === 'ready'
      ? 100
      : 0
  const rawEta = record.etaSeconds
  let etaSeconds =
    typeof rawEta === 'number' && Number.isFinite(rawEta) && rawEta >= 0 ? Math.round(rawEta) : null
  const audioSeconds = finiteNumber(record.audioSeconds)
  const stageStartedAt = finiteNumber(record.stageStartedAt)
  const audioDone = finiteNumber(record.audioDone) ?? 0
  if ((status === 'running' || status === 'queued') && audioSeconds != null) {
    const estimated = estimateMeetingEta({
      stage: stage || status,
      audioSeconds,
      stageStartedAt,
      audioDone,
      nowSeconds: Date.now() / 1000,
    })
    if (estimated != null) etaSeconds = estimated
  }
  const rawElapsed = record.elapsedSeconds
  let elapsedSeconds =
    typeof rawElapsed === 'number' && Number.isFinite(rawElapsed) && rawElapsed >= 0 ? Math.round(rawElapsed) : null
  const startedAt = record.startedAt
  if (
    (status === 'running' || status === 'queued') &&
    typeof startedAt === 'number' &&
    Number.isFinite(startedAt)
  ) {
    elapsedSeconds = Math.max(0, Math.round(Date.now() / 1000 - startedAt))
  }
  const resolvedStage = stage || status
  return {
    status,
    transcript,
    segments,
    error,
    stage: resolvedStage,
    progress,
    etaSeconds,
    elapsedSeconds,
    steps: parseMeetingSteps(record.steps, resolvedStage),
  }
}

const MEETING_CONTEXT_HEADER =
  'Расшифровки выбранных встреч. Это полный текст записей. Реплики одного спикера собраны подряд, в том порядке, как он их говорил.'
const MEETING_CONTEXT_CHARS = 96_000

type MeetingPassage = {
  title: string
  segments: MeetingSegment[]
}

/** The whole selected recording, grouped by speaker, so a question or a summary can use every line. */
export function meetingChatContext(
  meetings: readonly { title: string; segments: readonly MeetingSegment[] }[],
  _query: string,
): string {
  const ready: MeetingPassage[] = meetings
    .map((meeting) => ({
      title: meeting.title.trim() || 'Встреча',
      segments: meeting.segments.filter((segment) => segment.text.trim()),
    }))
    .filter((meeting) => meeting.segments.length > 0)
  if (ready.length === 0) return `${MEETING_CONTEXT_HEADER}\nВ выбранных встречах ещё нет текста.`
  let body = ready.map((meeting) => `${meetingBanner(meeting)}\n${speakerScript(meeting)}`).join('\n\n')
  if (body.length > MEETING_CONTEXT_CHARS) {
    body = `${body.slice(0, MEETING_CONTEXT_CHARS).trimEnd()}\n…`
  }
  return `${MEETING_CONTEXT_HEADER}\n${body}`
}

function speakerScript(meeting: MeetingPassage) {
  const groups = new Map<string, string[]>()
  for (const segment of meeting.segments) {
    const text = segment.text.trim().replace(/\s+/g, ' ')
    if (!text) continue
    const speaker = segment.speaker.trim() || 'Спикер'
    const lines = groups.get(speaker)
    if (lines) lines.push(text)
    else groups.set(speaker, [text])
  }
  return [...groups].map(([speaker, lines]) => `${speaker}:\n${lines.join('\n')}`).join('\n\n')
}

function meetingBanner(meeting: MeetingPassage) {
  const speakers = [...new Set(meeting.segments.map((segment) => segment.speaker))].join(', ')
  const end = meeting.segments.at(-1)?.end ?? 0
  return `Встреча «${meeting.title}». Голоса: ${speakers}. Запись около ${formatMeetingClock(end)}.`
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseMeetingSteps(value: unknown, stage: string): MeetingStep[] {
  if (!Array.isArray(value) || value.length === 0) {
    if (stage === 'ready' || stage === 'failed') return []
    return meetingStepsForStage(stage)
  }
  const steps: MeetingStep[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id.trim().slice(0, 40) : ''
    const state = record.state === 'done' || record.state === 'current' || record.state === 'pending' ? record.state : ''
    const seconds =
      typeof record.seconds === 'number' && Number.isFinite(record.seconds) && record.seconds >= 0
        ? Math.round(record.seconds)
        : null
    if (!id || !state) continue
    steps.push({ id, state, seconds })
  }
  return steps.length > 0 ? steps : meetingStepsForStage(stage)
}
