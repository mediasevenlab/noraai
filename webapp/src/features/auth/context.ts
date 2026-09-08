import type {
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  RegisterRequest,
  RegistrationMentorLookupResponse,
  ReferralLookupResponse,
  UserDto,
} from '@web-app-demo/contracts'
import { createContext } from 'react'
import type { AuthenticatedTransport } from '@/platform/api'

export type AuthContextValue = {
  user: UserDto | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  sessionError: Error | null
  retrySession: () => Promise<void>
  transport: AuthenticatedTransport
  register: (input: RegisterRequest) => Promise<void>
  lookupRegistrationMentor: (identifier: string) => Promise<RegistrationMentorLookupResponse>
  lookupReferrer: (code: string) => Promise<ReferralLookupResponse>
  login: (input: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (input: PasswordResetRequest) => Promise<PasswordResetRequestResponse>
  confirmPasswordReset: (input: PasswordResetConfirmRequest) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
