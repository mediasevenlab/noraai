import { NoraBadge } from '@/components/nora/primitives'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DEMO_USER_REFERRAL_PAYOUTS,
  formatPayoutAmount,
  userReferralPayoutTotal,
  type UserReferralPayoutStatus,
} from './model'

const statusLabel: Record<UserReferralPayoutStatus, string> = {
  paid: 'Выплачено',
  pending: 'Ожидает выплаты',
}

const statusVariant: Record<UserReferralPayoutStatus, 'green' | 'yellow'> = {
  paid: 'green',
  pending: 'yellow',
}

export function UserReferralPayoutHistoryPanel() {
  const months = [...DEMO_USER_REFERRAL_PAYOUTS].sort((a, b) => b.id.localeCompare(a.id))
  const total = userReferralPayoutTotal(DEMO_USER_REFERRAL_PAYOUTS)

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Реферальные выплаты
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--nora-text-tertiary)]">
          Демонстрационная история выплат за приглашённых пользователей.
        </p>
      </div>

      <Table className="w-full table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 w-[28%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
              Период
            </TableHead>
            <TableHead className="h-10 w-[18%] text-xs font-medium text-[var(--nora-text)]">
              Рефералы
            </TableHead>
            <TableHead className="h-10 w-[22%] text-xs font-medium text-[var(--nora-text)]">
              Сумма
            </TableHead>
            <TableHead className="h-10 w-[32%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
              Статус
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => (
            <TableRow
              className="even:bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:bg-[var(--nora-row-hover)]"
              key={month.id}
            >
              <TableCell className="px-3.5 py-2.5 text-xs font-medium text-[var(--nora-text)]">
                {month.label}
              </TableCell>
              <TableCell className="py-2.5 text-xs tabular-nums text-[var(--nora-text-secondary)]">
                {month.referrals}
              </TableCell>
              <TableCell className="py-2.5 text-xs font-semibold tabular-nums text-[var(--nora-text)]">
                {formatPayoutAmount(month.amount)}
              </TableCell>
              <TableCell className="px-3.5 py-2.5">
                <NoraBadge variant={statusVariant[month.status]}>
                  {statusLabel[month.status]}
                </NoraBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] bg-[color-mix(in_srgb,var(--nora-inset)_40%,transparent)] px-3.5 py-3">
        <span className="text-[12px] font-medium text-[var(--nora-text-secondary)]">
          Всего выплат
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-[var(--nora-text)]">
          {formatPayoutAmount(total)}
        </span>
      </div>
    </div>
  )
}
