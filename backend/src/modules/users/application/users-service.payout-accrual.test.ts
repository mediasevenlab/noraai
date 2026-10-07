import { expect, test } from 'bun:test'

import type { AuthenticatedPrincipal } from '../../auth'
import { SUBSCRIPTION_PRICE_RUB, SUBSCRIPTION_YEAR_PRICE_RUB } from '../../payments/domain/subscription-payment'
import { UsersService } from './users-service'

const referrer: AuthenticatedPrincipal = {
  id: 'referrer',
  publicId: 1,
  email: 'referrer@example.com',
  displayName: null,
  nickname: null,
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  sessionId: 'session',
}

function service(role: 'user' | 'mentor' = 'user') {
  return new UsersService({
    adminDashboardReader: { dashboard: async () => ({ totalUsers: 0, totalAdmins: 0, newUsersLast7Days: 0 }) },
    adminUsersReader: { listUsers: async () => ({ items: [], page: 1, pageSize: 20, total: 0, hasNext: false }) },
    clock: { now: () => new Date('2026-10-07T00:00:00.000Z') },
    currentUserMentorReader: { getCurrentUserMentor: async () => null },
    mentorUsersManager: {
      listMentorUsers: async () => ({
        items: [{ id: 'mentee' }],
        page: 1,
        pageSize: 100,
        total: 1,
        hasNext: false,
      }),
    } as never,
    userMentorConnector: {} as never,
    userReferralsReader: {
      listUserReferrals: async () => ({
        items: [{ id: 'invited' }, { id: 'waiting' }],
        page: 1,
        pageSize: 100,
        total: 2,
        hasNext: false,
      }),
    } as never,
    profileWriter: {} as never,
    questionnaireStore: {} as never,
    userDeleter: {} as never,
    userRoleUpdater: {} as never,
    listPaidSubscriptions: async () => [
      { userId: 'invited', amountRub: SUBSCRIPTION_PRICE_RUB, paidAt: '2026-10-01T00:00:00.000Z' },
      { userId: 'invited', amountRub: SUBSCRIPTION_PRICE_RUB, paidAt: '2026-11-01T00:00:00.000Z' },
      { userId: 'mentee', amountRub: SUBSCRIPTION_YEAR_PRICE_RUB, paidAt: '2026-10-02T00:00:00.000Z' },
      { userId: 'mentee', amountRub: SUBSCRIPTION_PRICE_RUB, paidAt: '2026-11-02T00:00:00.000Z' },
      { userId: 'stranger', amountRub: SUBSCRIPTION_PRICE_RUB, paidAt: '2026-10-03T00:00:00.000Z' },
    ],
  }).readPayoutAccrual({ ...referrer, role, id: role === 'mentor' ? 'mentor' : referrer.id })
}

test('a referrer is paid once for the first payment and a waiting signup adds nothing', async () => {
  await expect(service('user')).resolves.toEqual({
    accruedRub: 200,
    people: [{ userId: 'invited', bonusRub: 200 }],
  })
})

test('a mentor is paid for every confirmed payment of a mentee', async () => {
  await expect(service('mentor')).resolves.toEqual({
    accruedRub: 2_600,
    people: [{ userId: 'mentee', bonusRub: 2_600 }],
  })
})
