import { expect, test } from 'bun:test'

import { passwordResetAcceptedNotice } from '../src/features/auth/password-reset-copy'

test('password reset copy does not claim email was sent when delivery is off', () => {
  expect(passwordResetAcceptedNotice('unavailable')).toEqual({
    title: 'Сброс по почте недоступен',
    body: 'Письма сейчас не отправляются. Войдите, если помните пароль, или напишите в поддержку.',
  })
  expect(passwordResetAcceptedNotice('queued').title).toBe('Проверьте почту')
  expect(passwordResetAcceptedNotice('queued').body).toContain('инструкции по сбросу уже отправлены')
})
