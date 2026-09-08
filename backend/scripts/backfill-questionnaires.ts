import 'dotenv/config'

import { createPrisma } from '../src/db'
import { backfillUserQuestionnaires } from '../src/modules/users'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const prisma = createPrisma(databaseUrl)
try {
  const result = await backfillUserQuestionnaires(prisma)
  console.log(
    `Questionnaire backfill: scanned=${result.scanned} created=${result.created} skipped=${result.skipped}`,
  )
} finally {
  await prisma.$disconnect()
}
