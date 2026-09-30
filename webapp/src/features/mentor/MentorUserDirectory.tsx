import { MoreHorizontalIcon, SearchIcon } from '@/components/icons'
import type { AdminUserSummary } from '@web-app-demo/contracts'
import { useState, type FormEvent } from 'react'

import { DataTableFrame } from '@/components/dashboard'
import { NoraBadge, NoraIconButton, NoraSearch } from '@/components/nora/primitives'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { DetachMentorUserDialog } from './DetachMentorUserDialog'
import {
  formatMentorBonus,
  MENTOR_CONNECTION_BONUS,
  mentorConnectionBonusTotal,
} from './model'
import {
  useDetachMentorUserMutation,
  useMentorUsersQuery,
} from './queries'

export function MentorUserDirectory() {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDetach, setPendingDetach] = useState<AdminUserSummary | null>(null)
  const users = useMentorUsersQuery({
    q: query || undefined,
    page,
    pageSize: 20,
  })
  const detach = useDetachMentorUserMutation()
  const totalPages = users.data
    ? Math.max(1, Math.ceil(users.data.total / users.data.pageSize))
    : 1
  const shownCount = users.data?.items.length
  const description = users.data
    ? `${shownCount} показано`
    : users.isError
      ? 'Недоступно'
      : 'Загрузка…'
  const bonusTotal = users.data
    ? mentorConnectionBonusTotal(users.data.total)
    : null
  const perUserBonusLabel = formatMentorBonus(MENTOR_CONNECTION_BONUS)

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setQuery(draftQuery.trim())
  }

  return (
    <>
      <div className="grid gap-4">
        <DataTableFrame
          description={description}
          nextDisabled={!users.data?.hasNext}
          onNext={() => setPage((current) => current + 1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          previousDisabled={page <= 1}
          summary={users.data
            ? `Страница ${users.data.page} из ${totalPages} · ${users.data.total} пользователей`
            : users.isError
              ? 'Пользователи недоступны'
              : 'Загрузка пользователей'}
          title="Мои пользователи"
          toolbar={
            <form className="flex items-center gap-2" onSubmit={submitSearch}>
              {bonusTotal !== null ? (
                <div className="flex items-center gap-1.5 pr-1">
                  <span className="text-[11px] font-medium text-[var(--nora-text-secondary)]">
                    Бонусы
                  </span>
                  <NoraBadge variant="green">
                    {formatMentorBonus(bonusTotal)}
                  </NoraBadge>
                </div>
              ) : null}
              <NoraSearch
                aria-label="Поиск подключённых пользователей"
                className="w-[220px]"
                icon={<SearchIcon />}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Поиск пользователей…"
                value={draftQuery}
              />
            </form>
          }
        >
          {users.isPending && (
            <div aria-label="Загрузка пользователей" className="grid gap-3 p-3.5" role="status">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {users.isError && (
            <div className="p-3.5">
              <Alert variant="destructive">
                <AlertTitle>Не удалось загрузить пользователей</AlertTitle>
                <AlertDescription>{users.error.message}</AlertDescription>
              </Alert>
            </div>
          )}
          {users.data?.items.length === 0 && (
            <div className="p-3.5">
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Пользователи не найдены</EmptyTitle>
                  <EmptyDescription>
                    {query
                      ? 'Подключённые пользователи не найдены.'
                      : 'У вас пока нет подключённых пользователей.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
          {users.data && users.data.items.length > 0 && (
            <Table className="w-full table-fixed text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] px-3.5 text-xs font-medium text-[var(--nora-text)]">
                    Пользователь
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
                  <TableHead className="w-10 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((user) => (
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
                      <NoraBadge variant="green">{perUserBonusLabel}</NoraBadge>
                    </TableCell>
                    <TableCell className="h-auto px-2 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <NoraIconButton
                              aria-label={`Действия для ${user.email}`}
                              disabled={detach.isPending}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              detach.reset()
                              setPendingDetach(user)
                            }}
                            variant="destructive"
                          >
                            Отключить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableFrame>
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
    </>
  )
}
