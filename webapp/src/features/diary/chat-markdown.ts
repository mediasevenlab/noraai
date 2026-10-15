export type ChatInline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }

export type ChatBlock =
  | { kind: 'paragraph'; lines: ChatInline[][] }
  | { kind: 'heading'; level: 1 | 2 | 3; inlines: ChatInline[] }
  | { kind: 'list'; ordered: boolean; items: ChatInline[][] }

const HEADING = /^(#{1,3})\s+(.+)$/
const BULLET = /^[-*]\s+(.+)$/
const NUMBERED = /^\d+\.\s+(.+)$/

export function parseChatMarkdown(source: string): ChatBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ChatBlock[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[][] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', lines: paragraph.map(parseChatInlines) })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push({
      kind: 'list',
      ordered: list.ordered,
      items: list.items.map((item) => parseChatInlines(item.join(' '))),
    })
    list = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        inlines: parseChatInlines(heading[2]!),
      })
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push([(bullet ?? numbered)![1]!])
      continue
    }
    if (list) {
      list.items.at(-1)?.push(line)
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

export function parseChatInlines(source: string): ChatInline[] {
  const parts: ChatInline[] = []
  let buffer = ''
  let index = 0
  const flush = () => {
    if (!buffer) return
    parts.push({ kind: 'text', text: buffer })
    buffer = ''
  }
  while (index < source.length) {
    if (source.startsWith('**', index) || source.startsWith('__', index)) {
      const marker = source.slice(index, index + 2)
      const end = source.indexOf(marker, index + 2)
      if (end > index + 2) {
        flush()
        parts.push({ kind: 'strong', text: source.slice(index + 2, end) })
        index = end + 2
        continue
      }
    }
    if (source[index] === '`') {
      const end = source.indexOf('`', index + 1)
      if (end > index + 1) {
        flush()
        parts.push({ kind: 'code', text: source.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    const markdownLink = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(source.slice(index))
    if (markdownLink) {
      const href = safeChatUrl(markdownLink[2]!)
      if (href) {
        flush()
        parts.push({ kind: 'link', text: markdownLink[1]!, href })
        index += markdownLink[0].length
        continue
      }
    }
    if (source[index] === '<') {
      const end = source.indexOf('>', index + 1)
      const href = end > index ? safeChatUrl(source.slice(index + 1, end)) : null
      if (href) {
        flush()
        parts.push({ kind: 'link', text: href, href })
        index = end + 1
        continue
      }
    }
    if (source.startsWith('http://', index) || source.startsWith('https://', index)) {
      const raw = /^https?:\/\/[^\s<>]+/.exec(source.slice(index))?.[0]?.replace(/[.,;:!?)]+$/, '')
      const href = raw ? safeChatUrl(raw) : null
      if (raw && href) {
        flush()
        parts.push({ kind: 'link', text: href, href })
        index += raw.length
        continue
      }
    }
    const marker = source[index]
    if ((marker === '*' || marker === '_') && source[index + 1] !== marker) {
      const end = source.indexOf(marker, index + 1)
      if (end > index + 1) {
        flush()
        parts.push({ kind: 'em', text: source.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    buffer += source[index]
    index += 1
  }
  flush()
  return parts
}

export function safeChatUrl(raw: string) {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}
