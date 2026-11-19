export const SAVED_LAWS = ['44', '223', '615'] as const

export type SavedLaw = (typeof SAVED_LAWS)[number]

export type SavedNoticeQuery = {
  text: string
  laws: SavedLaw[]
}

const LAW_MATCH: Record<SavedLaw, string> = {
  '44': "law LIKE '%44-ФЗ%'",
  '223': "law LIKE '%223-ФЗ%'",
  '615': "law LIKE '%615%'",
}

/** Search text and law checkboxes. An empty law list means every saved notice. */
export function normalizeSavedQuery(text: string, laws: readonly string[]): SavedNoticeQuery {
  return {
    text: text.trim().toLocaleLowerCase('ru-RU').slice(0, 80),
    laws: SAVED_LAWS.filter((law) => laws.includes(law)),
  }
}

export function noticeNeedle(row: { number: string; object: string; customer: string }) {
  return `${row.number}\n${row.object}\n${row.customer}`.toLocaleLowerCase('ru-RU')
}

export function savedNoticeWhere(query: SavedNoticeQuery) {
  const clauses = [`status = 'saved'`]
  const params: Record<string, string | number> = {}
  if (query.text) {
    params.$text = `%${query.text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
    clauses.push(`needle LIKE $text ESCAPE '\\'`)
  }
  if (query.laws.length > 0) {
    clauses.push(`(${query.laws.map((law) => LAW_MATCH[law]).join(' OR ')})`)
  }
  return { where: clauses.join(' AND '), params }
}
