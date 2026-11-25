import type { ChatAgentId } from '../domain/agent'

export type AgentTextEnv = {
  LLM_BASE_URL?: string
  LLM_API_KEY?: string
  LLM_TEXT_MODEL: string
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL: string
  OPENAI_MODEL: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL: string
  GEMINI_API_HOST: string
  GEMINI_API_PORT: number
}

export function agentReady(env: AgentTextEnv) {
  return {
    nora: Boolean(env.LLM_BASE_URL && env.LLM_API_KEY),
    chatgpt: Boolean(env.OPENAI_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
  }
}

export async function completeAgentText(
  env: AgentTextEnv,
  agent: ChatAgentId,
  system: string,
  user: string,
  signal?: AbortSignal,
) {
  if (agent === 'chatgpt') return completeOpenAi(env, system, user, signal)
  if (agent === 'gemini') return completeGemini(env, system, user, signal)
  return completeNora(env, system, user, signal)
}

async function completeNora(env: AgentTextEnv, system: string, user: string, signal?: AbortSignal) {
  const baseUrl = env.LLM_BASE_URL?.replace(/\/$/, '').replace(/\/v1$/, '')
  if (!baseUrl || !env.LLM_API_KEY) throw new Error('Локальная модель не настроена')
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.LLM_TEXT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      think: false,
      options: { num_ctx: 8192, num_predict: 900, temperature: 0.1 },
    }),
    signal: linkedSignal(signal, 180_000),
  })
  if (!response.ok) throw new Error('Локальная модель не ответила')
  const payload = await response.json() as { message?: { content?: unknown; thinking?: unknown } }
  const content = typeof payload.message?.content === 'string' ? payload.message.content.trim() : ''
  const thinking = typeof payload.message?.thinking === 'string' ? payload.message.thinking.trim() : ''
  const text = content || thinking
  if (!text) throw new Error('Локальная модель ничего не ответила')
  return text
}

async function completeOpenAi(env: AgentTextEnv, system: string, user: string, signal?: AbortSignal) {
  if (!env.OPENAI_API_KEY) throw new Error('Ключ ChatGPT не задан')
  const base = env.OPENAI_BASE_URL.replace(/\/$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: linkedSignal(signal, 60_000),
  })
  if (!response.ok) throw new Error('ChatGPT не ответил')
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const text = payload.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('ChatGPT ничего не ответил')
  return text
}

async function completeGemini(env: AgentTextEnv, system: string, user: string, signal?: AbortSignal) {
  if (!env.GEMINI_API_KEY) throw new Error('Ключ Gemini не задан')
  const path = `/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`
  const url = `https://${env.GEMINI_API_HOST}:${env.GEMINI_API_PORT}${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 900, responseMimeType: 'application/json' },
    }),
    signal: linkedSignal(signal, 60_000),
  })
  if (!response.ok) throw new Error('Gemini не ответил')
  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
  }
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()
  if (!text) throw new Error('Gemini ничего не ответил')
  return text
}

function linkedSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}
