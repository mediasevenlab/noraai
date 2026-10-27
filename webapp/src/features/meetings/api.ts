import {
  deleteMeetingResponseSchema,
  meetingListSchema,
  meetingSchema,
  type Meeting,
  type MeetingList,
} from '@web-app-demo/contracts'

import { ApiRequestError, type AuthenticatedTransport } from '@/platform/api'

export function listMeetings(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/meetings', meetingListSchema)
}

export function getMeeting(transport: AuthenticatedTransport, meetingId: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}`, meetingSchema)
}

export function deleteMeeting(transport: AuthenticatedTransport, meetingId: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}`, deleteMeetingResponseSchema, {
    method: 'DELETE',
  })
}

export function renameMeetingTitle(transport: AuthenticatedTransport, meetingId: string, title: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}`, meetingSchema, {
    method: 'PATCH',
    body: { title },
  })
}

export function renameMeetingSpeaker(transport: AuthenticatedTransport, meetingId: string, from: string, to: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}/speakers`, meetingSchema, {
    method: 'PATCH',
    body: { from, to },
  })
}

export function retryMeeting(transport: AuthenticatedTransport, meetingId: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}/retry`, meetingSchema, {
    method: 'POST',
  })
}

export function cancelMeeting(transport: AuthenticatedTransport, meetingId: string) {
  return transport.request(`/api/users/me/meetings/${meetingId}/cancel`, meetingSchema, {
    method: 'POST',
  })
}

export async function downloadMeetingAudio(transport: AuthenticatedTransport, meetingId: string, fileName: string) {
  const response = await transport.raw(`/api/users/me/meetings/${meetingId}/audio`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Same size the server expects. A short piece survives a link that drops a long request. */
export const meetingPartBytes = 4 * 1024 * 1024

export function meetingPartSpan(fileSize: number, index: number, partBytes = meetingPartBytes) {
  const count = Math.max(1, Math.ceil(fileSize / partBytes))
  const start = index * partBytes
  return { count, start, end: Math.min(fileSize, start + partBytes) }
}

function partCanRetry(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return false
  if (error instanceof Error && error.name === 'AbortError') return false
  if (error instanceof ApiRequestError) return error.status === 502 || error.status === 503 || error.status === 504
  return error instanceof TypeError
}

export async function createMeeting(
  transport: AuthenticatedTransport,
  file: File,
  title = '',
  signal?: AbortSignal,
  onUploadProgress?: (event: { loaded: number; total: number }) => void,
) {
  if (file.size <= 0) throw new Error('Файл пустой')
  if (file.size > 256 * 1024 * 1024) throw new Error('Файл больше 256 МБ')
  const uploadId = crypto.randomUUID()
  const count = meetingPartSpan(file.size, 0).count
  const name = title.trim()
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'X-Upload-Id': uploadId,
    'X-Part-Count': String(count),
    'X-File-Size': String(file.size),
    'X-File-Name': encodeURIComponent(file.name),
    'X-File-Mime': file.type || 'application/octet-stream',
  }
  if (name && name !== 'Новая встреча') headers['X-Meeting-Title'] = encodeURIComponent(name)

  try {
    let meeting: Meeting | null = null
    for (let index = 0; index < count; index += 1) {
      const { start, end } = meetingPartSpan(file.size, index)
      const response = await postMeetingPart(transport, file.slice(start, end), headers, index, signal, (loaded) => {
        onUploadProgress?.({ loaded: start + loaded, total: file.size })
      })
      if (index === count - 1) meeting = meetingSchema.parse(await response.json())
    }
    if (!meeting) throw new Error('Не удалось отправить запись')
    return meeting
  } catch (error) {
    void transport.raw(`/api/users/me/meetings/parts/${uploadId}`, { method: 'DELETE' }).catch(() => undefined)
    throw error
  }
}

async function postMeetingPart(
  transport: AuthenticatedTransport,
  body: Blob,
  headers: Record<string, string>,
  index: number,
  signal: AbortSignal | undefined,
  onLoaded: (loaded: number) => void,
) {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    try {
      return await transport.raw('/api/users/me/meetings/parts', {
        method: 'POST',
        body,
        signal,
        headers: { ...headers, 'X-Part-Index': String(index) },
        onUploadProgress: (event) => onLoaded(event.loaded),
      })
    } catch (error) {
      last = error
      if (!partCanRetry(error)) throw error
    }
  }
  throw last instanceof Error ? last : new Error('Не удалось отправить запись')
}

export type { Meeting, MeetingList }
