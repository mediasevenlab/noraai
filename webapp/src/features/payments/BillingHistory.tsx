import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { NoraBadge } from '@/components/nora/primitives'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  type BillingLedgerEntry,
  type BillingLedgerStatus,
} from './card-store'
import {
  formatPayoutAmount,
  formatShortDate,
  mentorPayoutNet,
  mentorPayoutWithholding,
  nextMentorPayoutDate,
} from './model'

export const CHARGE_HISTORY_PAGE_SIZE = 10
const PAYOUT_HISTORY_PAGE_SIZE = 8

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
  return formatShortDate(date)
}

export function ChargeHistory({ entries }: { entries: readonly BillingLedgerEntry[] }) {
  return <LedgerTable empty="Списаний пока нет." entries={entries} pageSize={CHARGE_HISTORY_PAGE_SIZE} />
}

export function PayoutHistory({
  accrued,
  ready,
  records,
}: {
  accrued: number | null
  ready: boolean
  /** Referral payouts already sent. When set, the monthly waiting row is not shown. */
  records?: ReadonlyArray<{ at: string, grossRub: number }>
}) {
  const [page, setPage] = useState(1)
  const rows = records
    ? records.map((record) => ({
      at: formatWhen(record.at),
      gross: record.grossRub,
      id: record.at,
      status: 'paid' as const,
    }))
    : (accrued ?? 0) > 0
      ? [{
        at: formatShortDate(nextMentorPayoutDate()),
        gross: accrued ?? 0,
        id: 'scheduled',
        status: ready ? 'waiting' as const : 'needs-data' as const,
      }]
      : []
  if (rows.length === 0) {
    return (
      <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
        Выплат пока нет.
      </p>
    )
  }
  const range = ledgerPageWindow(rows.length, page, PAYOUT_HISTORY_PAGE_SIZE)
  if (range.current !== page) setPage(range.current)
  const visible = rows.slice(range.from - 1, range.to)
  return (
    <div className="overflow-hidden rounded-[12px] bg-[var(--nora-panel)]">
      <Table columns className="grid w-full grid-cols-[max-content_max-content_max-content_max-content_max-content] justify-between">
        <TableHeader>
          <TableRow className={cn(ledgerRowClass, 'hover:bg-transparent')}>
            <TableHead className={payoutHeadClass}>Дата</TableHead>
            <TableHead className={payoutHeadClass}>Накоплено</TableHead>
            <TableHead className={payoutHeadClass}>Налог</TableHead>
            <TableHead className={payoutHeadClass}>Придёт</TableHead>
            <TableHead className={payoutHeadClass}>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => {
            const tax = mentorPayoutWithholding(row.gross)
            const net = mentorPayoutNet(row.gross)
            return (
              <TableRow
                className={cn(ledgerRowClass, 'even:!bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:!bg-[var(--nora-row-hover)]')}
                key={row.id}
              >
                <TableCell className={payoutCellClass}>{row.at}</TableCell>
                <TableCell className={payoutCellClass}>{formatPayoutAmount(row.gross)}</TableCell>
                <TableCell className={payoutCellClass}>{formatPayoutAmount(tax)}</TableCell>
                <TableCell className={payoutCellClass}>{formatPayoutAmount(net)}</TableCell>
                <TableCell className={payoutStatusClass}>
                  <PayoutStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] px-3.5 py-3">
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
          {`Показано ${range.from}–${range.to} из ${rows.length}`}
        </p>
        <LedgerPageList onPage={setPage} page={range.current} totalPages={range.totalPages} />
      </div>
    </div>
  )
}

export function ledgerPageWindow(total: number, page: number, pageSize = CHARGE_HISTORY_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const current = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = total === 0 ? 0 : Math.min(total, current * pageSize)
  return { current, from, to, totalPages }
}

function PayoutStatusBadge({ status }: { status: 'paid' | 'waiting' | 'needs-data' }) {
  return (
    <NoraBadge className="!font-[250]" variant={status === 'paid' ? 'green' : status === 'waiting' ? 'yellow' : 'red'}>
      {status === 'paid' ? 'Выплачено' : status === 'waiting' ? 'Ждёт выплаты' : 'Ждёт данные'}
    </NoraBadge>
  )
}

const ledgerRowClass = 'col-span-full grid grid-cols-subgrid'
const payoutHeadClass =
  '!h-auto px-0.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)] first:pl-4 last:pr-4'
const payoutCellClass =
  'h-auto px-0.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)] first:pl-4 last:pr-4'
const payoutStatusClass = 'h-auto px-0.5 py-3 text-left whitespace-nowrap first:pl-4 last:pr-4'
const headClass =
  '!h-auto px-2.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)] first:pl-4 last:pr-4'
const cellClass =
  'h-auto px-2.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)] first:pl-4 last:pr-4'
const statusClass = 'h-auto px-2.5 py-3 text-left whitespace-nowrap first:pl-4 last:pr-4'

function LedgerTable({
  available,
  empty,
  entries,
  pageSize,
}: {
  available?: { amount: string, when: string } | null
  empty: string
  entries: readonly BillingLedgerEntry[]
  pageSize?: number
}) {
  const [page, setPage] = useState(1)
  const range = pageSize ? ledgerPageWindow(entries.length, page, pageSize) : null
  if (range && range.current !== page) setPage(range.current)
  const visible = range && range.from > 0 ? entries.slice(range.from - 1, range.to) : entries
  const shownFrom = range?.from ?? (entries.length === 0 ? 0 : 1)
  const shownTo = range?.to ?? entries.length

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
      <Table columns className="grid w-full grid-cols-[max-content_max-content_max-content_max-content] justify-between">
        <TableHeader>
          <TableRow className={cn(ledgerRowClass, 'hover:bg-transparent')}>
            <TableHead className={headClass}>Дата</TableHead>
            <TableHead className={headClass}>Операция</TableHead>
            <TableHead className={headClass}>Сумма</TableHead>
            <TableHead className={headClass}>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((entry) => (
            <TableRow
              className={cn(ledgerRowClass, 'even:!bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:!bg-[var(--nora-row-hover)]')}
              key={entry.id}
            >
              <TableCell className={cellClass}>{formatWhen(entry.at)}</TableCell>
              <TableCell className={cellClass}>{entry.title}</TableCell>
              <TableCell className={cellClass}>{formatPayoutAmount(entry.amount)}</TableCell>
              <TableCell className={statusClass}>
                <NoraBadge className="!font-[250]" variant={statusVariant[entry.status]}>{statusLabel[entry.status]}</NoraBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {entries.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] px-3.5 py-3">
          <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
            {`Показано ${shownFrom}–${shownTo} из ${entries.length}`}
          </p>
          {range && range.totalPages > 1 ? (
            <LedgerPageList onPage={setPage} page={range.current} totalPages={range.totalPages} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function LedgerPageList({
  onPage,
  page,
  totalPages,
}: {
  onPage: (page: number) => void
  page: number
  totalPages: number
}) {
  const pageClass = (active: boolean) =>
    cn(
      'inline-flex !h-6 !min-h-6 !w-6 !min-w-6 items-center justify-center rounded-full px-0 font-[family-name:var(--nora-font)] text-[12px] font-normal',
      active
        ? 'bg-[var(--nora-text)] text-[var(--nora-panel)]'
        : 'bg-[var(--nora-panel)] text-[var(--nora-text)] hover:bg-[var(--nora-button-bg-hover)]',
    )

  return (
    <nav aria-label="Страницы истории" className="flex flex-wrap items-center justify-end gap-1">
      <button
        aria-label="Предыдущая страница"
        className={cn(pageClass(false), 'disabled:pointer-events-none disabled:opacity-40')}
        data-generation-control=""
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <ChevronLeftIcon className="size-3" />
      </button>
      {pageItems(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center text-[12px] text-[var(--nora-text-tertiary)]"
            key={`gap-${index}`}
          >
            …
          </span>
        ) : (
          <button
            aria-current={item === page ? 'page' : undefined}
            className={pageClass(item === page)}
            data-generation-control=""
            key={item}
            onClick={() => onPage(item)}
            type="button"
          >
            {item}
          </button>
        ),
      )}
      <button
        aria-label="Следующая страница"
        className={cn(pageClass(false), 'disabled:pointer-events-none disabled:opacity-40')}
        data-generation-control=""
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        <ChevronRightIcon className="size-3" />
      </button>
    </nav>
  )
}

function pageItems(page: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const items: Array<number | 'gap'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push('gap')
  for (let current = start; current <= end; current += 1) items.push(current)
  if (end < totalPages - 1) items.push('gap')
  items.push(totalPages)
  return items
}
