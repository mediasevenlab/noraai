import 'dotenv/config'

import { createPrisma } from '../src/db'
import {
  bootstrapDefaultAccounts,
  DEFAULT_APP_ACCOUNT_PASSWORD,
} from '../src/modules/users'
import {
  bootstrapAdmin,
  parseAdminSeedConfig,
} from '../src/modules/users/infrastructure/admin-bootstrap'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'prisma:seed is disabled in production; use db:deploy for strict administrator bootstrap',
  )
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the administrator')
}

const prisma = createPrisma(databaseUrl)
try {
  const config = parseAdminSeedConfig(process.env, { requirePassword: false })
  const result = await bootstrapAdmin(prisma, config)
  if (result.locked) {
    console.log(
      `Seeded locked administrator ${result.email}. Set ADMIN_SEED_PASSWORD and run the seed again to enable password login.`,
    )
  } else {
    console.log(`Seeded login-capable administrator ${result.email}.`)
  }
  const defaults = await bootstrapDefaultAccounts(prisma, DEFAULT_APP_ACCOUNT_PASSWORD)
  console.log(
    `Seeded default accounts created=${defaults.created.length} updated=${defaults.updated.length}.`,
  )
} finally {
  await prisma.$disconnect()
}
