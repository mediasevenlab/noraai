import { z } from 'zod'

import {
  emailSchema,
  nicknameSchema,
  profileNicknameSchema,
  publicUserIdSchema,
  telegramPhoneSchema,
  telegramUsernameSchema,
  userRoleSchema,
  userSchema,
} from './auth'
import { generationSpendSchema } from './meals'

export const DEFAULT_USER_NICKNAMES = {
  'admin@nora.com': 'admin',
  'mentor@nora.com': 'mentor',
  'user@nora.com': 'user',
} as const

export function defaultNicknameForEmail(email: string): string | undefined {
  return DEFAULT_USER_NICKNAMES[email.toLowerCase() as keyof typeof DEFAULT_USER_NICKNAMES]
}

export function isDefaultUserEmail(email: string): boolean {
  return defaultNicknameForEmail(email) !== undefined
}

export function defaultRoleForEmail(email: string): z.infer<typeof userRoleSchema> {
  return email.toLowerCase() === 'mentor@nora.com' ? 'mentor' : 'user'
}

export const updateProfileRequestSchema = z
  .object({
    displayName: z.union([z.string().trim().min(2).max(80), z.null()]).optional(),
    nickname: z.union([profileNicknameSchema, z.null()]).optional(),
    telegramUsername: z.union([telegramUsernameSchema, z.null()]).optional(),
    telegramPhone: z.union([telegramPhoneSchema, z.null()]).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.displayName !== undefined
      || value.nickname !== undefined
      || value.telegramUsername !== undefined
      || value.telegramPhone !== undefined,
    { message: 'At least one profile field is required' },
  )

export const updateProfileResponseSchema = z
  .object({
    user: userSchema,
  })
  .strict()

const requiredAnswerText = (maximum = 120) => z.string().trim().min(1).max(maximum)
const optionalAnswerText = (maximum = 2000) => z.string().trim().max(maximum)

/** Persisted questionnaire answers for role=user onboarding/profile cards. */
export const questionnaireAnswersSchema = z
  .object({
    sexLabel: requiredAnswerText(),
    ageLabel: requiredAnswerText(),
    height: requiredAnswerText(),
    weight: requiredAnswerText(),
    goal: requiredAnswerText(),
    goalDetail: optionalAnswerText().default(''),
    goalPace: requiredAnswerText().default('Умеренно'),
    targetWeight: optionalAnswerText(120).default(''),
    timeline: optionalAnswerText(120).default(''),
    activity: requiredAnswerText(),
    activityDetail: optionalAnswerText().default(''),
    meals: optionalAnswerText(120).default(''),
    water: optionalAnswerText(120).default(''),
    sleep: optionalAnswerText(120).default(''),
    cooking: optionalAnswerText(120).default(''),
    dietType: optionalAnswerText(120).default(''),
    routineDetail: optionalAnswerText().default(''),
    restrictions: optionalAnswerText(120).default(''),
    health: optionalAnswerText(120).default(''),
    stressEating: optionalAnswerText(120).default(''),
    dietExperience: optionalAnswerText(120).default(''),
    notes: optionalAnswerText().default(''),
  })
  .strict()

export type QuestionnaireAnswers = z.infer<typeof questionnaireAnswersSchema>

export const QUESTIONNAIRE_OPTIONAL_KEYS = [
  'goalDetail',
  'targetWeight',
  'timeline',
  'activityDetail',
  'meals',
  'water',
  'sleep',
  'cooking',
  'dietType',
  'routineDetail',
  'restrictions',
  'health',
  'stressEating',
  'dietExperience',
  'notes',
] as const satisfies ReadonlyArray<keyof QuestionnaireAnswers>

/** Draft-friendly empty answers; required fields are filled during onboarding. */
export const emptyQuestionnaireAnswers = (): Record<keyof QuestionnaireAnswers, string> => ({
  sexLabel: '',
  ageLabel: '',
  height: '',
  weight: '',
    goal: '',
    goalDetail: '',
    goalPace: '',
  targetWeight: '',
  timeline: '',
  activity: '',
  activityDetail: '',
  meals: '',
  water: '',
  sleep: '',
  cooking: '',
  dietType: '',
  routineDetail: '',
  restrictions: '',
  health: '',
  stressEating: '',
  dietExperience: '',
  notes: '',
})

export function isQuestionnaireAnswersComplete(
  answers: Record<keyof QuestionnaireAnswers, string>,
): boolean {
  return (Object.keys(questionnaireAnswersSchema.shape) as Array<keyof QuestionnaireAnswers>)
    .filter((key) => !(QUESTIONNAIRE_OPTIONAL_KEYS as ReadonlyArray<string>).includes(key))
    .every((key) => answers[key].trim().length > 0)
}

/** Partial-friendly schema for wizard drafts before final submit. */
export const questionnaireDraftAnswersSchema = z
  .object({
    sexLabel: optionalAnswerText(120),
    ageLabel: optionalAnswerText(120),
    height: optionalAnswerText(120),
    weight: optionalAnswerText(120),
    goal: optionalAnswerText(120),
    goalDetail: optionalAnswerText(),
    goalPace: optionalAnswerText(120),
    targetWeight: optionalAnswerText(120),
    timeline: optionalAnswerText(120),
    activity: optionalAnswerText(120),
    activityDetail: optionalAnswerText(),
    meals: optionalAnswerText(120),
    water: optionalAnswerText(120),
    sleep: optionalAnswerText(120),
    cooking: optionalAnswerText(120),
    dietType: optionalAnswerText(120),
    routineDetail: optionalAnswerText(),
    restrictions: optionalAnswerText(120),
    health: optionalAnswerText(120),
    stressEating: optionalAnswerText(120),
    dietExperience: optionalAnswerText(120),
    notes: optionalAnswerText(),
  })
  .strict()

export const putQuestionnaireRequestSchema = z
  .object({
    answers: questionnaireAnswersSchema,
  })
  .strict()

export const questionnaireResponseSchema = z
  .object({
    answers: questionnaireAnswersSchema.nullable(),
    completed: z.boolean(),
    completedAt: z.string().datetime().nullable(),
    version: z.number().int().positive(),
  })
  .strict()

export const rationGoalSchema = z.enum(['Похудение', 'Набор', 'Поддержание', 'Здоровье'])
export const rationMealSlotSchema = z.enum(['Завтрак', 'Обед', 'Ужин', 'Перекус'])

/** A mentor plan can hold a full week of meals, same ceiling as a shared ration. */
export const MENTOR_RATION_MEAL_LIMIT = 80
export const AUTHORED_PLAN_DAY_COUNT_MAX = 7

export const mentorRationMealSchema = z
  .object({
    slot: rationMealSlotSchema,
    title: z.string().trim().min(1).max(200),
    ingredients: z.string().trim().max(4000).default(''),
    steps: z.array(z.string().trim().min(1).max(500)).max(40).default([]),
    image: z.string().max(1_500_000).default(''),
    kcal: z.number().int().nonnegative().max(20_000),
    protein: z.number().int().nonnegative().max(5_000),
    fat: z.number().int().nonnegative().max(5_000),
    carbs: z.number().int().nonnegative().max(5_000),
    dayIndex: z.number().int().min(0).max(AUTHORED_PLAN_DAY_COUNT_MAX - 1).optional(),
  })
  .strict()

export const mentorRationSchema = z
  .object({
    id: z.string().uuid(),
    mentorId: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    goal: rationGoalSchema,
    source: z.string().trim().min(1).max(80),
    image: z.string().max(1_500_000),
    days: z.number().int().positive().max(30),
    mealsPerDay: z.number().int().positive().max(MENTOR_RATION_MEAL_LIMIT),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    meals: z.array(mentorRationMealSchema).min(1).max(MENTOR_RATION_MEAL_LIMIT),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()

export const upsertMentorRationRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(''),
    goal: rationGoalSchema,
    image: z.string().max(1_500_000).optional(),
    meals: z.array(mentorRationMealSchema).min(1).max(MENTOR_RATION_MEAL_LIMIT),
  })
  .strict()

export const mentorPlanSchema = mentorRationSchema
export const upsertMentorPlanRequestSchema = upsertMentorRationRequestSchema
export const mentorPlansResponseSchema = z
  .object({
    items: z.array(mentorPlanSchema).max(200),
  })
  .strict()
export const mentorPlanMutationResponseSchema = z
  .object({
    plan: mentorPlanSchema,
  })
  .strict()
export const deleteMentorPlanResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()
export const forgetRationParamsSchema = z
  .object({
    planId: z.string().trim().regex(/^[A-Za-z0-9:_-]{1,80}$/),
  })
  .strict()
export const mentorPlanParamsSchema = z
  .object({
    planId: z.string().uuid(),
  })
  .strict()
export const planAssignmentSchema = z
  .object({
    planIds: z.array(z.string().trim().min(1).max(80)).max(20),
    authoredPlans: z.array(mentorPlanSchema).max(20).default([]),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict()
export const putPlanAssignmentRequestSchema = z
  .object({ planIds: z.array(z.string().trim().min(1).max(80)).max(20) })
  .strict()

export const telegramLinkRequestSchema = z
  .object({
    telegramUsername: z.union([telegramUsernameSchema, z.null()]).optional(),
    telegramPhone: z.union([telegramPhoneSchema, z.null()]).optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.telegramUsername) || Boolean(value.telegramPhone),
    { message: 'Telegram username or phone is required' },
  )

export const telegramLinkResponseSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
    botUrl: z.string().url().nullable(),
    expiresAt: z.string().datetime(),
  })
  .strict()

const savedItemIdSchema = z.string().trim().min(1).max(80)

export const userFavoritesSchema = z
  .object({
    mealIds: z.array(savedItemIdSchema).max(400),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict()

export const putUserFavoritesRequestSchema = z
  .object({
    mealIds: z.array(savedItemIdSchema).max(400),
  })
  .strict()

export type UserFavorites = z.infer<typeof userFavoritesSchema>
export type PutUserFavoritesRequest = z.infer<typeof putUserFavoritesRequestSchema>

const authoredUserPlanIdSchema = z
  .string()
  .trim()
  .regex(/^plan_[A-Za-z0-9_-]{1,72}$/)
  .max(80)

const catalogPlanIdSchema = z
  .string()
  .trim()
  .regex(/^catalog_[A-Za-z0-9_-]{1,72}$/)
  .max(80)

const planStartDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const authoredUserPlanSchema = z
  .object({
    id: authoredUserPlanIdSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(''),
    coverImage: z.string().max(2048).default(''),
    createdAt: z.string().datetime(),
    goal: rationGoalSchema.nullable(),
    sourceCatalogId: catalogPlanIdSchema.optional(),
    sourceSharedRationId: z.string().uuid().optional(),
    dayCount: z.number().int().min(1).max(AUTHORED_PLAN_DAY_COUNT_MAX).optional(),
  })
  .strict()

export const userPlanLibrarySchema = z
  .object({
    authoredPlans: z.array(authoredUserPlanSchema).max(20),
    savedPlanIds: z.array(savedItemIdSchema).max(80),
    selectedPlanIds: z.array(savedItemIdSchema).max(20),
    planStarts: z.array(
      z
        .object({
          planId: savedItemIdSchema,
          dayKey: planStartDayKeySchema,
        })
        .strict(),
    ).max(40),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict()

export const putUserPlanLibraryRequestSchema = userPlanLibrarySchema.omit({ updatedAt: true })

export const sharePlanIdSchema = z.union([authoredUserPlanIdSchema, z.string().uuid()])

export const sharedRationMealSchema = z
  .object({
    dayIndex: z.number().int().min(0).max(AUTHORED_PLAN_DAY_COUNT_MAX - 1),
    slot: rationMealSlotSchema,
    title: z.string().trim().min(1).max(200),
    ingredients: z.string().trim().max(4000).default(''),
    image: z.string().max(2048).default(''),
    kcal: z.number().int().nonnegative().max(20_000),
    protein: z.number().int().nonnegative().max(5_000),
    fat: z.number().int().nonnegative().max(5_000),
    carbs: z.number().int().nonnegative().max(5_000),
  })
  .strict()

export const sharedRationSnapshotSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(''),
    goal: rationGoalSchema.nullable().default(null),
    coverImage: z.string().max(2048).default(''),
    meals: z.array(sharedRationMealSchema).min(1).max(80),
  })
  .strict()

export const shareRationRequestSchema = z
  .object({
    shared: z.boolean(),
    snapshot: sharedRationSnapshotSchema.optional(),
  })
  .strict()
  .refine((value) => !value.shared || value.snapshot != null, {
    message: 'Snapshot is required when publishing a ration',
    path: ['snapshot'],
  })

export const likeRationRequestSchema = z
  .object({
    liked: z.boolean(),
  })
  .strict()

export const sharedRationSchema = z
  .object({
    id: z.string().uuid(),
    sourcePlanId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    goal: rationGoalSchema.nullable(),
    coverImage: z.string().max(2048),
    days: z.number().int().positive().max(AUTHORED_PLAN_DAY_COUNT_MAX),
    kcal: z.number().int().nonnegative(),
    protein: z.number().int().nonnegative(),
    fat: z.number().int().nonnegative(),
    carbs: z.number().int().nonnegative(),
    meals: z.array(sharedRationMealSchema).max(80),
    shared: z.boolean(),
    sharedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    authorName: z.string().trim().min(1).max(80).optional(),
    likeCount: z.number().int().nonnegative().default(0),
    liked: z.boolean().default(false),
    own: z.boolean().default(false),
  })
  .strict()

export const listSharedRationsResponseSchema = z
  .object({
    items: z.array(sharedRationSchema).max(80),
  })
  .strict()

export const sharedRationMutationResponseSchema = z
  .object({
    ration: sharedRationSchema,
  })
  .strict()

export const shareRationParamsSchema = z
  .object({
    planId: sharePlanIdSchema,
  })
  .strict()

export const sharedRationParamsSchema = z
  .object({
    rationId: z.string().uuid(),
  })
  .strict()

export type AuthoredUserPlan = z.infer<typeof authoredUserPlanSchema>
export type UserPlanLibrary = z.infer<typeof userPlanLibrarySchema>
export type PutUserPlanLibraryRequest = z.infer<typeof putUserPlanLibraryRequestSchema>
export type SharedRationMeal = z.infer<typeof sharedRationMealSchema>
export type SharedRationSnapshot = z.infer<typeof sharedRationSnapshotSchema>
export type ShareRationRequest = z.infer<typeof shareRationRequestSchema>
export type LikeRationRequest = z.infer<typeof likeRationRequestSchema>
export type SharedRation = z.infer<typeof sharedRationSchema>
export type ListSharedRationsResponse = z.infer<typeof listSharedRationsResponseSchema>
export type SharedRationMutationResponse = z.infer<typeof sharedRationMutationResponseSchema>

const positiveIntegerQuerySchema = (defaultValue: number, maximum?: number) =>
  z.coerce.number().int().positive().max(maximum ?? Number.MAX_SAFE_INTEGER).default(defaultValue)

export const ADMIN_USERS_MAX_PAGE = 100

export const adminUsersQuerySchema = z
  .object({
    q: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().trim().max(100).optional(),
    ),
    role: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      userRoleSchema.optional(),
    ),
    page: positiveIntegerQuerySchema(1, ADMIN_USERS_MAX_PAGE),
    pageSize: positiveIntegerQuerySchema(20, 100),
  })
  .strict()

export const adminUserParamsSchema = z
  .object({
    userId: z.uuid(),
  })
  .strict()

export const adminUserSummarySchema = z
  .object({
    id: z.string(),
    publicId: publicUserIdSchema,
    email: emailSchema,
    displayName: z.string().nullable(),
    nickname: nicknameSchema.nullable(),
    role: userRoleSchema,
    createdAt: z.string().datetime(),
    generationSpend: generationSpendSchema.optional(),
  })
  .strict()

export const adminUsersResponseSchema = z
  .object({
    items: z.array(adminUserSummarySchema),
    page: z.number().int().positive().max(ADMIN_USERS_MAX_PAGE),
    pageSize: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    /** Sum of every user's settled generation spend, including other pages. */
    generationSpend: generationSpendSchema.optional(),
  })
  .strict()

export const adminDashboardResponseSchema = z
  .object({
    totalUsers: z.number().int().nonnegative(),
    totalAdmins: z.number().int().nonnegative(),
    newUsersLast7Days: z.number().int().nonnegative(),
  })
  .strict()

export const updateUserRoleRequestSchema = z
  .object({
    role: userRoleSchema,
  })
  .strict()

export const updateUserRoleResponseSchema = z
  .object({
    user: adminUserSummarySchema,
  })
  .strict()

export const deleteAdminUserResponseSchema = z
  .object({
    user: adminUserSummarySchema,
  })
  .strict()

export const mentorUsersQuerySchema = adminUsersQuerySchema

export const mentorUsersResponseSchema = adminUsersResponseSchema

export const connectCurrentUserToMentorRequestSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(64)
      .refine(
        (value) =>
          /^\d{1,10}$/.test(value)
          || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
          || /^[a-z][a-z0-9_]{2,31}$/.test(value),
        { message: 'Identifier must be a public ID, UUID, or nickname' },
      ),
  })
  .strict()

