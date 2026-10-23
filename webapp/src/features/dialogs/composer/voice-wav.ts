const VOICE_RATE = 16_000

export function downsampleMono(samples: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate || samples.length === 0) return samples
  const nextLength = Math.max(1, Math.round((samples.length * toRate) / fromRate))
  const next = new Float32Array(nextLength)
  for (let index = 0; index < nextLength; index += 1) {
    const source = (index * fromRate) / toRate
    const left = Math.floor(source)
    const right = Math.min(left + 1, samples.length - 1)
    const mix = source - left
    next[index] = (samples[left] ?? 0) * (1 - mix) + (samples[right] ?? 0) * mix
  }
  return next
}

export function encodePcmWav(samples: Float32Array, sampleRate: number) {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  writeAscii(bytes, 0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  writeAscii(bytes, 8, 'WAVE')
  writeAscii(bytes, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(bytes, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return bytes
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

export async function blobToVoiceWavBase64(blob: Blob) {
  if (typeof AudioContext === 'undefined') return null
  const context = new AudioContext()
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer())
    const mono = mixChannels(audio)
    const samples = downsampleMono(mono, audio.sampleRate, VOICE_RATE)
    return bytesToBase64(encodePcmWav(samples, VOICE_RATE))
  } catch {
    return null
  } finally {
    await context.close()
  }
}

function mixChannels(audio: AudioBuffer) {
  if (audio.numberOfChannels <= 1) return audio.getChannelData(0)
  const length = audio.length
  const mixed = new Float32Array(length)
  for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
    const data = audio.getChannelData(channel)
    for (let index = 0; index < length; index += 1) mixed[index] += data[index] ?? 0
  }
  for (let index = 0; index < length; index += 1) mixed[index] /= audio.numberOfChannels
  return mixed
}

function writeAscii(bytes: Uint8Array, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) bytes[offset + index] = text.charCodeAt(index)
}
