const CHUNK_SIZE = 1400
const CHUNK_OVERLAP = 220
const PASSAGE_LIMIT = 8
const CONTEXT_CHAR_BUDGET = 12_000

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'your', 'что', 'это', 'как', 'для',
  'или', 'при', 'его', 'её', 'ее', 'их', 'она', 'они', 'все', 'уже', 'ещё', 'еще', 'только',
  'если', 'чтобы', 'можно', 'нужно', 'есть', 'нет', 'так', 'там', 'тут', 'где', 'когда',
  'этот', 'эта', 'эти', 'этом', 'эту', 'какой', 'какая', 'какие', 'какое', 'меня', 'мне',
  'надо', 'хочу', 'дай', 'дайте', 'будет', 'прошу',
])

/** Links and page words match almost any «дай ссылку» question and must not pull a file in alone. */
const GENERIC_PREFIXES = ['сайт', 'ссыл', 'страниц']

export type KnowledgePassage = {
  baseName: string
  fileName: string
  position: number
  text: string
}

export function chunkKnowledgeText(raw: string) {
  const text = raw.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!text) return []
  if (text.length <= CHUNK_SIZE) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(text.length, start + CHUNK_SIZE)
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end)
      if (breakAt > start + CHUNK_SIZE * 0.5) end = breakAt
    }
    const piece = text.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= text.length) break
    const next = end - CHUNK_OVERLAP
    start = next > start ? next : end
  }
  return chunks
}

function tokens(value: string) {
  return (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (token) => token.length > 2 && !STOP_WORDS.has(token),
  )
}

/** Same key for «просмотров» and «просмотра»: Russian endings sit past the first five letters. */
function stem(token: string) {
  if (token.length <= 5) return token
  return token.slice(0, 5)
}

function isGeneric(token: string) {
  return GENERIC_PREFIXES.some((prefix) => token.startsWith(prefix))
}

function fileKey(passage: KnowledgePassage) {
  return `${passage.baseName}\0${passage.fileName}`
}

function asksAboutDocument(queryTokens: readonly string[]) {
  return queryTokens.some((token) =>
    ['инстр', 'заявк', 'конку', 'докум', 'отбор'].some((prefix) => token.startsWith(prefix)),
  )
}

/** A conclusion or a calculation stays a question, even when it mentions a table. */
function asksForReasoning(query: string) {
  return /(о ч[её]м|сколько|почему|зачем|посчита|сумм|итог|разниц|сравни|объясни|расскаж|вывод|заключ)/i.test(query)
}

/** «Построй таблицу» asks for a grid. «О чём эта таблица» does not. */
function asksToReproduce(query: string) {
  if (asksForReasoning(query)) return false
  return /таблиц|содержим|как в базе|в базе знаний|из базы|весь файл|весь документ/.test(query.toLowerCase())
}

/** The model should see the workbook, not only the first sheet, when the question is about the file. */
function asksAboutSheets(query: string) {
  return /файл|таблиц|лист|страниц|смет|данн|расчет|расчёт|итог|сумм|посчита|о ч[её]м|содерж|расскаж|объясни|вывод|заключ/i.test(
    query,
  )
}

const ORDINAL_FORMS = [
  /перв(?:ую|ая|ый|ое|ой)(?![а-яё])/i,
  /втор(?:ую|ая|ой|ое)(?![а-яё])/i,
  /трет(?:ью|ья|ей|ье|ий)(?![а-яё])/i,
  /четв[её]рт(?:ую|ая|ой|ый)(?![а-яё])/i,
  /пят(?:ую|ая|ый|ое|ой)(?![а-яё])/i,
  /шест(?:ую|ая|ой|ое)(?![а-яё])/i,
  /седьм(?:ую|ая|ой|ое)(?![а-яё])/i,
  /восьм(?:ую|ая|ой|ое)(?![а-яё])/i,
  /девят(?:ую|ая|ый|ое|ой)(?![а-яё])/i,
]

/** «Вторую» picks a table. A bare «пять» does not. */
export function tableOrdinal(query: string) {
  const lower = query.toLowerCase()
  const index = ORDINAL_FORMS.findIndex((form) => form.test(lower))
  if (index >= 0) return index + 1
  if (!/таблиц|номер/.test(lower) && !/^(?:давай\s+)?\d{1,2}\s*[.!?]?$/.test(lower.trim())) return null
  const digit = lower.match(/\b(\d{1,2})\b/)
  if (!digit?.[1]) return null
  const value = Number(digit[1])
  if (value < 1 || value > 40) return null
  return value
}

