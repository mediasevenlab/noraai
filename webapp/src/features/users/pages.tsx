import { Navigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'
import { useState } from 'react'

import { useAuth } from '@/features/auth'

import { ModelChatSettings } from '@/features/diary'
import { userGeneralSearch } from '@/features/navigation'
import {
  clearReferralPayoutLedger,
  formatPayoutAmount,
  mentorPayoutNet,
  mentorPayoutStatus,
  readReferralPayoutLedger,
  settleReferralPayout,
  unpaidBonusRub,
  MentorPayoutPanel,
  PaymentFacts,
  PayoutHistory,
  readMentorPayoutProfile,
} from '@/features/payments'

import { AtSignIcon, HashIcon, MailIcon, UserRoundIcon } from '@/components/icons'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { MentorConnectionPanel } from './MentorConnectionPanel'
import { ProfileMobileMasthead } from './ProfileMobileMasthead'
import { ProfilePanel } from './ProfilePanel'
import { GenerationTokenUsagePanel } from './GenerationTokenUsagePanel'
import { MealEnginePanel } from './MealEnginePanel'
import { ReferralLinkPanel } from './ReferralLinkPanel'
import { ReferralsDirectory } from './ReferralsDirectory'
import { useUserReferralsQuery, usePayoutAccrualQuery } from './queries'
import { USER_REFERRAL_BONUS } from './model'

/** Legacy /app entry — Общее is the user landing. */
export function UserHome() {
  return <Navigate replace search={userGeneralSearch()} to="/app/general" />
}

export function UserProfile({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Профиль"
      description="Имя и никнейм."
      editable
      eyebrow="Аккаунт"
      lead={<ProfileMobileMasthead user={user} />}
      meta={user.email}
      panelsId="profile-panels"
      title="Профиль"
    >
      <ProfilePanel user={user} />
    </SettingsCanvas>
  )
}

/** Mentor/admin identity profile without the user questionnaire. */
export function AccountProfile({ user }: { user: UserDto }) {
  const roleLabel = user.role === 'admin'
    ? 'Администратор'
    : user.role === 'mentor'
      ? 'Наставник'
      : 'Пользователь'

  return (
    <SettingsCanvas
      description="Основные данные аккаунта рабочей области."
      eyebrow={roleLabel}
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Профиль"
    >
      <SettingsEntry description="Имя, почта и роль." title="Данные аккаунта">
        <SettingsReadRows
          rows={[
            { icon: UserRoundIcon, label: 'Имя', value: user.displayName?.trim() || '—' },
            { icon: MailIcon, label: 'Email', value: user.email },
            { icon: AtSignIcon, label: 'Никнейм', value: user.nickname ?? '—' },
            { icon: HashIcon, label: 'ID', value: String(user.publicId) },
            { icon: UserRoundIcon, label: 'Роль', value: roleLabel },
          ]}
        />
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function UserSettings({
  user,
}: {
  user: UserDto
}) {
  const auth = useAuth()
  return (
    <SettingsCanvas
      description="Подключение к наставнику."
      editable
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Настройки"
    >
      <MentorConnectionPanel />
      <MealEnginePanel />
      <ModelChatSettings transport={auth.transport} />
      <GenerationTokenUsagePanel />
    </SettingsCanvas>
  )
}

export function UserReferrals({ user }: { user: UserDto }) {
  const referrals = useUserReferralsQuery({ page: 1, pageSize: 20 })
  const accrual = usePayoutAccrualQuery()
  const referralCount = referrals.data?.total ?? null
  const accrued = accrual.isSuccess ? accrual.data.accruedRub : null
  const [profile, setProfile] = useState(() => readMentorPayoutProfile(user.id, undefined, 'referral'))
  const [ledger, setLedger] = useState(() => readReferralPayoutLedger(user.id))
  const unpaid = accrued == null ? null : unpaidBonusRub(accrued, ledger.settledRub)
  const payoutReady = profile != null
  const payoutStatus = mentorPayoutStatus({
    accrued: unpaid,
    kind: 'referral',
    phone: profile?.phone ?? null,
    ready: payoutReady,
  })
  const payoutRows = [
    { label: 'За месяц', value: formatPayoutAmount(USER_REFERRAL_BONUS) },
    { label: 'За год', value: formatPayoutAmount(USER_REFERRAL_BONUS * 12) },
    { label: 'Рефералов', value: referralCount == null ? '—' : String(referralCount) },
    { label: 'Накоплено', value: unpaid == null ? '—' : formatPayoutAmount(unpaid) },
    { label: 'К получению', value: unpaid == null ? '—' : formatPayoutAmount(mentorPayoutNet(unpaid)) },
  ]

  return (
    <SettingsCanvas
      aside={referrals.isPending || accrual.isPending ? null : (
        <PaymentFacts
          description="Число приглашённых и сумма к выплате."
          rows={payoutRows}
          title="Статистика"
        />
      )}
      asideClassName="lg:w-[308px]"
      description="Единоразовый бонус за приглашение, после первой оплаты приглашённого."
      descriptionClassName="line-clamp-none max-w-none"
      showJumpLink={false}
      eyebrow=""
      meta={user.email}
      panelsId="referrals-panels"
      phoneSheet
      showMobileTitle
      title="Рефералы"
    >
      <ReferralLinkPanel className="lg:w-[28.8rem]" layout="entry" user={user} />
      <SettingsEntry
        className="lg:w-[28.8rem]"
        after={payoutStatus ? (
          <p
            className="text-right font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]"
            data-mobile-hide={payoutStatus.startsWith('Бонусы можно копить') ? '' : undefined}
          >
            {payoutStatus}
          </p>
        ) : null}
        description={(
          <>
            <span className="lg:hidden">Реквизиты для выплаты</span>
            <span className="hidden lg:inline">ФИО, ИНН и телефон счёта в СБП.</span>
          </>
        )}
        title="Данные для выплат"
      >
        <MentorPayoutPanel
          kind="referral"
          onRequest={() => {
            if (accrued == null) return
            setLedger(settleReferralPayout(user.id, { accruedRub: accrued }))
          }}
          onReset={() => setLedger(clearReferralPayoutLedger(user.id))}
          onSaved={() => setProfile(readMentorPayoutProfile(user.id, undefined, 'referral'))}
          unpaidRub={unpaid}
          userId={user.id}
        />
      </SettingsEntry>
      <ReferralsDirectory layout="entry" unpaidRub={unpaid} />
      <SettingsEntry
        className="lg:w-[28.8rem]"
        description={(
          <>
            <span className="lg:hidden">Когда и сколько придёт</span>
            <span className="hidden lg:inline">Дата, накопленная сумма, удержанный налог и сумма, которая придёт.</span>
          </>
        )}
        descriptionClassName="max-w-none"
        title="История выплат"
      >
        <PayoutHistory accrued={unpaid} ready={payoutReady} records={ledger.payouts} />
      </SettingsEntry>
      <SettingsEntry className="lg:hidden" description="Бонус за приглашение" title="Статистика">
        <SettingsReadRows rows={payoutRows} tone="facts" />
      </SettingsEntry>
    </SettingsCanvas>
  )
}
