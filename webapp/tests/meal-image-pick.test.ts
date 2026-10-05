import { describe, expect, test } from 'bun:test'

import {
  clipboardImageFiles,
  fileToMealImage,
  isAllowedMealImageFile,
  mealAttachPickerMode,
  mealImageOutputSize,
  mealImagePickInputProps,
  nextJpegQuality,
  pastedMealImageFiles,
  takeMealAttachRoom,
} from '../src/features/diary/meal-image-pick'

describe('meal image pick', () => {
  test('gallery input does not request the camera', () => {
    expect(mealImagePickInputProps('gallery')).toEqual({ accept: 'image/*' })
  })

  test('camera input asks the device for the rear camera', () => {
    expect(mealImagePickInputProps('camera')).toEqual({
      accept: 'image/*',
      capture: 'environment',
    })
  })

  test('desktop opens the gallery directly and phones keep the source menu', () => {
    expect(mealAttachPickerMode({ matches: true })).toBe('menu')
    expect(mealAttachPickerMode({ matches: false })).toBe('direct')
    expect(mealAttachPickerMode(null)).toBe('direct')
  })

  test('rejects files that are not jpeg, png, webp, or heic', async () => {
    const file = new File(['gif'], 'note.gif', { type: 'image/gif' })
    expect(isAllowedMealImageFile(file)).toBe(false)
    await expect(fileToMealImage(file)).rejects.toThrow('JPEG, PNG, WebP или HEIC')
  })

  test('accepts phone camera formats including HEIC and extension-only JPEGs', () => {
    expect(isAllowedMealImageFile(new File(['x'], 'IMG_001.HEIC', { type: 'image/heic' }))).toBe(true)
    expect(isAllowedMealImageFile(new File(['x'], 'lunch.jpg', { type: '' }))).toBe(true)
    expect(isAllowedMealImageFile(new File(['x'], 'lunch', { type: '' }))).toBe(false)
  })

  test('downscales phone-resolution photos to a compact long edge', () => {
    expect(mealImageOutputSize(4032, 3024)).toEqual({ width: 1280, height: 960 })
    expect(mealImageOutputSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  test('steps jpeg quality down until the floor', () => {
    expect(nextJpegQuality(0.82)).toBe(0.74)
    expect(nextJpegQuality(0.54)).toBeNull()
  })

  test('clipboard paste keeps images and leaves text alone', () => {
    const shot = new File(['png'], 'screenshot.png', { type: 'image/png' })
    const fromItems = clipboardImageFiles({
      items: [
        { kind: 'string', type: 'text/plain', getAsFile: () => null },
        { kind: 'file', type: 'image/png', getAsFile: () => shot },
      ],
      files: [],
    })
    expect(fromItems).toEqual([shot])
    expect(clipboardImageFiles({ items: [], files: [shot] })).toEqual([shot])
    expect(
      clipboardImageFiles({
        items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
        files: [],
      }),
    ).toEqual([])

    let prevented = false
    expect(
      pastedMealImageFiles({
        clipboardData: { items: [], files: [] },
        preventDefault: () => {
          prevented = true
        },
      }),
    ).toEqual([])
    expect(prevented).toBe(false)
  })

  test('attach room keeps earlier photos and reports the overflow', () => {
    expect(takeMealAttachRoom(6, 3)).toEqual({ taken: 2, overflow: true })
    expect(takeMealAttachRoom(8, 1)).toEqual({ taken: 0, overflow: true })
    expect(takeMealAttachRoom(1, 2)).toEqual({ taken: 2, overflow: false })
  })
})
