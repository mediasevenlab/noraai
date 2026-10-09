import { createApp } from './app'
import { createBackendRuntime } from './runtime'
import { shutdownBackend } from './shutdown'

const runtime = createBackendRuntime()
const app = createApp({
  backgroundTasks: runtime.backgroundTasks,
  env: runtime.env,
  prisma: runtime.prisma,
  startMealsPoller: true,
  startPaymentRenewal: true,
})

const server = Bun.serve({
  port: runtime.env.PORT,
  // Two YooKassa attempts can take about 30s. The default 10s cuts the payment off first.
  idleTimeout: 40,
  fetch: app.fetch,
})

console.log(`Backend listening on ${server.url}`)
if (runtime.env.TELEGRAM_MEALS_BOT_TOKEN) {
  console.log('Telegram meals poller enabled')
}
if (runtime.env.TELEGRAM_NOTIFY_BOT_TOKEN) {
  console.log('Telegram notify poller enabled')
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
