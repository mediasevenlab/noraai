import type {
  AdminDashboardResponse,
  AdminUserSummary,
  AdminUsersQuery,
  AdminUsersResponse,
  QuestionnaireAnswers,
  UserReferralsQuery,
  UserReferralsResponse,
  MentorUsersQuery,
  MentorUsersResponse,
  UserRole,
} from '@web-app-demo/contracts'

import type { SharedRationRecord } from '../domain/shared-ration'

export type UserRecord = {
  id: string
  publicId: number
  email: string
  displayName: string | null
  nickname: string | null
  telegramUsername: string | null
  telegramPhone: string | null
  role: UserRole
  createdAt: Date
}

export type ProfileWriter = {
  updateProfile(
    userId: string,
    input: {
      displayName?: string | null
      nickname?: string | null
      telegramUsername?: string | null
      telegramPhone?: string | null
      telegramChatId?: string | null
    },
  ): Promise<UserRecord>
}

export type AdminDashboardReader = {
  dashboard(createdAfter: Date): Promise<AdminDashboardResponse>
}

export type AdminUsersReader = {
  listUsers(query: AdminUsersQuery): Promise<AdminUsersResponse>
}

export type UserRoleUpdater = {
  updateRole(input: {
    actorUserId: string
    targetUserId: string
    role: UserRole
    now: Date
  }): Promise<AdminUserSummary>
}

export type UserDeleter = {
  deleteUser(input: {
    actorUserId: string
    targetUserId: string
  }): Promise<AdminUserSummary>
}

export type MentorUsersManager = {
  listMentorUsers(
    mentorUserId: string,
    query: MentorUsersQuery,
  ): Promise<MentorUsersResponse>
  detachMentorUser(
    mentorUserId: string,
    menteeUserId: string,
  ): Promise<AdminUserSummary>
  /** Throws not_found when mentee is not assigned to this mentor. */
  requireAssignedMentee(
    mentorUserId: string,
    menteeUserId: string,
  ): Promise<void>
}

export type UserMentorConnector = {
  connectCurrentUserToMentor(
    userId: string,
    mentorIdentifier: string,
  ): Promise<AdminUserSummary>
}

export type CurrentUserMentorReader = {
  getCurrentUserMentor(userId: string): Promise<AdminUserSummary | null>
}

export type UserReferralsReader = {
  listUserReferrals(
    userId: string,
    query: UserReferralsQuery,
  ): Promise<UserReferralsResponse>
}

export type Clock = {
  now(): Date
}

export type QuestionnaireProfileRecord = {
  answers: QuestionnaireAnswers
  version: number
  completedAt: Date | null
}

export type QuestionnaireStore = {
  getQuestionnaire(userId: string): Promise<QuestionnaireProfileRecord | null>
  upsertQuestionnaire(
    userId: string,
    answers: QuestionnaireAnswers,
    completedAt: Date,
  ): Promise<QuestionnaireProfileRecord>
  hasCompletedQuestionnaire(userId: string): Promise<boolean>
}

export type UserFavoritesRecord = {
  mealIds: string[]
  updatedAt: Date
}

export type UserFavoritesStore = {
  getFavorites(userId: string): Promise<UserFavoritesRecord | null>
  putFavorites(input: {
    userId: string
    mealIds: string[]
  }): Promise<UserFavoritesRecord>
  filterOwnedMealIds(userId: string, mealIds: string[]): Promise<string[]>
}

export type UserPlanLibraryRecord = {
  authoredPlans: unknown
  savedPlanIds: unknown
  selectedPlanIds: unknown
  planStarts: unknown
  updatedAt: Date
}

export type UserPlanLibraryStore = {
  getPlanLibrary(userId: string): Promise<UserPlanLibraryRecord | null>
  putPlanLibrary(input: {
    userId: string
    authoredPlans: unknown
    savedPlanIds: unknown
    selectedPlanIds: unknown
    planStarts: unknown
  }): Promise<UserPlanLibraryRecord>
}

export type MentorRationRecord = {
  id: string
  mentorId: string
  title: string
  description: string
  goal: string
  source: string
  image: string
  days: number
  mealsPerDay: number
  meals: unknown
  kcal: number
  protein: number
  fat: number
  carbs: number
  createdAt: Date
  updatedAt: Date
}

export type PlanAssignmentRecord = {
  planIds: string[]
  updatedAt: Date
}

export type PlanAssignmentsStore = {
  getPlanAssignment(userId: string): Promise<PlanAssignmentRecord | null>
  putPlanAssignment(input: {
    mentorUserId: string
    userId: string
    planIds: string[]
  }): Promise<PlanAssignmentRecord>
}

export type MentorPlanRecord = MentorRationRecord

export type MentorPlansStore = {
  listMentorPlans(mentorId: string): Promise<MentorPlanRecord[]>
  getMentorPlan(mentorId: string, planId: string): Promise<MentorPlanRecord | null>
  listPlansByIds(ids: string[]): Promise<MentorPlanRecord[]>
  createMentorPlan(input: {
    mentorId: string
    title: string
    description: string
    goal: string
    source: string
    image: string
    days: number
    mealsPerDay: number
    meals: unknown
    kcal: number
    protein: number
    fat: number
    carbs: number
  }): Promise<MentorPlanRecord>
  updateMentorPlan(input: {
    mentorId: string
    planId: string
    title: string
    description: string
    goal: string
    source: string
    image: string
    days: number
    mealsPerDay: number
    meals: unknown
    kcal: number
    protein: number
    fat: number
    carbs: number
  }): Promise<MentorPlanRecord>
  deleteMentorPlan(mentorId: string, planId: string): Promise<void>
}

export type SharedRationsStore = {
  findByAuthorAndSource(
    authorId: string,
    sourcePlanId: string,
  ): Promise<SharedRationRecord | null>
  findById(id: string): Promise<SharedRationRecord | null>
  upsertShared(input: {
    authorId: string
    sourcePlanId: string
    title: string
    description: string
    goal: string | null
    coverImage: string
    days: number
    meals: unknown
    kcal: number
    protein: number
    fat: number
    carbs: number
    sharedAt: Date | null
  }): Promise<SharedRationRecord>
  setSharedAt(id: string, sharedAt: Date | null): Promise<SharedRationRecord>
  listShared(limit: number, viewerUserId: string): Promise<SharedRationRecord[]>
  setLiked(
    rationId: string,
    userId: string,
    liked: boolean,
  ): Promise<SharedRationRecord>
}

export type MealMediaCleanup = {
  deleteImagesForUser(userId: string): Promise<void>
}

export type TelegramLinkIdentity = {
  telegramUsername?: string | null
  telegramPhone?: string | null
}

export type TelegramLinkStore = {
  start(
    userId: string,
    input: TelegramLinkIdentity,
  ): Promise<{ code: string; expiresAt: Date }>
  complete(
    code: string,
    proof: TelegramLinkIdentity,
    extras?: { telegramChatId?: string },
  ): Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'mismatch' | 'phone_proof_required' }>
}

