export type UploadSample = { at: number; loaded: number }

export type UploadProgress = {
  loaded: number
  total: number
  bytesPerSecond: number
}

export function formatByteSize(bytes: number): string {
  const size = Math.max(0, bytes)
  const units = [
    { suffix: 'ГБ', divisor: 1024 ** 3 },
    { suffix: 'МБ', divisor: 1024 ** 2 },
    { suffix: 'КБ', divisor: 1024 },
  ]
  for (const unit of units) {
    if (size >= unit.divisor) return `${trimNumber(size / unit.divisor)} ${unit.suffix}`
  }
  return `${Math.round(size)} Б`
}

function trimNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) return String(Math.round(rounded))
  return rounded.toFixed(1).replace('.', ',')
}

/** Average over the last two seconds, so one quiet tick does not drop the speed to zero. */
export function bytesPerSecond(samples: readonly UploadSample[], now: number): number {
  if (samples.length < 2) return 0
  const latest = samples[samples.length - 1]
  if (!latest) return 0
  if (now - latest.at > 2000) return 0
  const windowStart = now - 2000
  const earliest = samples.find((sample) => sample.at >= windowStart) ?? samples[0]
  if (!earliest || earliest === latest) return 0
  const elapsed = (latest.at - earliest.at) / 1000
  if (elapsed <= 0) return 0
  return Math.max(0, (latest.loaded - earliest.loaded) / elapsed)
}

export function uploadStatusLine(progress: UploadProgress): string {
  const total = progress.total > 0 ? progress.total : progress.loaded
  const loaded = Math.min(Math.max(0, progress.loaded), total)
  const sent = formatByteSize(loaded)
  const whole = formatByteSize(total)
  if (total > 0 && progress.loaded >= total) return `${whole} из ${whole} · сохраняем на сервере`
  const speed = progress.bytesPerSecond < 1024 && total >= 1024 * 1024
    ? '0 МБ/с'
    : `${formatByteSize(progress.bytesPerSecond)}/с`
  return `${sent} из ${whole} · ${speed}`
}
