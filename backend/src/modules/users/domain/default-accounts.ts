import { DEFAULT_USER_NICKNAMES } from '@web-app-demo/contracts'

export const DEFAULT_APP_ACCOUNTS = [
  {
    email: 'admin@nora.com',
    role: 'admin' as const,
    displayName: 'Администратор',
    nickname: DEFAULT_USER_NICKNAMES['admin@nora.com'],
  },
  {
    email: 'mentor@nora.com',
    role: 'mentor' as const,
    displayName: 'Наставник',
    nickname: DEFAULT_USER_NICKNAMES['mentor@nora.com'],
  },
  {
    email: 'user@nora.com',
    role: 'user' as const,
    displayName: 'Пользователь',
    nickname: DEFAULT_USER_NICKNAMES['user@nora.com'],
  },
] as const

export const DEFAULT_MENTOR_EMAIL = 'mentor@nora.com'
export const DEFAULT_MENTEE_EMAIL = 'user@nora.com'
export const DEFAULT_APP_ACCOUNT_PASSWORD = '12345678'
