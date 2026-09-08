import type {
  AdminUsersQuery,
  ConnectCurrentUserToMentorRequest,
  MentorUsersQuery,
  PutQuestionnaireRequest,
  UserReferralsQuery,
  PutUserFavoritesRequest,
  PutUserPlanLibraryRequest,
  TelegramLinkRequest,
  UpdateProfileRequest,
  UpdateUserRoleRequest,
  UpsertMentorPlanRequest,
  UserDto,
} from '@web-app-demo/contracts'

import type { AuthenticatedPrincipal } from '../../auth'
import { UsersFailure } from '../domain/errors'
import { publishedFavoriteMealIds } from '../domain/favorite-meal-ids'
import {
  emptyPlanLibrary,
  normalizePlanLibrary,
} from '../domain/plan-library'
import {
  isUuid,
  mentorPlanWriteFields,
  toMentorRationDto,
  tryToMentorRationDto,
} from '../domain/mentor-ration'
import type {
  AdminDashboardReader,
  AdminUsersReader,
  Clock,
  CurrentUserMentorReader,
  MealMediaCleanup,
  MentorPlansStore,
  MentorUsersManager,
  PlanAssignmentsStore,
  ProfileWriter,
  QuestionnaireStore,
  TelegramLinkStore,
  UserDeleter,
  UserFavoritesStore,
  UserPlanLibraryStore,
  UserRecord,
  UserRoleUpdater,
  UserReferralsReader,
  UserMentorConnector,
} from './ports'

type UsersServiceDependencies = {
  adminDashboardReader: AdminDashboardReader
  adminUsersReader: AdminUsersReader
  clock: Clock
  currentUserMentorReader: CurrentUserMentorReader
  mentorUsersManager: MentorUsersManager
  userMentorConnector: UserMentorConnector
  userReferralsReader: UserReferralsReader
  profileWriter: ProfileWriter
  questionnaireStore: QuestionnaireStore
  planAssignmentsStore?: PlanAssignmentsStore
  userFavoritesStore?: UserFavoritesStore
  userPlanLibraryStore?: UserPlanLibraryStore
  mentorPlansStore?: MentorPlansStore
  telegramLinks?: TelegramLinkStore
  botUsername?: string
  notifyBotUsername?: string
  mealMediaCleanup?: MealMediaCleanup
  userDeleter: UserDeleter
  userRoleUpdater: UserRoleUpdater
}

export class UsersService {
  constructor(private readonly dependencies: UsersServiceDependencies) {}

  async updateProfile(principal: AuthenticatedPrincipal, input: UpdateProfileRequest) {
    if (input.telegramUsername || input.telegramPhone) {
      throw new UsersFailure(
        'invalid',
        'Telegram identity must be verified through the bot',
      )
    }
    const user = await this.dependencies.profileWriter.updateProfile(
      principal.id,
      {
        displayName: input.displayName,
        nickname: input.nickname,
        telegramUsername: input.telegramUsername,
        telegramPhone: input.telegramPhone,
      },
    )
    return {
      user: this.userDto(user, principal.questionnaireCompleted),
    }
  }

  async startTelegramLink(principal: AuthenticatedPrincipal, input: TelegramLinkRequest) {
    const store = this.dependencies.telegramLinks
    if (!store) throw new UsersFailure('not_found', 'Telegram linking is unavailable')
    const started = await store.start(principal.id, input)
    const bot = (
      principal.role === 'mentor'
        ? this.dependencies.notifyBotUsername
        : this.dependencies.botUsername
    )?.replace(/^@/, '')
    return {
      code: started.code,
      botUrl: bot
        ? `https://t.me/${bot}?start=${started.code}`
        : null,
      expiresAt: started.expiresAt.toISOString(),
    }
  }

  async getQuestionnaire(principal: AuthenticatedPrincipal) {
    this.assertRegularUser(principal)
    return this.readQuestionnaire(principal.id)
  }

  async putQuestionnaire(
    principal: AuthenticatedPrincipal,
    input: PutQuestionnaireRequest,
  ) {
    this.assertRegularUser(principal)
    return this.writeQuestionnaire(principal.id, input)
  }

  async getMentorUserQuestionnaire(
    principal: AuthenticatedPrincipal,
    menteeUserId: string,
  ) {
    await this.dependencies.mentorUsersManager.requireAssignedMentee(
      principal.id,
      menteeUserId,
    )
    return this.readQuestionnaire(menteeUserId)
  }

  async putMentorUserQuestionnaire(
    principal: AuthenticatedPrincipal,
    menteeUserId: string,
    input: PutQuestionnaireRequest,
  ) {
    await this.dependencies.mentorUsersManager.requireAssignedMentee(
      principal.id,
      menteeUserId,
    )
    return this.writeQuestionnaire(menteeUserId, input)
  }

