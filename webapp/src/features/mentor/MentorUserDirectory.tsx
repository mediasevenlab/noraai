import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, Trash2Icon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { AdminUserSummary } from '@web-app-demo/contracts'
import { useEffect, useState, type FormEvent } from 'react'

import { SettingsEntry } from '@/components/settings-canvas'
import { NoraBadge, NoraIconButton, NoraSearch } from '@/components/nora/primitives'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SectionLoading } from '@/components/nora/product-sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DetachMentorUserDialog } from './DetachMentorUserDialog'
import { formatMentorBonus } from './model'
import {
  useDetachMentorUserMutation,
  useMentorUsersQuery,
} from './queries'
import { usePayoutAccrualQuery } from '@/features/users'

const MENTOR_USERS_PAGE_SIZE = 10

const headClass =
  '!h-auto px-2.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)]'
const cellClass =
  'h-auto px-2.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)]'
const statusClass = 'h-auto px-2.5 py-3 text-left whitespace-nowrap'

export function MentorUserDirectory() {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDetach, setPendingDetach] = useState<AdminUserSummary | null>(null)
  const users = useMentorUsersQuery({
    q: query || undefined,
    page,
    pageSize: MENTOR_USERS_PAGE_SIZE,
  })
  const accrual = usePayoutAccrualQuery()
  const bonusById = new Map(accrual.data?.people.map((person) => [person.userId, person.bonusRub]) ?? [])
  const detach = useDetachMentorUserMutation()
  const totalPages = users.data
    ? Math.max(1, Math.ceil(users.data.total / users.data.pageSize))
    : 1
  const description = users.isError
    ? 'Недоступно'
    : users.isPending
      ? 'Загрузка…'
      : null
  const bonusTotal = accrual.isSuccess ? accrual.data.accruedRub : null

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

  const bonusChip =
    bonusTotal !== null ? (
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-[var(--nora-text-secondary)]" data-settings-meta="">
          Бонусы
        </span>
        <NoraBadge variant="green">{formatMentorBonus(bonusTotal)}</NoraBadge>
      </div>
    ) : null

  const searchField = (
    <NoraSearch
      aria-label="Поиск подключённых пользователей"
      className="h-8 min-h-8 w-full bg-[var(--nora-panel)]"
      icon={<SearchIcon className="!size-4" strokeWidth={1.75} />}
      inputClassName="text-[13px] !font-light leading-5 placeholder:!font-light"
      onChange={(event) => setDraftQuery(event.target.value)}
      placeholder="Поиск пользователей…"
      value={draftQuery}
    />
  )

  return (
    <SettingsEntry
      description="Кто подключён к вам по ссылке."
      title="Мои пользователи"
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
            users.data?.items.length
              ? 'overflow-hidden rounded-[12px] bg-[var(--nora-panel)]'
              : undefined
          }
        >
          {users.isPending && (
            <SectionLoading className="min-h-32 py-8" label="Загрузка пользователей" />
          )}
          {users.isError && (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить пользователей</AlertTitle>
              <AlertDescription>{users.error.message}</AlertDescription>
            </Alert>
          )}
          {users.data?.items.length === 0 && (
            <div className="rounded-[var(--nora-radius-md)] bg-[var(--settings-field-bg,var(--nora-panel))] px-3 py-2.5">
              <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                {query ? 'Никого не нашли' : 'Подопечных пока нет'}
              </p>
              <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">
                {query
                  ? 'Попробуйте другое имя или почту.'
                  : 'Подключённые пользователи появятся в этом списке.'}
              </p>
            </div>
          )}
          {users.data && users.data.items.length > 0 && (
            <Table className="w-full table-fixed">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={headClass}>Пользователь</TableHead>
                  <TableHead className={headClass}>Никнейм</TableHead>
                  <TableHead className={headClass}>ID</TableHead>
                  <TableHead className={headClass}>Бонусы</TableHead>
                  <TableHead className={headClass} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((user) => {
                  const bonus = bonusById.get(user.id)
                  return (
                    <TableRow className="hover:bg-[var(--nora-row-hover)]" key={user.id}>
                      <TableCell className={cn(cellClass, 'whitespace-normal')}>
                        <div className="grid min-w-0">
                          <span className="truncate !font-medium !text-[var(--nora-text)]">{user.displayName ?? user.email}</span>
                          {user.displayName ? (
                            <span className="truncate !text-[var(--nora-text-tertiary)]">{user.email}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className={cellClass}>{user.nickname ?? '—'}</TableCell>
                      <TableCell className={cellClass}>{user.publicId}</TableCell>
                      <TableCell className={statusClass}>
                        {accrual.isSuccess ? (
                          bonus
                            ? <NoraBadge className="!font-[250]" variant="green">{formatMentorBonus(bonus)}</NoraBadge>
                            : <NoraBadge className="!font-[250]" variant="yellow">Ждёт оплаты</NoraBadge>
                        ) : (
                          <NoraBadge className="!font-[250]" variant="neutral">…</NoraBadge>
                        )}
                      </TableCell>
                      <TableCell className={cn(statusClass, 'text-center')}>
                        <NoraIconButton
                          aria-label={`Отключить ${user.email}`}
                          className="!size-8 !min-h-8 !min-w-8 !rounded-full !p-0 shadow-none hover:!text-[var(--nora-error)]"
                          data-settings-field=""
                          disabled={detach.isPending}
                          onClick={() => {
                            detach.reset()
                            setPendingDetach(user)
                          }}
                        >
                          <Trash2Icon className="size-4" strokeWidth={1.75} />
                        </NoraIconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {users.data && users.data.total > 0 && users.data.items.length > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] px-3.5 py-3">
              <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
                {shownUsersLabel(page, users.data.pageSize, users.data.items.length, users.data.total)}
              </p>
              <UserPageList onPage={setPage} page={page} totalPages={totalPages} />
            </div>
          ) : null}
        </div>
      </div>
      <DetachMentorUserDialog
        error={detach.isError ? detach.error : null}
        isPending={detach.isPending}
        onCancel={() => {
          detach.reset()
          setPendingDetach(null)
        }}
        onConfirm={() => {
          if (!pendingDetach) return
          detach.mutate(pendingDetach.id, {
            onSuccess: () => setPendingDetach(null),
          })
        }}
        user={pendingDetach}
      />
    </SettingsEntry>
  )
}

function shownUsersLabel(page: number, pageSize: number, count: number, total: number) {
  if (count === 0 || total === 0) return 'Показано 0 из 0'
  const start = (page - 1) * pageSize + 1
  const end = start + count - 1
  return `Показано ${start}–${end} из ${total}`
}

function UserPageList({
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
    <nav aria-label="Страницы пользователей" className="flex flex-wrap items-center justify-end gap-1">
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
