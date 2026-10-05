import {
  userRoleSchema,
  type AdminUserSummary,
  type UserDto,
  type UserRole,
} from '@web-app-demo/contracts'
import { useEffect, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, Trash2Icon } from '@/components/icons'
import { formatGenerationMoney, formatGenerationSpend } from '@/features/diary'
import { GenerationCurrencySelect, useGenerationCurrency } from '@/features/users'

import { DataTableFrame } from '@/components/dashboard'
import { cn } from '@/lib/utils'
import {
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from '@/components/nora/product-sheet'
import { NoraIconButton, NoraSearch } from '@/components/nora/primitives'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { ProductFeedEmpty, SectionLoading } from '@/components/nora/product-sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  adminUsersPagination,
  adminUsersViewState,
  canDeleteAdminUser,
  roleMutationFeedback,
} from './model'
import {
  useAdminUsersQuery,
  useDeleteAdminUserMutation,
  useUpdateAdminUserRoleMutation,
} from './queries'
import { DeleteUserDialog } from './DeleteUserDialog'
import { RoleChangeDialog } from './RoleChangeDialog'

const directoryHeadClass =
  '!h-10 px-3.5 !text-[12px] !font-normal text-[var(--nora-text-tertiary)]'
const directoryCellClass =
  'h-auto px-3.5 py-2.5 !text-[13px] !font-normal leading-5'

type PendingRoleChange = {
  role: UserRole
  user: AdminUserSummary
}

