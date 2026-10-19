import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { createPrisma } from '../src/db'
import {
  assertLoginCapableAdmin,
  bootstrapAdmin,
  parseAdminSeedConfig,
} from '../src/modules/users/infrastructure/admin-bootstrap'

const backendRoot = resolve(import.meta.dirname, '..')

function run(args: string[]) {
  const child = spawn(process.execPath, args, {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  })
  return new Promise<number>((resolveStatus, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => resolveStatus(code ?? 1))
  })
}

const migrationStatus = await run(['run', 'prisma:deploy'])
if (migrationStatus !== 0) process.exit(migrationStatus)

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const db = createPrisma(databaseUrl)
try {
  if (process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
    const admin = await bootstrapAdmin(
      db,
      parseAdminSeedConfig(process.env, { requirePassword: true }),
    )
    console.log(`Administrator ${admin.email} is login-capable.`)
  }
  await assertLoginCapableAdmin(db)
} finally {
  await db.$disconnect()
}

const server = spawn(process.execPath, ['src/index.ts'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'inherit',
})

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.kill(signal))
}

server.on('exit', (code) => process.exit(code ?? 0))
