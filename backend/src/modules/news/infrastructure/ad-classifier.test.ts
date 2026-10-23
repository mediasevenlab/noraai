import { expect, test } from 'bun:test'

import { createNewsAdClassifier } from './ad-classifier'

const env = {
  GEMINI_API_KEY: 'test-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_API_HOST: 'generativelanguage.googleapis.com',
  GEMINI_API_PORT: 443,
  GEMINI_PROXY_TOKEN: 'proxy-secret',
}

test('the model JSON marks a selling post and leaves a news post unmarked', async () => {
  const calls: string[] = []
  const classifier = createNewsAdClassifier(env, async (input, init) => {
    calls.push(String(input))
    const body = JSON.parse(String(init?.body)) as { contents: Array<{ parts: Array<{ text: string }> }> }
    const text = body.contents[0]?.parts[0]?.text ?? ''
    const post = text.split('Текст:\n').at(-1) ?? ''
    const ad = post.includes('промокод')
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ ad }) }] } }],
    }))
  })

  expect(await classifier.classify('Скидка по промокоду SALE')).toBe(true)
  expect(await classifier.classify('Вышла новая игра')).toBe(false)
  expect(calls[0]).toContain('generativelanguage.googleapis.com')
  expect(calls[0]).not.toContain('proxy-secret')
})

test('a proxy host failure falls back to Google and does not send the proxy token there', async () => {
  const seen: Array<{ host: string; authorization: string | null }> = []
  const classifier = createNewsAdClassifier(
    { ...env, GEMINI_API_HOST: 'proxy.example', GEMINI_API_PORT: 8443 },
    async (input, init) => {
      const url = new URL(String(input))
      const headers = new Headers(init?.headers)
      seen.push({ host: url.host, authorization: headers.get('authorization') })
      if (url.hostname === 'proxy.example') throw new Error('proxy down')
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"ad":true}' }] } }],
      }))
    },
  )

  expect(await classifier.classify('Купи сейчас')).toBe(true)
  expect(seen.map((item) => item.host)).toEqual(['proxy.example:8443', 'generativelanguage.googleapis.com'])
  expect(seen[0]?.authorization).toBe('Bearer proxy-secret')
  expect(seen[1]?.authorization).toBeNull()
})

test('a missing model key does not invent an ad mark', async () => {
  const classifier = createNewsAdClassifier({ ...env, GEMINI_API_KEY: undefined })
  await expect(classifier.classify('Купи')).rejects.toThrow('GEMINI_API_KEY')
})
