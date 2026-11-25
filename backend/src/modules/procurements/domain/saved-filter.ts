import { noticeMatch } from './notice-text'

export const SAVED_LAWS = ['44', '223', '615'] as const

export type SavedLaw = (typeof SAVED_LAWS)[number]

export type SavedNoticeQuery = {
  phrases: string[]
  laws: SavedLaw[]
  rank: boolean
}

export type SavedSearchMode = 'card' | 'indexed' | 'mixed'

export type SavedSearch = {
  where: string
  params: Record<string, string | number>
  hits: string
}

const LAW_MATCH: Record<SavedLaw, string> = {
  '44': "subsystem = 'PRIZ'",
  '223': "subsystem = 'RI223'",
  '615': "subsystem = 'P615'",
}

const MAX_PHRASES = 8

/** One remembered search phrase: trimmed, folded, and capped. */
export function foldPhrase(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').slice(0, 80)
}

/** Several phrases match a notice when any one of them matches. Rank counts how many. */
export function normalizeSavedQuery(
  text: string,
  laws: readonly string[],
  phrases: readonly string[] = [],
  rank = false,
  phraseLimit = MAX_PHRASES,
): SavedNoticeQuery {
  const source = phrases.length > 0 ? phrases : [text]
  const limit = Math.min(16, Math.max(1, Math.trunc(phraseLimit)))
  const seen = new Set<string>()
  const keys: string[] = []
  for (const item of source) {
    const phrase = foldPhrase(item)
    if (!phrase || seen.has(phrase)) continue
    seen.add(phrase)
    keys.push(phrase)
    if (keys.length === limit) break
  }
  return {
    phrases: keys,
    laws: SAVED_LAWS.filter((law) => laws.includes(law)),
    rank: rank && keys.length > 0,
  }
}

export function noticeNeedle(row: { number: string; object: string; customer: string }) {
  return `${row.number}\n${row.object}\n${row.customer}`.toLocaleLowerCase('ru-RU')
}

export function needlePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

/** Card fields, or the parsed notice text when that row is already indexed. */
export function savedSearch(query: SavedNoticeQuery, mode: SavedSearchMode): SavedSearch {
  const clauses = [`status = 'saved'`]
  const params: Record<string, string | number> = {}
  const parts = query.phrases.map((phrase, index) => phraseSql(index, phrase, mode))
  for (const part of parts) Object.assign(params, part.params)
  if (parts.length > 0) clauses.push(`(${parts.map((part) => part.sql).join(' OR ')})`)
  if (query.laws.length > 0) clauses.push(`(${query.laws.map((law) => LAW_MATCH[law]).join(' OR ')})`)
  const hits = parts.length > 0 && query.rank
    ? parts.map((part) => `(CASE WHEN ${part.sql} THEN 1 ELSE 0 END)`).join(' + ')
    : '0'
  return { where: clauses.join(' AND '), params, hits }
}

/** One phrase as a SQL condition. Indexes must not collide when several groups are combined. */
export function savedPhraseClause(index: number, phrase: string, mode: SavedSearchMode) {
  return phraseSql(index, phrase, mode)
}

function phraseSql(index: number, phrase: string, mode: SavedSearchMode) {
  const match = noticeMatch(phrase)
  const params: Record<string, string> = {}
  const needle = `needle LIKE $t${index} ESCAPE '\\'`
  if (mode === 'card' || !match) {
    params[`$t${index}`] = needlePattern(phrase)
    return { sql: needle, params }
  }
  params[`$m${index}`] = match
  const fullText = `rowid IN (SELECT rowid FROM notice_text WHERE notice_text MATCH $m${index})`
  const byNumber = numberSql(index, phrase, params)
  if (mode === 'indexed') return { sql: byNumber ? `(${fullText} OR ${byNumber})` : fullText, params }
  params[`$t${index}`] = needlePattern(phrase)
  const text = `(${fullText} OR (indexed <> 1 AND ${needle}))`
  return { sql: byNumber ? `(${text} OR ${byNumber})` : text, params }
}

function numberSql(index: number, phrase: string, params: Record<string, string>) {
  if (!/^\d{8,30}$/.test(phrase)) return ''
  params[`$n${index}`] = phrase
  return `number = $n${index}`
}
