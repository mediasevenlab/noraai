import { getHybridPlugin, isHybridNativeRuntime, type HybridRuntime } from './hybrid-notifications'

export type MealImagePickSource = 'gallery' | 'camera'

export type HybridCameraPlugin = {
  takePhoto?: (options: { quality?: number }) => Promise<{
    webPath?: string
    uri?: string
    thumbnail?: string
  }>
  chooseFromGallery?: (options: {
    quality?: number
    limit?: number
  }) => Promise<{ results?: Array<{ webPath?: string; uri?: string; thumbnail?: string }> }>
  getPhoto?: (options: {
    quality?: number
    source?: 'CAMERA' | 'PHOTOS'
    resultType?: 'uri' | 'base64' | 'dataUrl'
  }) => Promise<{ webPath?: string; base64String?: string; dataUrl?: string; format?: string }>
}

export type HybridCameraRuntime = HybridRuntime & {
  fetch?: typeof fetch
}

export type HybridMealImagePickResult =
  | { kind: 'skipped' }
  | { kind: 'unavailable' }
  | { kind: 'canceled' }
  | { kind: 'file'; file: File }

function cameraPlugin(runtime: HybridCameraRuntime) {
  return getHybridPlugin<HybridCameraPlugin>('Camera', runtime)
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    const extra = 'code' in error && typeof error.code === 'string' ? error.code : ''
    return `${extra} ${error.message}`
  }
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string }
    return `${record.code ?? ''} ${record.message ?? JSON.stringify(error)}`
  }
  return String(error ?? '')
}

function isPermissionDenied(error: unknown) {
  const text = errorText(error)
  return /OS-PLUG-CAMR-0003/i.test(text) || /camera permissions/i.test(text)
}

function isCanceled(error: unknown) {
  const text = errorText(error)
  return /cancel/i.test(text) || /OS-PLUG-CAMR-0006/i.test(text) || /NO_PICTURE/i.test(text)
}

async function fileFromUrl(url: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error('Не удалось прочитать фото')
  const blob = await response.blob()
  const type = blob.type || 'image/jpeg'
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  return new File([blob], `meal.${ext}`, { type })
}

function fileFromBase64(base64: string, mime = 'image/jpeg') {
  const raw = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
  const binary = atob(raw)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const ext = mime.includes('png') ? 'png' : 'jpg'
  return new File([bytes], `meal.${ext}`, { type: mime })
}

async function fileFromPhoto(
  photo: {
    webPath?: string
    uri?: string
    thumbnail?: string
    base64String?: string
    dataUrl?: string
    format?: string
  },
  fetchImpl: typeof fetch,
  convertFileSrc?: (path: string) => string,
) {
  if (photo.dataUrl) return fileFromBase64(photo.dataUrl)
  if (photo.base64String) {
    const mime = photo.format === 'png' ? 'image/png' : 'image/jpeg'
    return fileFromBase64(photo.base64String, mime)
  }
  const urls = [
    photo.webPath,
    photo.uri && convertFileSrc ? convertFileSrc(photo.uri) : undefined,
    photo.uri,
  ].filter((url): url is string => Boolean(url))
  for (const url of urls) {
    try {
      return await fileFromUrl(url, fetchImpl)
    } catch {
      // Remote origin + Capacitor file URL can fail; try the next candidate.
    }
  }
  if (photo.thumbnail) return fileFromBase64(photo.thumbnail)
  throw new Error('Пустое фото')
}

async function captureFromCamera(
  plugin: HybridCameraPlugin,
  fetchImpl: typeof fetch,
  convertFileSrc?: (path: string) => string,
) {
  if (typeof plugin.takePhoto === 'function') {
    try {
      const photo = await plugin.takePhoto({ quality: 82 })
      return await fileFromPhoto(photo, fetchImpl, convertFileSrc)
    } catch (error) {
      if (isCanceled(error) || isPermissionDenied(error) || typeof plugin.getPhoto !== 'function') {
        throw error
      }
    }
  }
  if (typeof plugin.getPhoto !== 'function') throw new Error('Камера недоступна')
  const photo = await plugin.getPhoto({
    quality: 82,
    source: 'CAMERA',
    resultType: 'base64',
  })
  return fileFromPhoto(photo, fetchImpl, convertFileSrc)
}

export async function pickHybridMealImage(
  source: MealImagePickSource,
  runtime: HybridCameraRuntime = globalThis,
): Promise<HybridMealImagePickResult> {
  if (!isHybridNativeRuntime(runtime)) return { kind: 'skipped' }
  const plugin = cameraPlugin(runtime)
  if (!plugin) return { kind: 'unavailable' }
  const fetchImpl = runtime.fetch ?? globalThis.fetch
  const convertFileSrc = runtime.Capacitor?.convertFileSrc
  try {
    if (source === 'camera') {
      return {
        kind: 'file',
        file: await captureFromCamera(plugin, fetchImpl, convertFileSrc),
      }
    }
    if (typeof plugin.chooseFromGallery === 'function') {
      const picked = await plugin.chooseFromGallery({ quality: 82, limit: 1 })
      const photo = picked.results?.[0]
      if (!photo) return { kind: 'canceled' }
      return { kind: 'file', file: await fileFromPhoto(photo, fetchImpl, convertFileSrc) }
    }
    if (typeof plugin.getPhoto === 'function') {
      const photo = await plugin.getPhoto({
        quality: 82,
        source: 'PHOTOS',
        resultType: 'base64',
      })
      return { kind: 'file', file: await fileFromPhoto(photo, fetchImpl, convertFileSrc) }
    }
    return { kind: 'unavailable' }
  } catch (error) {
    if (isCanceled(error)) return { kind: 'canceled' }
    return { kind: 'unavailable' }
  }
}
