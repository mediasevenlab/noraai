import { z } from 'zod'

const displayNameSchema = z
  .union([z.string().trim().min(2).max(80), z.literal('')])
  .optional()
  .transform((value) => {
    if (value === '' || value === undefined) return undefined
    return value
  })

export const emailSchema = z.string().trim().toLowerCase().email().max(254)

export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{2,31}$/, {
    message: 'Nickname must start with a letter and contain 3-32 lowercase letters, numbers, or underscores',
  })

const reservedNicknameSchema = new Set(['admin', 'mentor', 'user'])

export const profileNicknameSchema = nicknameSchema.refine(
  (nickname) => !reservedNicknameSchema.has(nickname),
  { message: 'This nickname is reserved' },
)

/** Telegram @username without leading @; 5–32 chars per Telegram rules. */
export const telegramUsernameSchema = z
  .string()
  .trim()
  .transform((value) => (value.startsWith('@') ? value.slice(1) : value))
  .pipe(
    z
      .string()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_]{4,31}$/, {
        message:
          'Telegram username must start with a letter and contain 5-32 letters, numbers, or underscores',
      }),
  )

/** Normalize RU mobile input to 11 digits starting with 7 (79001234567). */
export function normalizeTelegramPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (digits.length === 10) {
    digits = `7${digits}`
  }
  return digits
}

/** True when raw input looks like a RU mobile phone (not a Telegram username). */
export function looksLikeTelegramPhone(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed || /^@/.test(trimmed) || /[a-zA-Z_]/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return true
  return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))
}

/** Stored Telegram phone: 11 digits, country code 7. */
export const telegramPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeTelegramPhoneDigits)
  .pipe(
    z.string().regex(/^7\d{10}$/, {
      message: 'Telegram phone must be a Russian mobile number (+7XXXXXXXXXX)',
    }),
  )

export function formatTelegramPhoneDisplay(phone: string): string {
  const digits = normalizeTelegramPhoneDigits(phone)
  if (!/^7\d{10}$/.test(digits)) return phone
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
}

export const publicUserIdSchema = z.number().int().positive()

export const referralCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(32)
  .refine(
    (value) => /^\d{1,10}$/.test(value) || /^[a-z][a-z0-9_]{2,31}$/.test(value),
    { message: 'Referral code must be a public ID or nickname' },
  )

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const userRoleSchema = z.enum(['user', 'admin', 'mentor'])
export const registrationRoleSchema = z.enum(['user', 'mentor'])
export const registrationMentorIdentifierSchema = z
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
    { message: 'Mentor identifier must be a public ID, UUID, or nickname' },
  )

export const userSchema = z.object({
  id: z.string(),
  publicId: publicUserIdSchema,
  email: emailSchema,
  displayName: z.string().nullable(),
  nickname: nicknameSchema.nullable(),
  telegramUsername: telegramUsernameSchema.nullable(),
  telegramPhone: telegramPhoneSchema.nullable(),
  role: userRoleSchema,
  /** False only for role=user until onboarding questionnaire is completed. */
  questionnaireCompleted: z.boolean(),
  createdAt: z.string().datetime(),
})

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema,
    role: registrationRoleSchema.default('user'),
    mentorIdentifier: registrationMentorIdentifierSchema.optional(),
    referralCode: referralCodeSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.role === 'mentor' && value.mentorIdentifier !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['mentorIdentifier'],
        message: 'Mentor accounts cannot select a mentor',
      })
    }
  })

export const registrationMentorLookupQuerySchema = z
  .object({
    identifier: registrationMentorIdentifierSchema,
  })
  .strict()

export const registrationMentorLookupResponseSchema = z
  .object({
    found: z.boolean(),
    mentor: z
      .object({
        id: z.string(),
        publicId: publicUserIdSchema,
        displayName: z.string().nullable(),
        nickname: nicknameSchema.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict()

export const referralLookupQuerySchema = z
  .object({
    code: referralCodeSchema,
  })
  .strict()

export const referralLookupResponseSchema = z
  .object({
    found: z.boolean(),
    referrer: z
      .object({
        id: z.string(),
        publicId: publicUserIdSchema,
        displayName: z.string().nullable(),
        nickname: nicknameSchema.nullable(),
        role: userRoleSchema,
      })
      .strict()
      .nullable(),
  })
  .strict()

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordResetRequestResponseSchema = z.object({
  accepted: z.literal(true),
  delivery: z.enum(['queued', 'unavailable']),
})

export const passwordResetConfirmRequestSchema = z.object({
  token: z.string().trim().min(43).max(256),
  password: passwordSchema,
})

export const cookieRefreshRequestSchema = z.object({}).strict().optional().default({})
export const cookieLogoutRequestSchema = z.object({}).strict().optional().default({})

export const tokenRefreshRequestSchema = z.object({
  refreshToken: z.string().min(32),
})

export const tokenLogoutRequestSchema = tokenRefreshRequestSchema

export const cookieAuthResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
}).strict()

export const tokenAuthResponseSchema = cookieAuthResponseSchema.extend({
  refreshToken: z.string(),
})

export const cookieRefreshResponseSchema = z.object({
  accessToken: z.string(),
}).strict()

export const tokenRefreshResponseSchema = cookieRefreshResponseSchema.extend({
  refreshToken: z.string(),
})

export const meResponseSchema = z.object({
  user: userSchema,
})

export type UserDto = z.infer<typeof userSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type RegistrationRole = z.infer<typeof registrationRoleSchema>
export type RegisterRequest = z.input<typeof registerRequestSchema>
export type RegisterPayload = z.output<typeof registerRequestSchema>
export type RegistrationMentorLookupQuery = z.infer<typeof registrationMentorLookupQuerySchema>
export type RegistrationMentorLookupResponse = z.infer<typeof registrationMentorLookupResponseSchema>
export type ReferralLookupQuery = z.infer<typeof referralLookupQuerySchema>
export type ReferralLookupResponse = z.infer<typeof referralLookupResponseSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetRequestResponse = z.infer<typeof passwordResetRequestResponseSchema>
export type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmRequestSchema>
export type CookieRefreshRequest = z.infer<typeof cookieRefreshRequestSchema>
export type CookieLogoutRequest = z.infer<typeof cookieLogoutRequestSchema>
export type TokenRefreshRequest = z.infer<typeof tokenRefreshRequestSchema>
export type TokenLogoutRequest = z.infer<typeof tokenLogoutRequestSchema>
export type CookieAuthResponse = z.infer<typeof cookieAuthResponseSchema>
export type TokenAuthResponse = z.infer<typeof tokenAuthResponseSchema>
export type CookieRefreshResponse = z.infer<typeof cookieRefreshResponseSchema>
export type TokenRefreshResponse = z.infer<typeof tokenRefreshResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
