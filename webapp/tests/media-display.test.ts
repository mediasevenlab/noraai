import { describe, expect, test } from 'bun:test'

import {
  displayMediaSrc,
  mealPhotoDisplaySize,
  mealPhotoFallbackSrc,
  mealPhotoNeedsPreview,
  mealPhotoOriginalSrc,
} from '../src/features/diary/media-display'

describe('media display src', () => {
  test('feed cards use thumbnails and the dialog uses the full variant', () => {
    expect(mealPhotoDisplaySize('md')).toBe('card')
    expect(mealPhotoDisplaySize('lg')).toBe('full')
  })

  test('leaves local previews unchanged', () => {
    expect(displayMediaSrc('blob:https://app/1', 'card')).toBe('blob:https://app/1')
    expect(displayMediaSrc('data:image/jpeg;base64,abc', 'full')).toBe('data:image/jpeg;base64,abc')
  })

  test('asks the meal image route for card or full without changing the signature', () => {
    const src = '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc'
    expect(displayMediaSrc(src, 'card')).toBe(`${src}&size=card`)
    expect(displayMediaSrc(src, 'full')).toBe(`${src}&size=full`)
    expect(displayMediaSrc(`${src}&size=card`, 'full')).toBe(`${src}&size=full`)
    expect(mealPhotoOriginalSrc(src, 'card')).toBe(`${src}&size=full`)
    expect(mealPhotoOriginalSrc('/rations/ration-01.jpg', 'card')).toBe('/rations/ration-01.jpg')
  })

  test('rewrites catalog photos to sibling webp variants', () => {
    expect(displayMediaSrc('/rations/ration-01.jpg', 'card')).toBe('/rations/ration-01.card.webp')
    expect(displayMediaSrc('/diary/meals/meal-01.jpg', 'full')).toBe('/diary/meals/meal-01.webp')
    expect(displayMediaSrc('/rations/ration-01.card.webp', 'full')).toBe(
      '/rations/ration-01.card.webp',
    )
    expect(displayMediaSrc('/catalog/sup-s-indejkoj-i-risom.jpg', 'card')).toBe(
      '/catalog/sup-s-indejkoj-i-risom.jpg',
    )
    expect(displayMediaSrc('/catalog/spagetti-v-slivochnom-souse-s-kuricej.png', 'full')).toBe(
      '/catalog/spagetti-v-slivochnom-souse-s-kuricej.png',
    )
    expect(displayMediaSrc('/rations/plan-cover-placeholder.png', 'card')).toBe(
      '/rations/plan-cover-placeholder.png',
    )
    expect(displayMediaSrc('/diary/meal-cover-placeholder.png', 'card')).toBe(
      '/diary/meal-cover-placeholder.png',
    )
  })

  test('falls back from a missing variant to the original photo, then the placeholder', () => {
    const original = '/rations/ration-01.jpg'
    const displaySrc = '/rations/ration-01.card.webp'
    const placeholder = '/diary/meal-preview-placeholder.jpg'
    expect(
      mealPhotoFallbackSrc({ attempted: 'display', displaySrc, originalSrc: original, placeholder }),
    ).toBe(original)
    expect(
      mealPhotoFallbackSrc({
        attempted: 'original',
        displaySrc,
        originalSrc: original,
        placeholder,
      }),
    ).toBe(placeholder)
    expect(
      mealPhotoFallbackSrc({
        attempted: 'placeholder',
        displaySrc,
        originalSrc: original,
        placeholder,
      }),
    ).toBeNull()
  })

  test('opens the dialog on the cached card photo while the full variant loads', () => {
    expect(mealPhotoNeedsPreview('/rations/ration-01.jpg', 'full')).toBe(true)
    expect(mealPhotoNeedsPreview('/rations/ration-01.jpg', 'card')).toBe(false)
    expect(mealPhotoNeedsPreview('blob:https://app/1', 'full')).toBe(false)
    const src = '/api/meals/11111111-1111-4111-8111-111111111111/image?exp=1&sig=abc'
    expect(mealPhotoNeedsPreview(src, 'full')).toBe(true)
  })
})
