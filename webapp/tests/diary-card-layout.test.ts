import { expect, test } from 'bun:test'

import {
  diaryFeedGridClass,
  readDiaryCardLayout,
  writeDiaryCardLayout,
} from '../src/features/diary/diary-card-layout'

function withMemoryStorage(run: () => void) {
  const memory = new Map<string, string>()
  const originalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    },
  })
  try {
    run()
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  }
}

test('diary card layout defaults to a two-column grid', () => {
  withMemoryStorage(() => {
    expect(readDiaryCardLayout()).toBe('grid')
    expect(diaryFeedGridClass('grid')).toContain('grid-cols-2')
    expect(diaryFeedGridClass('grid')).not.toContain('max-md:grid-cols-1')
  })
})

test('list layout is one card per row on mobile and persists', () => {
  withMemoryStorage(() => {
    writeDiaryCardLayout('list')
    expect(readDiaryCardLayout()).toBe('list')
    expect(diaryFeedGridClass('list')).toContain('max-md:grid-cols-1')
    expect(diaryFeedGridClass('list')).toContain('grid-cols-2')
  })
})
