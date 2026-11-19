import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

import { readPackCard, presentDate } from '../domain/pack-card'
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
    error TEXT NOT NULL DEFAULT ''
  )`)
  db.run(`CREATE INDEX IF NOT EXISTS notices_saved_order ON notices (status, published, number)`)
  db.run(`CREATE TABLE IF NOT EXISTS sync_plan (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL
  )`)
  const remember = db.query(`INSERT INTO notices (
    number, subsystem, law, status, object, customer, price, published, updated, deadline, url
  ) VALUES ($number, $subsystem, $law, 'queued', $object, $customer, $price, $published, $updated, $deadline, $url)
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
    savedPage(page: number) {
      const totalRow = db.query(`SELECT COUNT(*) AS count FROM notices WHERE status = 'saved'`).get() as { count: number }
      const total = totalRow.count
      const pageCount = Math.max(1, Math.ceil(total / SAVED_PAGE_SIZE))
      const safePage = Math.min(Math.max(page, 1), pageCount)
      const rows = db.query(`SELECT number, law, status, object, customer, price, published, updated, deadline, url
        FROM notices WHERE status = 'saved'
        ORDER BY published DESC, number DESC
        LIMIT $limit OFFSET $offset`).all({
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
    counts(): SyncCounts {
      const rows = db.query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(zip_bytes), 0) AS bytes FROM notices GROUP BY status`).all() as { status: string; count: number; bytes: number }[]
      const counts = { queued: 0, saved: 0, failed: 0, zipBytes: 0 }
      for (const row of rows) {
        if (row.status === 'queued') counts.queued = row.count
        if (row.status === 'saved') counts.saved = row.count
        if (row.status === 'failed') counts.failed = row.count
        counts.zipBytes += row.bytes
      }
      return counts
    },
    close() {
      db.close()
    },
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
      SET object = $object, customer = $customer, price = $price, published = $published, deadline = $deadline, url = $url
      WHERE number = $number`).run({
      $number: row.number,
      $object: next.object,
      $customer: next.customer,
      $price: next.price,
      $published: next.published,
      $deadline: next.deadline,
      $url: next.url,
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
  }
}