function isSignatureLine(line: string) {
  return /_{3,}/.test(line) || /^(сдал|принял|по эстафете)\b/i.test(line)
}

function wordsOf(line: string) {
  return line.match(/[A-Za-zА-Яа-яЁё№][A-Za-zА-Яа-яЁё№/-]*/g) ?? []
}

function hasDigit(line: string) {
  return /\d/.test(line)
}

/** A column-title row: several words, no date and no quantity. */
function isWideHeader(line: string) {
  if (hasDigit(line)) return false
  return wordsOf(line).length >= 3
}

function prepareTableLines(text: string) {
  const lines: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || isSignatureLine(line) || /^\d+\s+\d+$/.test(line)) continue
    lines.push(line)
  }
  return lines
}

function isStackedHeaderLine(lines: readonly string[], index: number) {
  const line = lines[index] ?? ''
  if (!line || isWideHeader(line) || hasDigit(line) || line.length > 40) return false
  const next = lines[index + 1] ?? ''
  return Boolean(next) && !hasDigit(next) && wordsOf(line).length > 0
}

function startsStackedHeader(lines: readonly string[], index: number) {
  if (index === 0) return false
  const previous = lines[index - 1] ?? ''
  if (!hasDigit(previous)) return false
  return isStackedHeaderLine(lines, index)
}

export type PlainTable = {
  index: number
  title: string
  text: string
  markdown: string
  /** Worksheet tab, when the grid came from Excel. */
  sheet?: string
}

function markdownCell(value: string) {
  return value.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()
}

function markdownRow(cells: readonly string[]) {
  return `| ${cells.map(markdownCell).join(' | ')} |`
}

/** Wrapped column titles: a capital line starts a column, a lowercase line continues it. */
function groupWrappedColumns(header: readonly string[]) {
  const columns: string[] = []
  const lines = [...header]
  let current: string[] = []
  const push = () => {
    const value = current.join(' ').replace(/\s+/g, ' ').trim()
    current = []
    if (value) columns.push(value)
  }
  if ((lines[0]?.split(/\s+/).length ?? 0) === 1 && /^[A-ZА-ЯЁ]/.test(lines[0] ?? '')) {
    columns.push(lines.shift() ?? '')
  }
  for (const line of lines) {
    const note = line.match(/^(.*\S)\s+(Примечание)$/i)
    if (note) {
      current.push(note[1] ?? '')
      push()
      columns.push('Примечание')
      continue
    }
    const starts = /^[A-ZА-ЯЁ]/.test(line) && !/^(На|По|В|С|К|От|Для)\b/.test(line)
    if (starts && current.length > 0) push()
    current.push(line)
  }
  push()
  return columns
}

function itemRows(lines: readonly string[]) {
  const rows: { name: string; qty: string }[] = []
  const seen = new Set<string>()
  let name: string[] = []
  const flush = (qty: string) => {
    const label = name.join(' ').replace(/\s+/g, ' ').trim()
    name = []
    if (!label || seen.has(label)) return
    seen.add(label)
    rows.push({ name: label, qty })
  }
  for (const line of lines) {
    if (/^\d+$/.test(line)) {
      flush(line)
      continue
    }
    const ended = line.match(/^(.*\S)\s+(\d+)$/)
    if (ended && !/_\d+$/.test(ended[1] ?? '')) {
      name.push(ended[1] ?? '')
      flush(ended[2] ?? '')
      continue
    }
    name.push(line)
  }
  if (name.length) flush('')
  return rows
}

/** Cells that pdf text already separated with spaces, one row per line. */
function renderAlignedTable(header: string, body: readonly string[]) {
  const columns = header.split(/\s+/).filter(Boolean)
  if (columns.length < 2) return ''
  const rows = body
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/).filter(Boolean))
  if (rows.length === 0 || rows.some((row) => row.length !== columns.length)) return ''
  return [markdownRow(columns), markdownRow(columns.map(() => '---')), ...rows.map((row) => markdownRow(row))].join('\n')
}

