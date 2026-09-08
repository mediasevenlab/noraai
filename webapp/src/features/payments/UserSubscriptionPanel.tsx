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
  DEMO_USER_NEXT_CHARGE,
  DEMO_USER_SUBSCRIPTION,
  DEMO_USER_SUBSCRIPTION_DAYS_LEFT,
  formatPayoutAmount,
  formatSubscriptionDaysLeft,
  type UserSubscriptionStatus,
} from './model'

const statusLabel: Record<UserSubscriptionStatus, string> = {
  paid: 'Оплачено',
  failed: 'Ошибка оплаты',
  scheduled: 'Запланировано',
}

const statusVariant: Record<UserSubscriptionStatus, 'green' | 'red' | 'yellow'> = {
  paid: 'green',
  failed: 'red',
  scheduled: 'yellow',
}

export function UserSubscriptionPanel() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="flex flex-col gap-3 border-b border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
            Подписка
          </h2>
          <p className="text-[11px] text-[var(--nora-text-tertiary)]">
            Демонстрационная история списаний за доступ к сервису.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[var(--nora-text-secondary)]">
            Следующее списание
          </span>
          <NoraBadge variant="blue">
            {DEMO_USER_NEXT_CHARGE.label} · {formatPayoutAmount(DEMO_USER_NEXT_CHARGE.amount)}
          </NoraBadge>
        </div>
      </div>

      <Table className="w-full table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 w-[28%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
              Период
            </TableHead>
            <TableHead className="h-10 w-[18%] text-xs font-medium text-[var(--nora-text)]">
              Сумма
            </TableHead>
            <TableHead className="h-10 w-[22%] text-xs font-medium text-[var(--nora-text)]">
              Статус
            </TableHead>
            <TableHead className="h-10 w-[32%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
              Комментарий
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEMO_USER_SUBSCRIPTION.map((month) => (
            <TableRow
              className="even:bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:bg-[var(--nora-row-hover)]"
              key={month.id}
            >
              <TableCell className="px-3.5 py-2.5 text-xs font-medium text-[var(--nora-text)]">
                {month.label}
              </TableCell>
              <TableCell className="py-2.5 text-xs font-semibold tabular-nums text-[var(--nora-text)]">
                {formatPayoutAmount(month.amount)}
              </TableCell>
              <TableCell className="py-2.5">
                <NoraBadge variant={statusVariant[month.status]}>
                  {statusLabel[month.status]}
                </NoraBadge>
              </TableCell>
              <TableCell className="px-3.5 py-2.5 text-[11px] text-[var(--nora-text-secondary)]">
                {month.note ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] bg-[color-mix(in_srgb,var(--nora-inset)_40%,transparent)] px-3.5 py-3">
        <span className="text-[12px] font-medium text-[var(--nora-text-secondary)]">
          Осталось дней подписки
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-[var(--nora-text)]">
          {formatSubscriptionDaysLeft(DEMO_USER_SUBSCRIPTION_DAYS_LEFT)}
        </span>
      </div>
    </div>
  )
}
