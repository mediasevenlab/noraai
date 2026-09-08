import type { DbClient } from '../../../db'
import { toBaseUserDto, type ProjectUser } from '../../auth'

/** Enrich auth UserDto with questionnaire completion for workspace gating. */
export function createQuestionnaireProjectUser(db: DbClient): ProjectUser {
  return async (user) => {
    if (user.role !== 'user') {
      return toBaseUserDto(user, true)
    }

    const profile = await db.userQuestionnaireProfile.findUnique({
      where: { userId: user.id },
      select: { completedAt: true },
    })

    return toBaseUserDto(user, profile?.completedAt != null)
  }
}
