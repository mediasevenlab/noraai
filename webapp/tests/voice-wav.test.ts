import { expect, test } from 'bun:test'

import { downsampleMono, encodePcmWav } from '../src/features/diary/voice-wav'

test('voice wav is 16-bit mono at the speech model rate', () => {
  const samples = downsampleMono(Float32Array.from([0, 0.5, -0.5, 0]), 32_000, 16_000)
  expect(samples).toHaveLength(2)
  const wav = encodePcmWav(samples, 16_000)
  const view = new DataView(wav.buffer)
  expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF')
  expect(view.getUint16(22, true)).toBe(1)
  expect(view.getUint32(24, true)).toBe(16_000)
  expect(view.getUint32(40, true)).toBe(samples.length * 2)
})
