import { expect, test } from 'bun:test'

import { isAuthSessionPending } from '../src/features/auth/session-status'

test('keeps the session unresolved while refresh is in flight', () => {
  expect(
    isAuthSessionPending({
      isRefreshing: true,
      accessToken: null,
      user: null,
      meError: null,
    }),
  ).toBe(true)
})

test('does not treat a restored token as a guest before /me resolves', () => {
  expect(
    isAuthSessionPending({
      isRefreshing: false,
      accessToken: 'access-token',
      user: null,
      meError: null,
    }),
  ).toBe(true)
})

test('is ready for the login screen after refresh finds no session', () => {
  expect(
    isAuthSessionPending({
      isRefreshing: false,
      accessToken: null,
      user: null,
      meError: null,
    }),
  ).toBe(false)
})

test('is ready for the workspace once the current user is known', () => {
  expect(
    isAuthSessionPending({
      isRefreshing: false,
      accessToken: 'access-token',
      user: { id: 'user_1' },
      meError: null,
    }),
  ).toBe(false)
})

test('is ready for the session error screen when /me fails', () => {
  expect(
    isAuthSessionPending({
      isRefreshing: false,
      accessToken: 'access-token',
      user: null,
      meError: new Error('unavailable'),
    }),
  ).toBe(false)
})