function renderFormTable(header: string, data: string) {
  if (!/№\s*документа/.test(header) || !/№\s*рейса/.test(header)) return ''
  const match = data.match(
    /^([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё-]*)(?:\s+(\d{3,}))?\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})\s+(\S+)\s+([A-Za-z]\d?\s+\d+)$/,
  )
  if (!match) return ''
  const head = ['Авиакомпания', '№ документа', 'Дата/время вылета', 'Тип / № борта', '№ рейса']
  const row = [match[1] ?? '', match[2] ?? '', match[3] ?? '', match[4] ?? '', match[5] ?? '']
  return [markdownRow(head), markdownRow(head.map(() => '---')), markdownRow(row)].join('\n')
}

function renderStackedTable(header: readonly string[], body: readonly string[]) {
  const columns = groupWrappedColumns(header)
  const items = itemRows(body)
  if (columns.length < 2 || items.length === 0) return ''
  const rows = items.map((item) => {
    const cells = Array.from({ length: columns.length }, () => '')
    cells[0] = item.name
    cells[1] = item.qty
    return markdownRow(cells)
  })
  return [markdownRow(columns), markdownRow(columns.map(() => '---')), ...rows].join('\n')
}

function renderTable(lines: readonly string[], headerCount: number) {
  const header = lines.slice(0, headerCount)
  const body = lines.slice(headerCount)
  if (headerCount === 1) {
    const markdown = renderFormTable(header[0] ?? '', body[0] ?? '') || renderAlignedTable(header[0] ?? '', body)
    const title = markdown
      ? (markdown.split('\n')[0] ?? '').replace(/^\|\s*/, '').replace(/\s*\|$/, '').split('|').map((part) => part.trim()).filter(Boolean).join(', ')
      : header[0] ?? 'Таблица'
    return { title, markdown }
  }
  const columns = groupWrappedColumns(header)
  return {
    title: columns.join(', ') || header.join(' '),
    markdown: renderStackedTable(header, body),
  }
}

function splitMarkdownRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isMarkdownSeparator(line: string) {
  const cells = splitMarkdownRow(line).filter((cell) => cell.length > 0)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

/** The worksheet name sits on the line `Лист «…»`, sometimes with a caption under it. */
function sheetLabel(lines: readonly string[], before: number) {
  let cursor = before
  while (cursor >= 0 && before - cursor <= 8) {
    const line = lines[cursor]?.trim() ?? ''
    if (!line) {
      cursor -= 1
      continue
    }
    const named = line.match(/^Лист «(.+)»$/)
    if (named?.[1]) return named[1]
    if (line.startsWith('|')) return undefined
    cursor -= 1
  }
  return undefined
}

/** A scan is stored as Markdown tables. Those grids are already built. */
function markdownTables(text: string): PlainTable[] {
  const lines = text.split('\n')
  const found: PlainTable[] = []
  let index = 0
  while (index < lines.length) {
    if (!(lines[index]?.trim() ?? '').startsWith('|')) {
      index += 1
      continue
    }
    const block: string[] = []
    while (index < lines.length && (lines[index]?.trim() ?? '').startsWith('|')) {
      block.push((lines[index] ?? '').trim())
      index += 1
    }
    const separatorAt = block.findIndex(isMarkdownSeparator)
    if (separatorAt < 1) continue
    const header = splitMarkdownRow(block[separatorAt - 1] ?? '').filter(Boolean)
    const dataWide = block
      .slice(separatorAt + 1)
      .some((row) => splitMarkdownRow(row).filter(Boolean).length >= 2)
    const sheetName = sheetLabel(lines, index - block.length - 1)
    if (!sheetName && header.length < 2) continue
    if (sheetName && header.length === 0 && !dataWide) continue
    const sheet = block.slice(separatorAt - 1)
    const columns = header.join(', ').replace(/\s+/g, ' ')
    found.push({
      index: found.length + 1,
      title: (sheetName ?? columns).slice(0, 180),
      text: sheet.join('\n'),
      markdown: sheet.join('\n'),
      ...(sheetName ? { sheet: sheetName } : {}),
    })
  }
  return found
}

/** Split reading-order text into tables: a wide header row, then a wrapped header after it. */
export function listPlainTables(text: string): PlainTable[] {
  const marked = markdownTables(text)
  if (marked.length > 0) return marked
  const lines = prepareTableLines(text)
  if (lines.length === 0) return []
  const start = lines.findIndex((line) => isWideHeader(line))
  if (start < 0) {
    return [{ index: 1, title: lines[0] ?? 'Таблица', text: lines.join('\n'), markdown: '' }]
  }
  const drafts: { lines: string[]; headerCount: number }[] = []
  let index = start
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (isWideHeader(line)) {
      const block = [line]
      index += 1
      while (
        index < lines.length &&
        !startsStackedHeader(lines, index) &&
        !isWideHeader(lines[index] ?? '')
      ) {
        block.push(lines[index] ?? '')
        index += 1
      }
      drafts.push({ lines: block, headerCount: 1 })
      continue
    }
    if (startsStackedHeader(lines, index)) {
      const header: string[] = []
      while (index < lines.length && isStackedHeaderLine(lines, index)) {
        header.push(lines[index] ?? '')
        index += 1
      }
      const block = [...header]
      while (index < lines.length && !isWideHeader(lines[index] ?? '')) {
        block.push(lines[index] ?? '')
        index += 1
      }
      drafts.push({ lines: block, headerCount: header.length })
      continue
    }
    index += 1
  }
  // A sentence above the grid has no numbers of its own. It names the next table.
  const tables: { lines: string[]; headerCount: number; title: string }[] = []
  let pendingTitle = ''
  for (const draft of drafts) {
    const body = draft.lines.slice(draft.headerCount)
    if (draft.headerCount === 1 && !body.some((line) => hasDigit(line))) {
      pendingTitle = draft.lines[0] ?? pendingTitle
      continue
    }
    tables.push({ ...draft, title: pendingTitle })
    pendingTitle = ''
  }
  if (tables.length === 0) {
    return [{ index: 1, title: lines[0] ?? 'Таблица', text: lines.join('\n'), markdown: '' }]
  }
  return tables.map((table, position) => {
    const rendered = renderTable(table.lines, table.headerCount)
    const title = (table.title || rendered.title).replace(/\s+/g, ' ').trim().slice(0, 180)
    return {
      index: position + 1,
      title,
      text: table.lines.join('\n'),
      markdown: rendered.markdown,
    }
  })
}

