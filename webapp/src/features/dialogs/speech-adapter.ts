import type { SpeechSynthesisAdapter } from '@assistant-ui/react'

import { toast } from '@/components/ui/toast'
import type { AuthenticatedTransport } from '@/platform/api'

import { speakNoraReply } from './api'

type TransportSource = { current: AuthenticatedTransport }

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

function audioBuffer(bytes: Uint8Array) {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

export class NoraSpeechAdapter implements SpeechSynthesisAdapter {
  private readonly transport: TransportSource

  constructor(transport: TransportSource) {
    this.transport = transport
  }

  speak(text: string): SpeechSynthesisAdapter.Utterance {
    const subscribers = new Set<() => void>()
    const controller = new AbortController()
    // Unlock both players inside the click. The first spoken sentence returns later.
    const audio = new Audio()
    audio.preload = 'auto'
    audio.setAttribute('playsinline', 'true')
    audio.src = SILENT_WAV
    const unlocked = audio.play()
    const playback = new AudioContext()
    const silent = playback.createBuffer(1, 1, 22050)
    const tick = playback.createBufferSource()
    tick.buffer = silent
    tick.connect(playback.destination)
    tick.start(0)
    void playback.resume()

    let source: AudioBufferSourceNode | null = null
    const objectUrls: string[] = []
    let useContext = false

    const utterance: SpeechSynthesisAdapter.Utterance = {
      status: { type: 'starting' },
      cancel: () => {
        if (utterance.status.type === 'ended') return
        controller.abort()
        audio.pause()
        audio.src = ''
        try {
          source?.stop()
        } catch {
          /* playback had not started */
        }
        void playback.close()
        for (const url of objectUrls) URL.revokeObjectURL(url)
        objectUrls.length = 0
        finish('cancelled')
      },
      subscribe: (callback) => {
        if (utterance.status.type === 'ended') {
          queueMicrotask(callback)
          return () => {}
        }
        subscribers.add(callback)
        return () => {
          subscribers.delete(callback)
        }
      },
    }

    const notify = () => {
      for (const subscriber of subscribers) subscriber()
    }

    const finish = (reason: 'finished' | 'cancelled' | 'error', error?: unknown) => {
      if (utterance.status.type === 'ended') return
      utterance.status = { type: 'ended', reason, error }
      notify()
    }

    const markRunning = () => {
      if (controller.signal.aborted || utterance.status.type !== 'starting') return
      utterance.status = { type: 'running' }
      notify()
    }

    const buffered: Array<Uint8Array | null> = []
    const waiting: Array<(chunk: Uint8Array | null) => void> = []
    const pushChunk = (chunk: Uint8Array | null) => {
      const waiter = waiting.shift()
      if (waiter) waiter(chunk)
      else buffered.push(chunk)
    }
    const nextChunk = () => {
      const ready = buffered.shift()
      if (ready !== undefined) return Promise.resolve(ready)
      return new Promise<Uint8Array | null>((resolve) => waiting.push(resolve))
    }

    const playElement = (bytes: Uint8Array) =>
      new Promise<void>((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([audioBuffer(bytes)], { type: 'audio/mpeg' }))
        objectUrls.push(url)
        audio.onended = () => {
          URL.revokeObjectURL(url)
          const index = objectUrls.indexOf(url)
          if (index >= 0) objectUrls.splice(index, 1)
          resolve()
        }
        audio.src = url
        void audio.play().then(markRunning).catch(reject)
      })

    const playContext = async (bytes: Uint8Array) => {
      await playback.resume()
      if (playback.state !== 'running') throw new Error('Audio playback is suspended')
      const buffer = await playback.decodeAudioData(audioBuffer(bytes))
      if (controller.signal.aborted) return
      await new Promise<void>((resolve) => {
        source = playback.createBufferSource()
        source.buffer = buffer
        source.connect(playback.destination)
        source.onended = () => resolve()
        source.start()
        markRunning()
      })
    }

    void (async () => {
      await unlocked.catch(() => undefined)
      while (!controller.signal.aborted) {
        const bytes = await nextChunk()
        if (controller.signal.aborted) return
        if (!bytes) {
          void playback.close()
          finish('finished')
          return
        }
        try {
          if (useContext) await playContext(bytes)
          else await playElement(bytes)
        } catch {
          if (controller.signal.aborted) return
          if (useContext) throw new Error('Audio playback is suspended')
          audio.onended = null
          useContext = true
          await playContext(bytes)
        }
      }
    })().catch((error: unknown) => {
      if (controller.signal.aborted || utterance.status.type === 'ended') return
      audio.pause()
      void playback.close()
      toast.error('Не получилось озвучить')
      finish('error', error)
    })

    void speakNoraReply(this.transport.current, text, controller.signal)
      .then((response) => readFramedMp3(response, controller.signal, pushChunk))
      .then(() => {
        if (!controller.signal.aborted) pushChunk(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || utterance.status.type === 'ended') return
        audio.pause()
        void playback.close()
        pushChunk(null)
        toast.error('Не получилось озвучить')
        finish('error', error)
      })

    return utterance
  }
}

async function readFramedMp3(
  response: Response,
  signal: AbortSignal,
  onChunk: (bytes: Uint8Array) => void,
) {
  const body = response.body
  if (!body) throw new Error('Пустой ответ озвучки')
  const reader = body.getReader()
  let pending = new Uint8Array(0)
  const append = (extra: Uint8Array) => {
    if (pending.length === 0) {
      pending = new Uint8Array(extra)
      return
    }
    const next = new Uint8Array(pending.length + extra.length)
    next.set(pending)
    next.set(extra, pending.length)
    pending = next
  }
  const need = async (size: number) => {
    while (pending.length < size) {
      if (signal.aborted) return false
      const { done, value } = await reader.read()
      if (done || !value) return false
      append(value)
    }
    return true
  }
  try {
    while (!signal.aborted) {
      if (!(await need(4))) return
      const length = new DataView(pending.buffer, pending.byteOffset, pending.byteLength).getUint32(0)
      pending = pending.slice(4)
      if (length === 0 || length > 8_000_000) throw new Error('Озвучка оборвалась')
      if (!(await need(length))) throw new Error('Озвучка оборвалась')
      onChunk(pending.slice(0, length))
      pending = new Uint8Array(pending.subarray(length))
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}
