import pg from 'pg'

import { normalizePgConnectionString } from '../../../db'

const LOCK_SQL = 'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired'
const UNLOCK_SQL = 'SELECT pg_advisory_unlock(hashtextextended($1, 0))'
const LOCK_NAME = 'telegram-meals-poller'

export type TelegramPollerLock = {
  tryAcquire(): Promise<boolean>
  release(): Promise<void>
}

export function createTelegramPollerLock(
  databaseUrl: string,
  lockName = LOCK_NAME,
): TelegramPollerLock {
  const client = new pg.Client({
    connectionString: normalizePgConnectionString(databaseUrl),
  })
  let connected = false
  let held = false

  return {
    async tryAcquire() {
      if (!connected) {
        await client.connect()
        connected = true
      }
      const result = await client.query<{ acquired: boolean }>(LOCK_SQL, [lockName])
      held = result.rows[0]?.acquired === true
      return held
    },
    async release() {
      if (!connected) return
      try {
        if (held) {
          await client.query(UNLOCK_SQL, [lockName])
          held = false
        }
      } finally {
        await client.end()
        connected = false
      }
    },
  }
}
