import { mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

import { deadlineMillis } from '../domain/keep-notice'
import { noticeBody } from '../domain/notice-text'
import { readPackCard, presentDate } from '../domain/pack-card'
import { readNoticeDocument } from '../domain/read-notice'
import { normalizeSavedQuery, noticeNeedle, savedSearch, type SavedNoticeQuery } from '../domain/saved-filter'
import { initialPackPlan, packCellsDone, SAVED_PAGE_SIZE, type PackPlan } from '../domain/pack-sync'
import { readZipXml } from '../domain/zip-xml'
import { initialPlan, moscowDate, type OpenSyncPlan } from '../domain/open-sync'
import type { OpenNotice } from '../domain/read-search'

export type StoredNotice = OpenNotice & { subsystem: string }

export type SyncCounts = {
  queued: number
  saved: number
  failed: number
  zipBytes: number
  indexed: number
}

export function openNoticeStore(dir: string, now = () => new Date()) {
  mkdirSync(dir, { recursive: true })
  const db = new Database(`${dir}/notices.sqlite`)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`CREATE TABLE IF NOT EXISTS notices (
    number TEXT PRIMARY KEY,
    subsystem TEXT NOT NULL,
    law TEXT NOT NULL,
    status TEXT NOT NULL,
    object TEXT NOT NULL,
    customer TEXT NOT NULL,
    price TEXT NOT NULL,
    published TEXT NOT NULL,
    updated TEXT NOT NULL,
    deadline TEXT NOT NULL,
    url TEXT NOT NULL,
    zip_bytes INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    needle TEXT NOT NULL DEFAULT '',
    indexed INTEGER NOT NULL DEFAULT 0,
    deadline_ms INTEGER NOT NULL DEFAULT 0
  )`)
  const columns = db.query(`PRAGMA table_info(notices)`).all() as { name: string }[]
  if (!columns.some((column) => column.name === 'needle')) {
    db.run(`ALTER TABLE notices ADD COLUMN needle TEXT NOT NULL DEFAULT ''`)
  }
  if (!columns.some((column) => column.name === 'indexed')) {
    db.run(`ALTER TABLE notices ADD COLUMN indexed INTEGER NOT NULL DEFAULT 0`)
  }
  if (!columns.some((column) => column.name === 'deadline_ms')) {
    db.run(`ALTER TABLE notices ADD COLUMN deadline_ms INTEGER NOT NULL DEFAULT 0`)
  }
  db.run(`CREATE INDEX IF NOT EXISTS notices_saved_order ON notices (status, published, number)`)
  db.run(`CREATE INDEX IF NOT EXISTS notices_expired ON notices(deadline_ms) WHERE status = 'saved' AND deadline_ms > 0`)
  db.run(`CREATE INDEX IF NOT EXISTS notices_deadline_raw ON notices(number) WHERE deadline_ms = 0 AND deadline != ''`)
  const textReady = openTextIndex(db)
  fillNeedles(db)
  db.run(`CREATE TABLE IF NOT EXISTS sync_plan (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL
  )`)
  const remember = db.query(`INSERT INTO notices (
    number, subsystem, law, status, object, customer, price, published, updated, deadline, url, needle, deadline_ms
  ) VALUES ($number, $subsystem, $law, 'queued', $object, $customer, $price, $published, $updated, $deadline, $url, $needle, $deadlineMs)
  ON CONFLICT(number) DO NOTHING`)
  const nextQueued = db.query(`SELECT number, subsystem, law, status, object, customer, price, published, updated, deadline, url
    FROM notices WHERE status = 'queued' ORDER BY published, number LIMIT 1`)
  const markSaved = db.query(`UPDATE notices SET status = 'saved', zip_bytes = $bytes, error = '' WHERE number = $number`)
  const markFailed = db.query(`UPDATE notices SET status = 'failed', error = $error WHERE number = $number`)
  const readPlan = db.query(`SELECT json FROM sync_plan WHERE id = 1`)
  const writePlan = db.query(`INSERT INTO sync_plan (id, json) VALUES (1, $json)
    ON CONFLICT(id) DO UPDATE SET json = excluded.json`)

  return {
    dir,
    remember(notice: StoredNotice) {
      remember.run({
        $number: notice.number,
        $subsystem: notice.subsystem,
        $law: notice.law,
        $object: notice.object,
        $customer: notice.customer,
        $price: notice.price,
        $published: notice.published,
        $updated: notice.updated,
        $deadline: notice.deadline,
        $url: notice.url,
        $needle: noticeNeedle(notice),
        $deadlineMs: deadlineMillis(notice.deadline),
      })
    },
    nextQueued(): StoredNotice | null {
      const row = nextQueued.get() as Record<string, string> | null
      if (!row) return null
      return {
        number: row.number,
        subsystem: row.subsystem,
        law: row.law,
        status: row.status,
        object: row.object,
        customer: row.customer,
        price: row.price,
        published: row.published,
        updated: row.updated,
        deadline: row.deadline,
        url: row.url,
      }
    },
    markSaved(number: string, bytes: number) {
      markSaved.run({ $number: number, $bytes: bytes })
    },
    markFailed(number: string, error: string) {
      markFailed.run({ $number: number, $error: error.slice(0, 300) })
    },
    plan(): OpenSyncPlan {
      const row = readPlan.get() as { json: string } | null
      if (!row) return initialPlan(moscowDate(now()))
      const parsed = JSON.parse(row.json) as OpenSyncPlan
      return { ...parsed, truncatedDays: parsed.truncatedDays ?? [] }
    },
    savePlan(plan: OpenSyncPlan) {
      writePlan.run({ $json: JSON.stringify(plan) })
    },
    /** Switches an in-progress number crawl over to day-and-region packs. Saved archives stay. */
    packPlan(): PackPlan {
      const row = readPlan.get() as { json: string } | null
      const parsed = row ? JSON.parse(row.json) as PackPlan : null
      if (parsed?.mode === 'packs') {
        const plan = { ...initialPackPlan(moscowDate(now())), ...parsed, mode: 'packs' as const }
        if (plan.startedAt) return plan
        const stamped = {
          ...plan,
          startedAt: now().toISOString(),
          baseDone: packCellsDone(plan, moscowDate(now())),
        }
        writePlan.run({ $json: JSON.stringify(stamped) })
        return stamped
      }
      db.run(`DELETE FROM notices WHERE status = 'queued'`)
      const fresh = {
        ...initialPackPlan(moscowDate(now())),
        startedAt: now().toISOString(),
        baseDone: 0,
      }
      writePlan.run({ $json: JSON.stringify(fresh) })
      return fresh
    },
    savePackPlan(plan: PackPlan) {
      writePlan.run({ $json: JSON.stringify(plan) })
    },
    savedPage(page: number, raw: { text?: string; phrases?: readonly string[]; laws?: readonly string[]; rank?: boolean } = {}) {
      const query = normalizeSavedQuery(raw.text ?? '', raw.laws ?? [], raw.phrases ?? [], raw.rank === true)
      const filter = searchFilter(db, textReady, query)
      const totalRow = db.query(`SELECT COUNT(*) AS count FROM notices WHERE ${filter.where}`).get(filter.params) as { count: number }
      const total = totalRow.count
      const pageCount = Math.max(1, Math.ceil(total / SAVED_PAGE_SIZE))
      const safePage = Math.min(Math.max(page, 1), pageCount)
      const rows = db.query(`SELECT number, law, status, object, customer, price, published, updated, deadline, url, indexed, (${filter.hits}) AS matches
        FROM notices WHERE ${filter.where}
        ORDER BY ${query.rank ? 'matches DESC, ' : ''}published DESC, number DESC
        LIMIT $limit OFFSET $offset`).all({
        ...filter.params,
        $limit: SAVED_PAGE_SIZE,
        $offset: (safePage - 1) * SAVED_PAGE_SIZE,
      }) as SavedRow[]
      return {
        total,
        page: safePage,
        pageCount,
        notices: rows.map((row) => presentRow(fillRow(dir, db, row))),
      }
    },
    noticeCard(number: string) {
      if (!/^\d{5,30}$/.test(number)) return null
      const row = db.query(`SELECT number, law, status, object, customer, price, published, updated, deadline, url, indexed, 0 AS matches
        FROM notices WHERE number = $number AND status = 'saved'`).get({ $number: number }) as SavedRow | null
      if (!row) return null
      const shown = presentRow(fillRow(dir, db, row))
      if (row.indexed !== 1) return { ...cardBody(shown), parsed: false, sections: [] }
      const document = readNoticeDocument(readStoredXml(dir, number))
      return {
        ...cardBody(shown),
        parsed: document.sections.length > 0,
        sections: document.sections,
      }
    },
    chatMatches(phrases: readonly string[], skip: readonly string[]) {
      const query = normalizeSavedQuery('', [], phrases, true)
      if (query.phrases.length === 0) return { total: 0, notices: [] as ChatNotice[] }
      const filter = searchFilter(db, textReady, query)
      const totalRow = db.query(`SELECT COUNT(*) AS count FROM notices WHERE ${filter.where}`).get(filter.params) as { count: number }
      const params: Record<string, string | number> = { ...filter.params }
      const safeSkip = skip.filter((item) => /^\d+$/.test(item)).slice(0, 80)
      for (const [index, item] of safeSkip.entries()) params[`$skip${index}`] = item
      const where = safeSkip.length === 0
        ? filter.where
        : `${filter.where} AND number NOT IN (${safeSkip.map((_, index) => `$skip${index}`).join(', ')})`
      const rows = db.query(`SELECT rowid AS id, number, law, status, object, customer, price, published, updated, deadline, url, indexed, (${filter.hits}) AS matches
        FROM notices WHERE ${where}
        ORDER BY matches DESC, published DESC, number DESC
        LIMIT 12`).all(params) as Array<SavedRow & { id: number }>
      return {
        total: totalRow.count,
        notices: rows.map((row) => {
          const shown = presentRow(row)
          return {
            number: shown.number,
            law: shown.law,
            object: shown.object,
            customer: shown.customer,
            price: shown.price,
            parsed: row.indexed === 1,
            snippet: noticeSnippet(db, row),
          }
        }),
      }
    },
    counts(): SyncCounts {
      const rows = db.query(`SELECT status, indexed, COUNT(*) AS count, COALESCE(SUM(zip_bytes), 0) AS bytes FROM notices GROUP BY status, indexed`).all() as { status: string; indexed: number; count: number; bytes: number }[]
      const counts = { queued: 0, saved: 0, failed: 0, zipBytes: 0, indexed: 0 }
      for (const row of rows) {
        if (row.status === 'queued') counts.queued += row.count
        if (row.status === 'saved') counts.saved += row.count
        if (row.status === 'saved' && row.indexed === 1) counts.indexed += row.count
        if (row.status === 'failed') counts.failed += row.count
        counts.zipBytes += row.bytes
      }
      return counts
    },
    /** Reads one saved archive into the text index. The download cursor stays untouched. */
    indexNext() {
      if (!textReady) return false
      return indexNextNotice(dir, db)
    },
    /** Drops one saved notice whose application deadline has passed. The download cursor stays. */
    expireNext() {
      return expireNextNotice(dir, db, now().getTime())
    },
    close() {
      db.close()
    },
  }
}