export const currentUserMentorResponseSchema = z
  .object({
    mentor: adminUserSummarySchema.nullable(),
  })
  .strict()

export const userReferralsQuerySchema = adminUsersQuerySchema

export const userReferralsResponseSchema = adminUsersResponseSchema

export const mentorUserMutationResponseSchema = z
  .object({
    user: adminUserSummarySchema,
  })
  .strict()

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>
export type UpdateProfileResponse = z.infer<typeof updateProfileResponseSchema>
export type PutQuestionnaireRequest = z.infer<typeof putQuestionnaireRequestSchema>
export type QuestionnaireResponse = z.infer<typeof questionnaireResponseSchema>
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>
export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleRequestSchema>
export type UpdateUserRoleResponse = z.infer<typeof updateUserRoleResponseSchema>
export type DeleteAdminUserResponse = z.infer<typeof deleteAdminUserResponseSchema>
export type MentorUsersQuery = z.infer<typeof mentorUsersQuerySchema>
export type MentorUsersResponse = z.infer<typeof mentorUsersResponseSchema>
export type ConnectCurrentUserToMentorRequest = z.infer<
  typeof connectCurrentUserToMentorRequestSchema
>
export type CurrentUserMentorResponse = z.infer<typeof currentUserMentorResponseSchema>
export type UserReferralsQuery = z.infer<typeof userReferralsQuerySchema>
export type UserReferralsResponse = z.infer<typeof userReferralsResponseSchema>
export type MentorUserMutationResponse = z.infer<typeof mentorUserMutationResponseSchema>
export type MentorRationMeal = z.infer<typeof mentorRationMealSchema>
export type MentorRation = z.infer<typeof mentorRationSchema>
export type UpsertMentorRationRequest = z.infer<typeof upsertMentorRationRequestSchema>
export type TelegramLinkRequest = z.infer<typeof telegramLinkRequestSchema>
export type TelegramLinkResponse = z.infer<typeof telegramLinkResponseSchema>
export type MentorPlan = z.infer<typeof mentorPlanSchema>
export type UpsertMentorPlanRequest = z.infer<typeof upsertMentorPlanRequestSchema>
export type MentorPlansResponse = z.infer<typeof mentorPlansResponseSchema>
export type MentorPlanMutationResponse = z.infer<typeof mentorPlanMutationResponseSchema>
export type PlanAssignment = z.infer<typeof planAssignmentSchema>
export type PutPlanAssignmentRequest = z.infer<typeof putPlanAssignmentRequestSchema>
