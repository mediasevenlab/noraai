import { NoraBadge } from '@/components/nora/primitives'
import {
  DEMO_MENTOR_PAYOUTS,
  formatPayoutAmount,
  mentorPayoutTotal,
} from './model'

const statusLabel = {
  paid: 'Выплачено',
  pending: 'Ожидает',
} as const

const statusVariant = {
  paid: 'green',
  pending: 'yellow',
} as const

export function MentorPayoutHistoryPanel() {
  const total = mentorPayoutTotal(DEMO_MENTOR_PAYOUTS)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Выплаты
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Демонстрационная история начислений за подключённых пользователей.
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <ul className="divide-y divide-[var(--nora-divider)]">
          {DEMO_MENTOR_PAYOUTS.map((month) => (
            <li
              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
              key={month.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--nora-text)]">
                  {month.label}
                </span>
                <NoraBadge variant={statusVariant[month.status]}>
                  {statusLabel[month.status]}
                </NoraBadge>
              </div>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--nora-text)]">
                {formatPayoutAmount(month.amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] bg-[color-mix(in_srgb,var(--nora-inset)_40%,transparent)] px-3.5 py-3">
          <span className="text-[12px] font-medium text-[var(--nora-text-secondary)]">
            Всего выплачено
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-[var(--nora-text)]">
            {formatPayoutAmount(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