export function startNoticeTextIndex(store: { indexNext(): boolean }) {
  const controller = new AbortController()
  const task = run()
  return {
    stop() {
      controller.abort()
      return task.catch(() => undefined)
    },
  }

  async function run() {
    while (!controller.signal.aborted) {
      let found = false
      try {
        found = store.indexNext()
      } catch (error) {
        console.error('Procurement text was not indexed', error instanceof Error ? error.message : error)
      }
      await delay(found ? 50 : 5_000, controller.signal)
    }
  }
}

export function startNoticeExpiry(store: { expireNext(): boolean }) {
  const controller = new AbortController()
  const task = run()
  return {
    stop() {
      controller.abort()
      return task.catch(() => undefined)
    },
  }

  async function run() {
    while (!controller.signal.aborted) {
      let removed = false
      try {
        removed = store.expireNext()
      } catch (error) {
        console.error('Procurement archive was not removed', error instanceof Error ? error.message : error)
      }
      await delay(removed ? 20 : 5_000, controller.signal)
    }
  }
}

export type NoticeStore = ReturnType<typeof openNoticeStore>

type SavedRow = {
  number: string
  law: string
  status: string
  object: string
  customer: string
  price: string
  published: string
  updated: string
  deadline: string
  url: string
  matches: number
  indexed?: number
  id?: number
}

