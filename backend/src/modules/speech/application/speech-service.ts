import { SpeechFailure } from '../domain/errors'
import { speechChunks, spokenText } from '../domain/spoken-text'
import type { SpeechSpeaker } from './ports'

async function* speakParts(speaker: SpeechSpeaker, text: string, signal?: AbortSignal) {
  const spoken = spokenText(text)
  if (!spoken) throw new SpeechFailure('bad_request', 'Нечего озвучивать')
  for (const chunk of speechChunks(spoken)) {
    if (signal?.aborted) throw new SpeechFailure('unavailable', 'Озвучка остановлена')
    yield await speaker.speak(chunk, signal)
  }
}

export function createSpeechService(speaker: SpeechSpeaker) {
  return {
    speakParts(text: string, signal?: AbortSignal) {
      return speakParts(speaker, text, signal)
    },
    async speak(text: string, signal?: AbortSignal) {
      const parts: Uint8Array[] = []
      for await (const part of speakParts(speaker, text, signal)) parts.push(part)
      return joinAudio(parts)
    },
  }
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
