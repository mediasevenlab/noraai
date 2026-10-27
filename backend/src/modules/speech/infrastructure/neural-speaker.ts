import {
  CHROMIUM_FULL_VERSION,
  generateSecMsGecToken_V2,
  SEC_MS_GEC_VERSION_V2,
  TRUSTED_CLIENT_TOKEN,
} from 'node-edge-tts/dist/drm.js'

import type { SpeechSpeaker } from '../application/ports'
import { SpeechFailure } from '../domain/errors'

const voice = 'ru-RU-SvetlanaNeural'
const chunkTimeoutMs = 25_000

type SpeechSocket = WebSocket & {
  binaryType: BinaryType
}

export function createNeuralSpeaker(): SpeechSpeaker {
  return {
    speak(text, signal) {
      return synthesize(text, signal)
    },
  }
}

function synthesize(text: string, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new SpeechFailure('unavailable', 'Озвучка остановлена'))
  const major = CHROMIUM_FULL_VERSION.split('.')[0] ?? '143'
  const connectionId = crypto.randomUUID().replaceAll('-', '')
  const url =
    'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
    `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}` +
    `&Sec-MS-GEC=${generateSecMsGecToken_V2()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION_V2}`
  const socket = new WebSocket(url, {
    headers: {
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
    },
  } as unknown as string[]) as SpeechSocket
  socket.binaryType = 'arraybuffer'

  return new Promise<Uint8Array>((resolve, reject) => {
    const frames: Uint8Array[] = []
    let settled = false
    const finish = (error?: SpeechFailure) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
      if (error) reject(error)
      else resolve(joinAudio(frames))
    }
    const onAbort = () => finish(new SpeechFailure('unavailable', 'Озвучка остановлена'))
    const timer = setTimeout(() => finish(new SpeechFailure('unavailable', 'Озвучка не успела начаться')), chunkTimeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })

    socket.addEventListener('open', () => {
      socket.send(
        `X-Timestamp:${new Date().toUTCString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                },
              },
            },
          }),
      )
      socket.send(
        `X-RequestId:${connectionId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
          `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU"><voice name="${voice}"><prosody rate="0%" pitch="0Hz">${escapeXml(text)}</prosody></voice></speak>`,
      )
    })
    socket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          if (frames.length === 0) finish(new SpeechFailure('unavailable', 'Не получилось озвучить'))
          else finish()
        }
        return
      }
      const bytes = bytesOf(event.data)
      if (!bytes || bytes.length < 2) return
      const headerLength = (bytes[0]! << 8) | bytes[1]!
      const audio = bytes.subarray(headerLength + 2)
      if (audio.length > 0) frames.push(audio)
    })
    socket.addEventListener('error', () => finish(new SpeechFailure('unavailable', 'Не получилось озвучить')))
    socket.addEventListener('close', () => {
      if (settled) return
      if (frames.length > 0) finish()
      else finish(new SpeechFailure('unavailable', 'Не получилось озвучить'))
    })
  })
}

function bytesOf(data: unknown) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return null
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function joinAudio(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const audio = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    audio.set(part, offset)
    offset += part.length
  }
  return audio
}