export function UserDirectory({ currentUser }: { currentUser: UserDto }) {
  const currency = useGenerationCurrency()
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<AdminUserSummary | null>(null)
  const [pendingRole, setPendingRole] = useState<PendingRoleChange | null>(null)
  useEffect(() => {
    const next = draftQuery.trim()
    const handle = window.setTimeout(() => {
      setQuery((current) => {
        if (current === next) return current
        return next
      })
      setPage((current) => (query === next ? current : 1))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [draftQuery, query])

  const usersQuery = useAdminUsersQuery({
    q: query || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    page,
    pageSize: 19,
  })
  const deleteMutation = useDeleteAdminUserMutation()
  const roleMutation = useUpdateAdminUserRoleMutation()
  const mutationFeedback = roleMutationFeedback(roleMutation)
  const viewState = adminUsersViewState({
    isError: usersQuery.isError,
    isPending: usersQuery.isPending,
    itemCount: usersQuery.data?.items.length,
  })
  const pagination = usersQuery.data
    ? adminUsersPagination(usersQuery.data)
    : null

  const confirmRoleChange = () => {
    if (!pendingRole) return
    roleMutation.mutate(
      { role: pendingRole.role, userId: pendingRole.user.id },
      { onSuccess: () => setPendingRole(null) },
    )
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(
      { userId: pendingDelete.id },
      {
        onSuccess: () => {
          if (usersQuery.data?.items.length === 1 && page > 1) {
            setPage((current) => Math.max(1, current - 1))
          }
          setPendingDelete(null)
        },
      },
    )
  }

  const totalSpend = usersQuery.data?.generationSpend
  const totalSpendMoney =
    totalSpend && totalSpend.tokens > 0 ? formatGenerationMoney(totalSpend, currency) : null
  const shownCount = usersQuery.data?.items.length
  const description = usersQuery.data
    ? `${shownCount} показано из ${usersQuery.data.total}`
    : viewState === 'error'
      ? 'Недоступно'
      : 'Загрузка…'

  const summary = usersQuery.data
    ? `Страница ${usersQuery.data.page} из ${pagination?.totalPages ?? 1} · ${usersQuery.data.total} пользователей${
        pagination?.wasBounded
          ? ` · Доступны первые ${pagination.reachableUsers} совпадений`
          : ''
      }`
    : viewState === 'error'
      ? 'Пользователи недоступны'
      : 'Загрузка пользователей'

  return (
    <>
      <div className="grid gap-4">
        {mutationFeedback === 'success' && roleMutation.isSuccess && (
          <Alert>
            <AlertTitle>Роль изменена</AlertTitle>
            <AlertDescription>
              {roleMutation.data.user.email} теперь {roleMutation.data.user.role}.
              Предыдущие сессии отозваны.
            </AlertDescription>
          </Alert>
        )}
        {deleteMutation.isSuccess && (
          <Alert>
            <AlertTitle>Пользователь удалён</AlertTitle>
            <AlertDescription>
              Аккаунт {deleteMutation.data.user.email} и связанные с ним сессии удалены.
            </AlertDescription>
          </Alert>
        )}

        <DataTableFrame
          controls={
            <DirectoryPager
              onPage={setPage}
              page={usersQuery.data?.page ?? page}
              totalPages={pagination?.totalPages ?? 1}
            />
          }
          description={description}
          nextDisabled={!pagination?.canGoNext}
          onNext={() => setPage((current) => current + 1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          previousDisabled={page <= 1}
          summary={summary}
          title="Каталог пользователей"
          toolbar={
            <div className="flex items-center gap-2">
              <GenerationCurrencySelect className="!h-8 !min-h-8 !bg-[var(--nora-panel)]" />
              <NoraSearch
                aria-label="Поиск пользователей"
                className="h-8 min-h-8 w-[240px] !rounded-full !bg-[var(--nora-panel)]"
                icon={<SearchIcon />}
                inputClassName="!text-[13px] !font-normal leading-5"
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Имя, ник или почта…"
                value={draftQuery}
              />
              <DirectoryRoleFilter
                onChange={(next) => {
                  setRoleFilter(next)
                  setPage(1)
                }}
                value={roleFilter}
              />
            </div>
          }
        >
          {viewState === 'loading' && <DirectoryLoading />}
          {viewState === 'error' && usersQuery.isError && (
            <DirectoryError
              error={usersQuery.error}
              onRetry={() => void usersQuery.refetch()}
            />
          )}
          {viewState === 'empty' && <DirectoryEmpty hasQuery={query.length > 0} />}
          {viewState === 'ready' && usersQuery.data && (
            <Table className="table-fixed !text-[13px]">
              <colgroup>
                <col span={6} />
                <col className="w-12" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={directoryHeadClass}>Пользователь</TableHead>
                  <TableHead className={directoryHeadClass}>Никнейм</TableHead>
                  <TableHead className={directoryHeadClass}>ID</TableHead>
                  <TableHead className={directoryHeadClass}>Роль</TableHead>
                  <TableHead className={directoryHeadClass}>Создан</TableHead>
                  <TableHead className={directoryHeadClass}>
                    Расход
                    {totalSpendMoney ? (
                      <span className="font-[250]"> ({totalSpendMoney})</span>
                    ) : null}
                  </TableHead>
                  <TableHead className="w-12 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.items.map((user) => {
                  const canDelete = canDeleteAdminUser(currentUser.id, user)
                  const busy = deleteMutation.isPending
                  return (
                    <TableRow key={user.id}>
                      <TableCell className={cn(directoryCellClass, 'whitespace-normal')}>
                        <div className="grid min-w-0 gap-0.5">
                          <span className="truncate font-[550] leading-5">
                            {user.displayName ?? user.email}
                          </span>
                          <span className="truncate text-[12px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={cn(directoryCellClass, 'truncate text-[var(--nora-text-secondary)]')}>
                        {user.nickname ?? '—'}
                      </TableCell>
                      <TableCell className={cn(directoryCellClass, 'text-[var(--nora-text-secondary)]')}>
                        {user.publicId}
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        <Select
                          disabled={roleMutation.isPending || deleteMutation.isPending}
                          onValueChange={(value) => {
                            const parsedRole = userRoleSchema.safeParse(value)
                            if (parsedRole.success && parsedRole.data !== user.role) {
                              roleMutation.reset()
                              setPendingRole({ role: parsedRole.data, user })
                            }
                          }}
                          value={user.role}
                        >
                          <SelectTrigger
                            aria-label={`Роль для ${user.email}`}
                            className="!h-8 !min-h-8 w-fit !gap-1.5 !rounded-full !px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-normal"
                          >
                            <span className="truncate text-left">{user.role}</span>
                          </SelectTrigger>
                          <SelectContent className={productToolbarSelectContentClass}>
                            <SelectItem
                              className={productToolbarSelectItemClass}
                              disabled={user.id === currentUser.id && user.role === 'admin'}
                              value="user"
                            >
                              user
                            </SelectItem>
                            <SelectItem className={productToolbarSelectItemClass} value="mentor">
                              mentor
                            </SelectItem>
                            <SelectItem className={productToolbarSelectItemClass} value="admin">
                              admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={cn(directoryCellClass, 'text-[var(--nora-text-secondary)]')}>
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell className={cn(directoryCellClass, 'tabular-nums')}>
                        {user.generationSpend && user.generationSpend.tokens > 0
                          ? formatGenerationSpend(user.generationSpend, currency)
                          : '—'}
                      </TableCell>
                      <TableCell className="px-2 py-2.5">
                        <NoraIconButton
                          aria-label={`Удалить ${user.email}`}
                          className="!size-8 !rounded-full !bg-[var(--nora-input-bg)] hover:!bg-[var(--nora-error)] hover:!text-white"
                          data-catalog-delete=""
                          disabled={busy || !canDelete}
                          onClick={() => {
                            if (!canDelete) return
                            deleteMutation.reset()
                            setPendingDelete(user)
                          }}
                        >
                          <Trash2Icon />
                        </NoraIconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </DataTableFrame>
      </div>

      <RoleChangeDialog
        error={roleMutation.isError ? roleMutation.error : null}
        isPending={roleMutation.isPending}
        onCancel={() => {
          roleMutation.reset()
          setPendingRole(null)
        }}
        onConfirm={confirmRoleChange}
        pendingChange={pendingRole}
      />

      <DeleteUserDialog
        error={deleteMutation.isError ? deleteMutation.error : null}
        isPending={deleteMutation.isPending}
        onCancel={() => {
          deleteMutation.reset()
          setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        pendingUser={pendingDelete}
      />
    </>
  )
}

const roleFilterLabel: Record<UserRole | 'all', string> = {
  all: 'Все',
  user: 'user',
  mentor: 'mentor',
  admin: 'admin',
}

function DirectoryRoleFilter({
  onChange,
  value,
}: {
  onChange: (value: UserRole | 'all') => void
  value: UserRole | 'all'
}) {
  return (
    <Select
      onValueChange={(next) => {
        if (next === 'all' || next === 'user' || next === 'mentor' || next === 'admin') {
          onChange(next)
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label="Тип пользователей"
        className="!h-8 !min-h-8 w-fit !rounded-full !bg-[var(--nora-panel)] !px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-normal"
        type="button"
      >
        <span className="truncate text-left">{roleFilterLabel[value]}</span>
      </SelectTrigger>
      <SelectContent className={productToolbarSelectContentClass}>
        {(Object.keys(roleFilterLabel) as Array<UserRole | 'all'>).map((role) => (
          <SelectItem className={productToolbarSelectItemClass} key={role} value={role}>
            {roleFilterLabel[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DirectoryPager({
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
      'inline-flex h-8 min-h-8 min-w-8 items-center justify-center rounded-full px-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal',
      active
        ? 'bg-[var(--nora-text)] text-[var(--nora-panel)]'
        : 'bg-[var(--nora-panel)] text-[var(--nora-text)] hover:bg-[var(--nora-button-bg-hover)]',
    )

  return (
    <nav aria-label="Страницы пользователей" className="flex flex-wrap items-center justify-end gap-1">
      <button
        aria-label="Предыдущая страница"
        className={cn(pageClass(false), 'disabled:pointer-events-none disabled:opacity-40')}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <ChevronLeftIcon className="size-3.5" />
      </button>
      {directoryPageItems(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span
            className="inline-flex h-8 min-w-8 items-center justify-center text-[13px] text-[var(--nora-text-tertiary)]"
            key={`gap-${index}`}
          >
            …
          </span>
        ) : (
          <button
            aria-current={item === page ? 'page' : undefined}
            className={pageClass(item === page)}
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
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        <ChevronRightIcon className="size-3.5" />
      </button>
    </nav>
  )
}

function directoryPageItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
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

function DirectoryLoading() {
  return <SectionLoading className="min-h-32 py-8" label="Загрузка пользователей" />
}

function DirectoryError({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  return (
    <div className="p-3.5">
      <Alert variant="destructive">
        <AlertTitle>Пользователи недоступны</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            Повторить
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}

function DirectoryEmpty({ hasQuery }: { hasQuery: boolean }) {
  return (
    <ProductFeedEmpty
      className="px-3.5"
      description={
        hasQuery
          ? 'Попробуйте другое имя или почту.'
          : 'Когда появятся аккаунты, они будут в этом списке.'
      }
      title={hasQuery ? 'Никого не нашли' : 'Пользователей пока нет'}
    />
  )
}
