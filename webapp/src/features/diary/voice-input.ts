/**
 * Hold-to-talk on phones cancels the user gesture before Safari/Chrome
 * can show the microphone permission prompt (pointerup / preventDefault).
 * Tap-to-toggle keeps getUserMedia inside the tap.
 */
export function isHoldToTalkVoiceInput(query?: { matches: boolean } | null) {
  void query
  return false
}

export function requestVoiceStream(input: {
  getUserMedia: (constraints: { audio: true }) => Promise<MediaStream>
  onShowRecorder: () => void
}) {
  input.onShowRecorder()
  return input.getUserMedia({ audio: true })
}

export function voiceStartErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError'
  ) {
    return 'Нужен доступ к микрофону'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Микрофон не найден'
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'Не удалось получить микрофон. Закройте другие приложения и попробуйте снова.'
  }
  return 'Не удалось включить микрофон'
}

export function createVoiceAudioContext() {
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) {
    throw new Error('AudioContext unavailable')
  }
  return new Ctor()
}

export function appendVoiceTranscript(existing: string, incoming: string) {
  const text = incoming.trim()
  if (!text) return existing
  const previous = existing.replace(/\s+$/, '')
  return previous ? `${previous} ${text}` : text
}

export function pickRecorderMime(isTypeSupported: (type: string) => boolean) {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
  ]
  return types.find((type) => isTypeSupported(type)) ?? ''
}
