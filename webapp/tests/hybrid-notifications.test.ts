import { describe, expect, test } from 'bun:test'

import {
  favoriteAddedNotification,
  getHybridPlugin,
  isHybridNativeRuntime,
  notifyHybridFavoriteAdded,
} from '../src/platform/hybrid-notifications'

describe('hybrid favorite notifications', () => {
  test('browser runtime stays silent', () => {
    expect(isHybridNativeRuntime({})).toBe(false)
    expect(isHybridNativeRuntime({ Capacitor: { isNativePlatform: () => false } })).toBe(false)
  })

  test('native runtime is detected from Capacitor', () => {
    expect(isHybridNativeRuntime({ Capacitor: { isNativePlatform: () => true } })).toBe(true)
  })

  test('registers missing native plugins through the injected Capacitor global', () => {
    const plugins: Record<string, unknown> = {}
    const camera = { takePhoto: async () => ({}) }
    expect(
      getHybridPlugin('Camera', {
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: plugins,
          registerPlugin(name: string) {
            plugins[name] = camera
            return camera
          },
        },
      }),
    ).toBe(camera)
    expect(plugins.Camera).toBe(camera)
  })

  test('favorite notification copy names the saved card', () => {
    expect(favoriteAddedNotification('Тестовый лёгкий день')).toEqual({
      title: 'Добавлено в избранное',
      body: 'Тестовый лёгкий день',
    })
    expect(favoriteAddedNotification('  ')).toEqual({
      title: 'Добавлено в избранное',
      body: 'Карточка',
    })
  })

  test('schedules a local notification only after permission', async () => {
    const scheduled: unknown[] = []
    const runtime = {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          LocalNotifications: {
            requestPermissions: async () => ({ display: 'granted' }),
            schedule: async (options: { notifications: unknown[] }) => {
              scheduled.push(options.notifications)
            },
          },
        },
      },
    }

    expect(await notifyHybridFavoriteAdded('Овсянка', {})).toEqual({ kind: 'skipped' })
    expect(
      await notifyHybridFavoriteAdded('Овсянка', {
        Capacitor: { isNativePlatform: () => true },
      }),
    ).toEqual({ kind: 'unavailable' })
    expect(
      await notifyHybridFavoriteAdded('Овсянка', {
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            LocalNotifications: {
              requestPermissions: async () => ({ display: 'denied' }),
              schedule: async () => undefined,
            },
          },
        },
      }),
    ).toEqual({ kind: 'denied' })

    const result = await notifyHybridFavoriteAdded('Овсянка', runtime)
    expect(result).toEqual({
      kind: 'scheduled',
      title: 'Добавлено в избранное',
      body: 'Овсянка',
    })
    expect(scheduled).toEqual([
      [
        expect.objectContaining({
          title: 'Добавлено в избранное',
          body: 'Овсянка',
          foreground: true,
        }),
      ],
    ])
    expect(scheduled[0]).toEqual([
      expect.objectContaining({
        title: 'Добавлено в избранное',
        body: 'Овсянка',
        foreground: true,
      }),
    ])
  })
})
