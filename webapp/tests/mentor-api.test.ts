import { expect, test } from 'bun:test'

import { connectCurrentUserToMentor } from '../src/features/users/api'
import type { AuthenticatedTransport } from '../src/platform/api'

test('user mentor connection normalizes identifiers', async () => {
  const calls: Array<{ path: string; body?: unknown }> = []
  const user = {
    id: '019c0000-0000-7000-8000-000000000001',
    publicId: 101,
    email: 'user@example.com',
    displayName: null,
    nickname: 'candidate_user',
    role: 'user' as const,
    questionnaireCompleted: true,
    createdAt: '2026-07-20T00:00:00.000Z',
  }
  const transport = {
    request: async (path: string, _schema: unknown, options?: { body?: unknown }) => {
      calls.push({ path, body: options?.body })
      return { user }
    },
  } as unknown as AuthenticatedTransport

  await connectCurrentUserToMentor(transport, { identifier: '  CANDIDATE_USER  ' })

  expect(calls).toEqual([
    {
      path: '/api/users/me/mentor',
      body: { identifier: 'candidate_user' },
    },
  ])
})
