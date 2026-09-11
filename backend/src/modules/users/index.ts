import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { createQuestionnaireProjectUser } from './application/questionnaire-project-user'
import { UsersService } from './application/users-service'
import type { MealMediaCleanup } from './application/ports'
import { createPrismaUsersRepository } from './infrastructure/users-repository'
import { createTelegramLinkStore } from './infrastructure/telegram-link-store'
import { createUsersRoutes } from './transport/routes'

type CreateUsersModuleOptions = {
  botUsername?: string
  notifyBotUsername?: string
  db: DbClient
  mealMediaCleanup?: MealMediaCleanup
  requireAdmin: MiddlewareHandler<AuthHttpEnv>
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  requireMentor: MiddlewareHandler<AuthHttpEnv>
  telegramLinks?: ReturnType<typeof createTelegramLinkStore>
}

export function createUsersModule(options: CreateUsersModuleOptions) {
  const repository = createPrismaUsersRepository(options.db)
  const telegramLinks = options.telegramLinks ?? createTelegramLinkStore(options.db)
  const service = new UsersService({
    adminDashboardReader: repository,
    adminUsersReader: repository,
    botUsername: options.botUsername,
    notifyBotUsername: options.notifyBotUsername,
    clock: { now: () => new Date() },
    currentUserMentorReader: repository,
    mealMediaCleanup: options.mealMediaCleanup,
    mentorPlansStore: repository,
    mentorUsersManager: repository,
    profileWriter: repository,
    questionnaireStore: repository,
    planAssignmentsStore: repository,
    telegramLinks,
    userFavoritesStore: repository,
    userPlanLibraryStore: repository,
    userMentorConnector: repository,
    userReferralsReader: repository,
    userDeleter: repository,
    userRoleUpdater: repository,
  })
  return {
    ...createUsersRoutes({
      requireAdmin: options.requireAdmin,
      requireAuth: options.requireAuth,
      requireMentor: options.requireMentor,
      service,
    }),
    service,
    telegramLinks,
  }
}

export { createQuestionnaireProjectUser }
export { uniqueQuestionnaireAnswers } from './domain/questionnaire'
export {
  DEFAULT_APP_ACCOUNT_PASSWORD,
  DEFAULT_APP_ACCOUNTS,
} from './domain/default-accounts'
export { bootstrapDefaultAccounts } from './infrastructure/default-accounts-bootstrap'
export type { DefaultAccountsBootstrapResult } from './infrastructure/default-accounts-bootstrap'
export { backfillUserQuestionnaires } from './infrastructure/questionnaire-backfill'
export { createTelegramLinkStore } from './infrastructure/telegram-link-store'
