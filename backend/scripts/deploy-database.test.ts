import { describe, expect, test } from 'bun:test'

import type { DbClient } from '../src/db'
import { deployDatabase } from './deploy-database'

describe('database deployment command', () => {
  test('rejects invalid configuration before attempting a migration', async () => {
    const invalidSources = [
      {},
      {
        DATABASE_URL: databaseUrl,
        ADMIN_SEED_EMAIL: 'admin@example.com',
      },
      {
        DATABASE_URL: databaseUrl,
        ADMIN_SEED_EMAIL: 'admin@example.com',
        ADMIN_SEED_PASSWORD: 'aaaaaaaaaaaa',
      },
    ]

    for (const source of invalidSources) {
      let migrationAttempts = 0
      await expect(
        deployDatabase(source, {
          ...unusedDependencies,
          migrate() {
            migrationAttempts += 1
          },
        }),
      ).rejects.toThrow()
      expect(migrationAttempts).toBe(0)
    }
  })

  test('migrates and verifies an existing login-capable administrator', async () => {
    const calls: string[] = []
    await deployDatabase(
      { DATABASE_URL: databaseUrl },
      dependenciesRecording(calls),
    )

    expect(calls).toEqual([
      'migrate',
      'create',
      'backfill-meal-client-keys',
      'log',
      'backfill-meal-versions',
      'log',
      'backfill',
      'log',
      'assert',
      'disconnect',
      'log',
    ])
  })

  test('bootstraps paired strong credentials before verifying the administrator', async () => {
    const calls: string[] = []
    await deployDatabase(
      {
        DATABASE_URL: databaseUrl,
        ADMIN_SEED_EMAIL: ' ADMIN@Example.COM ',
        ADMIN_SEED_PASSWORD: 'a-strong-initial-password',
      },
      dependenciesRecording(calls),
    )

    expect(calls).toEqual([
      'migrate',
      'create',
      'backfill-meal-client-keys',
      'log',
      'backfill-meal-versions',
      'log',
      'bootstrap:admin@example.com',
      'backfill',
      'log',
      'assert',
      'disconnect',
      'log',
    ])
  })

  test('fails fast on a meal client-key conflict and still disconnects', async () => {
    const calls: string[] = []
    const dependencies = dependenciesRecording(calls)

    await expect(
      deployDatabase(
        { DATABASE_URL: databaseUrl },
        {
          ...dependencies,
          async backfillMealClientKeys() {
            calls.push('backfill-meal-client-keys')
            throw new Error('meal clientKey conflict')
          },
        },
      ),
    ).rejects.toThrow('meal clientKey conflict')

    expect(calls).toEqual([
      'migrate',
      'create',
      'backfill-meal-client-keys',
      'disconnect',
    ])
  })
})

const databaseUrl = 'postgresql://unused:unused@127.0.0.1:1/unused'

const unusedDependencies = {
  async assertAdmin() {
    throw new Error('assertAdmin must not run')
  },
  async backfillQuestionnaires() {
    throw new Error('backfillQuestionnaires must not run')
  },
  async backfillMealClientKeys() {
    throw new Error('backfillMealClientKeys must not run')
  },
  async backfillMealVersions() {
    throw new Error('backfillMealVersions must not run')
  },
  async bootstrap() {
    throw new Error('bootstrap must not run')
  },
  createDatabase() {
    throw new Error('createDatabase must not run')
  },
  log() {
    throw new Error('log must not run')
  },
  migrate() {
    throw new Error('migrate must not run')
  },
}

function dependenciesRecording(calls: string[]) {
  const db = {
    async $disconnect() {
      calls.push('disconnect')
    },
  } as unknown as DbClient

  return {
    async assertAdmin() {
      calls.push('assert')
    },
    async backfillQuestionnaires() {
      calls.push('backfill')
      return { scanned: 0, created: 0, skipped: 0 }
    },
    async backfillMealClientKeys() {
      calls.push('backfill-meal-client-keys')
      return { migrated: 0 }
    },
    async backfillMealVersions() {
      calls.push('backfill-meal-versions')
      return { scanned: 0, updated: 0 }
    },
    async bootstrap(
      _db: DbClient,
      config: { email: string },
    ) {
      calls.push(`bootstrap:${config.email}`)
    },
    createDatabase() {
      calls.push('create')
      return db
    },
    log() {
      calls.push('log')
    },
    migrate() {
      calls.push('migrate')
    },
  }
}