  async connectCurrentUserToMentor(
    principal: AuthenticatedPrincipal,
    input: ConnectCurrentUserToMentorRequest,
  ) {
    return {
      user: await this.dependencies.userMentorConnector.connectCurrentUserToMentor(
        principal.id,
        input.identifier,
      ),
    }
  }

  async getCurrentUserMentor(principal: AuthenticatedPrincipal) {
    return {
      mentor: await this.dependencies.currentUserMentorReader.getCurrentUserMentor(
        principal.id,
      ),
    }
  }

  async getCurrentUserPlans(principal: AuthenticatedPrincipal) {
    return this.readPlanAssignment(principal.id)
  }

  async getMentorUserPlans(principal: AuthenticatedPrincipal, menteeUserId: string) {
    await this.dependencies.mentorUsersManager.requireAssignedMentee(principal.id, menteeUserId)
    return this.readPlanAssignment(menteeUserId)
  }

  async getCurrentUserFavorites(principal: AuthenticatedPrincipal) {
    const saved = await this.dependencies.userFavoritesStore?.getFavorites(principal.id)
    return {
      mealIds: publishedFavoriteMealIds(saved?.mealIds ?? []),
      updatedAt: saved?.updatedAt.toISOString() ?? null,
    }
  }

  async putCurrentUserFavorites(
    principal: AuthenticatedPrincipal,
    input: PutUserFavoritesRequest,
  ) {
    const store = this.dependencies.userFavoritesStore
    if (!store) throw new UsersFailure('not_found', 'Favorites are unavailable')
    const requestedMealIds = uniqueIds(input.mealIds)
    const mealIds = store.filterOwnedMealIds
      ? await store.filterOwnedMealIds(principal.id, requestedMealIds)
      : requestedMealIds
    const saved = await store.putFavorites({
      userId: principal.id,
      mealIds,
    })
    return {
      mealIds: saved.mealIds,
      updatedAt: saved.updatedAt.toISOString(),
    }
  }

  async getCurrentUserPlanLibrary(principal: AuthenticatedPrincipal) {
    const saved = await this.dependencies.userPlanLibraryStore?.getPlanLibrary(principal.id)
    return this.toPlanLibraryDto(saved)
  }

  async putCurrentUserPlanLibrary(
    principal: AuthenticatedPrincipal,
    input: PutUserPlanLibraryRequest,
  ) {
    const store = this.dependencies.userPlanLibraryStore
    if (!store) throw new UsersFailure('not_found', 'Plan library is unavailable')
    const fields = normalizePlanLibrary(input, this.dependencies.clock.now().toISOString())
    const saved = await store.putPlanLibrary({
      userId: principal.id,
      ...fields,
    })
    return this.toPlanLibraryDto(saved)
  }

  async listMentorPlans(principal: AuthenticatedPrincipal) {
    const store = this.requireMentorPlansStore()
    const items = await store.listMentorPlans(principal.id)
    return { items: items.flatMap((row) => {
      const plan = tryToMentorRationDto(row)
      return plan ? [plan] : []
    }) }
  }

  async createMentorPlan(
    principal: AuthenticatedPrincipal,
    input: UpsertMentorPlanRequest,
  ) {
    const store = this.requireMentorPlansStore()
    const fields = mentorPlanWriteFields(input)
    const row = await store.createMentorPlan({
      mentorId: principal.id,
      ...fields,
    })
    return { plan: toMentorRationDto(row) }
  }

  async updateMentorPlan(
    principal: AuthenticatedPrincipal,
    planId: string,
    input: UpsertMentorPlanRequest,
  ) {
    const store = this.requireMentorPlansStore()
    const fields = mentorPlanWriteFields(input)
    const row = await store.updateMentorPlan({
      mentorId: principal.id,
      planId,
      ...fields,
    })
    return { plan: toMentorRationDto(row) }
  }

  async deleteMentorPlan(principal: AuthenticatedPrincipal, planId: string) {
    await this.requireMentorPlansStore().deleteMentorPlan(principal.id, planId)
    return { ok: true as const }
  }

  async putMentorUserPlans(
    principal: AuthenticatedPrincipal,
    menteeUserId: string,
    planIds: string[],
  ) {
    await this.dependencies.mentorUsersManager.requireAssignedMentee(principal.id, menteeUserId)
    const store = this.dependencies.planAssignmentsStore
    if (!store) throw new UsersFailure('not_found', 'Plan assignments are unavailable')
    const unique = uniqueIds(planIds)
    if (unique.some((id) => !isUuid(id))) {
      throw new UsersFailure('invalid', 'Assigned plans must be own authored plans')
    }
    if (unique.length > 0) {
      const owned = await this.requireMentorPlansStore().listPlansByIds(unique)
      const ownedIds = new Set(
        owned.filter((row) => row.mentorId === principal.id).map((row) => row.id),
      )
      if (ownedIds.size !== unique.length) {
        throw new UsersFailure('invalid', 'Assigned plans must be own authored plans')
      }
    }
    const assignment = await store.putPlanAssignment({
      mentorUserId: principal.id,
      userId: menteeUserId,
      planIds: unique,
    })
    return this.readPlanAssignment(menteeUserId, assignment)
  }

