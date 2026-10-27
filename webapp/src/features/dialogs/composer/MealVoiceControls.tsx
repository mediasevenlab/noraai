import * as React from 'react'
import { CheckIcon, Loader2Icon, MicIcon, XIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'

import type { AuthenticatedTransport } from '@/platform/api'
import { cn } from '@/lib/utils'

import { transcribeMyVoice } from '../api'
import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { blobToVoiceWavBase64 } from './voice-wav'
import {
  createVoiceAudioContext,
  pickRecorderMime,
  requestVoiceStream,
  voiceStartErrorMessage,
} from './voice-input'

const MAX_RECORD_MS = 60_000
const MIN_RECORD_MS = 400
const BAR_COUNT = 5

type VoiceSession = {
  recorder: MediaRecorder
  stream: MediaStream
  chunks: Blob[]
  startedAt: number
  analyser?: AnalyserNode
  audioContext?: AudioContext
}

export function MealVoiceControls({
  disabled,
  encodeWav = false,
  transport,
  transcribe,
  sendButton,
  onTranscript,
}: {
  disabled: boolean
  /** Settings chat sends 16 kHz wav to the office speech model. */
  encodeWav?: boolean
  transport: AuthenticatedTransport
  transcribe?: (input: { audioBase64: string; audioMime?: string }) => Promise<{ text: string }>
  sendButton: React.ReactNode
  onTranscript?: (text: string) => void
}) {
  const [recording, setRecording] = React.useState(false)
  const [transcribing, setTranscribing] = React.useState(false)
  const [levels, setLevels] = React.useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.18))
  const sessionRef = React.useRef<VoiceSession | null>(null)
  const startingRef = React.useRef<Promise<void> | null>(null)
  const rafRef = React.useRef<number>(0)

  React.useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    teardown(sessionRef.current)
    sessionRef.current = null
  }, [])

  const stopMeters = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.18))
  }, [])

  const startMeters = React.useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const next = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = Math.floor((index / BAR_COUNT) * data.length)
        const end = Math.floor(((index + 1) / BAR_COUNT) * data.length)
        const slice = data.slice(start, Math.max(end, start + 1))
        const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length
        return Math.max(0.16, Math.min(1, avg / 140))
      })
      setLevels(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const finishRecording = React.useCallback(
    async (commit: boolean) => {
      const session = sessionRef.current
      sessionRef.current = null
      setRecording(false)
      stopMeters()
      if (!session) return
      const elapsed = Date.now() - session.startedAt
      const mime = session.recorder.mimeType || 'audio/webm'
      const blob = await stopRecorder(session)
      teardown(session)
      if (!commit || elapsed < MIN_RECORD_MS || blob.size < 256) return
      setTranscribing(true)
      try {
        const wavBase64 = encodeWav ? await blobToVoiceWavBase64(blob) : null
        const audioBase64 = wavBase64 ?? (await blobToBase64(blob))
        const audioMime = wavBase64 ? 'audio/wav' : mime.split(';')[0] || 'audio/webm'
        const result = transcribe
          ? await transcribe({ audioBase64, audioMime })
          : await transcribeMyVoice(transport, { audioBase64, audioMime })
        const text = result.text.trim()
        if (!text) {
          toast.error('Не удалось распознать речь')
          return
        }
        onTranscript?.(text)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось расшифровать голос')
      } finally {
        setTranscribing(false)
      }
    },
    [encodeWav, onTranscript, stopMeters, transcribe, transport],
  )

  const startRecording = React.useCallback(() => {
    if (disabled || transcribing || sessionRef.current || startingRef.current) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Голосовой ввод недоступен в этом браузере')
      return
    }
    const pending = (async () => {
      let stream: MediaStream | null = null
      try {
        stream = await requestVoiceStream({
          getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
          onShowRecorder: () => setRecording(true),
        })
        const mime = pickRecorderMime((type) => MediaRecorder.isTypeSupported(type))
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream)
        const chunks: Blob[] = []
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        })
        const session: VoiceSession = {
          recorder,
          stream,
          chunks,
          startedAt: Date.now(),
        }
        sessionRef.current = session
        recorder.start()
        window.setTimeout(() => {
          if (sessionRef.current === session) void finishRecording(true)
        }, MAX_RECORD_MS)
        try {
          const audioContext = createVoiceAudioContext()
          await audioContext.resume()
          if (sessionRef.current !== session) {
            if (audioContext.state !== 'closed') void audioContext.close()
            return
          }
          const source = audioContext.createMediaStreamSource(stream)
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 64
          source.connect(analyser)
          session.analyser = analyser
          session.audioContext = audioContext
          startMeters(analyser)
        } catch {
          // Meters are optional; capture already started.
        }
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop())
        setRecording(false)
        toast.error(voiceStartErrorMessage(error))
      } finally {
        startingRef.current = null
      }
    })()
    startingRef.current = pending
  }, [disabled, finishRecording, startMeters, transcribing])

  const micDisabled = disabled || transcribing

  if (recording) {
    return (
      <div className="ios-glass-glare flex items-center gap-1 rounded-full border-0 bg-[var(--nora-text)]/72 py-0.5 pr-0.5 pl-3 text-[var(--nora-panel)] backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_55%,transparent)]">
        <span className="flex h-4 items-end gap-0.5 pr-1" aria-hidden>
          {levels.map((level, index) => (
            <span
              key={index}
              className="w-0.5 rounded-full bg-[var(--nora-panel)]"
              style={{ height: `${Math.round(level * 16)}px` }}
            />
          ))}
        </span>
        <button
          aria-label="Отменить голосовой ввод"
          className="inline-flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-[var(--nora-panel)] outline-none"
          onClick={() => void finishRecording(false)}
          type="button"
        >
          <XIcon className="size-3.5" strokeWidth={2.25} />
        </button>
        <button
          aria-label="Готово"
          className="ios-glass-glare inline-flex size-8 items-center justify-center rounded-full border-0 bg-[var(--nora-panel)]/88 text-[var(--nora-text)] outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)]"
          onClick={() => void finishRecording(true)}
          type="button"
        >
          {transcribing ? (
            <Loader2Icon aria-hidden className="size-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <CheckIcon className="size-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={transcribing ? 'Расшифровка голоса' : 'Голосовой ввод'}
              className={cn(dialogComposerToolClass(false, micDisabled), 'size-8')}
              disabled={micDisabled}
              onClick={() => void startRecording()}
              type="button"
            />
          }
        >
          {transcribing ? (
            <Loader2Icon aria-hidden className="size-[18px] animate-spin" strokeWidth={1.75} />
          ) : (
            <MicIcon className="size-[18px]" strokeWidth={1.75} />
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {transcribing ? 'Расшифровка голоса' : 'Голосовой ввод'}
        </TooltipContent>
      </Tooltip>
      {sendButton}
    </>
  )
}

function teardown(session: VoiceSession | null) {
  if (!session) return
  session.stream.getTracks().forEach((track) => track.stop())
  if (session.audioContext && session.audioContext.state !== 'closed') {
    void session.audioContext.close()
  }
}

function stopRecorder(session: VoiceSession) {
  return new Promise<Blob>((resolve) => {
    const finish = () => {
      resolve(new Blob(session.chunks, { type: session.recorder.mimeType || 'audio/webm' }))
    }
    if (session.recorder.state === 'inactive') {
      finish()
      return
    }
    session.recorder.addEventListener('stop', finish, { once: true })
    session.recorder.stop()
  })
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}
