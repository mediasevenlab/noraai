export type HybridNotificationPermission = {
  display: string
}

export type HybridLocalNotifications = {
  requestPermissions: () => Promise<HybridNotificationPermission>
  schedule: (options: {
    notifications: Array<{
      id: number
      title: string
      body: string
      foreground?: boolean
    }>
  }) => Promise<void>
}

export type HybridRuntime = {
  Capacitor?: {
    isNativePlatform?: () => boolean
    registerPlugin?: (name: string) => unknown
    convertFileSrc?: (path: string) => string
    Plugins?: {
      LocalNotifications?: HybridLocalNotifications
    } & Record<string, unknown>
  }
}

export type HybridFavoriteNotifyResult =
  | { kind: 'skipped' }
  | { kind: 'unavailable' }
  | { kind: 'denied' }
  | { kind: 'scheduled'; title: string; body: string }

export function hybridRuntimeOf(runtime?: object): HybridRuntime {
  if (runtime) return runtime as HybridRuntime
  return globalThis as typeof globalThis & HybridRuntime
}

export function isHybridNativeRuntime(runtime: object = hybridRuntimeOf()) {
  return hybridRuntimeOf(runtime).Capacitor?.isNativePlatform?.() === true
}

export function getHybridPlugin<T>(name: string, runtime: object = hybridRuntimeOf()): T | undefined {
  const cap = hybridRuntimeOf(runtime).Capacitor
  if (!cap) return undefined
  const existing = cap.Plugins?.[name]
  if (existing) return existing as T
  const registered = cap.registerPlugin?.(name)
  return (registered as T | undefined) ?? (cap.Plugins?.[name] as T | undefined)
}

export function favoriteAddedNotification(title: string) {
  const body = title.trim() || 'Карточка'
  return {
    title: 'Добавлено в избранное',
    body,
  }
}

export async function notifyHybridFavoriteAdded(
  title: string,
  runtime: object = hybridRuntimeOf(),
): Promise<HybridFavoriteNotifyResult> {
  if (!isHybridNativeRuntime(runtime)) return { kind: 'skipped' }
  const plugin = getHybridPlugin<HybridLocalNotifications>('LocalNotifications', runtime)
  if (!plugin) return { kind: 'unavailable' }
  const permission = await plugin.requestPermissions()
  if (permission.display !== 'granted') return { kind: 'denied' }
  const notification = favoriteAddedNotification(title)
  await plugin.schedule({
    notifications: [
      {
        id: Math.floor(Date.now() % 2_000_000_000),
        ...notification,
        foreground: true,
      },
    ],
  })
  return { kind: 'scheduled', ...notification }
}
