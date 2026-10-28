import { expect, test } from 'bun:test'

import { bindThreadMeetings, writeThreadMeetings } from './selection'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

test('a meeting stays on the dialog where it was chosen', () => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
  localStorage.setItem('dialogs-meetings:user:', JSON.stringify(['meeting-1']))
  writeThreadMeetings('user', 'first', ['meeting-1'])
  expect(bindThreadMeetings('user', 'second')).toEqual([])
  expect(bindThreadMeetings('user', 'first')).toEqual(['meeting-1'])
  writeThreadMeetings('user', 'first', [])
  expect(bindThreadMeetings('user', 'first')).toEqual([])
  expect(bindThreadMeetings('user', '')).toEqual([])
})
