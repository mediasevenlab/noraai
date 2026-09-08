import { describe, expect, test } from 'bun:test'

import { demoMenteeNavStatus } from '../src/features/mentor/mentee-demo-status'

describe('demo mentee nav status', () => {
  test('is deterministic and within demo bounds', () => {
    const userId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa'
    const a = demoMenteeNavStatus(userId)
    const b = demoMenteeNavStatus(userId)
    expect(a).toEqual(b)
    expect(['green', 'yellow', 'red']).toContain(a.activity)
    expect(a.unreadMeals).toBeGreaterThanOrEqual(0)
    expect(a.unreadMeals).toBeLessThanOrEqual(12)
  })

  test('varies across mentees', () => {
    const statuses = [
      'user-a',
      'user-b',
      'user-c',
      'user-d',
      'user-e',
    ].map((id) => demoMenteeNavStatus(id))
    expect(new Set(statuses.map((s) => s.activity)).size).toBeGreaterThan(1)
    expect(new Set(statuses.map((s) => s.unreadMeals)).size).toBeGreaterThan(1)
  })
})
