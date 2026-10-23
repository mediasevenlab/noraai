import { NewsFailure } from './errors'
import type { ParsedTelegramMedia } from './telegram-page'

const MAX_FILES = 10

export function newsPostFields(text: string) {
  const lines = text.split('\n')
  const first = lines.findIndex((line) => line.trim())
  if (first < 0) return { title: '', body: '' }
  return {
    title: lines[first]!.trim(),
    body: lines.slice(first + 1).join('\n').replace(/^\n+/, '').trimEnd(),
  }
}

export function newsPostText(title: string, body: string) {
  const heading = title.trim().slice(0, 300)
  const rest = body.trim().slice(0, 8_000)
  if (!heading) return rest
  if (!rest) return heading
  return `${heading}\n\n${rest}`
}

export function keptNewsMedia(media: ParsedTelegramMedia[], keep: number[]) {
  if (keep.some((index) => !Number.isInteger(index) || index < 0 || index >= media.length)) {
    throw new NewsFailure('bad_request', 'News media is invalid')
  }
  if (new Set(keep).size !== keep.length) throw new NewsFailure('bad_request', 'News media is invalid')
  const kept = keep.map((index) => media[index]!)
  if (kept.some((item) => item.role === 'poster')) throw new NewsFailure('bad_request', 'News media is invalid')
  return kept
}

export function postersForEdit(
  media: ParsedTelegramMedia[],
  kept: ParsedTelegramMedia[],
  uploads: { kind: ParsedTelegramMedia['kind'] }[],
) {
  if (kept.length + uploads.length > MAX_FILES) throw new NewsFailure('bad_request', 'A post can hold up to 10 files')
  const videoRemains = kept.some((item) => item.kind === 'video') || uploads.some((item) => item.kind === 'video')
  return videoRemains ? media.filter((item) => item.role === 'poster') : []
}
