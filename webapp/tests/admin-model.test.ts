import { expect, test } from 'bun:test'

import {
  adminUsersPagination,
  adminUsersViewState,
  canDeleteAdminUser,
  roleMutationFeedback,
} from '../src/features/admin/model'

test('admin directory exposes loading, error, empty, and ready states', () => {
  expect(
    adminUsersViewState({ isPending: true, isError: false }),
  ).toBe('loading')
  expect(
    adminUsersViewState({ isPending: false, isError: true }),
  ).toBe('error')
  expect(
    adminUsersViewState({ isPending: false, isError: false, itemCount: 0 }),
  ).toBe('empty')
  expect(
    adminUsersViewState({ isPending: false, isError: false, itemCount: 1 }),
  ).toBe('ready')
})

test('admin pagination respects the reachable server window', () => {
  expect(adminUsersPagination({
    hasNext: false,
    page: 100,
    pageSize: 20,
    total: 2_001,
  })).toEqual({
    canGoNext: false,
    reachableUsers: 2_000,
    totalPages: 100,
    wasBounded: true,
  })
})

test('role mutation exposes explicit error and success feedback', () => {
  expect(roleMutationFeedback({ isError: true, isSuccess: false })).toBe('error')
  expect(roleMutationFeedback({ isError: false, isSuccess: true })).toBe('success')
  expect(roleMutationFeedback({ isError: false, isSuccess: false })).toBeNull()
})

test('administrator cannot delete the current account', () => {
  expect(canDeleteAdminUser('admin-1', {
    id: 'admin-1',
    email: 'other-admin@example.com',
  })).toBe(false)
  expect(canDeleteAdminUser('admin-1', {
    id: 'user-1',
    email: 'user@example.com',
  })).toBe(true)
  expect(canDeleteAdminUser('admin-1', {
    id: 'default-user',
    email: 'user@nora.com',
  })).toBe(false)
})
