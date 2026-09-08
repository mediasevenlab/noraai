export const N8N_FALLBACK_FROM = 'n8n' as const

export type N8nFallbackChannel = 'analyze' | 'transcribe'

export function markN8nFallback<T extends object>(result: T): T & { fallbackFrom: typeof N8N_FALLBACK_FROM } {
  return { ...result, fallbackFrom: N8N_FALLBACK_FROM }
}

export function reportN8nFallback(channel: N8nFallbackChannel, detail: string, cause?: unknown) {
  const message = `n8n ${channel} fallback to Gemini: ${detail}`
  if (cause === undefined) {
    console.warn(message)
    return
  }
  console.warn(message, cause)
}
