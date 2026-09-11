import { describe, expect, test } from 'bun:test'

import {
  DEFAULT_APP_ACCOUNT_PASSWORD,
  DEFAULT_APP_ACCOUNTS,
  DEFAULT_MENTEE_EMAIL,
  DEFAULT_MENTOR_EMAIL,
} from './default-accounts'

describe('default app accounts', () => {
  test('ships administrator, mentor, and user with reserved nicknames', () => {
    expect(DEFAULT_APP_ACCOUNTS.map((account) => [account.email, account.role, account.displayName])).toEqual([
      ['admin@nora.com', 'admin', 'Администратор'],
      ['mentor@nora.com', 'mentor', 'Наставник'],
      ['user@nora.com', 'user', 'Пользователь'],
    ])
    expect(DEFAULT_APP_ACCOUNTS.map((account) => account.nickname)).toEqual(['admin', 'mentor', 'user'])
    expect(DEFAULT_MENTOR_EMAIL).toBe('mentor@nora.com')
    expect(DEFAULT_MENTEE_EMAIL).toBe('user@nora.com')
    expect(DEFAULT_APP_ACCOUNT_PASSWORD).toBe('12345678')
  })
})