function passagesInBudget(passages: readonly KnowledgePassage[]) {
  const groups = new Map<string, KnowledgePassage[]>()
  for (const passage of passages) {
    const key = fileKey(passage)
    const group = groups.get(key) ?? []
    group.push(passage)
    groups.set(key, group)
  }
  const ordered = [...groups.values()]
    .map((group) => [...group].sort((left, right) => left.position - right.position))
    .sort((left, right) => {
      const size = (group: KnowledgePassage[]) => group.reduce((sum, item) => sum + item.text.length, 0)
      return size(left) - size(right)
    })
  const selected: KnowledgePassage[] = []
  let used = 0
  for (const group of ordered) {
    for (const passage of group) {
      if (selected.length >= PASSAGE_LIMIT) return selected
      if (used + passage.text.length > CONTEXT_CHAR_BUDGET && selected.length > 0) return selected
      selected.push(passage)
      used += passage.text.length
    }
  }
  return selected
}

/** «ПФКИ» → the passage that spells Президентский фонд культурных инициатив. */
function acronymPositions(query: string, passages: readonly KnowledgePassage[]) {
  const wanted = new Set((query.match(/\p{Lu}{3,8}/gu) ?? []).map((item) => item.toLowerCase()))
  const positions = new Set<number>()
  if (wanted.size === 0) return positions
  for (const passage of passages) {
    const words = passage.text.match(/[A-Za-zА-ЯЁа-яё]{2,}/g) ?? []
    for (const acronym of wanted) {
      const size = acronym.length
      for (let index = 0; index + size <= words.length; index += 1) {
        const window = words.slice(index, index + size)
        const letters = window.map((word) => word[0]?.toLowerCase() ?? '').join('')
        const first = window[0]?.[0] ?? ''
        const capital = first !== first.toLowerCase()
        if (letters === acronym && capital) positions.add(passage.position)
      }
    }
  }
  return positions
}

