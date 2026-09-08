import type { UserDto, UserRole } from '@web-app-demo/contracts'

export type AuthUserRecord = {
  id: string
  publicId: number
  email: string
  passwordHash: string | null
  displayName: string | null
  nickname: string | null
  telegramUsername: string | null
  telegramPhone: string | null
  role: UserRole
  createdAt: Date
}

export type AuthenticatedPrincipal = UserDto & {
  sessionId: string
}

export function toBaseUserDto(
  user: AuthUserRecord,
  questionnaireCompleted = user.role !== 'user',
): UserDto {
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

export function userDtoFromPrincipal(principal: AuthenticatedPrincipal): UserDto {
  const { sessionId: _sessionId, ...user } = principal
  return user
}
