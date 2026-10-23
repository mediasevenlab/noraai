import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { completeNoraChat, streamNoraChat } from './nora-chat-client'

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
        `${JSON.stringify({ message: { role: 'assistant', content: 'Белок строится из аминокислот.' }, done: true })}\n`,
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

    expect(url).toBe('http://llm.test/api/chat')
    const request = JSON.parse(body) as {
      model: string
      messages: Array<{ role: string }>
      think?: boolean
      stream?: boolean
      options?: { num_ctx?: number; num_predict?: number }
    }
    expect(request.model).toBe('qwen2.5:7b')
    expect(request.think).toBe(false)
    expect(request.stream).toBe(true)
    expect(request.options?.num_ctx).toBe(32768)
    expect(request.options?.num_predict).toBe(1024)
    expect(request.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ])
  })

  test('the reasoning button asks the text model to think', async () => {
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        `${JSON.stringify({ message: { role: 'assistant', thinking: 'Сверяю выдержку.', content: 'Срок равен четырём неделям.' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        env,
        [{ role: 'user', text: 'Какой срок?' }],
        false,
        undefined,
        undefined,
        true,
      )
      expect(result.reply).toBe('Срок равен четырём неделям.')
      expect(result.reasoning).toContain('Сверяю выдержку.')
    } finally {
      globalThis.fetch = original
    }
    const request = JSON.parse(body) as { think?: boolean; options?: { num_predict?: number } }
    expect(request.think).toBe(true)
    expect(request.options?.num_predict).toBe(8192)
  })

  test('a photo goes to the vision model already shrunk', async () => {
    const photo = await sharp({
      create: { width: 900, height: 700, channels: 3, background: { r: 20, g: 160, b: 30 } },
    })
      .jpeg()
      .toBuffer()
    const original = globalThis.fetch
    let body = ''
    let url = ''
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input)
      body = String(init?.body ?? '')
      return new Response(
        `${JSON.stringify({ message: { role: 'assistant', content: 'Это яблоко.' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Что это?', images: [{ base64: photo.toString('base64'), mime: 'image/jpeg' }] },
      ])
      expect(result.model).toBe('qwen2.5vl:3b')
      expect(result.reply).toBe('Это яблоко.')
    } finally {
      globalThis.fetch = original
    }

    expect(url).toBe('http://llm.test/api/chat')
    const request = JSON.parse(body) as {
      model: string
      think?: boolean
      stream?: boolean
      options?: { num_ctx?: number; num_predict?: number }
      messages: Array<{ role: string; content?: string; images?: string[] }>
    }
    expect(request.model).toBe('qwen2.5vl:3b')
    expect(request.think).toBe(false)
    expect(request.stream).toBe(true)
    expect(request.options?.num_ctx).toBe(16384)
    expect(request.options?.num_predict).toBe(2048)
    expect(request).not.toHaveProperty('max_tokens')
    const image = request.messages[1]?.images?.[0] ?? ''
    expect(image.startsWith('data:')).toBe(false)
    const sent = Buffer.from(image, 'base64')
    const meta = await sharp(sent).metadata()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
    expect(image).not.toContain(photo.toString('base64'))
    expect(String(request.messages[0]?.content)).toContain('КБЖУ')
  })

  test('reasoning on a photo still uses the vision window and does not ask the vision model to think', async () => {
    const photo = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 40, b: 20 } },
    })
      .jpeg()
      .toBuffer()
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        `${JSON.stringify({ message: { role: 'assistant', content: 'Около 450 ккал.' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        env,
        [{ role: 'user', text: 'Какая калорийность?', images: [{ base64: photo.toString('base64'), mime: 'image/jpeg' }] }],
        false,
        undefined,
        undefined,
        true,
      )
      expect(result.reply).toBe('Около 450 ккал.')
    } finally {
      globalThis.fetch = original
    }
    const request = JSON.parse(body) as { think?: boolean; options?: { num_ctx?: number } }
    expect(request.think).toBe(false)
    expect(request.options?.num_ctx).toBe(16384)
  })

  test('a context overflow is explained without the raw model error', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        '{"error":{"code":400,"message":"request (4120 tokens) exceeds the available context size (4096 tokens)","type":"exceed_context_size_error","n_prompt_tokens":4120,"n_ctx":4096}}',
        { status: 400 },
      )) as typeof fetch
    try {
      await expect(completeNoraChat(env, [{ role: 'user', text: 'Привет' }])).rejects.toThrow(/контекст модели/)
    } finally {
      globalThis.fetch = original
    }
  })

  test('returns the think block separately from the answer', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        `${JSON.stringify({
          message: {
            thinking: 'Считаю в столбик.',
            content: '<think>17 × 20 = 340, плюс 17 × 4.</think>\n408.',
          },
          done: true,
        })}\n`,
        { status: 200 },
      )) as unknown as typeof fetch
    try {
      const result = await completeNoraChat(
        env,
        [{ role: 'user', text: 'Сколько будет 17 × 24?' }],
        undefined,
        undefined,
        undefined,
        true,
      )
      expect(result.reply).toBe('408.')
      expect(result.reasoning).toContain('Считаю в столбик.')
      expect(result.reasoning).toContain('17 × 20')
      expect(result.reply).not.toContain('<think>')
    } finally {
      globalThis.fetch = original
    }
  })

  test('a text question can search the web and answer from the findings', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/search')) {
        return new Response(
          JSON.stringify({
            results: [{ title: 'Канберра', url: 'https://example.test/canberra', content: 'Столица Австралии.' }],
          }),
          { status: 200 },
        )
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: Array<{ role?: string }> }
      const searched = body.messages?.some((message) => message.role === 'tool')
      return new Response(
        JSON.stringify(
          searched
            ? { choices: [{ message: { content: 'Столица Австралии — Канберра.' } }] }
            : {
                choices: [
                  {
                    message: {
                      content: '',
                      tool_calls: [
                        {
                          id: 'call_1',
                          function: { name: 'web_search', arguments: '{"query":"столица Австралии"}' },
                        },
                      ],
                    },
                  },
                ],
              },
        ),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        { ...env, LLM_SEARCH_URL: 'http://search.test' },
        [{ role: 'user', text: 'Какая столица Австралии?' }],
        true,
      )
      expect(result.reply).toBe('Столица Австралии — Канберра.')
    } finally {
      globalThis.fetch = original
    }
    expect(calls.some((url) => url.startsWith('http://search.test/search?'))).toBe(true)
    expect(calls.filter((url) => url.endsWith('/chat/completions'))).toHaveLength(2)
  })

  test('a ready table list is printed word by word', async () => {
    const knowledge = 'NORA_TABLE_MENU\nВ файле «a.pdf» такие таблицы:\n1. План\n\nНапишите номер — построю её.'
    const chunks: string[] = []
    for await (const event of streamNoraChat(env, [{ role: 'user', text: 'какие таблицы?' }], false, knowledge)) {
      if (event.reply) chunks.push(event.reply)
    }
    expect(chunks.length).toBeGreaterThan(3)
    expect(chunks.join('')).toBe('В файле «a.pdf» такие таблицы:\n1. План\n\nНапишите номер — построю её.')
    expect(chunks.every((chunk) => chunk.length < 40)).toBe(true)
  })

  test('streams reasoning tokens before the answer', async () => {
    const original = globalThis.fetch
    const sse = [
      JSON.stringify({ message: { thinking: '17 × 20' }, done: false }),
      JSON.stringify({ message: { thinking: ' = 340' }, done: false }),
      JSON.stringify({ message: { content: '408' }, done: false }),
      JSON.stringify({ done: true, done_reason: 'stop' }),
      '',
    ].join('\n')
    globalThis.fetch = (async () =>
      new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })) as unknown as typeof fetch
    const events: Array<{ reasoning?: string; reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        env,
        [{ role: 'user', text: 'Сколько будет 17 × 24?' }],
        undefined,
        undefined,
        undefined,
        true,
      )) {
        if (event.reasoning || event.reply) events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    expect(events.map((event) => event.reasoning ?? event.reply)).toEqual(['17 × 20', ' = 340', '408'])
  })

  test('reasoning stays out of the answer when the button is off', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        `${JSON.stringify({ message: { thinking: 'Долгое рассуждение.', content: 'Привет.' }, done: true })}\n`,
        { status: 200 },
      )) as unknown as typeof fetch
    try {
      const result = await completeNoraChat(env, [{ role: 'user', text: 'Привет' }])
      expect(result.reply).toBe('Привет.')
      expect(result.reasoning).toBeUndefined()
    } finally {
      globalThis.fetch = original
    }
  })

  test('internet off answers without calling search', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input))
      const body = JSON.parse(String(init?.body ?? '{}')) as { tools?: unknown }
      expect(body.tools).toBeUndefined()
      return new Response(`${JSON.stringify({ message: { content: 'Отвечаю по памяти.' }, done: true })}\n`, {
        status: 200,
      })
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        { ...env, LLM_SEARCH_URL: 'http://search.test' },
        [{ role: 'user', text: 'Какая столица Австралии?' }],
        false,
      )
      expect(result.reply).toBe('Отвечаю по памяти.')
    } finally {
      globalThis.fetch = original
    }
    expect(calls.some((url) => url.includes('/search'))).toBe(false)
  })

  test('a completed search is reported and a failed search is not', async () => {
    const original = globalThis.fetch
    const answer = () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'Сейчас 11 градусов.' } }] }),
        { status: 200 },
      )
    const run = async (searchStatus: number) => {
      const events: Array<{ searched?: boolean }> = []
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        if (String(input).includes('/search')) {
          return new Response(
            JSON.stringify({
              results: [{ title: 'Погода', url: 'https://weather.example/nsk', content: 'Сейчас 11 градусов.' }],
            }),
            { status: searchStatus },
          )
        }
        return answer()
      }) as typeof fetch
      for await (const event of streamNoraChat(
        { ...env, LLM_SEARCH_URL: 'http://search.test' },
        [{ role: 'user', text: 'Какая погода?' }],
        true,
      )) {
        if (event.searched) events.push(event)
      }
      return events
    }
    try {
      expect(await run(200)).toEqual([{ searched: true }])
      expect(await run(503)).toEqual([])
    } finally {
      globalThis.fetch = original
    }
  })
})
