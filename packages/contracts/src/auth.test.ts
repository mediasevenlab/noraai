import { describe, expect, test } from 'bun:test'

import type { UserDto } from './index'
import {
  apiErrorSchema,
  cookieAuthResponseSchema,
  cookieLogoutRequestSchema,
  cookieRefreshRequestSchema,
  cookieRefreshResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  passwordResetConfirmRequestSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  registerRequestSchema,
  registrationMentorLookupQuerySchema,
  registrationMentorLookupResponseSchema,
  referralLookupQuerySchema,
  referralLookupResponseSchema,
  tokenAuthResponseSchema,
  tokenLogoutRequestSchema,
  tokenRefreshRequestSchema,
  tokenRefreshResponseSchema,
} from './index'

const validUser = {
  id: 'user_1',
  publicId: 101,
  email: 'user@example.com',
  displayName: null,
  nickname: null,
  telegramUsername: null,
    telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: '2026-05-11T00:00:00.000Z',
} satisfies UserDto

describe('auth contracts', () => {
  test('normalizes registration and login input', () => {
    expect(
      registerRequestSchema.parse({
        email: ' USER@Example.COM ',
        password: 'password123',
        displayName: ' Jane ',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
      displayName: 'Jane',
      role: 'user',
    })

    expect(
      registerRequestSchema.parse({
        email: 'user@example.com',
        password: 'password123',
        displayName: '',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
      displayName: undefined,
      role: 'user',
    })

    expect(
      registerRequestSchema.parse({
        email: 'mentor@example.com',
        password: 'password123',
        role: 'mentor',
      }).role,
    ).toBe('mentor')
    expect(() =>
      registerRequestSchema.parse({
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      }),
    ).toThrow()
    expect(
      registerRequestSchema.parse({
        email: 'mentee@example.com',
        password: 'password123',
        role: 'user',
        mentorIdentifier: '  MENTOR_01  ',
      }).mentorIdentifier,
    ).toBe('mentor_01')
    expect(() =>
      registerRequestSchema.parse({
        email: 'mentor@example.com',
        password: 'password123',
        role: 'mentor',
        mentorIdentifier: 'other_mentor',
      }),
    ).toThrow()
    expect(registrationMentorLookupQuerySchema.parse({
      identifier: '  MENTOR_01 ',
    })).toEqual({ identifier: 'mentor_01' })
    expect(registrationMentorLookupResponseSchema.parse({
      found: false,
      mentor: null,
    })).toEqual({ found: false, mentor: null })
    expect(referralLookupQuerySchema.parse({ code: '  101 ' })).toEqual({
      code: '101',
    })
    expect(referralLookupResponseSchema.parse({
      found: true,
      referrer: {
        id: validUser.id,
        publicId: validUser.publicId,
        displayName: validUser.displayName,
        nickname: validUser.nickname,
        role: validUser.role,
      },
    }).found).toBe(true)

    expect(
      loginRequestSchema.parse({
        email: ' USER@Example.COM ',
        password: 'password123',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  test('rejects invalid auth request payloads', () => {
    expect(() =>
      registerRequestSchema.parse({
        email: 'not-an-email',
        password: 'short',
        displayName: 'A',
      }),
    ).toThrow()

    expect(() =>
      loginRequestSchema.parse({
        email: 'user@example.com',
        password: 'short',
      }),
    ).toThrow()
  })

  test('normalizes password reset requests and keeps their response generic', () => {
    expect(passwordResetRequestSchema.parse({ email: ' USER@Example.COM ' })).toEqual({
      email: 'user@example.com',
    })
    expect(passwordResetRequestResponseSchema.parse({ accepted: true, delivery: 'queued' })).toEqual({
      accepted: true,
      delivery: 'queued',
    })
    expect(
      passwordResetRequestResponseSchema.parse({ accepted: true, delivery: 'unavailable' }),
    ).toEqual({
      accepted: true,
      delivery: 'unavailable',
    })
    expect(() => passwordResetRequestResponseSchema.parse({ accepted: true })).toThrow()
    expect(() => passwordResetRequestResponseSchema.parse({ accepted: false })).toThrow()
  })

  test('requires a bounded reset token and a valid replacement password', () => {
    const token = 't'.repeat(43)
    expect(
      passwordResetConfirmRequestSchema.parse({ token, password: 'new-password-123' }),
    ).toEqual({ token, password: 'new-password-123' })
    expect(() =>
      passwordResetConfirmRequestSchema.parse({ token: 'short', password: 'new-password-123' }),
    ).toThrow()
    expect(() =>
      passwordResetConfirmRequestSchema.parse({ token, password: 'short' }),
    ).toThrow()
  })

  test('keeps cookie requests empty and requires explicit token transport credentials', () => {
    expect(cookieRefreshRequestSchema.parse(undefined)).toEqual({})
    expect(cookieRefreshRequestSchema.parse({})).toEqual({})
    expect(cookieLogoutRequestSchema.parse(undefined)).toEqual({})
    expect(cookieLogoutRequestSchema.parse({})).toEqual({})

    const refreshToken = 'r'.repeat(32)
    expect(tokenRefreshRequestSchema.parse({ refreshToken })).toEqual({ refreshToken })
    expect(tokenLogoutRequestSchema.parse({ refreshToken })).toEqual({ refreshToken })

    expect(() => cookieRefreshRequestSchema.parse({ refreshToken })).toThrow()
    expect(() => cookieLogoutRequestSchema.parse({ refreshToken })).toThrow()
    expect(() => tokenRefreshRequestSchema.parse({})).toThrow()
    expect(() => tokenLogoutRequestSchema.parse({ refreshToken: 'short' })).toThrow()
  })

  test('keeps cookie responses token-free and requires tokens for explicit token transport', () => {
    expect(
      cookieAuthResponseSchema.parse({
        user: validUser,
        accessToken: 'access-token',
      }),
    ).toEqual({
      user: validUser,
      accessToken: 'access-token',
    })

    expect(() =>
      cookieAuthResponseSchema.parse({
        user: validUser,
        accessToken: 'access-token',
        refreshToken: 'must-not-be-exposed',
      }),
    ).toThrow()

    expect(
      tokenAuthResponseSchema.parse({
        user: validUser,
        accessToken: 'access-token',
        refreshToken: 'token-transport-refresh-token',
      }),
    ).toEqual({
      user: validUser,
      accessToken: 'access-token',
      refreshToken: 'token-transport-refresh-token',
    })

    expect(() => tokenAuthResponseSchema.parse({ user: validUser, accessToken: 'access-token' })).toThrow()
    expect(cookieRefreshResponseSchema.parse({ accessToken: 'access-token' })).toEqual({
      accessToken: 'access-token',
    })
    expect(
      tokenRefreshResponseSchema.parse({
        accessToken: 'access-token',
        refreshToken: 'token-transport-refresh-token',
      }),
    ).toEqual({
      accessToken: 'access-token',
      refreshToken: 'token-transport-refresh-token',
    })
    expect(meResponseSchema.parse({ user: validUser })).toEqual({ user: validUser })
  })

  test('validates stable API error response shape', () => {
    expect(
      apiErrorSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: [{ path: ['email'], message: 'Invalid email address' }],
        },
      }),
    ).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: [{ path: ['email'], message: 'Invalid email address' }],
      },
    })

    expect(() =>
      apiErrorSchema.parse({
        error: {
          code: 'SOMETHING_ELSE',
          message: 'Nope',
        },
      }),
    ).toThrow()
  })
})
