import {
  deleteMeetingResponseSchema,
  meetingListSchema,
  meetingSchema,
  type Meeting,
  type MeetingList,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

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

export function createMeeting(transport: AuthenticatedTransport, file: File, title = '') {
  const body = new FormData()
  body.set('file', file)
  const name = title.trim()
  if (name && name !== 'Новая встреча') body.set('title', name)
  return transport.request('/api/users/me/meetings', meetingSchema, {
    method: 'POST',
    body,
  })
}

export type { Meeting, MeetingList }
