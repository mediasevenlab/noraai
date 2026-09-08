import { describe, expect, test } from 'bun:test'

import {
  appendVoiceTranscript,
  isHoldToTalkVoiceInput,
  pickRecorderMime,
  requestVoiceStream,
  voiceStartErrorMessage,
} from './voice-input'

describe('voice input helpers', () => {
  test('shows the recorder before getUserMedia finishes', async () => {
    const order: string[] = []
    let release!: (stream: MediaStream) => void
    const pending = requestVoiceStream({
      onShowRecorder: () => order.push('show'),
      getUserMedia: () => {
        order.push('request')
        return new Promise<MediaStream>((resolve) => {
          release = resolve
        })
      },
    })
    expect(order).toEqual(['show', 'request'])
    release({} as MediaStream)
    await pending
  })

  test('uses tap-to-toggle so the browser can show the microphone prompt', () => {
    expect(isHoldToTalkVoiceInput({ matches: true })).toBe(false)
    expect(isHoldToTalkVoiceInput({ matches: false })).toBe(false)
    expect(isHoldToTalkVoiceInput(null)).toBe(false)
  })

  test('maps getUserMedia failures without treating setup errors as a denied prompt', () => {
    expect(voiceStartErrorMessage(new DOMException('denied', 'NotAllowedError'))).toBe(
      'Нужен доступ к микрофону',
    )
    expect(voiceStartErrorMessage(new DOMException('missing', 'NotFoundError'))).toBe(
      'Микрофон не найден',
    )
    expect(voiceStartErrorMessage(new Error('AudioContext unavailable'))).toBe(
      'Не удалось включить микрофон',
    )
  })

  test('appends transcript to existing composer text', () => {
    expect(appendVoiceTranscript('', '  брокколи  ')).toBe('брокколи')
    expect(appendVoiceTranscript('Обед', 'ещё соус')).toBe('Обед ещё соус')
    expect(appendVoiceTranscript('Обед  ', '')).toBe('Обед  ')
  })

  test('prefers opus webm when the recorder supports it', () => {
    expect(
      pickRecorderMime((type) => type === 'audio/webm;codecs=opus'),
    ).toBe('audio/webm;codecs=opus')
    expect(pickRecorderMime(() => false)).toBe('')
  })
})