type ChatNotice = {
  number: string
  law: string
  object: string
  customer: string
  price: string
  parsed: boolean
  snippet: string
}

function openTextIndex(db: Database) {
  try {
    db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS notice_text USING fts5(body, content='', tokenize = 'unicode61')`)
    db.run(`CREATE INDEX IF NOT EXISTS notices_text_pending ON notices(indexed) WHERE indexed <> 1`)
    return true
  } catch (error) {
    console.error('Procurement text index was not opened', error instanceof Error ? error.message : error)
    return false
  }
}

function searchFilter(db: Database, textReady: boolean, query: SavedNoticeQuery) {
  if (!textReady || query.phrases.length === 0) return savedSearch(query, 'card')
  const pending = db.query(`SELECT 1 AS hit FROM notices WHERE indexed <> 1 AND status = 'saved' LIMIT 1`).get()
  return savedSearch(query, pending ? 'mixed' : 'indexed')
}

function stampDeadlineBatch(db: Database) {
  const rows = db.query(`SELECT number, deadline FROM notices
    WHERE status = 'saved' AND deadline_ms = 0 AND deadline != '' LIMIT 200`).all() as { number: string; deadline: string }[]
  if (rows.length === 0) return 0
  const update = db.query(`UPDATE notices SET deadline_ms = $ms WHERE number = $number`)
  db.transaction(() => {
    for (const row of rows) update.run({ $number: row.number, $ms: deadlineMillis(row.deadline) })
  })()
  return rows.length
}

function expireNextNotice(dir: string, db: Database, nowMs: number) {
  const stamped = stampDeadlineBatch(db)
  const row = db.query(`SELECT rowid AS id, number FROM notices
    WHERE status = 'saved' AND deadline_ms > 0 AND deadline_ms < $now LIMIT 1`).get({ $now: nowMs }) as { id: number; number: string } | null
  if (!row) return stamped > 0
  if (!removeArchive(dir, row.number)) {
    db.query(`UPDATE notices SET deadline_ms = -1 WHERE rowid = $id`).run({ $id: row.id })
    console.error('Procurement archive was not removed', row.number)
    return true
  }
  db.query(`DELETE FROM notices WHERE rowid = $id`).run({ $id: row.id })
  try {
    db.query(`DELETE FROM notice_text WHERE rowid = $id`).run({ $id: row.id })
  } catch {
    // A contentless index cannot drop one row. The card is already gone, so search will not show it.
  }
  return true
}

function removeArchive(dir: string, number: string) {
  if (!/^\d+$/.test(number)) return true
  try {
    unlinkSync(join(dir, 'zips', `${number}.zip`))
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
}

function indexNextNotice(dir: string, db: Database) {
  const row = db.query(`SELECT rowid AS id, number, object, customer
    FROM notices WHERE status = 'saved' AND indexed = 0 LIMIT 1`).get() as { id: number; number: string; object: string; customer: string } | null
  if (!row) return false
  const body = noticeBody(`${row.number}\n${row.object}\n${row.customer}\n${readStoredXml(dir, row.number)}`)
  const insert = db.query(`INSERT INTO notice_text(rowid, body) VALUES ($id, $body)`)
  const mark = db.query(`UPDATE notices SET indexed = $indexed WHERE rowid = $id`)
  try {
    db.transaction(() => {
      insert.run({ $id: row.id, $body: body || row.number })
      mark.run({ $id: row.id, $indexed: 1 })
    })()
  } catch {
    mark.run({ $id: row.id, $indexed: 2 })
  }
  return true
}

function readStoredXml(dir: string, number: string) {
  try {
    return readZipXml(readFileSync(join(dir, 'zips', `${number}.zip`))).xml
  } catch {
    return ''
  }
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

function fillNeedles(db: Database) {
  const rows = db.query(`SELECT number, object, customer FROM notices WHERE needle = ''`).all() as { number: string; object: string; customer: string }[]
  if (rows.length === 0) return
  const update = db.query(`UPDATE notices SET needle = $needle WHERE number = $number`)
  db.transaction(() => {
    for (const row of rows) update.run({ $number: row.number, $needle: noticeNeedle(row) })
  })()
}

function fillRow(dir: string, db: Database, row: SavedRow) {
  if (row.object) return row
  try {
    const xml = readZipXml(readFileSync(join(dir, 'zips', `${row.number}.zip`))).xml
    const card = readPackCard(xml)
    const next = {
      ...row,
      object: card.object,
      customer: card.customer,
      price: card.price,
      published: card.published || row.published,
      deadline: card.deadline || row.deadline,
      url: card.url || row.url,
    }
    db.query(`UPDATE notices
      SET object = $object, customer = $customer, price = $price, published = $published, deadline = $deadline, url = $url, needle = $needle, deadline_ms = $deadlineMs
      WHERE number = $number`).run({
      $number: row.number,
      $object: next.object,
      $customer: next.customer,
      $price: next.price,
      $published: next.published,
      $deadline: next.deadline,
      $url: next.url,
      $needle: noticeNeedle(next),
      $deadlineMs: deadlineMillis(next.deadline),
    })
    return next
  } catch {
    return row
  }
}

function presentRow(row: SavedRow) {
  return {
    law: row.law,
    status: row.status || 'Подача заявок',
    number: row.number,
    object: row.object || 'Извещение ЕИС',
    customer: row.customer,
    price: row.price,
    published: presentDate(row.published),
    updated: presentDate(row.updated),
    deadline: presentDate(row.deadline),
    url: row.url || `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${row.number}&fz44=on&fz223=on&ppRf615=on`,
    matches: row.matches ?? 0,
    parsed: row.indexed === 1,
  }
}

function cardBody(row: ReturnType<typeof presentRow>) {
  return {
    law: row.law,
    status: row.status,
    number: row.number,
    object: row.object,
    customer: row.customer,
    price: row.price,
    published: row.published,
    updated: row.updated,
    deadline: row.deadline,
    url: row.url,
  }
}

function noticeSnippet(db: Database, row: SavedRow) {
  if (row.indexed === 1 && row.id) {
    try {
      const found = db.query(`SELECT substr(body, 1, 420) AS snippet FROM notice_text WHERE rowid = $id`).get({ $id: row.id }) as { snippet: string } | null
      const snippet = found?.snippet?.trim()
      if (snippet) return snippet
    } catch {
      // A contentless text table may refuse to return the stored body.
    }
  }
  return `${row.object}\n${row.customer}`.trim().slice(0, 420)
}
