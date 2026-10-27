import { expect, test } from 'bun:test'

import { noteIsSaved, noteMessageId, notesFor, removeNote, toggleNote } from './store'

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
  })).toBe('saved')
  expect(noteIsSaved(userId, 'message-1')).toBe(true)
  expect(notesFor(userId)[0]?.text).toBe('Спикер 1 (Дмитрий)')
  expect(notesFor(userId)[0]?.source).toBe('Резюмируй информацию')

  expect(toggleNote(userId, {
    id: 'message-1',
    role: 'assistant',
    text: 'Спикер 1 (Дмитрий)',
    source: 'Резюмируй информацию',
  })).toBe('removed')
  expect(notesFor(userId)).toEqual([])
})

test('removing a note from the page clears the same message', () => {
  const userId = 'notes-remove'
  toggleNote(userId, { id: 'message-2', role: 'user', text: 'Привет', source: 'Диалог' })
  removeNote(userId, 'message-2')
  expect(noteIsSaved(userId, 'message-2')).toBe(false)
})

test('a note is stored even when the message id is not ready yet', () => {
  const userId = 'notes-late-id'
  const id = noteMessageId('', 'assistant', 'Привет! Я Нора.')
  expect(id).toBe(noteMessageId('  ', 'assistant', 'Привет! Я Нора.'))
  expect(toggleNote(userId, { id, role: 'assistant', text: 'Привет! Я Нора.', source: 'Диалог' })).toBe('saved')
  expect(notesFor(userId)).toHaveLength(1)
  expect(noteIsSaved(userId, id)).toBe(true)
})

test('a full browser store does not pretend the note was saved', () => {
  const userId = 'notes-full'
  const original = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = () => {
    throw new Error('quota')
  }
  try {
    expect(toggleNote(userId, { id: 'message-3', role: 'user', text: 'Длинный ответ', source: 'Диалог' })).toBe('rejected')
    expect(notesFor(userId)).toEqual([])
  } finally {
    globalThis.localStorage.setItem = original
  }
})

test('an empty user does not invent a new notes list on every read', () => {
  expect(notesFor('')).toBe(notesFor(''))
})
