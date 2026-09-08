import { MealsFailure } from './errors'

export const MAX_MEAL_IMAGE_BYTES = 5 * 1024 * 1024
export const MEAL_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

type MealImageMime = (typeof MEAL_IMAGE_MIME_TYPES)[number]

const signatures: ReadonlyArray<{ mime: MealImageMime; matches: (bytes: Buffer) => boolean }> = [
  {
    mime: 'image/jpeg',
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mime: 'image/png',
    matches: (bytes) =>
      bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    matches: (bytes) =>
      bytes.length >= 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  },
]

export function detectMealImageMime(bytes: Buffer): MealImageMime | null {
  return signatures.find(({ matches }) => matches(bytes))?.mime ?? null
}

export function validateMealImage(input: {
  base64: string
  declaredMime?: string
  maxBytes?: number
}): { bytes: Buffer; mime: MealImageMime } {
  const bytes = Buffer.from(input.base64, 'base64')
  const maxBytes = input.maxBytes ?? MAX_MEAL_IMAGE_BYTES
  if (!bytes.length || bytes.length > maxBytes) {
    throw new MealsFailure('bad_request', `Meal image must be between 1 and ${maxBytes} bytes`)
  }
  const detected = detectMealImageMime(bytes)
  if (!detected) {
    throw new MealsFailure('bad_request', 'Meal image must be JPEG, PNG, or WebP')
  }
  if (input.declaredMime && input.declaredMime.trim().toLowerCase() !== detected) {
    throw new MealsFailure('bad_request', 'Meal image MIME type does not match content')
  }
  return { bytes, mime: detected }
}