  listUserReferrals(principal: AuthenticatedPrincipal, query: UserReferralsQuery) {
    return this.dependencies.userReferralsReader.listUserReferrals(principal.id, query)
  }

  dashboard() {
    const createdAfter = new Date(this.dependencies.clock.now().getTime() - 7 * 24 * 60 * 60 * 1000)
    return this.dependencies.adminDashboardReader.dashboard(createdAfter)
  }

  listUsers(query: AdminUsersQuery) {
    return this.dependencies.adminUsersReader.listUsers(query)
  }

  async updateRole(
    principal: AuthenticatedPrincipal,
    targetUserId: string,
    input: UpdateUserRoleRequest,
  ) {
    return {
      user: await this.dependencies.userRoleUpdater.updateRole({
        actorUserId: principal.id,
        targetUserId,
        role: input.role,
        now: this.dependencies.clock.now(),
      }),
    }
  }

  async deleteUser(principal: AuthenticatedPrincipal, targetUserId: string) {
    try {
      await this.dependencies.mealMediaCleanup?.deleteImagesForUser(targetUserId)
    } catch {
      // Blob cleanup is best-effort; account deletion still proceeds.
    }
    return {
      user: await this.dependencies.userDeleter.deleteUser({
        actorUserId: principal.id,
        targetUserId,
      }),
    }
  }

  listMentorUsers(principal: AuthenticatedPrincipal, query: MentorUsersQuery) {
    return this.dependencies.mentorUsersManager.listMentorUsers(principal.id, query)
  }

  async detachMentorUser(
    principal: AuthenticatedPrincipal,
    targetUserId: string,
  ) {
    return {
      user: await this.dependencies.mentorUsersManager.detachMentorUser(
        principal.id,
        targetUserId,
      ),
    }
  }

  private requireMentorPlansStore() {
    const store = this.dependencies.mentorPlansStore
    if (!store) throw new UsersFailure('not_found', 'Mentor plans are unavailable')
    return store
  }

  private async readPlanAssignment(
    userId: string,
    assignment?: { planIds: string[]; updatedAt: Date },
  ) {
    const current =
      assignment
      ?? await this.dependencies.planAssignmentsStore?.getPlanAssignment(userId)
    const planIds = current?.planIds ?? []
    const authored = await this.dependencies.mentorPlansStore?.listPlansByIds(
      planIds.filter(isUuid),
    )
    return {
      planIds,
      authoredPlans: (authored ?? []).flatMap((row) => {
        const plan = tryToMentorRationDto(row)
        return plan ? [plan] : []
      }),
      updatedAt: current?.updatedAt.toISOString() ?? null,
    }
  }

  private assertRegularUser(principal: AuthenticatedPrincipal) {
    if (principal.role !== 'user') {
      throw new UsersFailure('forbidden', 'User access is required')
    }
  }

  private async readQuestionnaire(userId: string) {
    const profile = await this.dependencies.questionnaireStore.getQuestionnaire(
      userId,
    )
    if (!profile) {
      return {
        answers: null,
        completed: false,
        completedAt: null,
        version: 1,
      }
    }
    return {
      answers: profile.answers,
      completed: profile.completedAt != null,
      completedAt: profile.completedAt?.toISOString() ?? null,
      version: profile.version,
    }
  }

  private async writeQuestionnaire(
    userId: string,
    input: PutQuestionnaireRequest,
  ) {
    const profile = await this.dependencies.questionnaireStore.upsertQuestionnaire(
      userId,
      input.answers,
      this.dependencies.clock.now(),
    )
    return {
      answers: profile.answers,
      completed: profile.completedAt != null,
      completedAt: profile.completedAt?.toISOString() ?? null,
      version: profile.version,
    }
  }

  private userDto(user: UserRecord, questionnaireCompleted: boolean): UserDto {
    return {
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      displayName: user.displayName,
      nickname: user.nickname,
      telegramUsername: user.telegramUsername,
      telegramPhone: user.telegramPhone,
      role: user.role,
      questionnaireCompleted,
      createdAt: user.createdAt.toISOString(),
    }
  }

  private toPlanLibraryDto(saved?: {
    authoredPlans: unknown
    savedPlanIds: unknown
    selectedPlanIds: unknown
    planStarts: unknown
    updatedAt: Date
  } | null) {
    const fields = saved
      ? normalizePlanLibrary(saved, saved.updatedAt.toISOString())
      : emptyPlanLibrary()
    return {
      ...fields,
      updatedAt: saved?.updatedAt.toISOString() ?? null,
    }
  }
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}
