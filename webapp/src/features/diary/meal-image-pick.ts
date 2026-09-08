export type MealImagePickSource = 'gallery' | 'camera'
export type MealAttachPickerMode = 'menu' | 'direct'
export type MealImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

export const MEAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024
/** Long edge for stored/upload photos: sharp enough for meal analysis, small on the wire. */
export const MEAL_IMAGE_MAX_EDGE = 1280
export const MEAL_IMAGE_TARGET_BYTES = 180 * 1024
export const MEAL_IMAGE_JPEG_QUALITY = 0.82

const MEAL_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function mealImagePickInputProps(source: MealImagePickSource): {
  accept: 'image/*'
  capture?: 'environment'
} {
  if (source === 'camera') {
    return { accept: 'image/*', capture: 'environment' }
  }
  return { accept: 'image/*' }
}

/** Phones: plus opens a gallery/camera menu. Desktop: plus opens the file picker. */
export function mealAttachPickerMode(
  query?: { matches: boolean } | null,
): MealAttachPickerMode {
  return query?.matches ? 'menu' : 'direct'
}

export function isAllowedMealImageFile(file: File) {
  const type = file.type.trim().toLowerCase()
  if (
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/heic' ||
    type === 'image/heif'
  ) {
    return true
  }
  if (type && !type.startsWith('image/')) return false
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
}

export function mealImageOutputSize(
  width: number,
  height: number,
  maxEdge = MEAL_IMAGE_MAX_EDGE,
) {
  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { width, height }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function nextJpegQuality(quality: number) {
  const next = Math.round((quality - 0.08) * 100) / 100
  return next >= 0.5 ? next : null
}

export async function mealImageFromUrl(
  url: string,
): Promise<{ base64: string; mime: MealImageMime } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const mime =
      blob.type === 'image/png' || blob.type === 'image/webp' || blob.type === 'image/jpeg'
        ? blob.type
        : 'image/jpeg'
    const file = new File([blob], 'meal.jpg', { type: mime })
    return fileToMealImage(file)
  } catch {
    return null
  }
}

export async function fileToMealImage(file: File): Promise<{ base64: string; mime: MealImageMime }> {
  if (!isAllowedMealImageFile(file)) {
    return Promise.reject(new Error('Можно добавить только JPEG, PNG, WebP или HEIC'))
  }
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return readFileAsMealImage(file)
  }
  try {
    return await compressMealImage(file)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Можно добавить')) throw error
    if (MEAL_IMAGE_MIMES.includes(file.type as MealImageMime) && file.size <= MEAL_IMAGE_MAX_BYTES) {
      return readFileAsMealImage(file)
    }
    throw error instanceof Error ? error : new Error('Не удалось обработать фото')
  }
}

async function compressMealImage(file: File): Promise<{ base64: string; mime: MealImageMime }> {
  const bitmap = await decodeMealImage(file)
  const size = mealImageOutputSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Не удалось обработать фото')
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()

  let quality = MEAL_IMAGE_JPEG_QUALITY
  let blob = await canvasToJpeg(canvas, quality)
  let next = nextJpegQuality(quality)
  while (blob.size > MEAL_IMAGE_TARGET_BYTES && next !== null) {
    quality = next
    blob = await canvasToJpeg(canvas, quality)
    next = nextJpegQuality(quality)
  }
  if (blob.size > MEAL_IMAGE_MAX_BYTES) {
    throw new Error('Размер фото не должен превышать 5 МБ')
  }
  return {
    base64: await blobToBase64(blob),
    mime: 'image/jpeg',
  }
}

async function decodeMealImage(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      const image = await loadHtmlImage(file)
      return createImageBitmap(image)
    }
  }
}

function loadHtmlImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось прочитать фото'))
    }
    image.src = url
  })
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось сжать фото'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      if (!base64) {
        reject(new Error('Пустое фото'))
        return
      }
      resolve(base64)
    }
    reader.readAsDataURL(blob)
  })
}

function readFileAsMealImage(file: File): Promise<{ base64: string; mime: MealImageMime }> {
  if (!MEAL_IMAGE_MIMES.includes(file.type as MealImageMime)) {
    return Promise.reject(new Error('Можно добавить только JPEG, PNG, WebP или HEIC'))
  }
  if (file.size > MEAL_IMAGE_MAX_BYTES) {
    return Promise.reject(new Error('Размер фото не должен превышать 5 МБ'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      if (!base64) {
        reject(new Error('Пустое фото'))
        return
      }
      resolve({ base64, mime: file.type as MealImageMime })
    }
    reader.readAsDataURL(file)
  })
}
