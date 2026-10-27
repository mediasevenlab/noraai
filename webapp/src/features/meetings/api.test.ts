import { expect, test } from 'bun:test'

import { ApiRequestError, type AuthenticatedTransport } from '@/platform/api'

import { createMeeting, meetingPartSpan } from './api'

test('part spans cover the file without overlapping', () => {
  expect(meetingPartSpan(9, 0, 4)).toEqual({ count: 3, start: 0, end: 4 })
  expect(meetingPartSpan(9, 2, 4)).toEqual({ count: 3, start: 8, end: 9 })
})

test('a dropped piece is sent again, and a rejected piece removes the upload', async () => {
  const attempts: number[] = []
  const deleted: string[] = []
  const meeting = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'a',
    fileName: 'a.m4a',
    status: 'queued' as const,
    speakers: null,
    stage: 'queued',
    progress: 0,
    etaSeconds: null,
    error: '',
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    transcript: '',
    segments: [],
    elapsedSeconds: 0,
    steps: [],
    hasAudio: true,
  }
  const transport: AuthenticatedTransport = {
    async request() {
      throw new Error('unused')
    },
    async raw(path, options) {
      if (options?.method === 'DELETE') {
        deleted.push(path)
        return new Response('{}', { status: 200 })
      }
      const index = Number(new Headers(options?.headers).get('X-Part-Index'))
      attempts.push(index)
      if (attempts.length === 1) throw new TypeError('Failed to fetch')
      const size = options?.body instanceof Blob ? options.body.size : 0
      options?.onUploadProgress?.({ loaded: size, total: size })
      return new Response(JSON.stringify(meeting), { status: 200 })
    },
  }
  const file = new File([new Uint8Array([1, 2, 3, 4])], 'a.m4a', { type: 'audio/mp4' })
  const seen: number[] = []
  const created = await createMeeting(transport, file, '', undefined, (event) => seen.push(event.loaded))
  expect(created.id).toBe(meeting.id)
  expect(attempts).toEqual([0, 0])
  expect(deleted).toEqual([])
  expect(seen.at(-1)).toBe(4)

  const failing: AuthenticatedTransport = {
    async request() {
      throw new Error('unused')
    },
    async raw(path, options) {
      if (options?.method === 'DELETE') {
        deleted.push(path)
        return new Response('{}', { status: 200 })
      }
      throw new ApiRequestError(400, 'BAD_REQUEST', 'Часть записи повреждена')
    },
  }
  await expect(createMeeting(failing, file, '', undefined, () => undefined)).rejects.toThrow('Часть записи повреждена')
  expect(deleted).toHaveLength(1)
})
