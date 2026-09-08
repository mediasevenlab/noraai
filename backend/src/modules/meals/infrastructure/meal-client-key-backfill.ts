import type { DbClient } from '../../../db'
import { Prisma } from '../../../generated/prisma/client'

export type MealClientKeyBackfillResult = {
  migrated: number
}

/**
 * Moves pre-clientKey manual meal idempotency keys out of the globally unique
 * Telegram column. Existing conflicts fail before the update; a concurrent
 * conflict fails the single atomic UPDATE through the composite unique index.
 */
export async function backfillMealClientKeys(
  db: DbClient,
): Promise<MealClientKeyBackfillResult> {
  const [conflict] = await db.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM "meals" AS "legacy"
      INNER JOIN "meals" AS "keyed"
        ON "keyed"."user_id" = "legacy"."user_id"
        AND "keyed"."client_key" = "legacy"."telegram_update_id"
        AND "keyed"."id" <> "legacy"."id"
      WHERE "legacy"."source" = CAST('manual' AS "meal_source")
        AND "legacy"."client_key" IS NULL
        AND "legacy"."telegram_update_id" IS NOT NULL
    `,
  )
  const conflicts = conflict?.count ?? 0

  if (conflicts > 0) {
    throw new Error(
      `Meal clientKey backfill conflict: ${conflicts} legacy row(s) already have an owner-scoped key`,
    )
  }

  const migrated = await db.$executeRaw(
    Prisma.sql`
      UPDATE "meals"
      SET
        "client_key" = "telegram_update_id",
        "telegram_update_id" = NULL
      WHERE "source" = CAST('manual' AS "meal_source")
        AND "client_key" IS NULL
        AND "telegram_update_id" IS NOT NULL
    `,
  )

  return { migrated }
}
