import { describe, expect, test } from 'bun:test'

import { pickHybridMealImage } from '../src/platform/hybrid-camera'

const jpegFetch = async () =>
  new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } })

describe('hybrid camera pick', () => {
  test('browser runtime stays on the HTML file input', async () => {
    expect(await pickHybridMealImage('camera', {})).toEqual({ kind: 'skipped' })
  })

  test('registers Camera on the injected Capacitor global', async () => {
    const plugins: Record<string, unknown> = {}
    const names: string[] = []
    const picked = await pickHybridMealImage('camera', {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: plugins,
        registerPlugin(name: string) {
          names.push(name)
          const camera = {
            takePhoto: async () => ({ webPath: 'https://capacitor.local/photo.jpg' }),
          }
          plugins[name] = camera
          return camera
        },
      },
      fetch: jpegFetch,
    })
    expect(names).toEqual(['Camera'])
    expect(picked.kind).toBe('file')
  })

  test('opens the native camera instead of the gallery', async () => {
    const calls: string[] = []
    const file = await pickHybridMealImage('camera', {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Camera: {
            takePhoto: async () => {
              calls.push('takePhoto')
              return { webPath: 'https://capacitor.local/photo.jpg' }
            },
            chooseFromGallery: async () => {
              calls.push('gallery')
              return { results: [] }
            },
          },
        },
      },
      fetch: jpegFetch,
    })
    expect(calls).toEqual(['takePhoto'])
    expect(file.kind).toBe('file')
    if (file.kind === 'file') {
      expect(file.file.type).toBe('image/jpeg')
    }
  })

  test('falls back to getPhoto when takePhoto is unimplemented', async () => {
    const calls: string[] = []
    const picked = await pickHybridMealImage('camera', {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Camera: {
            takePhoto: async () => {
              calls.push('takePhoto')
              throw new Error('UNIMPLEMENTED')
            },
            getPhoto: async (options) => {
              calls.push(`getPhoto:${options.source}:${options.resultType}`)
              return { base64String: btoa('jpeg'), format: 'jpeg' }
            },
            chooseFromGallery: async () => {
              calls.push('gallery')
              return { results: [] }
            },
          },
        },
      },
    })
    expect(calls).toEqual(['takePhoto', 'getPhoto:CAMERA:base64'])
    expect(picked.kind).toBe('file')
  })

  test('denied camera permission does not open the gallery', async () => {
    expect(
      await pickHybridMealImage('camera', {
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            Camera: {
              takePhoto: async () => {
                throw Object.assign(new Error("Couldn't access camera. Check your camera permissions and try again."), {
                  code: 'OS-PLUG-CAMR-0003',
                })
              },
              getPhoto: async () => {
                throw new Error('should not getPhoto')
              },
              chooseFromGallery: async () => {
                throw new Error('should not open gallery')
              },
            },
          },
        },
      }),
    ).toEqual({ kind: 'unavailable' })
  })

  test('treats a user cancel as canceled, not a fallback to the gallery', async () => {
    expect(
      await pickHybridMealImage('camera', {
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            Camera: {
              takePhoto: async () => {
                throw Object.assign(new Error("Couldn't take photo because the process was canceled."), {
                  code: 'OS-PLUG-CAMR-0006',
                })
              },
            },
          },
        },
      }),
    ).toEqual({ kind: 'canceled' })
  })
})
