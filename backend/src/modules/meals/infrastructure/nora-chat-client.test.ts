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

  test('a selected meeting keeps a wider window so the whole transcript can be read', async () => {
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        `${JSON.stringify({ message: { role: 'assistant', content: 'Спикер 1 говорит о плане.' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      await completeNoraChat(
        env,
        [{ role: 'user', text: 'Резюмируй встречу по каждому спикеру' }],
        false,
        'Расшифровки выбранных встреч.\nСпикер 1:\nПлан на месяц.',
      )
    } finally {
      globalThis.fetch = original
    }
    const request = JSON.parse(body) as { options?: { num_ctx?: number; num_predict?: number } }
    expect(request.options?.num_ctx).toBe(65536)
    expect(request.options?.num_predict).toBe(3072)
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
    const bodies: string[] = []
    const urls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(input))
      bodies.push(String(init?.body ?? ''))
      return new Response(
        `${JSON.stringify({ message: { role: 'assistant', content: 'Это яблоко.' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Что это?', images: [{ base64: photo.toString('base64'), mime: 'image/jpeg' }] },
      ])
      expect(result.model).toBe('qwen2.5:7b')
      expect(result.reply).toBe('Это яблоко.')
    } finally {
      globalThis.fetch = original
    }

    expect(urls).toEqual(['http://llm.test/api/chat', 'http://llm.test/api/chat'])
    const glance = JSON.parse(bodies[0] ?? '{}') as {
      model: string
      think?: boolean
      stream?: boolean
      options?: { num_ctx?: number; num_predict?: number }
      messages: Array<{ role: string; content?: string; images?: string[] }>
    }
    expect(glance.model).toBe('qwen2.5vl:3b')
    expect(glance.think).toBe(false)
    expect(glance.stream).toBe(true)
    expect(glance.options?.num_ctx).toBe(16384)
    expect(glance.options?.num_predict).toBe(512)
    expect(glance).not.toHaveProperty('max_tokens')
    const image = glance.messages[1]?.images?.[0] ?? ''
    expect(image.startsWith('data:')).toBe(false)
    const sent = Buffer.from(image, 'base64')
    const meta = await sharp(sent).metadata()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
    expect(image).not.toContain(photo.toString('base64'))
    expect(String(glance.messages[0]?.content)).toContain('КБЖУ')
    const answer = JSON.parse(bodies[1] ?? '{}') as { model: string; messages: Array<{ content?: string }> }
    expect(answer.model).toBe('qwen2.5:7b')
    expect(JSON.stringify(answer.messages)).toContain('Что видно на изображении')
    expect(JSON.stringify(answer.messages)).toContain('Это яблоко.')
  })

  test('a request to build a table asks the vision model for the grid itself', async () => {
    const photo = await sharp({
      create: { width: 64, height: 40, channels: 3, background: { r: 250, g: 250, b: 250 } },
    })
      .png()
      .toBuffer()
    const original = globalThis.fetch
    const bodies: string[] = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ''))
      const vision = bodies.length === 1
      return new Response(
        `${JSON.stringify({
          message: { role: 'assistant', content: vision ? 'ШАПКА: Рейс | №\nСТРОКА: пусто | 5202' : 'Таблица готова.' },
          done: true,
        })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Построй таблицу по изображению.', images: [{ base64: photo.toString('base64'), mime: 'image/png' }] },
      ])
      expect(result.reply).toContain('5202')
      expect(result.reply).toContain('Рейс')
      expect(result.reply.startsWith('|')).toBe(true)
    } finally {
      globalThis.fetch = original
    }
    expect(bodies).toHaveLength(1)
    const glance = JSON.parse(bodies[0] ?? '{}') as { options?: { num_predict?: number }; messages: Array<{ content?: string }> }
    expect(glance.options?.num_predict).toBe(2048)
    expect(String(glance.messages[0]?.content)).toContain('ШАПКА:')
    expect(String(glance.messages[0]?.content)).not.toContain('двумя-тремя предложениями')
  })

  test('a tall screenshot is read in bands and the bands reach the answer', async () => {
    const page = await sharp({
      create: { width: 200, height: 3000, channels: 3, background: { r: 250, g: 250, b: 250 } },
    })
      .png()
      .toBuffer()
    const original = globalThis.fetch
    const bodies: string[] = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ''))
      const vision = bodies.length === 1
      return new Response(
        `${JSON.stringify({
          message: { role: 'assistant', content: vision ? 'Колонка | 1' : 'Таблица готова.' },
          done: true,
        })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(env, [
        { role: 'user', text: 'Построй таблицу по этому изображению.', images: [{ base64: page.toString('base64'), mime: 'image/png' }] },
      ])
      expect(result.reply).toBe('Таблица готова.')
    } finally {
      globalThis.fetch = original
    }
    expect(bodies.length).toBeGreaterThan(2)
    const first = JSON.parse(bodies[0] ?? '{}') as { messages: Array<{ content?: string; images?: string[] }> }
    expect(String(first.messages[0]?.content)).toContain('фрагмент')
    expect(first.messages[1]?.images).toHaveLength(1)
    const sent = Buffer.from(first.messages[1]?.images?.[0] ?? '', 'base64')
    const meta = await sharp(sent).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height ?? 0).toBeGreaterThan(400)
    const answer = JSON.parse(bodies.at(-1) ?? '{}') as { messages: Array<{ content?: string }> }
    expect(JSON.stringify(answer.messages)).toContain('Колонка | 1')
  })

  test('reasoning on a photo still uses the vision window and does not ask the vision model to think', async () => {
    const photo = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 40, b: 20 } },
    })
      .jpeg()
      .toBuffer()
    const original = globalThis.fetch
    const bodies: string[] = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ''))
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
    const glance = JSON.parse(bodies[0] ?? '{}') as { think?: boolean; model?: string; options?: { num_ctx?: number } }
    expect(glance.model).toBe('qwen2.5vl:3b')
    expect(glance.think).toBe(false)
    expect(glance.options?.num_ctx).toBe(16384)
    const answer = JSON.parse(bodies[1] ?? '{}') as { think?: boolean; model?: string }
    expect(answer.model).toBe('qwen2.5:7b')
    expect(answer.think).toBe(true)
  })

  test('a photo, a question, and search are one reply', async () => {
    const photo = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .toBuffer()
    const original = globalThis.fetch
    const calls: string[] = []
    const models: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/search')) {
        return new Response(
          JSON.stringify({
            results: [{ title: 'Пюре', url: 'https://example.test/puree', content: 'Рецепт пюре с соусом.' }],
          }),
          { status: 200 },
        )
      }
      const raw = String(init?.body ?? '')
      const body = JSON.parse(raw) as { model?: string }
      models.push(body.model ?? '')
      if (url.endsWith('/api/chat') && body.model === 'qwen2.5vl:3b') {
        return new Response(
          `${JSON.stringify({ message: { content: 'Картофельное пюре с мясным соусом\nНа тарелке пюре и соус.' }, done: true })}\n`,
          { status: 200 },
        )
      }
      if (raw.includes('фразой для поиска')) {
        return new Response(
          `${JSON.stringify({ message: { content: 'Картофельное пюре с мясным соусом' }, done: true })}\n`,
          { status: 200 },
        )
      }
      return new Response(
        `${JSON.stringify({ message: { content: 'На фото пюре с соусом. Рецепт: https://example.test/puree' }, done: true })}\n`,
        { status: 200 },
      )
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        { ...env, LLM_SEARCH_URL: 'http://search.test' },
        [{ role: 'user', text: 'Что за блюдо на фото? найди мне сайт с таким рецептом', images: [{ base64: photo.toString('base64'), mime: 'image/jpeg' }] }],
        true,
      )
      expect(result.reply).toBe('На фото пюре с соусом. Рецепт: https://example.test/puree')
      expect(result.model).toBe('qwen2.5:7b')
    } finally {
      globalThis.fetch = original
    }
    expect(models[0]).toBe('qwen2.5vl:3b')
    expect(models.at(-1)).toBe('qwen2.5:7b')
    const search = calls.find((url) => url.startsWith('http://search.test/search?')) ?? ''
    expect(decodeURIComponent(search).replace(/\+/g, ' ')).toContain('Картофельное пюре с мясным соусом рецепт')
    expect(calls.some((url) => url.endsWith('/chat/completions'))).toBe(false)
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

  test('stopping a table print ends the stream', async () => {
    const knowledge = [
      'NORA_TABLE_SHEET',
      '| Статья | Сумма |',
      '| --- | --- |',
      '| Аренда | 10 |',
      '| Ремонт | 20 |',
      '| Итог | 30 |',
    ].join('\n')
    const controller = new AbortController()
    const chunks: string[] = []
    const stream = streamNoraChat(
      env,
      [{ role: 'user', text: 'построй таблицу' }],
      false,
      knowledge,
      controller.signal,
    )
    const first = await stream.next()
    if (first.value && 'reply' in first.value && first.value.reply) chunks.push(first.value.reply)
    controller.abort()
    for await (const event of stream) {
      if (event.reply) chunks.push(event.reply)
    }
    const printed = chunks.join('')
    expect(printed.length).toBeGreaterThan(0)
    expect(printed).not.toContain('30')
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

  test('the bitrix button reads tasks and does not show the webhook to the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    const prompts: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/tasks.task.list.json')) {
        return new Response(
          JSON.stringify({
            result: { tasks: [{ id: '15', title: 'Проверить отчёт', status: '3', responsibleId: '10' }] },
          }),
          { status: 200 },
        )
      }
      prompts.push(String(init?.body ?? ''))
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'Есть задача 15: Проверить отчёт.' } }] }),
        { status: 200 },
      )
    }) as typeof fetch
    const events: Array<{ portal?: boolean; reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'Какие у меня задачи?' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        if (event.portal || event.reply) events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    expect(events.some((event) => event.portal)).toBe(true)
    expect(events.map((event) => event.reply ?? '').join('')).toContain('Проверить отчёт')
    expect(calls.some((url) => url.endsWith('/tasks.task.list.json'))).toBe(true)
    expect(prompts.join('')).toContain('Проверить отчёт')
    expect(prompts.join('')).not.toContain('secret')
  })

  test('the bitrix button off does not call the portal', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response(`${JSON.stringify({ message: { content: 'Отвечаю без портала.' }, done: true })}\n`, {
        status: 200,
      })
    }) as typeof fetch
    try {
      const result = await completeNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'Какие у меня задачи?' }],
        false,
      )
      expect(result.reply).toBe('Отвечаю без портала.')
    } finally {
      globalThis.fetch = original
    }
    expect(calls.some((url) => url.includes('portal.test'))).toBe(false)
  })

  test('creating a task goes through the bitrix tool', async () => {
    const original = globalThis.fetch
    const created: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/tasks.task.add.json')) {
        created.push(String(init?.body ?? ''))
        return new Response(JSON.stringify({ result: { task: { id: '77' } } }), { status: 200 })
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: Array<{ role?: string }> }
      const asked = body.messages?.some((message) => message.role === 'tool')
      return new Response(
        JSON.stringify(
          asked
            ? { choices: [{ message: { content: 'Задача создана, номер 77.' } }] }
            : {
                choices: [
                  {
                    message: {
                      content: '',
                      tool_calls: [
                        {
                          id: 'call_1',
                          function: {
                            name: 'bitrix',
                            arguments: '{"action":"create_task","title":"Проверить отчёт"}',
                          },
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
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'Создай задачу проверить отчёт' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )
      expect(result.reply).toBe('Задача создана, номер 77.')
    } finally {
      globalThis.fetch = original
    }
    expect(created[0]).toContain('Проверить отчёт')
    expect(created[0]).not.toContain('secret')
  })

  test('a request to download a bitrix file attaches it and does not ask the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '1', NAME: 'Диск', ROOT_OBJECT_ID: '3' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.getchildren.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '294', NAME: 'Список недостающих моделей.docx', TYPE: 'file' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.file.get.json')) {
        return new Response(JSON.stringify({
          result: { ID: '294', NAME: 'Список недостающих моделей.docx', DOWNLOAD_URL: 'https://files.test/294/secret/download' },
        }), { status: 200 })
      }
      if (url.startsWith('https://files.test/')) return new Response('docx-bytes', { status: 200 })
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ portal?: boolean; reply?: string; file?: { name: string; data: string } }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Файл 294 — это «Список недостающих моделей.docx»' },
          { role: 'user', text: 'дай этот файл для скачивания' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const file = events.find((event) => event.file)?.file
    expect(file?.name).toBe('Список недостающих моделей.docx')
    expect(file?.data).toBe(Buffer.from('docx-bytes').toString('base64'))
    expect(events.some((event) => event.portal)).toBe(true)
    expect(events.map((event) => event.reply ?? '').join('')).toContain('приложен')
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    expect(JSON.stringify(events)).not.toContain('secret')
  })

  test('a question about where a bitrix file sits answers with the folder path', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '1', NAME: 'Общий диск', ROOT_OBJECT_ID: '3' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.getchildren.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '254', NAME: 'Заявление на отпуск.docx', TYPE: 'file' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.file.get.json')) {
        return new Response(JSON.stringify({
          result: { ID: '254', NAME: 'Заявление на отпуск.docx', STORAGE_ID: '1', PARENT_ID: '252' },
        }), { status: 200 })
      }
      if (url.endsWith('/disk.storage.get.json')) {
        return new Response(JSON.stringify({ result: { ID: '1', NAME: 'Общий диск', ROOT_OBJECT_ID: '3', ENTITY_TYPE: 'common' } }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.get.json') && String(body.id) === '252') {
        return new Response(JSON.stringify({ result: { ID: '252', NAME: 'ООО Смарт Контрол', PARENT_ID: '3' } }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ portal?: boolean; reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Файл «Заявление на отпуск.docx» приложен.' },
          { role: 'user', text: 'где расположен этот документ?' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('Путь в Битриксе: Диск «Общий диск» / ООО Смарт Контрол / Заявление на отпуск.docx')
    expect(events.some((event) => event.portal)).toBe(true)
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    expect(JSON.stringify(events)).not.toContain('secret')
  })

  test('a follow-up for the file text reads the nested file and does not ask the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '1') {
        return new Response(JSON.stringify({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.getchildren.json') && String(body.id) === '284') {
        return new Response(JSON.stringify({ result: [{ ID: '294', NAME: 'Список недостающих моделей.docx', TYPE: 'file' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.file.get.json')) {
        return new Response(JSON.stringify({
          result: { ID: '294', NAME: 'Список недостающих моделей.txt', DOWNLOAD_URL: 'https://files.test/294/secret/download' },
        }), { status: 200 })
      }
      if (url.startsWith('https://files.test/')) return new Response('текст из учебника', { status: 200 })
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ portal?: boolean; reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Файл «Список недостающих моделей.docx» приложен. Его можно скачать.' },
          { role: 'user', text: 'напиши содержимое этого файла' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('текст из учебника')
    expect(reply).not.toContain('не могу найти')
    expect(events.some((event) => event.portal)).toBe(true)
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    expect(JSON.stringify(events)).not.toContain('secret')
  })

  test('a numbered file mention is read by its number', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/disk.file.get.json')) {
        return new Response(JSON.stringify({
          result: { ID: '294', NAME: 'Список недостающих моделей.txt', TYPE: 'file', DOWNLOAD_URL: 'https://files.test/294/secret/download' },
        }), { status: 200 })
      }
      if (url.startsWith('https://files.test/')) return new Response('текст из учебника', { status: 200 })
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Откройте файл «294. Список недостающих моделей.docx».' },
          { role: 'user', text: 'напиши содержимое этого файла' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    expect(events.map((event) => event.reply ?? '').join('')).toContain('текст из учебника')
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    expect(calls.some((url) => url.includes('disk.storage.getlist'))).toBe(false)
  })

  test('a folder question returns the nested tree and does not ask the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] }), { status: 200 })
      }
      if (String(body.id) === '1') {
        return new Response(JSON.stringify({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }] }), { status: 200 })
      }
      if (String(body.id) === '284') {
        return new Response(JSON.stringify({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }, { ID: '382', NAME: 'Загруженные файлы', TYPE: 'folder' }] }), { status: 200 })
      }
      if (String(body.id) === '382') {
        return new Response(JSON.stringify({ result: [{ ID: '400', NAME: 'Frame.png', TYPE: 'file' }] }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'что есть в 284. РШП 2024?' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('В папке «РШП 2024», номер 284:')
    expect(reply).toContain('```nora-disk')
    expect(reply).toContain('Список.docx')
    expect(reply).toContain('Загруженные файлы')
    expect(reply).not.toContain('Frame.png')
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
  })

  test('a disk tree starts at the top and opens every file only when asked', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as { id?: number | string }
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '1', NAME: 'Роман', ROOT_OBJECT_ID: '1' }] }), { status: 200 })
      }
      if (String(body.id) === '1') {
        return new Response(JSON.stringify({ result: [{ ID: '284', NAME: 'РШП 2024', TYPE: 'folder' }, { ID: '244', NAME: 'Список.xlsx', TYPE: 'file' }] }), { status: 200 })
      }
      if (String(body.id) === '284') {
        return new Response(JSON.stringify({ result: [{ ID: '294', NAME: 'Список.docx', TYPE: 'file' }] }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const ask = async (text: string) => {
      const events: Array<{ reply?: string }> = []
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
      return events.map((event) => event.reply ?? '').join('')
    }
    try {
      calls.length = 0
      const overview = await ask('дай дерево диска')
      expect(overview).toContain('```nora-disk')
      expect(overview).toContain('общее дерево')
      expect(overview).toContain('Список.xlsx')
      expect(overview).not.toContain('Список.docx')
      expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
      calls.length = 0
      const full = await ask('покажи дерево со всеми вложениями')
      expect(full).toContain('Список.docx')
      expect(full).not.toContain('общее дерево')
      expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    } finally {
      globalThis.fetch = original
    }
  })

  test('deleting a task is reported as done and the model does not retell it', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as { taskId?: number }
      if (url.endsWith('/tasks.task.list.json')) {
        return new Response(JSON.stringify({ result: { tasks: [{ id: '292', title: 'Тестовая задача 3' }] } }), { status: 200 })
      }
      if (url.endsWith('/tasks.task.delete.json')) {
        expect(body.taskId).toBe(292)
        return new Response(JSON.stringify({ result: true }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'удали Тестовая задача 3' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toBe('Задача «Тестовая задача 3» удалена, номер 292.')
    expect(reply).not.toContain('ранее')
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
  })

  test('creating a document with an approval chain does not ask the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/disk.storage.getlist.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '2', NAME: 'Общий диск', ENTITY_TYPE: 'common', ROOT_OBJECT_ID: '3' }] }), { status: 200 })
      }
      if (url.endsWith('/disk.folder.uploadfile.json')) {
        return new Response(JSON.stringify({ result: { ID: '394', NAME: 'Тестовый документ.txt' } }), { status: 200 })
      }
      if (url.endsWith('/user.get.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '12', NAME: 'Юлия', LAST_NAME: 'Фатеева' }] }), { status: 200 })
      }
      if (url.endsWith('/tasks.task.add.json')) {
        return new Response(JSON.stringify({ result: { task: { id: '411' } } }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'Создай тестовый документ и цепочку согласования нашими сотрудниками' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) {
        events.push(event)
      }
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('номер 394')
    expect(reply).toContain('Юлия Фатеева — задача №411')
    expect(reply).not.toContain('Документы:')
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
  })

  test('a meeting, the client list and successful deals do not ask the model', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/crm.company.list.json')) return new Response(JSON.stringify({ result: [{ ID: '4', TITLE: 'Сибирь Девелопмент' }], total: 1 }), { status: 200 })
      if (url.endsWith('/crm.contact.list.json')) return new Response(JSON.stringify({ result: [], total: 0 }), { status: 200 })
      if (url.endsWith('/crm.deal.list.json')) return new Response(JSON.stringify({ result: [{ ID: '1836', TITLE: 'продление Монолит' }], total: 1 }), { status: 200 })
      if (url.endsWith('/voximplant.statistic.get.json')) return new Response(JSON.stringify({ result: [], total: 2 }), { status: 200 })
      if (url.endsWith('/calendar.section.get.json')) return new Response(JSON.stringify({ result: [{ ID: '12', NAME: 'Календарь' }] }), { status: 200 })
      if (url.endsWith('/calendar.event.add.json')) return new Response(JSON.stringify({ result: 77 }), { status: 200 })
      if (url.endsWith('/calendar.event.getbyid.json')) {
        return new Response(JSON.stringify({ result: { ID: '77', NAME: 'Встреча: Дмитрий Резанов', DATE_FROM: '04.11.2026 12:00:00' } }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const ask = async (text: string) => {
      const events: Array<{ reply?: string }> = []
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) events.push(event)
      return events.map((event) => event.reply ?? '').join('')
    }
    try {
      expect(await ask('дай список наших клиентов')).toContain('№4 Сибирь Девелопмент')
      expect(await ask('у нас есть успешные дозвоны или успешные заключенные договора?')).toContain('№1836 продление Монолит')
      const meeting = await ask('создай на завтра встречу с ООО Ромашка')
      expect(meeting).toContain('номер 77')
      expect(meeting).not.toContain('Откройте Битрикс24')
      expect(meeting).not.toContain('is not defined')
      expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
      const events: Array<{ reply?: string }> = []
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'user', text: 'запланируй встречу для дмитрия резанова на завтра на 12 часов' },
          { role: 'assistant', text: meeting },
          { role: 'user', text: 'где ее найти?' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) events.push(event)
      const located = events.map((event) => event.reply ?? '').join('')
      expect(located).toContain('Календарь → 04.11.2026')
      expect(located).toContain('Встреча: Дмитрий Резанов')
      expect(located).toContain('12:00')
      expect(located).toContain('номер 77')
      expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
    } finally {
      globalThis.fetch = original
    }
  })

  test('a question about planned meetings lists them and does not create one', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/calendar.event.get.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '3746', NAME: 'Встреча: Дмитрий Резанов', DATE_FROM: '04.11.2026 12:00:00' }] }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [{ role: 'user', text: 'Какие запланированные встречи есть?' }],
        false,
        undefined,
        undefined,
        false,
        true,
      )) events.push(event)
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('04.11.2026 12:00')
    expect(reply).toContain('Дмитрий Резанов')
    expect(reply).not.toContain('создана')
    expect(reply).not.toContain('Откройте Битрикс24')
    expect(calls.some((url) => url.includes('calendar.event.add'))).toBe(false)
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
  })

  test('deleting the meeting just created does not list the calendar', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/calendar.event.getbyid.json')) {
        return new Response(JSON.stringify({ result: { ID: '3750', NAME: 'Встреча с ООО Hjvfirf', DATE_FROM: '03.11.2026 05:00:00' } }), { status: 200 })
      }
      if (url.endsWith('/calendar.event.delete.json')) return new Response(JSON.stringify({ result: true }), { status: 200 })
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Встреча «Встреча с ООО Hjvfirf» создана на 03.11.2026, 05:00–06:00, номер 3750. Компании «ООО Hjvfirf» в CRM нет.' },
          { role: 'user', text: 'удали эту встречу' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) events.push(event)
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('удалена, номер 3750')
    expect(reply).not.toContain('События:')
    expect(calls.some((url) => url.includes('calendar.event.delete'))).toBe(true)
    expect(calls.some((url) => url.includes('llm.test'))).toBe(false)
  })

  test('asking where the meetings are stays in the calendar', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/calendar.event.get.json')) {
        return new Response(JSON.stringify({ result: [{ ID: '3746', NAME: 'Встреча: Дмитрий Резанов', DATE_FROM: '04.11.2026 12:00:00' }] }), { status: 200 })
      }
      return new Response('model should not be called', { status: 500 })
    }) as typeof fetch
    const events: Array<{ reply?: string }> = []
    try {
      for await (const event of streamNoraChat(
        { ...env, BITRIX_WEBHOOK_URL: 'https://portal.test/rest/10/secret/' },
        [
          { role: 'assistant', text: 'Файл «Функционал для клиентов..xlsx», номер 188. Путь в Битриксе: Диск «Юлия Фатеева» / Функционал для клиентов..xlsx.' },
          { role: 'assistant', text: 'События:\n1. 04.11.2026 12:00. Встреча: Дмитрий Резанов' },
          { role: 'user', text: 'Где найти эти встречи?' },
        ],
        false,
        undefined,
        undefined,
        false,
        true,
      )) events.push(event)
    } finally {
      globalThis.fetch = original
    }
    const reply = events.map((event) => event.reply ?? '').join('')
    expect(reply).toContain('Календарь')
    expect(reply).toContain('Дмитрий Резанов')
    expect(reply).not.toContain('xlsx')
    expect(reply).not.toContain('Юлия')
  })
})
