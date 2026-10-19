import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { extractMealWithNora, refineMealWithNora } from './nora-llm-client'

const env = {
  LLM_BASE_URL: 'http://llm.test/v1',
  LLM_API_KEY: 'test-key',
  LLM_TEXT_MODEL: 'qwen2.5:7b',
  LLM_VISION_MODEL: 'qwen2.5vl:3b',
}

function solidJpeg(width: number, height: number, color: { r: number; g: number; b: number }) {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg({ quality: 90 })
    .toBuffer()
}

const readyCard = {
  title: 'Гуляш с картофелем',
  excerpt: 'гуляш, картофель, морковь',
  nutrition: { kcal: 416, protein: 19, fat: 15, carbs: 54 },
  composition: [
    { label: 'Гуляш ~150 г', kcal: 200, protein: 15, fat: 10, carbs: 10 },
    { label: 'Картофель ~200 г', kcal: 200, protein: 3, fat: 5, carbs: 40 },
    { label: 'Морковь ~40 г', kcal: 16, protein: 1, fat: 0, carbs: 4 },
  ],
  assumptions: ['Вес по фото'],
  micronutrients: [],
}

describe('Nora photo correction', () => {
  test('sends only the new photo, shrunk, with a short prompt', async () => {
    const cover = await solidJpeg(900, 900, { r: 220, g: 20, b: 20 })
    const carrot = await solidJpeg(900, 700, { r: 20, g: 160, b: 30 })
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(readyCard) } }],
        }),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      await refineMealWithNora(env, {
        card: {
          title: 'Гуляш с картофелем',
          mealType: 'Обед',
          composition: [
            { label: 'Гуляш ~150 г' },
            { label: 'Картофель ~200 г' },
          ],
        },
        message: 'Добавь к приему',
        photoMode: 'augment',
        coverBase64: cover.toString('base64'),
        coverMime: 'image/jpeg',
        attachBase64: carrot.toString('base64'),
        attachMime: 'image/jpeg',
      })
    } finally {
      globalThis.fetch = original
    }

    const request = JSON.parse(body) as {
      max_tokens: number
      model: string
      messages: Array<{ role: string; content: unknown }>
    }
    expect(request.model).toBe('qwen2.5vl:3b')
    expect(request.max_tokens).toBe(1024)
    const system = request.messages.find((message) => message.role === 'system')
    expect(String(system?.content)).toContain('Состав сейчас')
    expect(String(system?.content)).not.toContain('vitaminB12')
    const user = request.messages.find((message) => message.role === 'user')
    const parts = user?.content as Array<{ type: string; image_url?: { url: string } }>
    const images = parts.filter((part) => part.type === 'image_url')
    expect(images).toHaveLength(1)
    const url = images[0]?.image_url?.url ?? ''
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(url).not.toContain(cover.toString('base64'))
    const sent = Buffer.from(url.slice('data:image/jpeg;base64,'.length), 'base64')
    const meta = await sharp(sent).metadata()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
    const pixel = await sharp(sent).raw().toBuffer()
    expect(pixel[1]).toBeGreaterThan(pixel[0] ?? 0)
  })

  test('several photos are shrunk and sent with a short prompt', async () => {
    const goulash = await solidJpeg(900, 700, { r: 180, g: 40, b: 20 })
    const carrot = await solidJpeg(800, 900, { r: 20, g: 170, b: 30 })
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(readyCard) } }],
        }),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      await extractMealWithNora(env, {
        images: [
          { base64: goulash.toString('base64'), mime: 'image/jpeg' },
          { base64: carrot.toString('base64'), mime: 'image/jpeg' },
        ],
      })
    } finally {
      globalThis.fetch = original
    }

    const request = JSON.parse(body) as {
      max_tokens: number
      model: string
      messages: Array<{ role: string; content: unknown }>
    }
    expect(request.model).toBe('qwen2.5vl:3b')
    expect(request.max_tokens).toBe(1024)
    const system = String(request.messages.find((message) => message.role === 'system')?.content)
    expect(system).toContain('2 кадра')
    expect(system).not.toContain('vitaminB12')
    const user = request.messages.find((message) => message.role === 'user')
    const parts = user?.content as Array<{ type: string; image_url?: { url: string } }>
    const images = parts.filter((part) => part.type === 'image_url')
    expect(images).toHaveLength(2)
    for (const image of images) {
      const url = image.image_url?.url ?? ''
      expect(url.startsWith('data:image/jpeg;base64,')).toBe(true)
      const sent = Buffer.from(url.slice('data:image/jpeg;base64,'.length), 'base64')
      const meta = await sharp(sent).metadata()
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(448)
    }
  })

  test('says the photo does not fit instead of the raw context error', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            message:
              '{"error":{"code":400,"message":"request (4289 tokens) exceeds the available context size (4096 tokens)","type":"exceed_context_size_error","n_prompt_tokens":4289,"n_ctx":4096}}',
          },
        }),
        { status: 400 },
      )) as typeof fetch
    try {
      await refineMealWithNora(env, {
        card: { title: 'Гуляш', mealType: 'Обед' },
        message: 'Добавь к приему',
        photoMode: 'augment',
        attachBase64: Buffer.from('not-an-image').toString('base64'),
        attachMime: 'image/jpeg',
      })
      throw new Error('expected the context error')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(
        'Своя модель не вмещает это фото вместе с карточкой. Оставьте одно фото или выберите Gemini.',
      )
    } finally {
      globalThis.fetch = original
    }
  })

  test('a text correction stays on the text model and does not pretend there is a photo', async () => {
    const original = globalThis.fetch
    let body = ''
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(readyCard) } }],
        }),
        { status: 200 },
      )
    }) as typeof fetch
    try {
      await refineMealWithNora(env, {
        card: {
          title: 'Скумбрия',
          mealType: 'Ужин',
          composition: [{ label: 'Скумбрия ~120 г' }, { label: 'Масло растительное ~40 г' }],
        },
        message: 'убери масло из приема',
      })
    } finally {
      globalThis.fetch = original
    }
    const request = JSON.parse(body) as {
      max_tokens: number
      model: string
      messages: Array<{ role: string; content: unknown }>
    }
    expect(request.model).toBe('qwen2.5:7b')
    expect(request.max_tokens).toBe(2048)
    const system = String(request.messages.find((message) => message.role === 'system')?.content)
    expect(system).toContain('Фото нет')
    expect(system).not.toContain('На фото добавка')
  })
})
