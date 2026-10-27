import { useEffect, useRef, useState, type RefObject } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import type { Meeting, MeetingSegment } from '@web-app-demo/contracts'

import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { FileTypeIcon } from '@/components/file-type-icon'
import { DownloadIcon, PencilIcon, PlusIcon, RefreshCwIcon, SquareIcon } from '@/components/icons'
import { ruRecordedAt } from '@/lib/ru-when'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth'
import { ApiRequestError } from '@/platform/api'
import { cn } from '@/lib/utils'

import {
  cancelMeeting,
  createMeeting,
  downloadMeetingAudio,
  getMeeting,
  renameMeetingSpeaker,
  renameMeetingTitle,
  retryMeeting,
} from './api'
import { notifyMeetings, subscribeMeetings } from './selection'
import { bytesPerSecond, uploadStatusLine, type UploadProgress, type UploadSample } from './upload-progress'

function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

const stepLabels: Record<string, string> = {
  preparing: 'Готовим звук',
  diarizing: 'Разделяем голоса',
  transcribing: 'Расшифровываем',
}

function spanText(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest} с`
  if (rest === 0) return `${minutes} мин`
  return `${minutes} мин ${rest} с`
}

function remainingText(seconds: number) {
  if (seconds < 45) return 'Осталось меньше минуты.'
  const minutes = Math.max(1, Math.round(seconds / 60))
  const mod10 = minutes % 10
  const mod100 = minutes % 100
  if (mod10 === 1 && mod100 !== 11) return `Осталась примерно ${minutes} минута.`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `Осталось примерно ${minutes} минуты.`
  return `Осталось примерно ${minutes} минут.`
}

function timelineSteps(meeting: Meeting) {
  if (meeting.steps.length > 0) return meeting.steps
  const order = ['preparing', 'diarizing', 'transcribing']
  const index = order.indexOf(meeting.stage)
  return order.map((id, position) => ({
    id,
    state: (index < 0 ? 'pending' : position < index ? 'done' : position === index ? 'current' : 'pending') as
      | 'pending'
      | 'current'
      | 'done',
    seconds: null as number | null,
  }))
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

function useMovingClock(base: number | null, active: boolean, direction: 1 | -1) {
  const anchor = useRef({ base: base ?? 0, at: Date.now() })
  const now = useNow(active && base != null)
  if (base == null) return null
  if (anchor.current.base !== base) anchor.current = { base, at: Date.now() }
  const delta = ((now - anchor.current.at) / 1000) * direction
  return Math.max(0, anchor.current.base + delta)
}

function MeetingTimeline({ meeting }: { meeting: Meeting }) {
  const steps = timelineSteps(meeting)
  const active = meeting.status === 'queued' || meeting.status === 'running'
  const elapsed = useMovingClock(meeting.elapsedSeconds, active, 1)
  const eta = useMovingClock(meeting.etaSeconds, active, -1)
  const current = steps.find((step) => step.state === 'current')
  const heading = current ? (stepLabels[current.id] ?? current.id) : 'В очереди'
  return (
    <div aria-live="polite" className="flex max-w-xl flex-col gap-3" role="status">
      <p className="text-[13px] leading-5 text-[var(--nora-text-secondary)]">
        {heading} · {spanText(elapsed ?? 0)}
      </p>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          const label = stepLabels[step.id] ?? step.id
          return (
            <li key={step.id} className="flex gap-3">
              <div className="flex w-3.5 flex-col items-center">
                {step.state === 'current' ? (
                  <Spinner className="mt-0.5 size-3.5 text-[var(--nora-text)]" />
                ) : (
                  <span
                    className={
                      step.state === 'pending'
                        ? 'mt-1.5 size-2 shrink-0 rounded-full border border-[var(--nora-text-secondary)]'
                        : 'mt-1.5 size-2 shrink-0 rounded-full bg-[var(--nora-text)]'
                    }
                  />
                )}
                {last ? null : <span className="my-1 w-px flex-1 bg-[var(--nora-text-secondary)] opacity-30" />}
              </div>
              <div className={`flex min-w-0 flex-1 items-baseline justify-between gap-3 ${last ? '' : 'pb-3'}`}>
                <span className={step.state === 'pending' ? 'text-[14px] text-[var(--nora-text-secondary)]' : 'text-[14px] text-[var(--nora-text)]'}>
                  {label}
                  {step.state === 'current' && meeting.progress > 0 ? ` · ${meeting.progress}%` : ''}
                </span>
                <span className="shrink-0 text-[12px] text-[var(--nora-text-secondary)]">
                  {step.state === 'done' && step.seconds != null ? spanText(step.seconds) : ''}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-[13px] leading-5 text-[var(--nora-text-secondary)]">
        {eta != null ? remainingText(eta) : 'Прикидываем, сколько ещё осталось.'}
        {' '}Встречу можно закрыть и открыть позже.
      </p>
    </div>
  )
}

function SpeakerName({
  disabled,
  name,
  onRename,
}: {
  disabled: boolean
  name: string
  onRename: (from: string, to: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const skip = useRef(false)
  useEffect(() => setValue(name), [name])
  if (!editing) {
    return (
      <span className="group/speaker inline-flex items-center gap-1">
        <button
          className="font-medium text-[var(--nora-text)] disabled:cursor-default"
          disabled={disabled}
          onClick={() => setEditing(true)}
          title={disabled ? undefined : 'Переименовать во всей расшифровке'}
          type="button"
        >
          {name}
        </button>
        {disabled ? null : (
          <button
            aria-label={`Переименовать ${name}`}
            className="text-[var(--nora-text-secondary)] md:opacity-0 md:group-hover/speaker:opacity-100 md:group-focus-within/speaker:opacity-100"
            onClick={() => setEditing(true)}
            type="button"
          >
            <PencilIcon className="size-3.5" />
          </button>
        )}
      </span>
    )
  }
  return (
    <input
      aria-label={`Имя вместо ${name}`}
      autoFocus
      className="h-7 w-40 rounded-md border-0 bg-[var(--nora-input-bg)] px-2 text-[13px] font-medium text-[var(--nora-text)] outline-none"
      maxLength={40}
      onBlur={() => {
        if (skip.current) {
          skip.current = false
          return
        }
        const next = value.trim()
        setEditing(false)
        if (!next || next === name) {
          setValue(name)
          return
        }
        void onRename(name, next).catch(() => setValue(name))
      }}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          skip.current = true
          setValue(name)
          setEditing(false)
        }
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      value={value}
    />
  )
}

function MeetingTitle({
  title,
  onRename,
}: {
  title: string
  onRename: (title: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const skip = useRef(false)
  useEffect(() => {
    if (!editing) setValue(title)
  }, [editing, title])
  if (!editing) {
    return (
      <div className="group/title flex items-center gap-2">
        <h1 className="text-[22px] font-medium text-[var(--nora-text)]">{title}</h1>
        <button
          aria-label="Изменить название"
          className="text-[var(--nora-text-secondary)] md:opacity-0 md:group-hover/title:opacity-100 md:group-focus-within/title:opacity-100"
          onClick={() => setEditing(true)}
          type="button"
        >
          <PencilIcon className="size-4" />
        </button>
      </div>
    )
  }
  return (
    <input
      aria-label="Название встречи"
      autoFocus
      className="h-9 w-full rounded-md border-0 bg-[var(--nora-input-bg)] px-2 text-[22px] font-medium text-[var(--nora-text)] outline-none"
      maxLength={120}
      onBlur={() => {
        if (skip.current) {
          skip.current = false
          return
        }
        const next = value.trim()
        setEditing(false)
        if (!next || next === title) {
          setValue(title)
          return
        }
        void onRename(next).catch(() => setValue(title))
      }}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          skip.current = true
          setValue(title)
          setEditing(false)
        }
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      value={value}
    />
  )
}

const MEETING_AUDIO_ACCEPT = 'audio/*,video/webm,video/mp4,.mp3,.m4a,.wav,.webm'
const NEW_MEETING_TITLE = 'Новая встреча'

function NewMeetingHeading({
  disabled,
  title,
  onTitle,
}: {
  disabled: boolean
  title: string
  onTitle: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)
  const skip = useRef(false)
  const shown = title.trim() || NEW_MEETING_TITLE
  useEffect(() => {
    if (!editing) setValue(title.trim())
  }, [editing, title])
  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    const placeCaret = () => {
      const end = input.value.length
      input.setSelectionRange(end, end)
    }
    input.focus()
    placeCaret()
    const frame = requestAnimationFrame(placeCaret)
    return () => cancelAnimationFrame(frame)
  }, [editing])
  function beginEdit() {
    setValue(shown)
    setEditing(true)
  }
  if (!editing) {
    return (
      <div className="group/title flex max-w-full items-center justify-center gap-2">
        <h1 className="max-w-[36rem] truncate font-[family-name:var(--nora-font)] text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--nora-text)]">
          <button
            className="truncate"
            disabled={disabled}
            onClick={beginEdit}
            type="button"
          >
            {shown}
          </button>
        </h1>
        <button
          aria-label="Изменить название"
          className="text-[var(--nora-text-secondary)] md:opacity-0 md:group-hover/title:opacity-100 md:group-focus-within/title:opacity-100"
          disabled={disabled}
          onClick={beginEdit}
          type="button"
        >
          <PencilIcon className="size-4" />
        </button>
      </div>
    )
  }
  return (
    <input
      ref={inputRef}
      aria-label="Название встречи"
      className="h-10 w-full max-w-md rounded-md border-0 bg-[var(--nora-input-bg)] px-3 text-center font-[family-name:var(--nora-font)] text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--nora-text)] outline-none placeholder:text-[var(--nora-text-secondary)]"
      disabled={disabled}
      maxLength={120}
      placeholder="Название встречи"
      onBlur={() => {
        if (skip.current) {
          skip.current = false
          return
        }
        const next = value.trim()
        setEditing(false)
        onTitle(next === NEW_MEETING_TITLE ? '' : next)
      }}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          skip.current = true
          setValue(title.trim())
          setEditing(false)
        }
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      value={value}
    />
  )
}

function NewMeetingComposer({
  fileRef,
  progress,
  sending,
  title,
  uploadName,
  onCancel,
  onFile,
  onTitle,
}: {
  fileRef: RefObject<HTMLInputElement | null>
  progress: UploadProgress | null
  sending: boolean
  title: string
  uploadName: string
  onCancel: () => void
  onFile: (file: File | undefined) => void
  onTitle: (title: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-16">
      <NewMeetingHeading disabled={sending} title={title} onTitle={onTitle} />
      <p className="mt-2 max-w-[26rem] text-center text-[15px] leading-6 text-[var(--nora-text-secondary)]">
        Прикрепите mp3, m4a, wav или webm. Голоса разделятся сами, и здесь появится текст по спикерам.
      </p>
      <form
        className="mt-8 w-full max-w-3xl"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (sending) return
          onFile(event.dataTransfer.files[0])
        }}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="meal-composer-field relative flex flex-col rounded-[20px] bg-[var(--nora-panel)] px-4 pt-4 pb-3 dark:bg-[var(--nora-button-bg-hover)]">
          {uploadName ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--nora-border)] bg-[var(--nora-surface)] px-2 py-1.5">
              <FileTypeIcon name={uploadName} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--nora-text)]">{uploadName}</span>
              {sending ? <Spinner className="size-4 text-[var(--nora-text-secondary)]" /> : null}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              accept={MEETING_AUDIO_ACCEPT}
              className="hidden"
              disabled={sending}
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                onFile(file)
              }}
            />
            {sending ? (
              <button
                aria-label="Отменить загрузку"
                className={cn(dialogComposerToolClass(false), 'h-8 gap-1.5 px-3')}
                type="button"
                onClick={onCancel}
              >
                <SquareIcon className="size-3.5 fill-current" />
                <span className="text-[13px]">Отменить</span>
              </button>
            ) : (
              <button
                aria-label="Прикрепить запись"
                className={cn(dialogComposerToolClass(false), 'size-8')}
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                <PlusIcon className="size-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[15px] text-[var(--nora-text-secondary)]">
                {sending ? 'Запись загружается' : 'Прикрепите запись'}
              </p>
              {sending && progress ? (
                <p className="text-[13px] text-[var(--nora-text-secondary)]">{uploadStatusLine(progress)}</p>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const printedWords = new Map<string, number>()

function useRevealedWords(meetingId: string, total: number, live: boolean) {
  const [shown, setShown] = useState(() => {
    if (!live) return total
    return Math.min(printedWords.get(meetingId) ?? 0, total)
  })
  const sawLive = useRef(live)
  if (live) sawLive.current = true
  const caughtUp = shown >= total
  useEffect(() => {
    if (!sawLive.current) {
      setShown(total)
      return
    }
    printedWords.set(meetingId, Math.min(shown, total))
    if (caughtUp) return
    const timer = window.setInterval(() => {
      setShown((value) => {
        const next = value + 1
        printedWords.set(meetingId, next)
        return next
      })
    }, 45)
    return () => window.clearInterval(timer)
  }, [caughtUp, live, meetingId, total])
  if (!sawLive.current) return total
  return Math.min(shown, total)
}

function visibleSegments(segments: MeetingSegment[], shownWords: number) {
  let left = shownWords
  const visible: MeetingSegment[] = []
  for (const segment of segments) {
    const words = segment.text.trim().split(/\s+/).filter(Boolean)
    if (left <= 0 || words.length === 0) break
    const take = Math.min(words.length, left)
    visible.push({ ...segment, text: words.slice(0, take).join(' ') })
    left -= take
    if (take < words.length) break
  }
  return visible
}

function Transcript({
  canRename,
  live,
  meetingId,
  onRename,
  segments,
}: {
  canRename: boolean
  live: boolean
  meetingId: string
  onRename: (from: string, to: string) => Promise<void>
  segments: MeetingSegment[]
}) {
  const total = segments.reduce((sum, segment) => sum + wordCount(segment.text), 0)
  const shown = useRevealedWords(meetingId, total, live)
  const visible = live || shown < total ? visibleSegments(segments, shown) : segments
  const typing = shown < total
  return (
    <ol className="flex flex-col gap-4">
      {visible.map((segment, index) => {
        const last = index === visible.length - 1
        return (
          <li key={`${segment.speaker}-${segment.start}-${index}`} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 text-[12px] text-[var(--nora-text-secondary)]">
              <time>{clock(segment.start)}</time>
              <SpeakerName disabled={!canRename} name={segment.speaker} onRename={onRename} />
            </div>
            <p className="text-[15px] leading-6 text-[var(--nora-text)]">
              {segment.text}
              {typing && last ? <span className="ml-0.5 inline-block animate-pulse">▍</span> : null}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export function MeetingsPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const fileRef = useRef<HTMLInputElement>(null)
  const meetingId = useRouterState({
    select: (state) => {
      const id = (state.location.search as { id?: unknown }).id
      return typeof id === 'string' ? id : ''
    },
  })
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [missing, setMissing] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const uploadAbort = useRef<AbortController | null>(null)
  const uploadSamples = useRef<UploadSample[]>([])
  const [draftTitle, setDraftTitle] = useState('')
  const [acting, setActing] = useState(false)
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    if (!meetingId) {
      setMeeting(null)
      setMissing(false)
      return
    }
    let current = true
    function load() {
      void getMeeting(auth.transport, meetingId)
        .then((result) => {
          if (!current) return
          setMeeting(result)
          setMissing(false)
        })
        .catch(() => {
          if (!current) return
          setMeeting(null)
          setMissing(true)
        })
    }
    load()
    const unsubscribe = subscribeMeetings(load)
    const timer = window.setInterval(load, 2000)
    return () => {
      current = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [auth.transport, meetingId])

  function cancelUpload() {
    uploadAbort.current?.abort()
  }

  async function upload(file: File | undefined) {
    if (!file || sending) return
    const controller = new AbortController()
    uploadAbort.current = controller
    uploadSamples.current = []
    setUploadName(file.name)
    setUploadProgress({ loaded: 0, total: file.size, bytesPerSecond: 0 })
    setSending(true)
    try {
      const created = await createMeeting(auth.transport, file, draftTitle, controller.signal, (event) => {
        const now = Date.now()
        const total = event.total > 0 ? event.total : file.size
        const next = [...uploadSamples.current, { at: now, loaded: event.loaded }]
          .filter((sample) => sample.at >= now - 5000)
        uploadSamples.current = next
        setUploadProgress({
          loaded: event.loaded,
          total,
          bytesPerSecond: bytesPerSecond(next, now),
        })
      })
      if (controller.signal.aborted) return
      setDraftTitle('')
      setMeeting(created)
      notifyMeetings()
      const to = pathname.startsWith('/mentor') ? '/mentor/meetings' : '/app/meetings'
      void navigate({ to, search: { id: created.id } })
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return
      if (error instanceof ApiRequestError && error.status === 413) {
        toast.error('Файл слишком большой, сервер его не принял')
        return
      }
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить запись')
    } finally {
      if (uploadAbort.current === controller) uploadAbort.current = null
      uploadSamples.current = []
      setSending(false)
      setUploadName('')
      setUploadProgress(null)
    }
  }

  async function stopTranscript() {
    if (!meeting || acting) return
    setActing(true)
    try {
      setMeeting(await cancelMeeting(auth.transport, meeting.id))
      notifyMeetings()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось остановить расшифровку')
    } finally {
      setActing(false)
    }
  }

  async function retryTranscript() {
    if (!meeting || acting) return
    if (!meeting.hasAudio) {
      toast.error('Запись не сохранилась, загрузите её ещё раз')
      return
    }
    setActing(true)
    try {
      printedWords.delete(meeting.id)
      setMeeting(await retryMeeting(auth.transport, meeting.id))
      setRunKey((value) => value + 1)
      notifyMeetings()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось перегенерировать расшифровку')
    } finally {
      setActing(false)
    }
  }

  async function downloadRecording() {
    if (!meeting) return
    try {
      await downloadMeetingAudio(auth.transport, meeting.id, meeting.fileName)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось скачать запись')
    }
  }

  const live = meeting?.status === 'queued' || meeting?.status === 'running'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {!meetingId && !meeting ? (
        <NewMeetingComposer
          fileRef={fileRef}
          progress={uploadProgress}
          sending={sending}
          title={draftTitle}
          uploadName={uploadName}
          onCancel={cancelUpload}
          onFile={(file) => void upload(file)}
          onTitle={setDraftTitle}
        />
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {missing ? (
          <p className="text-[14px] text-[var(--nora-text-secondary)]">Встреча не найдена</p>
        ) : meeting ? (
          <article className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <header className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <MeetingTitle
                  title={meeting.title}
                  onRename={async (title) => {
                    const next = await renameMeetingTitle(auth.transport, meeting.id, title)
                    setMeeting(next)
                    notifyMeetings()
                  }}
                />
                {live ? (
                  <button
                    aria-label="Прервать расшифровку"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] disabled:opacity-40"
                    disabled={acting}
                    onClick={() => void stopTranscript()}
                    type="button"
                  >
                    <SquareIcon className="size-4 fill-current" />
                  </button>
                ) : (
                  <button
                    aria-label="Перегенерировать расшифровку"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] disabled:opacity-40"
                    disabled={acting}
                    onClick={() => void retryTranscript()}
                    type="button"
                  >
                    <RefreshCwIcon className="size-4" />
                  </button>
                )}
              </div>
              <p className="text-[13px] text-[var(--nora-text-secondary)]">{ruRecordedAt(meeting.createdAt)}</p>
              <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-[var(--nora-border)] bg-[var(--nora-surface)] px-2 py-1.5">
                <FileTypeIcon name={meeting.fileName} />
                <span className="min-w-0 truncate text-[13px] text-[var(--nora-text)]">{meeting.fileName}</span>
                {meeting.hasAudio ? (
                  <button
                    aria-label="Скачать запись"
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                    onClick={() => void downloadRecording()}
                    type="button"
                  >
                    <DownloadIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </header>
            {meeting.status === 'queued' || meeting.status === 'running' ? <MeetingTimeline meeting={meeting} /> : null}
            {meeting.status === 'failed' ? (
              <p className="text-[14px] leading-6 text-[var(--nora-text-secondary)]">
                {meeting.error || 'Расшифровка не получилась'}
              </p>
            ) : null}
            {meeting.segments.length > 0 ? (
              <Transcript
                key={`${meeting.id}:${runKey}`}
                canRename={meeting.status === 'ready'}
                live={live}
                meetingId={meeting.id}
                onRename={async (from, to) => {
                  const next = await renameMeetingSpeaker(auth.transport, meeting.id, from, to)
                  setMeeting(next)
                }}
                segments={meeting.segments}
              />
            ) : meeting.status === 'ready' && meeting.transcript ? (
              <pre className="whitespace-pre-wrap text-[15px] leading-6 text-[var(--nora-text)]">{meeting.transcript}</pre>
            ) : null}
          </article>
        ) : (
          <p className="text-[14px] text-[var(--nora-text-secondary)]">Загружаем расшифровку</p>
        )}
      </div>
      )}
    </div>
  )
}
