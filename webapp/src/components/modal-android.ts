export const ANDROID_MODAL_SAFE_ATTR = 'data-android'
export const HYBRID_SHELL_ATTR = 'data-hybrid'

export type HybridShellRuntime = {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

export function isAndroidClient(userAgent: string) {
  return /Android/i.test(userAgent)
}

export function isAndroidWebView(userAgent: string) {
  return /Android/i.test(userAgent) && /; wv\)/i.test(userAgent)
}

function hybridShellRuntime(runtime?: HybridShellRuntime): HybridShellRuntime {
  if (runtime) return runtime
  return globalThis as typeof globalThis & HybridShellRuntime
}

export function isHybridNativeRuntime(runtime: HybridShellRuntime = hybridShellRuntime()) {
  return runtime.Capacitor?.isNativePlatform?.() === true
}

export function isHybridShell(input: {
  userAgent: string
  runtime?: HybridShellRuntime
}) {
  return isHybridNativeRuntime(hybridShellRuntime(input.runtime)) || isAndroidWebView(input.userAgent)
}

export function applyAndroidModalSafe(
  root: Pick<Element, 'setAttribute' | 'removeAttribute'> | null,
  userAgent: string,
) {
  if (!root) return false
  if (isAndroidClient(userAgent)) {
    root.setAttribute(ANDROID_MODAL_SAFE_ATTR, '')
    return true
  }
  root.removeAttribute(ANDROID_MODAL_SAFE_ATTR)
  return false
}

export function applyHybridRuntimeFlags(
  root: Pick<Element, 'setAttribute' | 'removeAttribute'> | null,
  input: { userAgent: string; runtime?: HybridShellRuntime },
) {
  const android = applyAndroidModalSafe(root, input.userAgent)
  if (!root) return { android: false, hybrid: false }
  const hybrid = isHybridShell({
    userAgent: input.userAgent,
    runtime: hybridShellRuntime(input.runtime),
  })
  if (hybrid) root.setAttribute(HYBRID_SHELL_ATTR, '')
  else root.removeAttribute(HYBRID_SHELL_ATTR)
  return { android, hybrid }
}