/** Keyword rank, the precise half of how large chats search long files. */
export function selectKnowledgePassages(query: string, passages: readonly KnowledgePassage[]) {
  if (passages.length === 0) return []
  const queryTokens = tokens(query)
  if (queryTokens.length === 0) {
    if (asksToReproduce(query) || tableOrdinal(query) !== null || asksForEveryTable(query)) {
      return passagesInBudget(passages)
    }
    return []
  }
  const rawDocuments = passages.map((passage) => tokens(passage.text))
  const documents = rawDocuments.map((document) => document.map(stem))
  const averageLength = documents.reduce((sum, document) => sum + document.length, 0) / documents.length || 1
  const documentFrequency = new Map<string, number>()
  for (const document of documents) {
    for (const token of new Set(document)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    }
  }
  const spelledOut = acronymPositions(query, passages)
  const aboutDocument = asksAboutDocument(queryTokens)
  const scored = passages.map((passage, index) => {
    const document = documents[index] ?? []
    const raw = rawDocuments[index] ?? []
    const frequency = new Map<string, number>()
    for (const token of document) frequency.set(token, (frequency.get(token) ?? 0) + 1)
    let score = 0
    let specific = spelledOut.has(passage.position)
    for (const token of queryTokens) {
      const key = stem(token)
      let hits = frequency.get(key) ?? 0
      let docs = documentFrequency.get(key) ?? 0
      if (hits === 0 && token.length >= 3 && token.length <= 4) {
        hits = raw.filter((word) => word.startsWith(token) && word.length > token.length).length
        docs = rawDocuments.filter((words) =>
          words.some((word) => word.startsWith(token) && word.length > token.length),
        ).length
      }
      if (hits === 0) continue
      if (!isGeneric(token)) specific = true
      const idf = Math.log((passages.length - docs + 0.5) / (docs + 0.5) + 1)
      const lengthNorm = 1 - 0.75 + 0.75 * (document.length / averageLength)
      score += idf * ((hits * 2.2) / (hits + 1.2 * lengthNorm))
    }
    if (spelledOut.has(passage.position)) score += 8
    return { passage, score, specific }
  })
  const relevant = scored.filter((item) => item.specific && item.score > 0)
  if (relevant.length === 0 && (asksToReproduce(query) || tableOrdinal(query) !== null || asksForEveryTable(query))) {
    return passagesInBudget(passages)
  }
  if (relevant.length === 0 && !aboutDocument) return []

  const pinned: KnowledgePassage[] = []
  const pinnedIds = new Set<string>()
  const pin = (passage: KnowledgePassage | undefined) => {
    if (!passage) return
    const id = `${fileKey(passage)}:${passage.position}`
    if (pinnedIds.has(id)) return
    pinnedIds.add(id)
    pinned.push(passage)
  }
  const hitFiles = new Set(relevant.map((item) => fileKey(item.passage)))
  for (const passage of passages) {
    if (passage.position !== 0) continue
    if (hitFiles.has(fileKey(passage)) || (aboutDocument && relevant.length === 0)) pin(passage)
  }
  for (const passage of passages) {
    if (spelledOut.has(passage.position)) pin(passage)
  }

  relevant.sort((left, right) => right.score - left.score || left.passage.position - right.passage.position)
  const selected = [...pinned]
  let used = pinned.reduce((sum, passage) => sum + passage.text.length, 0)
  for (const item of relevant) {
    const id = `${fileKey(item.passage)}:${item.passage.position}`
    if (pinnedIds.has(id)) continue
    if (selected.length >= PASSAGE_LIMIT) break
    if (used + item.passage.text.length > CONTEXT_CHAR_BUDGET && selected.length > 0) break
    selected.push(item.passage)
    used += item.passage.text.length
  }
  return selected.sort((left, right) => left.position - right.position || left.fileName.localeCompare(right.fileName))
}

/** Chunks overlap, so joining them raw repeats the border rows of a sheet. */
function joinChunks(parts: readonly string[]) {
  let full = ''
  for (const part of parts) {
    const piece = part.trim()
    if (!piece) continue
    if (!full) {
      full = piece
      continue
    }
    const max = Math.min(full.length, piece.length, 500)
    let cut = 0
    for (let size = max; size >= 24; size -= 1) {
      if (full.endsWith(piece.slice(0, size))) {
        cut = size
        break
      }
    }
    full = cut > 0 ? full + piece.slice(cut) : `${full}\n${piece}`
  }
  return full
}

