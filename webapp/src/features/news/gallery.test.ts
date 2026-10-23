import { expect, test } from 'bun:test'

import { newsCoverUrls, newsSlides } from './gallery'

test('several photos of one post stay one gallery in source order', () => {
  const media = [
    { kind: 'image' as const, url: 'https://cdn.example/a.jpg' },
    { kind: 'image' as const, url: 'https://cdn.example/b.jpg' },
  ]
  expect(newsSlides(media)).toEqual([
    { kind: 'image', url: 'https://cdn.example/a.jpg' },
    { kind: 'image', url: 'https://cdn.example/b.jpg' },
  ])
  expect(newsCoverUrls(media)).toEqual([
    'https://cdn.example/a.jpg',
    'https://cdn.example/b.jpg',
  ])
})

test('a video preview is the poster, not a second slide', () => {
  const media = [
    { kind: 'image' as const, url: 'https://cdn.example/poster.jpg', role: 'poster' as const },
    { kind: 'video' as const, url: 'https://cdn.example/clip.mp4' },
  ]
  expect(newsSlides(media)).toEqual([
    { kind: 'video', url: 'https://cdn.example/clip.mp4', poster: 'https://cdn.example/poster.jpg' },
  ])
  expect(newsCoverUrls(media)).toEqual(['https://cdn.example/poster.jpg'])
})

test('photos and a video share one gallery, and the card cover stays the photos', () => {
  const media = [
    { kind: 'image' as const, url: 'https://cdn.example/a.jpg' },
    { kind: 'video' as const, url: 'https://cdn.example/clip.mp4' },
  ]
  expect(newsSlides(media)).toEqual([
    { kind: 'image', url: 'https://cdn.example/a.jpg' },
    { kind: 'video', url: 'https://cdn.example/clip.mp4' },
  ])
  expect(newsCoverUrls(media)).toEqual(['https://cdn.example/a.jpg'])
})
