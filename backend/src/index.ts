import { createApp } from './app'
import { createBackendRuntime } from './runtime'
import { shutdownBackend } from './shutdown'

const runtime = createBackendRuntime()
const app = createApp({
  backgroundTasks: runtime.backgroundTasks,
  env: runtime.env,
  prisma: runtime.prisma,
  startMealsPoller: false,
})

const server = Bun.serve({
  port: runtime.env.PORT,
  // Meetings accept up to 256 MB. Bun otherwise closes the socket at 128 MB.
  maxRequestBodySize: 256 * 1024 * 1024,
  // A Qwen reply with reasoning can take longer than the default idle timeout.
  idleTimeout: 120,
  fetch(request, bunServer) {
    // A scanned PDF is several vision calls. A long meeting upload is the
    // file body itself; the speech copy continues after the response.
    const path = new URL(request.url).pathname
    if (
      request.method === 'POST' &&
      (/\/knowledge-bases\/[^/]+\/files\/?$/.test(path) ||
        /\/model-chat\/?$/.test(path) ||
        /\/meetings\/?$/.test(path))
    ) {
      bunServer.timeout(request, 1500)
    }
    return app.fetch(request)
  },
})

console.log(`Backend listening on ${server.url}`)
if (runtime.env.TELEGRAM_MEALS_BOT_TOKEN) {
  console.log('Telegram meals poller enabled')
}
if (runtime.env.TELEGRAM_NOTIFY_BOT_TOKEN) {
  console.log('Telegram notify poller enabled')
}
if (runtime.env.N8N_NEWS_ARCHIVE_WEBHOOK_URL) {
  console.log('News archive webhook enabled')
}

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`Backend received ${signal}; shutting down`)
  await app.dispose()
  await shutdownBackend(
    server,
    runtime,
    runtime.env.SHUTDOWN_GRACE_SECONDS * 1000,
  )
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

