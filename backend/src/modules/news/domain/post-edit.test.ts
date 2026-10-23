import { expect, test } from 'bun:test'

import { keptNewsMedia, newsPostFields, newsPostText, postersForEdit } from './post-edit'

test('the editor title is the first line and the body is the rest', () => {
  expect(newsPostFields('Заголовок\n\nАбзац\nещё')).toEqual({ title: 'Заголовок', body: 'Абзац\nещё' })
  expect(newsPostText('Заголовок', 'Абзац')).toBe('Заголовок\n\nАбзац')
  expect(newsPostText('  Только заголовок  ', '  ')).toBe('Только заголовок')
})

test('kept files stay in the chosen order and a preview frame is not a file', () => {
  const media = [
    { kind: 'image' as const, url: 'https://cdn.example/poster.jpg', role: 'poster' as const },
    { kind: 'image' as const, url: 'https://cdn.example/a.jpg' },
    { kind: 'video' as const, url: 'https://cdn.example/clip.mp4' },
  ]
  expect(keptNewsMedia(media, [2, 1]).map((item) => item.url)).toEqual([
    'https://cdn.example/clip.mp4',
    'https://cdn.example/a.jpg',
  ])
  expect(() => keptNewsMedia(media, [0])).toThrow('News media is invalid')
  expect(() => keptNewsMedia(media, [1, 1])).toThrow('News media is invalid')
  expect(postersForEdit(media, [media[1]!], []).map((item) => item.role)).toEqual([])
  expect(postersForEdit(media, [media[2]!], []).map((item) => item.url)).toEqual(['https://cdn.example/poster.jpg'])
})
