import type { DbClient } from '../../../db'
import { uniqueQuestionnaireAnswers } from '../domain/questionnaire'

export type QuestionnaireBackfillResult = {
  scanned: number
  created: number
  skipped: number
}

/** Idempotent: creates completed questionnaire profiles for role=user without one. */
export async function backfillUserQuestionnaires(
  db: DbClient,
  now = new Date(),
): Promise<QuestionnaireBackfillResult> {
  const users = await db.user.findMany({
    where: { role: 'user' },
    select: {
      id: true,
      publicId: true,
      questionnaireProfile: { select: { userId: true } },
    },
    orderBy: { publicId: 'asc' },
  })

  let created = 0
  let skipped = 0

  for (const user of users) {
    if (user.questionnaireProfile) {
      skipped += 1
      continue
    }
    await db.userQuestionnaireProfile.create({
      data: {
        userId: user.id,
        answers: uniqueQuestionnaireAnswers(user.publicId),
        completedAt: now,
        version: 1,
      },
    })
    created += 1
  }

  return {
    scanned: users.length,
    created,
    skipped,
  }
}
