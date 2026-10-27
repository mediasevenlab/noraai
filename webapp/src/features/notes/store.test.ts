import { expect, test } from 'bun:test'

import { noteIsSaved, notesFor, removeNote, toggleNote } from './store'

const memory = new Map<string, string>()

globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value)
  },
  removeItem: (key) => {
    memory.delete(key)
  },
  clear: () => {
    memory.clear()
  },
  key: () => null,
  length: 0,
}

test('a note keeps its text after the dialog is gone', () => {
  const userId = 'notes-keep'
  expect(toggleNote(userId, {
    id: 'message-1',
    role: 'assistant',
    text: 'Спикер 1 (Дмитрий)',
    source: 'Резюмируй информацию',
  })).toBe(true)
  expect(noteIsSaved(userId, 'message-1')).toBe(true)
  expect(notesFor(userId)[0]?.text).toBe('Спикер 1 (Дмитрий)')
  expect(notesFor(userId)[0]?.source).toBe('Резюмируй информацию')

  expect(toggleNote(userId, {
    id: 'message-1',
    role: 'assistant',
    text: 'Спикер 1 (Дмитрий)',
    source: 'Резюмируй информацию',
  })).toBe(false)
  expect(notesFor(userId)).toEqual([])
})

test('removing a note from the page clears the same message', () => {
  const userId = 'notes-remove'
  toggleNote(userId, { id: 'message-2', role: 'user', text: 'Привет', source: 'Диалог' })
  removeNote(userId, 'message-2')
  expect(noteIsSaved(userId, 'message-2')).toBe(false)
})
