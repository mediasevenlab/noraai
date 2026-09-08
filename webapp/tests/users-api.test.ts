import { expect, test } from 'bun:test'

import { updateProfile } from '../src/features/users/api'
import type { AuthenticatedTransport } from '../src/platform/api'

test('nickname profile updates are normalized before transport', async () => {
  let requestBody: unknown
  const transport = {
    request: async (_path: string, _schema: unknown, options: { body?: unknown }) => {
      requestBody = options.body
      return {
        user: {
          id: 'user-1',
          publicId: 101,
          email: 'user@example.com',
          displayName: null,
          nickname: 'mentor_01',
          role: 'user',
          questionnaireCompleted: true,
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      }
    },
  } as unknown as AuthenticatedTransport

  const response = await updateProfile(transport, { nickname: '  Mentor_01  ' })

  expect(requestBody).toEqual({ nickname: 'mentor_01' })
  expect(response.user.nickname).toBe('mentor_01')
})
