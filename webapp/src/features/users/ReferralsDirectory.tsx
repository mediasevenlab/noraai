import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState, type FormEvent, type MouseEvent } from 'react'

import { DataTableFrame } from '@/components/dashboard'
import { SettingsEntry } from '@/components/settings-canvas'
import { NoraBadge, NoraSearch } from '@/components/nora/primitives'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
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
  USER_REFERRAL_BONUS,
  userReferralBonusTotal,
} from './model'
import { useUserReferralsQuery } from './queries'

export function ReferralsDirectory({ layout = 'card' }: { layout?: 'card' | 'entry' }) {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const referrals = useUserReferralsQuery({
    q: query || undefined,
    page,
    pageSize: 20,
  })
  const totalPages = referrals.data
    ? Math.max(1, Math.ceil(referrals.data.total / referrals.data.pageSize))
    : 1
  const shownCount = referrals.data?.items.length
  const description = referrals.data
    ? `${shownCount} показано`
    : referrals.isError
      ? 'Недоступно'
      : 'Загрузка…'
  const bonusTotal = referrals.data
    ? userReferralBonusTotal(referrals.data.total)
    : null
  const perReferralBonusLabel = formatUserReferralBonus(USER_REFERRAL_BONUS)

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setQuery(draftQuery.trim())
  }

  const tableBody = (
    <>
      {referrals.isPending && (
        <div aria-label="Загрузка рефералов" className="grid gap-3" role="status">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {referrals.isError && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить рефералов</AlertTitle>
          <AlertDescription>{referrals.error.message}</AlertDescription>
        </Alert>
      )}
      {referrals.data?.items.length === 0 && (
        <Empty className={layout === 'entry' ? 'bg-transparent px-3 py-2.5 shadow-none backdrop-blur-none' : undefined}>
          <EmptyHeader>
            <EmptyTitle>Рефералы не найдены</EmptyTitle>
            <EmptyDescription>
              {query ? 'Рефералы не найдены.' : 'У вас пока нет рефералов.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {referrals.data && referrals.data.items.length > 0 && (
        <Table className="w-full table-fixed text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
                Аккаунт
              </TableHead>
              <TableHead className="w-[20%] pl-6 text-xs font-medium text-[var(--nora-text)]">
                Никнейм
              </TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-[var(--nora-text)]">
                ID
              </TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-[var(--nora-text)]">
                Бонусы
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.data.items.map((user) => (
              <TableRow
                className="even:bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:bg-[var(--nora-row-hover)]"
                key={user.id}
              >
                <TableCell className="h-auto px-3.5 py-2.5 whitespace-normal">
                  <div className="grid min-w-0 gap-1">
                    <span className="truncate text-xs font-medium text-[var(--nora-text)]">
                      {user.displayName ?? user.email}
                    </span>
                    <span className="truncate text-[11px] text-[var(--nora-text-tertiary)]">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="h-auto min-w-0 truncate py-2.5 pl-6 text-xs font-medium text-[var(--nora-text-secondary)]">
                  {user.nickname ?? '—'}
                </TableCell>
                <TableCell className="h-auto min-w-0 truncate py-2.5 text-xs font-medium text-[var(--nora-text-secondary)]">
                  {user.publicId}
                </TableCell>
                <TableCell className="h-auto min-w-0 py-2.5">
                  <NoraBadge variant="green">{perReferralBonusLabel}</NoraBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )

  const bonusChip =
    bonusTotal !== null ? (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-[var(--nora-text-secondary)]">
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
      className="!h-10 !min-h-10 min-w-0 flex-1 bg-[var(--nora-panel)] [&_svg]:!size-5 lg:!h-8 lg:!min-h-8 lg:w-[220px] lg:flex-none"
      icon={<SearchIcon />}
      inputClassName="text-[16px] leading-5 lg:text-[13px] lg:leading-none"
      onChange={(event) => setDraftQuery(event.target.value)}
      placeholder="Поиск рефералов…"
      value={draftQuery}
    />
  )

  const search = (
    <form className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none" onSubmit={submitSearch}>
      {bonusChip}
      {searchField}
    </form>
  )

  if (layout === 'entry') {
    return (
      <SettingsEntry
        badge="Люди"
        description="Кто зарегистрировался по вашей ссылке."
        title="Каталог"
      >
        <div className="grid gap-2.5">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 lg:justify-between">
            <p className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
              {description}
            </p>
            {search}
          </div>
          <div className="overflow-hidden rounded-[12px] bg-[var(--nora-panel)]">
            {tableBody}
          </div>
          {totalPages > 1 ? (
            <ReferralPageList
              onPage={setPage}
              page={page}
              totalPages={totalPages}
            />
          ) : null}
        </div>
      </SettingsEntry>
    )
  }

  return (
    <div className="grid gap-4">
      <DataTableFrame
        description={description}
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
  const go = (next: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (next < 1 || next > totalPages || next === page) return
    onPage(next)
  }

  return (
    <Pagination className="mx-0 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            aria-label="Предыдущая страница"
            className={page <= 1 ? 'pointer-events-none opacity-40' : undefined}
            href="#referrals-page"
            onClick={go(page - 1)}
          >
            <ChevronLeftIcon className="size-3.5" />
          </PaginationLink>
        </PaginationItem>
        {referralPageItems(page, totalPages).map((item, index) => (
          <PaginationItem key={item === 'gap' ? `gap-${index}` : item}>
            {item === 'gap' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#referrals-page"
                isActive={item === page}
                onClick={go(item)}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationLink
            aria-label="Следующая страница"
            className={page >= totalPages ? 'pointer-events-none opacity-40' : undefined}
            href="#referrals-page"
            onClick={go(page + 1)}
          >
            <ChevronRightIcon className="size-3.5" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
