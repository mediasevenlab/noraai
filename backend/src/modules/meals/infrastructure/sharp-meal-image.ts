import sharp from 'sharp'

import { MEAL_IMAGE_SIZE_SPEC, type MealImageSize } from '../domain/meal-image-variants'

export type EncodedMealImage = { bytes: Buffer; mime: 'image/webp' }

export type MealImageEncodeSpec = {
  maxEdge: number
  quality: number
  effort?: number
}

export type MealImageProcessor = {
  encode(bytes: Buffer, size: MealImageSize): Promise<EncodedMealImage>
}

export async function encodeWebp(bytes: Buffer, spec: MealImageEncodeSpec) {
  return sharp(bytes)
    .rotate()
    .resize({
      width: spec.maxEdge,
      height: spec.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: spec.quality, effort: spec.effort ?? 4 })
    .toBuffer()
}

export async function encodeJpeg(bytes: Buffer, spec: MealImageEncodeSpec) {
  return sharp(bytes)
    .rotate()
    .resize({
      width: spec.maxEdge,
      height: spec.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: spec.quality, mozjpeg: true })
    .toBuffer()
}

export async function encodeMealImage(bytes: Buffer, size: MealImageSize): Promise<EncodedMealImage> {
  const spec = MEAL_IMAGE_SIZE_SPEC[size]
  return {
    bytes: await encodeWebp(bytes, spec),
    mime: 'image/webp',
  }
}

export const sharpMealImageProcessor: MealImageProcessor = {
  encode: encodeMealImage,
}