function tablesFromPassages(passages: readonly KnowledgePassage[], selected: readonly KnowledgePassage[]) {
  const groups = new Map<string, KnowledgePassage[]>()
  for (const passage of passages) {
    const key = fileKey(passage)
    const group = groups.get(key) ?? []
    group.push(passage)
    groups.set(key, group)
  }
  const visible = new Set(selected.map((passage) => `${fileKey(passage)}:${passage.position}`))
  return [...groups.values()].flatMap((group) => {
    const ordered = [...group].sort((left, right) => left.position - right.position)
    const source = ordered[0]
    if (!source || !ordered.some((passage) => visible.has(`${fileKey(passage)}:${passage.position}`))) return []
    const full = joinChunks(ordered.map((item) => item.text))
    const opened = ordered
      .filter((passage) => visible.has(`${fileKey(passage)}:${passage.position}`))
      .map((item) => item.text)
      .join('\n')
    // A scan stores real grids as Markdown. A long prose file stays on the opened excerpts.
    const text = /\|\s*-{3,}/.test(full) ? full : opened
    return listPlainTables(text).map((table) => ({
      ...table,
      baseName: source.baseName,
      fileName: source.fileName,
    }))
  }).map((table, index) => ({ ...table, index: index + 1 }))
}

const TABLE_MENU_MARK = 'NORA_TABLE_MENU\n'
const TABLE_SHEET_MARK = 'NORA_TABLE_SHEET\n'
const SHEET_WORDS = ['первая', 'вторая', 'третья', 'четвёртая', 'пятая', 'шестая', 'седьмая', 'восьмая', 'девятая']

function asksForEveryTable(query: string) {
  return /все таблиц|кажд(?:ую|ой) таблиц|извлеки все|покажи все|выведи все/.test(query.toLowerCase())
}

function captionLine(title: string) {
  return /[.!?…]$/.test(title.trim()) ? `${title.trim()}\n\n` : ''
}

function tableMenu(fileName: string, tables: readonly { index: number; title: string }[]) {
  const lines = tables.map((table) => `${table.index}. ${table.title}`)
  return `${TABLE_MENU_MARK}В файле «${fileName}» такие таблицы:\n${lines.join('\n')}\n\nНапишите номер — построю её.`
}

const SHEET_SKIP = new Set(['о', 'и', 'в', 'на', 'по', 'с', 'к', 'из', 'от', 'для', 'или'])

function sheetTokens(value: string) {
  return (value.toLowerCase().replace(/ё/g, 'е').match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (token) => token.length > 1 && !SHEET_SKIP.has(token),
  )
}

function sheetTokenMatches(queryToken: string, nameToken: string) {
  if (queryToken === nameToken) return true
  if (nameToken.length <= 3 || /^\d/.test(nameToken)) return false
  return queryToken.startsWith(nameToken.slice(0, 4))
}

/** «Форму 12» names the tab «Форма 12». «Форма 1» does not, and «курс» does not name «РС». */
function queryNamesSheet(query: string, sheet: string) {
  const nameTokens = sheetTokens(sheet)
  if (nameTokens.length === 0) return -1
  const queryTokens = sheetTokens(query)
  let at = 0
  let start = -1
  for (let index = 0; index < queryTokens.length; index += 1) {
    if (!sheetTokenMatches(queryTokens[index] ?? '', nameTokens[at] ?? '')) continue
    if (at === 0) start = index
    at += 1
    if (at < nameTokens.length) continue
    if (index - start <= nameTokens.length) return index
    at = 0
    start = -1
  }
  return -1
}

function namedSheet(query: string, tables: readonly PlainTable[]) {
  const hits = tables
    .map((table) => ({ table, end: table.sheet ? queryNamesSheet(query, table.sheet) : -1 }))
    .filter((item) => item.end >= 0)
  hits.sort(
    (left, right) => right.end - left.end || (right.table.sheet?.length ?? 0) - (left.table.sheet?.length ?? 0),
  )
  return hits[0]?.table
}

function sheetPreview(markdown: string) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|\s*-{3,}/.test(line))
    .slice(0, 4)
    .map((line) => (line.length > 240 ? `${line.slice(0, 240)}…` : line))
    .join('\n')
}

/** Enough of every worksheet for a conclusion, without pasting the whole workbook. */
function sheetDigest(fileName: string, tables: readonly PlainTable[]) {
  const sheets = tables.filter((table) => table.sheet && table.markdown)
  if (sheets.length < 2) return ''
  let text = `Прикреплённый файл «${fileName}». Начало листов, чтобы ответить на вопрос.\n`
  for (const table of sheets) {
    const block = `\nЛист «${table.sheet}»\n${sheetPreview(table.markdown)}\n`
    if (text.length + block.length > 9000) {
      text += '\nДальше листы есть, в эту выдержку они не поместились.'
      break
    }
    text += block
  }
  return text.trim()
}

