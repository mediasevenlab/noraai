import { describe, expect, test } from 'bun:test'

import { MealsFailure } from './errors'
import { buildNoraChatRequest, type NoraChatTurn } from './nora-chat'

const models = { text: 'qwen2.5:7b', vision: 'qwen2.5vl:3b' }

function user(text: string, images?: NoraChatTurn['images']): NoraChatTurn {
  return { role: 'user', text, images }
}

describe('Nora settings chat', () => {
  test('a text thread stays on the text model and keeps the earlier turns', () => {
    const request = buildNoraChatRequest(
      [
        user('Что такое белок?'),
        { role: 'assistant', text: 'Строительный материал.' },
        user('А жир?'),
      ],
      models,
    )

    expect(request.model).toBe('qwen2.5:7b')
    expect(request.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ])
    expect(request.messages[1]?.content).toBe('Что такое белок?')
    expect(request.messages[3]?.content).toBe('А жир?')
    expect(String(request.messages[0]?.content)).not.toContain('Только JSON')
  })

  test('a photo switches the thread to the vision model', () => {
    const request = buildNoraChatRequest(
      [user('Что на фото?', [{ base64: 'abc', mime: 'image/png' }])],
      models,
    )

    expect(request.model).toBe('qwen2.5vl:3b')
    const parts = request.messages[1]?.content as Array<{
      type: string
      text?: string
      image_url?: { url: string }
    }>
    expect(parts[0]).toEqual({ type: 'text', text: 'Что на фото?' })
    expect(parts[1]?.image_url?.url).toBe('data:image/png;base64,abc')
  })

  test('only the latest four photos stay in the request', () => {
    const photos = ['a', 'b', 'c', 'd', 'e'].map((base64) => ({ base64 }))
    const request = buildNoraChatRequest([user('Смотри', photos)], models)
    const parts = request.messages[1]?.content as Array<{
      type: string
      image_url?: { url: string }
    }>
    expect(parts.filter((part) => part.type === 'image_url')).toHaveLength(4)
    const urls = parts
      .filter((part) => part.type === 'image_url')
      .map((part) => part.image_url?.url)
    expect(urls).toEqual([
      'data:image/jpeg;base64,b',
      'data:image/jpeg;base64,c',
      'data:image/jpeg;base64,d',
      'data:image/jpeg;base64,e',
    ])
  })

  test('an empty turn is rejected', () => {
    expect(() => buildNoraChatRequest([user('   ')], models)).toThrow(MealsFailure)
  })
})
