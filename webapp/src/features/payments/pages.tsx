import type { UserDto } from '@web-app-demo/contracts'

import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'
import { SectionLoading } from '@/components/nora/product-sheet'
import {
  MENTOR_CONNECTION_BONUS,
  mentorConnectionBonusTotal,
} from '@/features/mentor/model'

import { BillingCardPanel } from './BillingCardPanel'
import { ChargeHistory, PayoutHistory } from './BillingHistory'
import { formatPayoutAmount, USER_SERVICE_PRICE_RUB } from './model'

function PaymentFacts({
  rows,
  title,
}: {
  rows: Array<{ label: string, value: string }>
  title: string
}) {
  return (
    <div className="grid gap-4">
      <h2 className="font-heading text-[20px] leading-tight font-bold tracking-[-0.02em] text-foreground">{title}</h2>
      <dl>
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

const userPlanRows = [
  { label: 'Тариф', value: 'Подписка' },
  { label: 'Сумма', value: `${formatPayoutAmount(USER_SERVICE_PRICE_RUB)} в месяц` },
  { label: 'Списание', value: 'Автоматически, раз в месяц' },
]

export function UserPayments({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      aside={<PaymentFacts rows={userPlanRows} title="Подписка" />}
      ctaLabel="Карта"
      description="Карта для ежемесячной подписки и история списаний. Чек уходит на почту, которую вы укажете."
      descriptionClassName={paymentsDescriptionClass}
      divided={false}
      eyebrow="Аккаунт"
      meta={user.email}
      panelsId="payments-panels"
      phoneSheet
      showJumpLink={false}
      title="Платежи"
    >
      <SettingsEntry
        description="Номер, срок и имя вводятся в полях. Плашка только показывает, какая это карта."
        title="Карта для оплаты"
      >
        <BillingCardPanel accountEmail={user.email} action="pay" requireCvc userId={user.id} />
      </SettingsEntry>
      <SettingsEntry className="lg:hidden" description="Один тариф." title="Подписка">
        <SettingsReadRows rows={userPlanRows} />
      </SettingsEntry>
      <SettingsEntry
        description="Успешные и неуспешные автосписания."
        title="История платежей"
      >
        <ChargeHistory userId={user.id} />
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function MentorPayments({
  connectedUsers,
  pending = false,
  user,
}: {
  connectedUsers: number | null
  pending?: boolean
  user: UserDto
}) {
  const accrued = connectedUsers == null ? null : mentorConnectionBonusTotal(connectedUsers)
  const payoutRows = [
    { label: 'Пользование', value: 'Бесплатно' },
    { label: 'За пользователя', value: formatPayoutAmount(MENTOR_CONNECTION_BONUS) },
    { label: 'Подключено', value: connectedUsers == null ? '—' : String(connectedUsers) },
    { label: 'К выплате', value: accrued == null ? '—' : formatPayoutAmount(accrued) },
  ]

  return (
    <SettingsCanvas
      aside={pending ? <SectionLoading className="min-h-16 py-4" label="Загрузка начислений" /> : <PaymentFacts rows={payoutRows} title="Выплаты" />}
      ctaLabel="Карта"
      description="Карта для выплаты и история переводов. Деньги уходят на сохранённую карту автоматически."
      descriptionClassName={paymentsDescriptionClass}
      divided={false}
      eyebrow="Наставник"
      meta={user.email}
      panelsId="payments-panels"
      phoneSheet
      showJumpLink={false}
      title="Платежи"
    >
      <SettingsEntry
        description="Карта получателя выплаты. ЮKassa переведёт деньги по номеру, когда выплаты будут включены."
        title="Карта для выплаты"
      >
        <BillingCardPanel accountEmail={user.email} requireCvc={false} userId={user.id} />
      </SettingsEntry>
      <SettingsEntry className="lg:hidden" description="Тот же бонус, что в списке пользователей." title="Выплаты">
        {pending ? (
          <SectionLoading className="min-h-16 py-4" label="Загрузка начислений" />
        ) : (
          <SettingsReadRows rows={payoutRows} />
        )}
      </SettingsEntry>
      <SettingsEntry
        description="Удачные и неудачные выплаты остаются в таблице."
        title="История выплат"
      >
        <PayoutHistory amount={accrued} userId={user.id} />
      </SettingsEntry>
    </SettingsCanvas>
  )
}
