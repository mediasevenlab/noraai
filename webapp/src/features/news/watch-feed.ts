import type { NewsPost } from '@web-app-demo/contracts'

const DEFAULT_INTERVAL_MS = 3_000
const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000

export async function waitForSavedPosts({
  previousIds,
  load,
  signal,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  previousIds: ReadonlySet<string>
  load: () => Promise<NewsPost[]>
  signal: AbortSignal
  intervalMs?: number
  timeoutMs?: number
}): Promise<NewsPost[] | null> {
  const deadline = Date.now() + timeoutMs
  while (!signal.aborted && Date.now() < deadline) {
    try {
      const posts = await load()
      if (signal.aborted) return null
      if (posts.some((post) => !previousIds.has(post.id))) return posts
    } catch {
      if (signal.aborted) return null
    }
    await wait(intervalMs, signal)
  }
  return null
}

function wait(ms: number, signal: AbortSignal) {
  if (signal.aborted || ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}
