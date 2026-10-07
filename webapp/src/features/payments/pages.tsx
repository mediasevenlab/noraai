import type { UserDto } from '@web-app-demo/contracts'

import { useState } from 'react'

import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'
import { SectionLoading } from '@/components/nora/product-sheet'
import {
  MENTOR_CONNECTION_BONUS,
} from '@/features/mentor/model'

import { SubscriptionAutopayControl, SubscriptionPayPanel, SubscriptionStatusLine } from './BillingCardPanel'
import { ChargeHistory, PayoutHistory } from './BillingHistory'
import { readMentorPayoutProfile, type BillingLedgerEntry, type BillingLedgerStatus } from './card-store'
import { MentorPayoutPanel } from './MentorPayoutPanel'
import { formatPayoutAmount, mentorPayoutNet } from './model'
import { mentorPayoutStatus } from './MentorPayoutPanel'
import type { SubscriptionOverview } from './api'
import { useSubscriptionAccess } from './subscription-access-context'

export function PaymentFacts({
  description,
  rows,
  title,
}: {
  description?: string
  rows: Array<{ label: string, value: string }>
  title: string
}) {
  return (
    <div>
      <div>
        <h2 className="font-heading text-[18px] leading-tight font-bold tracking-[-0.02em] text-foreground lg:text-[24px]">{title}</h2>
        {description ? (
          <p className="mt-1 font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
            {description}
          </p>
        ) : null}
      </div>
      <dl className="mt-8">
        {rows.map((row, index) => (
          <div
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-t border-[var(--nora-divider)] py-3',
              index === 0 && 'border-t-0 pt-0',
              index === rows.length - 1 && 'pb-0',
            )}
            key={row.label}
          >
            <dt className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">{row.label}</dt>
            <dd className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const paymentsDescriptionClass = 'line-clamp-none'

function chargeEntries(overview: SubscriptionOverview): BillingLedgerEntry[] {
  return overview.charges.map((charge) => ({
    id: charge.paymentId,
    monthKey: charge.createdAt.slice(0, 7),
    amount: charge.amountRub,
    status: chargeStatus(charge.status, charge.paid),
    at: charge.createdAt,
    title: charge.title,
  }))
}

function chargeStatus(status: string, paid: boolean): BillingLedgerStatus {
  if (paid || status === 'succeeded') return 'succeeded'
  if (status === 'canceled') return 'failed'
  return 'processing'
}

export function UserPayments({ user }: { user: UserDto }) {
  const subscription = useSubscriptionAccess()
  return (
    <SettingsCanvas
      ctaLabel="Оплата"
      description="Оплата доступа к дневнику, планам и разбору приёмов. Карту вводите на странице ЮKassa, чек уходит на почту аккаунта."
      descriptionClassName={paymentsDescriptionClass}
      eyebrow="Аккаунт"
      meta={user.email}
      panelsId="payments-panels"
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Платежи"
    >
      <SettingsEntry
        after={subscription.overview ? <SubscriptionStatusLine overview={subscription.overview} /> : null}
        description="Месяц или год со скидкой."
        title="Подписка"
      >
        {subscription.overview ? (
          <SubscriptionPayPanel
            error={subscription.error}
            onChanged={() => void subscription.reload()}
            overview={subscription.overview}
          />
        ) : subscription.error ? (
          <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-error)]">{subscription.error}</p>
        ) : (
          <SectionLoading className="min-h-16 py-4" label="Загрузка подписки" />
        )}
      </SettingsEntry>
      <SettingsEntry
        description="Списания по подписке."
        title="История платежей"
      >
        {subscription.overview ? (
          <div className="grid gap-3">
            <ChargeHistory entries={chargeEntries(subscription.overview)} />
            <SubscriptionAutopayControl
              onChanged={() => void subscription.reload()}
              overview={subscription.overview}
            />
          </div>
        ) : (
          <SectionLoading className="min-h-16 py-4" label="Загрузка истории" />
        )}
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function MentorPayments({
  accruedRub,
  connectedUsers,
  pending = false,
  user,
}: {
  accruedRub: number | null
  connectedUsers: number | null
  pending?: boolean
  user: UserDto
}) {
  const accrued = accruedRub
  const [profile, setProfile] = useState(() => readMentorPayoutProfile(user.id))
  const payoutReady = profile != null
  const payoutStatus = mentorPayoutStatus({
    accrued,
    phone: profile?.phone ?? null,
    ready: payoutReady,
  })
  const payoutRows = [
    { label: 'За месяц', value: formatPayoutAmount(MENTOR_CONNECTION_BONUS) },
    { label: 'За год', value: formatPayoutAmount(MENTOR_CONNECTION_BONUS * 12) },
    { label: 'Подключено', value: connectedUsers == null ? '—' : String(connectedUsers) },
    { label: 'Накоплено', value: accrued == null ? '—' : formatPayoutAmount(accrued) },
    { label: 'К получению', value: accrued == null ? '—' : formatPayoutAmount(mentorPayoutNet(accrued)) },
  ]

  return (
    <SettingsCanvas
      aside={pending ? (
        <SectionLoading className="min-h-16 py-4" label="Загрузка начислений" />
      ) : (
        <PaymentFacts rows={payoutRows} title="Выплаты" />
      )}
      ctaLabel="Выплата"
      description="200 ₽ за каждый оплаченный месяц подопечного. Год — 2 400 ₽ сразу. Налог удерживается при переводе."
      descriptionClassName={paymentsDescriptionClass}
      asideClassName="lg:w-[308px]"
      eyebrow=""
      meta={user.email}
      panelsId="payments-panels"
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Платежи"
    >
      <SettingsEntry
        after={payoutStatus ? (
          <p className="text-right font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">
            {payoutStatus}
          </p>
        ) : null}
        className="lg:w-[28.8rem]"
        description={(
          <>
            <span className="lg:hidden">Реквизиты для выплаты</span>
            <span className="hidden lg:inline">ФИО, ИНН и телефон счёта в СБП.</span>
          </>
        )}
        title="Данные для выплат"
      >
        <MentorPayoutPanel
          onSaved={() => setProfile(readMentorPayoutProfile(user.id))}
          userId={user.id}
        />
      </SettingsEntry>
      <SettingsEntry className="lg:hidden" description="Бонус за подопечных" title="Выплаты">
        {pending ? (
          <SectionLoading className="min-h-16 py-4" label="Загрузка начислений" />
        ) : (
          <SettingsReadRows rows={payoutRows} tone="facts" />
        )}
      </SettingsEntry>
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
        <PayoutHistory accrued={accrued} ready={payoutReady} />
      </SettingsEntry>
    </SettingsCanvas>
  )
}
