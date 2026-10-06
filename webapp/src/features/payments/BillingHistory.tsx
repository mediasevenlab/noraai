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
  readBillingLedger,
  type BillingLedgerEntry,
  type BillingLedgerStatus,
} from './card-store'
import {
  billingMonthKey,
  formatPayoutAmount,
  USER_SERVICE_PRICE_RUB,
} from './model'

const statusLabel: Record<BillingLedgerStatus, string> = {
  succeeded: 'Успешно',
  failed: 'Не прошло',
  processing: 'В обработке',
}

const statusVariant: Record<BillingLedgerStatus, 'green' | 'red' | 'yellow'> = {
  succeeded: 'green',
  failed: 'red',
  processing: 'yellow',
}

function formatWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/\s*г\.$/, '')
}

function formatMonth(date: Date) {
  const label = date
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    .replace(/\s*г\.$/, '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Shown until YooKassa writes real charges. Successful and failed months sit together. */
const DEMO_CHARGES: readonly BillingLedgerEntry[] = [
  {
    id: 'demo-2026-09',
    monthKey: '2026-09',
    amount: USER_SERVICE_PRICE_RUB,
    status: 'succeeded',
    at: '2026-09-01T09:00:00.000Z',
    title: 'Подписка',
  },
  {
    id: 'demo-2026-08',
    monthKey: '2026-08',
    amount: USER_SERVICE_PRICE_RUB,
    status: 'failed',
    at: '2026-08-01T09:00:00.000Z',
    title: 'Подписка',
  },
  {
    id: 'demo-2026-07',
    monthKey: '2026-07',
    amount: USER_SERVICE_PRICE_RUB,
    status: 'succeeded',
    at: '2026-07-01T09:00:00.000Z',
    title: 'Подписка',
  },
]

export function ChargeHistory({ userId }: { userId: string }) {
  const entries = withDemo(readBillingLedger(userId, 'charge'), DEMO_CHARGES)
  return <LedgerTable empty="Списаний пока нет." entries={entries} />
}

/** Shown until YooKassa writes real mentor payouts. */
const DEMO_PAYOUTS: readonly BillingLedgerEntry[] = [
  {
    id: 'demo-payout-2026-09',
    monthKey: '2026-09',
    amount: 1_400,
    status: 'succeeded',
    at: '2026-09-30T09:00:00.000Z',
    title: 'Выплата за месяц',
  },
  {
    id: 'demo-payout-2026-08',
    monthKey: '2026-08',
    amount: 1_200,
    status: 'failed',
    at: '2026-08-31T09:00:00.000Z',
    title: 'Выплата за месяц',
  },
  {
    id: 'demo-payout-2026-07',
    monthKey: '2026-07',
    amount: 1_400,
    status: 'succeeded',
    at: '2026-07-31T09:00:00.000Z',
    title: 'Выплата за месяц',
  },
]

function withDemo(
  stored: readonly BillingLedgerEntry[],
  demo: readonly BillingLedgerEntry[],
) {
  const storedMonths = new Set(stored.map((entry) => entry.monthKey))
  return [
    ...stored,
    ...demo.filter((entry) => !storedMonths.has(entry.monthKey)),
  ]
}

export function PayoutHistory({
  amount,
  userId,
}: {
  amount: number | null
  userId: string
}) {
  const entries = withDemo(readBillingLedger(userId, 'payout'), DEMO_PAYOUTS)
  const current = entries.find((entry) => entry.monthKey === billingMonthKey())
  const available = amount != null && amount > 0 && !current
    ? { when: formatMonth(new Date()), amount: formatPayoutAmount(amount) }
    : null

  return (
    <LedgerTable
      available={available}
      empty="Выплат пока нет."
      entries={entries}
    />
  )
}

/** Same 13px as the labels and amounts on this page. */
const headClass =
  '!h-auto px-3.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)]'
const cellClass =
  'h-auto px-3.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)]'
const statusClass = 'h-auto px-3.5 py-3 text-left whitespace-nowrap'

function LedgerTable({
  available,
  empty,
  entries,
}: {
  available?: { amount: string, when: string } | null
  empty: string
  entries: readonly BillingLedgerEntry[]
}) {
  if (entries.length === 0 && !available) {
    return (
      <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
        {empty}
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-[12px] bg-[var(--nora-panel)]">
      {available ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-[var(--nora-divider)] px-3.5 py-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
              {available.when}
            </p>
            <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">
              На сохранённую карту
            </p>
          </div>
          <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 tabular-nums text-[var(--nora-text-secondary)]">
            {available.amount}
          </p>
        </div>
      ) : null}
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Дата</TableHead>
            <TableHead className={headClass}>Операция</TableHead>
            <TableHead className={headClass}>Сумма</TableHead>
            <TableHead className={headClass}>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              className="even:bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:bg-[var(--nora-row-hover)]"
              key={entry.id}
            >
              <TableCell className={cellClass}>{formatWhen(entry.at)}</TableCell>
              <TableCell className={cellClass}>{entry.title}</TableCell>
              <TableCell className={cellClass}>{formatPayoutAmount(entry.amount)}</TableCell>
              <TableCell className={statusClass}>
                <NoraBadge variant={statusVariant[entry.status]}>{statusLabel[entry.status]}</NoraBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {entries.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] px-3.5 py-3">
          <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
            {`Показано 1–${entries.length} из ${entries.length}`}
          </p>
        </div>
      ) : null}
    </div>
  )
}
