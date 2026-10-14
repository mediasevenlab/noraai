import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { completeNoraChat } from './nora-chat-client'

const env = {
  LLM_BASE_URL: 'http://llm.test/v1',
  LLM_API_KEY: 'test-key',
  LLM_TEXT_MODEL: 'qwen2.5:7b',
  LLM_VISION_MODEL: 'qwen2.5vl:3b',
}

describe('Nora settings chat request', () => {
  test('posts the thread to the text model and returns its reply', async () => {
    const original = globalThis.fetch
    let body = ''
    let url = ''
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input)
      body = String(init?.body ?? '')
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'Белок строится из аминокислот.' } }] }),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Что такое белок?' },
        { role: 'assistant', text: 'Коротко: материал для тела.' },
        { role: 'user', text: 'Из чего он?' },
      ])
      expect(result).toEqual({ reply: 'Белок строится из аминокислот.', model: 'qwen2.5:7b' })
    } finally {
      globalThis.fetch = original
    }

    expect(url).toBe('http://llm.test/v1/chat/completions')
    const request = JSON.parse(body) as { model: string; messages: Array<{ role: string }> }
    expect(request.model).toBe('qwen2.5:7b')
    expect(request.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ])
  })

  test('a photo goes to the vision model already shrunk', async () => {
    const photo = await sharp({
      create: { width: 900, height: 700, channels: 3, background: { r: 20, g: 160, b: 30 } },
    })
      .jpeg()
      .toBuffer()
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Это яблоко.' } }] }), {
        status: 200,
      })
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Что это?', images: [{ base64: photo.toString('base64'), mime: 'image/jpeg' }] },
      ])
      expect(result.model).toBe('qwen2.5vl:3b')
    } finally {
      globalThis.fetch = original
    }

    const request = JSON.parse(body) as {
      model: string
      messages: Array<{ content: unknown }>
    }
    expect(request.model).toBe('qwen2.5vl:3b')
    const parts = request.messages[1]?.content as Array<{ image_url?: { url: string } }>
    const url = parts.find((part) => part.image_url)?.image_url?.url ?? ''
    const sent = Buffer.from(url.slice('data:image/jpeg;base64,'.length), 'base64')
    const meta = await sharp(sent).metadata()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
    expect(url).not.toContain(photo.toString('base64'))
  })
})
