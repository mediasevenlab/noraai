import type { AppEnv } from '../../../env'
import { readAdVerdict } from '../domain/ad-verdict'

const GOOGLE_GEMINI_HOST = 'generativelanguage.googleapis.com'

const PROMPT = `Определи, реклама ли этот пост Telegram.
Верни только JSON {"ad": true} или {"ad": false}.
ad=true, если сам пост продаёт товар или услугу, содержит промокод, erid, партнёрскую ссылку, пометку о рекламе или прямой призыв купить и перейти.
ad=false, если это новость, мем или пересказ чужой акции без продажи от лица канала.`

type GeminiEnv = Pick<AppEnv, 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_API_HOST' | 'GEMINI_API_PORT' | 'GEMINI_PROXY_TOKEN'>

export function createNewsAdClassifier(env: GeminiEnv, fetchImpl: typeof fetch = fetch) {
  return {
    async classify(text: string) {
      const apiKey = env.GEMINI_API_KEY
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
      const body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nТекст:\n${text.slice(0, 6000)}` }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      })
      const path = `/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
      const response = await requestGemini(env, fetchImpl, path, body)
      const raw = await response.text()
      if (!response.ok) throw new Error(`Gemini ${response.status}`)
      return readAdVerdict(candidateText(raw))
    },
  }
}

async function requestGemini(env: GeminiEnv, fetchImpl: typeof fetch, path: string, body: string) {
  const targets = [{ host: env.GEMINI_API_HOST, port: env.GEMINI_API_PORT }]
  if (!isGoogleHost(env.GEMINI_API_HOST)) targets.push({ host: GOOGLE_GEMINI_HOST, port: 443 })
  let lastError: unknown
  for (const target of targets) {
    try {
      return await fetchImpl(`https://${target.host}:${target.port}${path}`, {
        method: 'POST',
        headers: geminiHeaders(env, target.host),
        body,
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini network error')
}

function geminiHeaders(env: GeminiEnv, host: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.GEMINI_PROXY_TOKEN && !isGoogleHost(host)) {
    headers.Authorization = `Bearer ${env.GEMINI_PROXY_TOKEN}`
    headers['X-Gemini-Proxy-Token'] = env.GEMINI_PROXY_TOKEN
  }
  return headers
}

function isGoogleHost(host: string) {
  return host === GOOGLE_GEMINI_HOST || host.endsWith('.googleapis.com')
}

function candidateText(raw: string) {
  try {
    const payload = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return (payload.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('\n')
  } catch {
    return ''
  }
}

