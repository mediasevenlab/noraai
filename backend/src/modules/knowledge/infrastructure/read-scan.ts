import { KnowledgeFailure } from '../domain/errors'
import type { ScanPage, ScanReader } from './extract-document'

const OCR_PROMPT = [
  'Перепиши текст этой страницы дословно.',
  'Сохрани абзацы и номера пунктов.',
  'Если есть таблица с названиями и числами, оформи её таблицей Markdown: те же подписи столбцов и ячейки, пустую ячейку оставь пустой.',
  'Цветную шкалу времени и сетку из клеток не переписывай таблицей.',
  'Не повторяй одну и ту же строку и не выдумывай строки, которых не видно.',
  'Не описывай бланк и не добавляй вступление.',
].join(' ')

/** A confused page can print the same line hundreds of times. Two copies are enough. */
export function collapseRepeatedLines(text: string) {
  const lines = text.split('\n')
  const kept: string[] = []
  let previous = ''
  let copies = 0
  for (const line of lines) {
    const key = line.trim()
    if (key && key === previous) {
      copies += 1
      if (copies >= 2) continue
    } else {
      previous = key
      copies = 0
    }
    kept.push(line)
  }
  return kept.join('\n')
}

function origin(baseUrl: string) {
  return baseUrl.replace(/\/$/, '').replace(/\/v1$/, '')
}

async function readPage(options: { baseUrl: string; apiKey: string; model: string }, jpeg: Buffer) {
  const response = await fetch(`${origin(options.baseUrl)}/api/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      stream: false,
      think: false,
      messages: [{ role: 'user', content: OCR_PROMPT, images: [jpeg.toString('base64')] }],
      options: { num_ctx: 16384, num_predict: 3072, temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(180_000),
  })
  if (!response.ok) throw new KnowledgeFailure('bad_request', 'Страница скана не распозналась.')
  const body = (await response.json()) as { message?: { content?: unknown } }
  return typeof body.message?.content === 'string' ? body.message.content.trim() : ''
}

export function createVisionScanReader(options: { baseUrl: string; apiKey: string; model: string }): ScanReader {
  return async (pages: readonly ScanPage[]) => {
    const parts: string[] = []
    for (const page of pages) {
      const text = collapseRepeatedLines(await readPage(options, page.jpeg))
      if (text.trim()) parts.push(`Страница ${page.page}\n${text.trim()}`)
    }
    if (parts.length === 0) throw new KnowledgeFailure('bad_request', 'В скане не удалось прочитать текст.')
    return parts.join('\n\n')
  }
}
