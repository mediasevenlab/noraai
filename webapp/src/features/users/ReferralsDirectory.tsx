import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@/components/icons'
import { useEffect, useState, type FormEvent } from 'react'

import { DataTableFrame } from '@/components/dashboard'
import { SettingsEntry } from '@/components/settings-canvas'
import { NoraBadge, NoraSearch } from '@/components/nora/primitives'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ProductFeedEmpty, SectionLoading } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatUserReferralBonus,
} from './model'
import { useUserReferralsQuery, usePayoutAccrualQuery } from './queries'

const REFERRALS_PAGE_SIZE = 8

const headClass =
  '!h-auto px-2.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)]'
const cellClass =
  'h-auto px-2.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)]'
const statusClass = 'h-auto px-2.5 py-3 text-left whitespace-nowrap'

export function ReferralsDirectory({
  layout = 'card',
  unpaidRub = null,
}: {
  layout?: 'card' | 'entry'
  /** Unpaid referral bonus after payouts. Falls back to the server total. */
  unpaidRub?: number | null
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const referrals = useUserReferralsQuery({
    q: query || undefined,
    page,
    pageSize: REFERRALS_PAGE_SIZE,
  })
  const accrual = usePayoutAccrualQuery()
  const bonusById = new Map(accrual.data?.people.map((person) => [person.userId, person.bonusRub]) ?? [])
  const totalPages = referrals.data
    ? Math.max(1, Math.ceil(referrals.data.total / referrals.data.pageSize))
    : 1
  const description = referrals.isError
    ? 'Недоступно'
    : referrals.isPending
      ? 'Загрузка…'
      : null
  const bonusTotal = unpaidRub != null ? unpaidRub : accrual.isSuccess ? accrual.data.accruedRub : null

  useEffect(() => {
    const next = draftQuery.trim()
    const handle = window.setTimeout(() => {
      setQuery((current) => (current === next ? current : next))
      setPage((current) => (query === next ? current : 1))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [draftQuery, query])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = draftQuery.trim()
    setPage((current) => (query === next ? current : 1))
    setQuery(next)
  }

  const tableBody = (
    <>
      {referrals.isPending && <SectionLoading className="min-h-32 py-8" label="Загрузка рефералов" />}
      {referrals.isError && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить рефералов</AlertTitle>
          <AlertDescription>{referrals.error.message}</AlertDescription>
        </Alert>
      )}
      {referrals.data?.items.length === 0 && (
        layout === 'entry' ? (
          <ReferralSettingsEmpty
            description={
              query
                ? 'По этой строке рефералов нет.'
                : 'Люди, которые придут по вашей ссылке, появятся здесь.'
            }
            title={query ? 'Никого не нашли' : 'Рефералов пока нет'}
          />
        ) : (
          <ProductFeedEmpty
            description={
              query
                ? 'По этой строке рефералов нет.'
                : 'Люди, которые придут по вашей ссылке, появятся здесь.'
            }
            title={query ? 'Никого не нашли' : 'Рефералов пока нет'}
          />
        )
      )}
      {referrals.data && referrals.data.items.length > 0 && (
        <Table className="w-full table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[36%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={headClass}>Аккаунт</TableHead>
              <TableHead className={headClass}>Никнейм</TableHead>
              <TableHead className={headClass}>ID</TableHead>
              <TableHead className={headClass}>Бонус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.data.items.map((user) => {
              const bonus = bonusById.get(user.id)
              return (
                <TableRow
                  className="even:bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:bg-[var(--nora-row-hover)]"
                  key={user.id}
                >
                  <TableCell className={cellClass}>
                    <span className="block truncate !font-[350] !text-[color-mix(in_srgb,var(--nora-text)_50%,var(--nora-text-secondary))]">{user.displayName ?? user.email}</span>
                  </TableCell>
                  <TableCell className={cellClass}>{user.nickname ?? '—'}</TableCell>
                  <TableCell className={cellClass}>{user.publicId}</TableCell>
                  <TableCell className={statusClass}>
                    {accrual.isSuccess ? (
                      bonus
                        ? <NoraBadge className="!font-[250]" variant="green">{formatUserReferralBonus(bonus)}</NoraBadge>
                        : <NoraBadge className="!font-[250]" variant="yellow">Ждёт оплаты</NoraBadge>
                    ) : (
                      <NoraBadge className="!font-[250]" variant="neutral">…</NoraBadge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </>
  )

  const bonusChip =
    bonusTotal !== null ? (
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-[var(--nora-text-secondary)]" data-settings-meta="">
          Бонусы
        </span>
        <NoraBadge variant="green">
          {formatUserReferralBonus(bonusTotal)}
        </NoraBadge>
      </div>
    ) : null

  const searchField = (
    <NoraSearch
      aria-label="Поиск рефералов"
      className="h-8 min-h-8 w-full bg-[var(--nora-panel)]"
      icon={<SearchIcon className="!size-4 max-[767px]:!size-[calc(1rem/0.875)]" strokeWidth={1.75} />}
      inputClassName="text-[13px] !font-light leading-5 placeholder:!font-light"
      onChange={(event) => setDraftQuery(event.target.value)}
      placeholder="Поиск рефералов…"
      value={draftQuery}
    />
  )

  const search = (
    <form className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none" onSubmit={submitSearch}>
      {bonusChip}
      <div className="min-w-0 lg:w-[220px]">{searchField}</div>
    </form>
  )

  if (layout === 'entry') {
    return (
      <SettingsEntry
        className="lg:w-[28.8rem]"
        description="Кто пришёл по ссылке."
        title="Каталог"
      >
        <div className="grid gap-2.5">
          <form className="grid w-full grid-cols-2 items-center gap-2" onSubmit={submitSearch}>
            <div className="min-w-0">
              {description ? (
                <p className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                  {description}
                </p>
              ) : bonusChip}
            </div>
            <div className="relative h-8 min-w-0">{searchField}</div>
          </form>
          <div
            className={
              referrals.data?.items.length
                ? 'overflow-hidden rounded-[12px] bg-[var(--nora-panel)]'
                : undefined
            }
          >
            {tableBody}
            {referrals.data && referrals.data.total > 0 ? (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] px-3.5 py-3">
                <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
                  {`Показано ${(referrals.data.page - 1) * referrals.data.pageSize + 1}–${Math.min(referrals.data.total, referrals.data.page * referrals.data.pageSize)} из ${referrals.data.total}`}
                </p>
                <ReferralPageList onPage={setPage} page={page} totalPages={totalPages} />
              </div>
            ) : null}
          </div>
        </div>
      </SettingsEntry>
    )
  }

  return (
    <div className="grid gap-4">
      <DataTableFrame
        description={description ?? undefined}
        nextDisabled={!referrals.data?.hasNext}
        onNext={() => setPage((current) => current + 1)}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        previousDisabled={page <= 1}
        summary={referrals.data
          ? `Страница ${referrals.data.page} из ${totalPages} · ${referrals.data.total} рефералов`
          : referrals.isError
            ? 'Рефералы недоступны'
            : 'Загрузка рефералов'}
        title="Каталог рефералов"
        toolbar={search}
      >
        <div className={referrals.data?.items.length ? undefined : 'p-3.5'}>
          {tableBody}
        </div>
      </DataTableFrame>
    </div>
  )
}

function ReferralPageList({
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
    <nav aria-label="Страницы рефералов" className="flex flex-wrap items-center justify-end gap-1">
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
      {referralPageItems(page, totalPages).map((item, index) =>
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

function ReferralSettingsEmpty({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="rounded-[var(--nora-radius-md)] bg-[var(--settings-field-bg,var(--nora-panel))] px-3 py-2.5">
      <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
        {title}
      </p>
      <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">
        {description}
      </p>
    </div>
  )
}

function referralPageItems(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: Array<number | 'gap'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push('gap')
  for (let current = start; current <= end; current += 1) items.push(current)
  if (end < totalPages - 1) items.push('gap')
  items.push(totalPages)
  return items
}
