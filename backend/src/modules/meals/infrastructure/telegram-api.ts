export type TelegramApiEnv = {
  TELEGRAM_API_BASE?: string
  GEMINI_PROXY_TOKEN?: string
}

function apiBase(env: TelegramApiEnv) {
  return env.TELEGRAM_API_BASE?.replace(/\/$/, '') ?? ''
}

function usesProxy(env: TelegramApiEnv) {
  const base = apiBase(env)
  return Boolean(base) && !base.includes('://api.telegram.org')
}

/** Direct Telegram, or the same foreign HTTPS proxy Gemini already uses. */
export function telegramBotMethodUrl(env: TelegramApiEnv, token: string, method: string) {
  const base = apiBase(env)
  if (!base) return `https://api.telegram.org/bot${token}/${method}`
  return `${base}/bot${token}/${method}`
}

export function telegramFileUrl(env: TelegramApiEnv, token: string, filePath: string) {
  const base = apiBase(env)
  if (!base) return `https://api.telegram.org/file/bot${token}/${filePath}`
  return `${base}/file/bot${token}/${filePath}`
}

export function telegramApiHeaders(env: TelegramApiEnv, json = true): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (usesProxy(env) && env.GEMINI_PROXY_TOKEN) {
    headers.Authorization = `Bearer ${env.GEMINI_PROXY_TOKEN}`
    headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
  }
  return headers
}