/** A sum or a reason stays with the model. «Давай Форма 12» is the grid itself. */
function wantsSheetShown(query: string) {
  return !asksForReasoning(query)
}

function chosenTableContext(
  table: { index: number; title: string; markdown: string; text: string },
  alone = false,
) {
  const word = SHEET_WORDS[table.index - 1] ?? String(table.index)
  const lead = alone ? 'Вот таблица.' : `Вот ${word} таблица.`
  return `${TABLE_SHEET_MARK}${lead}\n\n${captionLine(table.title)}${table.markdown || table.text}`
}

export function buildKnowledgeContext(query: string, passages: readonly KnowledgePassage[]) {
  const tables = passages.length > 0 ? tablesFromPassages(passages, passages) : []
  const named = namedSheet(query, tables)
  if (named?.markdown && named.sheet) {
    if (wantsSheetShown(query)) return `${TABLE_SHEET_MARK}Вот лист «${named.sheet}».\n\n${named.markdown}`
    return `Лист «${named.sheet}»\n${named.markdown}`
  }
  const ordinal = tableOrdinal(query)
  const every = asksForEveryTable(query)
  const fileName = tables[0]?.fileName
  if (
    fileName
    && !asksToReproduce(query)
    && ordinal === null
    && !every
    && asksAboutSheets(query)
  ) {
    const digest = sheetDigest(fileName, tables)
    if (digest) return digest
  }
  const selected = selectKnowledgePassages(query, passages)
  const body = formatKnowledgeContext(selected)
  if ((!asksToReproduce(query) && ordinal === null && !every) || selected.length === 0) return body
  const lead = tables[0]
  if (ordinal) {
    const chosen = tables.find((table) => table.index === ordinal)
    if (chosen) return chosenTableContext(chosen)
    if (!lead) return body
    return tableMenu(lead.fileName, tables)
  }
  if (tables.length === 1 && lead?.markdown) return chosenTableContext(lead, true)
  if (tables.length < 2) {
    return `${body}\n\nВ тексте одна таблица. Если её просят построить, выведи таблицей Markdown. Не пиши «В выбранной базе этого нет».`
  }
  if (!lead) return body
  if (every) {
    const blocks = tables
      .map((table) => `Таблица ${table.index}.\n${captionLine(table.title)}${table.markdown || table.text}`)
      .join('\n\n')
    return `${TABLE_SHEET_MARK}${blocks}`
  }
  return tableMenu(lead.fileName, tables)
}

const FILE_ORDINAL_WORD = [
  'перв(?:ый|ого|ому|ым|ая|ую|ое)',
  'втор(?:ой|ого|ому|ым|ая|ую|ое)',
  'трет(?:ий|ьего|ьему|ьим|ья|ью|ье)',
  'четв[её]рт(?:ый|ого|ому|ым|ая|ую|ое)',
  'пят(?:ый|ого|ому|ым|ая|ую|ое)',
]
const FILE_PLACE = ['первый', 'второй', 'третий', 'четвёртый', 'пятый']

function fileOrdinal(query: string) {
  const lower = query.toLowerCase()
  for (let index = 0; index < FILE_ORDINAL_WORD.length; index += 1) {
    const word = FILE_ORDINAL_WORD[index] ?? ''
    const beforeFile = new RegExp(`${word}\\s+(?:файл|документ|вложен)`)
    const afterFile = new RegExp(`(?:файл|документ|вложен)\\S{0,6}\\s+${word}`)
    if (beforeFile.test(lower) || afterFile.test(lower)) return index
  }
  if (/скид\p{L}{0,8}\s+первым|отправ\p{L}{0,8}\s+первым|присыла\p{L}{0,8}\s+первым|прикреп\p{L}{0,8}\s+первым/u.test(lower)) {
    return 0
  }
  if (/из\s+первого\b/.test(lower) && !/из\s+первого\s+столб/.test(lower)) return 0
  if (/из\s+второго\b/.test(lower) && !/из\s+второго\s+столб/.test(lower)) return 1
  return null
}

