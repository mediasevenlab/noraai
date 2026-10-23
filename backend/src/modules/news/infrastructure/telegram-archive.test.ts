import { expect, test } from 'bun:test'

import { sendArchivePost, syncArchiveEdition } from './telegram-archive'

const env = { TELEGRAM_NEWS_BOT_TOKEN: 'test-token' }

test('two photos of one post are one album and the caption stays on the first', async () => {
  const calls: { url: string; media?: string; fields: string[] }[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    const address = String(url)
    if (address.includes('cdn4.telesco.pe')) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })
    }
    const form = init?.body
    const fields = form instanceof FormData ? [...form.keys()] : []
    calls.push({
      url: address,
      media: form instanceof FormData ? String(form.get('media') ?? '') : '',
      fields,
    })
    return new Response(JSON.stringify({
      ok: true,
      result: [
        { message_id: 10, chat: { id: -1001 }, photo: [{ file_id: 'small' }, { file_id: 'photo-a' }] },
        { message_id: 11, chat: { id: -1001 }, photo: [{ file_id: 'photo-b' }] },
      ],
    }))
  }

  const sent = await sendArchivePost(env, {
    chatId: '-1001',
    handle: 'naebnet',
    telegramPostId: 7,
    text: 'Один пост',
    media: [
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/a.jpg' },
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/b.jpg' },
    ],
  }, fetchImpl)

  expect(calls).toHaveLength(1)
  expect(calls[0]?.url.endsWith('/sendMediaGroup')).toBe(true)
  const media = JSON.parse(calls[0]?.media ?? '[]') as { type: string; media: string; caption?: string }[]
  expect(media.map((item) => item.media)).toEqual(['attach://file0', 'attach://file1'])
  expect(media[0]?.caption).toBe('Один пост')
  expect(media[1]?.caption).toBeUndefined()
  expect(calls[0]?.fields).toContain('file0')
  expect(calls[0]?.fields).toContain('file1')
  expect(sent.messageIds).toEqual([10, 11])
  expect(sent.media).toEqual([
    { kind: 'image', fileId: 'photo-a' },
    { kind: 'image', fileId: 'photo-b' },
  ])
})

test('a video preview is not sent as a second archive message', async () => {
  const methods: string[] = []
  const downloaded: string[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    const address = String(url)
    if (address.includes('cdn4.telesco.pe')) {
      downloaded.push(address)
      const video = address.endsWith('.mp4')
      return new Response(new Uint8Array([1]), { headers: { 'content-type': video ? 'video/mp4' : 'image/jpeg' } })
    }
    methods.push(address.split('/').pop() ?? '')
    const form = init?.body
    expect(form instanceof FormData && form.get('caption')).toBe('Ролик')
    return new Response(JSON.stringify({
      ok: true,
      result: { message_id: 4, chat: { id: -1001 }, video: { file_id: 'clip' } },
    }))
  }

  const sent = await sendArchivePost(env, {
    chatId: '-1001',
    text: 'Ролик',
    media: [
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/poster.jpg', role: 'poster' },
      { kind: 'video', url: 'https://cdn4.telesco.pe/file/clip.mp4' },
    ],
  }, fetchImpl)

  expect(downloaded).toEqual(['https://cdn4.telesco.pe/file/clip.mp4'])
  expect(methods).toEqual(['sendVideo'])
  expect(sent.messageIds).toEqual([4])
  expect(sent.media).toEqual([{ kind: 'video', fileId: 'clip' }])
})

test('an address outside Telegram is not fetched', async () => {
  let called = false
  const fetchImpl: typeof fetch = async () => {
    called = true
    return new Response('no')
  }
  await expect(sendArchivePost(env, {
    chatId: '-1001',
    text: 'Ссылка',
    media: [{ kind: 'image', url: 'https://vk.com/clip' }],
  }, fetchImpl)).rejects.toThrow('Archive media address is not allowed')
  expect(called).toBe(false)
})

test('the same files keep their archive message and only the caption changes', async () => {
  const methods: string[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    methods.push(String(url).split('/').pop() ?? '')
    const body = JSON.parse(String(init?.body)) as { caption?: string; message_id?: number }
    expect(body.message_id).toBe(4)
    expect(body.caption).toBe('Новый заголовок')
    return new Response(JSON.stringify({ ok: true, result: { message_id: 4 } }))
  }

  const sent = await syncArchiveEdition(env, {
    chatId: '-1001',
    messageIds: [4],
    text: 'Новый заголовок',
    previous: [{ kind: 'video', fileId: 'clip' }],
    next: [{ kind: 'video', fileId: 'clip' }],
  }, fetchImpl)

  expect(methods).toEqual(['editMessageCaption'])
  expect(sent.messageIds).toEqual([4])
  expect(sent.media).toEqual([{ kind: 'video', fileId: 'clip' }])
})

test('a removed photo publishes a new copy before the old archive message is deleted', async () => {
  const methods: string[] = []
  const deleted: number[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    const method = String(url).split('/').pop() ?? ''
    methods.push(method)
    if (method === 'sendPhoto') {
      const body = JSON.parse(String(init?.body)) as { photo?: string }
      expect(body.photo).toBe('photo-a')
      return new Response(JSON.stringify({ ok: true, result: { message_id: 20, chat: { id: -1001 }, photo: [{ file_id: 'photo-a' }] } }))
    }
    const body = JSON.parse(String(init?.body)) as { message_id?: number }
    deleted.push(body.message_id ?? 0)
    return new Response(JSON.stringify({ ok: true, result: true }))
  }

  const sent = await syncArchiveEdition(env, {
    chatId: '-1001',
    messageIds: [10, 11],
    text: 'Осталось фото',
    previous: [{ kind: 'image', fileId: 'photo-a' }, { kind: 'image', fileId: 'photo-b' }],
    next: [{ kind: 'image', fileId: 'photo-a' }],
  }, fetchImpl)

  expect(methods).toEqual(['sendPhoto', 'deleteMessage', 'deleteMessage'])
  expect(deleted).toEqual([10, 11])
  expect(sent.messageIds).toEqual([20])
})

test('a failed replacement leaves the old archive message and removes the new one', async () => {
  const deleted: number[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    const method = String(url).split('/').pop() ?? ''
    const body = JSON.parse(String(init?.body)) as { message_id?: number }
    if (method === 'sendPhoto') {
      return new Response(JSON.stringify({ ok: true, result: { message_id: 30, chat: { id: -1001 }, photo: [{ file_id: 'photo-a' }] } }))
    }
    deleted.push(body.message_id ?? 0)
    if (body.message_id === 10) return new Response(JSON.stringify({ ok: false, description: 'chat not found' }), { status: 400 })
    return new Response(JSON.stringify({ ok: true, result: true }))
  }

  await expect(syncArchiveEdition(env, {
    chatId: '-1001',
    messageIds: [10],
    text: 'Новое',
    previous: [{ kind: 'image', fileId: 'old' }],
    next: [{ kind: 'image', fileId: 'photo-a' }],
  }, fetchImpl)).rejects.toThrow('chat not found')
  expect(deleted).toEqual([10, 30])
})
