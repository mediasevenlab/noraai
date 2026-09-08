import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  ReferralLinkPanel,
  referralCodeForUser,
} from '../src/features/users/ReferralLinkPanel'
import { parseReferralSearchParam } from '../src/features/auth/referral-search'
import type { UserDto } from '@web-app-demo/contracts'

const sampleUser = {
  id: 'user-1',
  publicId: 101,
  email: 'mentor@nora.com',
  displayName: 'Mentor',
  nickname: 'mentor',
  role: 'mentor',
  questionnaireCompleted: true,
  createdAt: new Date(0).toISOString(),
} as UserDto

test('referral search params keep numeric public IDs as strings', () => {
  expect(parseReferralSearchParam(8)).toBe('8')
  expect(parseReferralSearchParam('8')).toBe('8')
  expect(parseReferralSearchParam('mihail')).toBe('mihail')
  expect(parseReferralSearchParam('  mentor  ')).toBe('mentor')
  expect(parseReferralSearchParam('')).toBeUndefined()
  expect(parseReferralSearchParam(undefined)).toBeUndefined()
  expect(parseReferralSearchParam(null)).toBeUndefined()
})

test('referral links prefer nickname and fall back to public ID', () => {
  expect(referralCodeForUser({ nickname: 'mentor_nora', publicId: 101 }))
    .toBe('mentor_nora')
  expect(referralCodeForUser({ nickname: null, publicId: 101 }))
    .toBe('101')
})

test('mentor invite panel uses connection copy on the same ref URL shape', () => {
  const markup = renderToStaticMarkup(
    createElement(ReferralLinkPanel, { user: sampleUser, variant: 'mentor' }),
  )

  expect(markup).toContain('Ссылка для подключения пользователей')
  expect(markup).toContain('подключатся к вам как к наставнику')
  expect(markup).toContain('/?ref=mentor')
  expect(markup).not.toContain('Реферальная ссылка')
  expect(markup).not.toContain('Копировать')
  expect(markup).toContain('Скопировать ссылку')
})

test('referral panel copies on field click without a separate button', () => {
  const markup = renderToStaticMarkup(
    createElement(ReferralLinkPanel, { user: sampleUser, variant: 'referral' }),
  )

  expect(markup).toContain('Реферальная ссылка')
  expect(markup).toContain('Нажмите на поле, чтобы скопировать')
  expect(markup).not.toContain('Копировать')
  expect(markup).toContain('Скопировать ссылку')
})