/** «Из первого файла» stays on the earlier attachment. «Построй вторую» stays on the latest. */
export function chooseAttachedFile(query: string, names: readonly string[]) {
  if (names.length === 0) return -1
  const lower = query.toLowerCase()
  const named = names.findIndex((name) => {
    const base = name.toLowerCase().replace(/\.[a-z0-9]+$/, '')
    return base.length >= 3 && lower.includes(base)
  })
  if (named >= 0) return named
  const ordinal = fileOrdinal(query)
  if (ordinal !== null && ordinal < names.length) return ordinal
  return names.length - 1
}

function mentionFileOrder(context: string, fileName: string, catalog: readonly string[] | undefined) {
  if (!catalog || catalog.length < 2) return context
  const place = catalog.indexOf(fileName)
  const word = FILE_PLACE[place]
  const note = word ? `Файл «${fileName}», ${word} в диалоге.` : `Файл «${fileName}».`
  if (context.startsWith(TABLE_MENU_MARK) || context.startsWith(TABLE_SHEET_MARK)) {
    const mark = context.startsWith(TABLE_MENU_MARK) ? TABLE_MENU_MARK : TABLE_SHEET_MARK
    return `${mark}${note}\n\n${context.slice(mark.length)}`
  }
  const list = catalog.map((item, index) => `${index + 1}. ${item}`).join('\n')
  return `В диалоге прикреплены файлы по порядку:\n${list}\n\n${note}\n\n${context}`
}

/** The file from the plus button. A table question uses the same sheets as a knowledge base. */
export function attachedFileContext(
  query: string,
  fileName: string,
  text: string,
  catalog?: readonly string[],
) {
  const name = fileName.replace(/\s+/g, ' ').trim().slice(0, 180) || 'файл'
  const chunks = chunkKnowledgeText(text)
  if (chunks.length === 0) return mentionFileOrder(`В файле «${name}» не нашлось текста.`, name, catalog)
  const passages: KnowledgePassage[] = chunks.map((chunk, position) => ({
    baseName: 'Вложение',
    fileName: name,
    position,
    text: chunk,
  }))
  const context = buildKnowledgeContext(query, passages)
  const opened = context.startsWith(TABLE_MENU_MARK) || context.startsWith(TABLE_SHEET_MARK)
    ? context
    : (context.includes('подходящих фрагментов нет')
      ? formatKnowledgeContext(passages.slice(0, PASSAGE_LIMIT))
      : context
    ).replace('Выдержки из включённых баз знаний.', `Прикреплённый файл «${name}».`)
  return mentionFileOrder(opened, name, catalog)
}

/** A file in the message is the subject. A ready table from it stays ahead of the selected bases. */
export function combineKnowledgeContext(attached: string, selected: string) {
  const file = attached.trim()
  const bases = selected.trim()
  if (directKnowledgeReply(file)) return file
  if (!file) return bases
  if (directKnowledgeReply(bases)) return file
  return [file, bases].filter(Boolean).join('\n\n')
}

/** A finished table or the list of tables. The chat sends this instead of asking the model. */
export function directKnowledgeReply(knowledge: string) {
  if (knowledge.startsWith(TABLE_SHEET_MARK)) return knowledge.slice(TABLE_SHEET_MARK.length).trim()
  if (knowledge.startsWith(TABLE_MENU_MARK)) {
    const text = knowledge.slice(TABLE_MENU_MARK.length).trim()
    return text || null
  }
  return copiedKnowledgeTable(knowledge)
}

/** A numbered table is already built. The chat returns it as written. */
export function copiedKnowledgeTable(knowledge: string) {
  if (!knowledge.includes('дословно и без вступления')) return null
  const lines = knowledge.split('\n')
  const start = lines.findIndex((line) => line.startsWith('| '))
  if (start < 0) return null
  const table: string[] = []
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (!line.startsWith('|')) break
    table.push(line)
  }
  return table.length >= 3 ? table.join('\n') : null
}

export function formatKnowledgeContext(passages: readonly KnowledgePassage[]) {
  const header = 'Выдержки из включённых баз знаний.'
  if (passages.length === 0) {
    return `${header}\nПо этому вопросу в выбранных базах подходящих фрагментов нет.`
  }
  const body = passages
    .map(
      (passage, index) =>
        `[${index + 1}] База «${passage.baseName}», файл «${passage.fileName}»\n${passage.text}`,
    )
    .join('\n\n')
  return `${header}\n${body}`
}
