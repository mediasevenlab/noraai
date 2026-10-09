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

const directoryRowClass = 'col-span-full grid grid-cols-subgrid !border-0'
const directoryStickyClass =
  'max-md:first:sticky max-md:first:left-0 max-md:first:z-20 max-md:first:min-w-0 max-md:first:overflow-hidden max-md:first:bg-[var(--nora-panel)] max-md:first:shadow-[1px_0_0_var(--nora-divider)]'
const directoryRuleClass = 'border-b border-[var(--nora-divider)]'
const directoryHeadClass =
  `flex items-center !h-auto px-2.5 py-3 text-left !font-[family-name:var(--nora-font)] !text-[13px] !font-medium !leading-5 whitespace-nowrap !text-[var(--nora-text)] first:pl-4 last:pr-4 ${directoryRuleClass} ${directoryStickyClass}`
const directoryCellClass =
  `flex items-center h-auto px-2.5 py-3 text-left font-[family-name:var(--nora-font)] !text-[13px] !font-[250] !leading-5 whitespace-nowrap !text-[var(--nora-text-secondary)] first:pl-4 last:pr-4 ${directoryRuleClass} ${directoryStickyClass}`
const directoryTableClass =
  'grid w-max min-w-full grid-cols-[11rem_max-content_max-content_max-content_max-content_max-content_max-content] max-md:grid-cols-[7.5rem_max-content_max-content_max-content_max-content_max-content_max-content] justify-between max-md:justify-start'

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
  const shownCount = usersQuery.data?.items.length ?? 0
  const pageSize = usersQuery.data?.pageSize ?? 19
  const shownFrom = usersQuery.data && shownCount > 0 ? (usersQuery.data.page - 1) * pageSize + 1 : 0
  const shownTo = shownFrom > 0 ? shownFrom + shownCount - 1 : 0
  const description = usersQuery.data
    ? null
    : viewState === 'error'
      ? 'Недоступно'
      : 'Загрузка…'

  return (
    <>
      <div className="grid min-w-0 gap-4">
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

        <div
          className="min-w-0 rounded-[16px] bg-[var(--settings-substrate,var(--nora-inset))] p-3.5"
          data-settings-well=""
        >
        <div className="min-w-0 overflow-hidden rounded-[12px] bg-[var(--nora-panel)]" data-catalog-frame="">
          <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-[var(--nora-divider)] px-3.5 py-3">
            <div className="min-w-0 shrink max-md:hidden">
              <h2 className="truncate font-[family-name:var(--nora-font)] text-[13px] font-[550] leading-5 text-[var(--nora-text)]">
                Каталог пользователей
              </h2>
              {description ? (
                <p className="truncate font-[family-name:var(--nora-font)] text-[12px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
                  {description}
                </p>
              ) : null}
            </div>
            <DirectoryToolbar
              draftQuery={draftQuery}
              onQuery={setDraftQuery}
              onRole={(next) => {
                setRoleFilter(next)
                setPage(1)
              }}
              role={roleFilter}
            />
          </div>
          {viewState === 'loading' && <DirectoryLoading />}
          {viewState === 'error' && usersQuery.isError && (
            <DirectoryError
              error={usersQuery.error}
              onRetry={() => void usersQuery.refetch()}
            />
          )}
          {viewState === 'empty' && <DirectoryEmpty hasQuery={query.length > 0} />}
          {viewState === 'ready' && usersQuery.data && (
            <Table columns className={directoryTableClass}>
              <TableHeader>
                <TableRow className={cn(directoryRowClass, 'hover:bg-transparent')}>
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
                  <TableHead className={directoryHeadClass} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.items.map((user) => {
                  const canDelete = canDeleteAdminUser(currentUser.id, user)
                  const busy = deleteMutation.isPending
                  return (
                    <TableRow
                      className={cn(
                        directoryRowClass,
                        'last:[&>td]:border-b-0',
                        'even:!bg-[color-mix(in_srgb,var(--nora-inset)_28%,transparent)] hover:!bg-[var(--nora-row-hover)]',
                        'max-md:even:[&>:first-child]:!bg-[color-mix(in_srgb,var(--nora-inset)_28%,var(--nora-panel))] max-md:hover:[&>:first-child]:![background-image:linear-gradient(var(--nora-row-hover),var(--nora-row-hover))]',
                      )}
                      key={user.id}
                    >
                      <TableCell className={cn(directoryCellClass, 'max-w-[11rem] flex-col items-start justify-center whitespace-normal max-md:max-w-[7.5rem]')}>
                        <span className="block w-full min-w-0 truncate !text-[var(--nora-text)]" data-table-text="">
                          {user.displayName ?? user.email}
                        </span>
                        {user.displayName ? (
                          <span className="block w-full min-w-0 truncate text-[12px] text-[var(--nora-text-tertiary)]" data-table-text="">
                            {user.email}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        {user.nickname ?? '—'}
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        {user.publicId}
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        <DirectoryRoleSelect
                          busy={roleMutation.isPending || deleteMutation.isPending}
                          currentUserId={currentUser.id}
                          onRole={(role) => {
                            roleMutation.reset()
                            setPendingRole({ role, user })
                          }}
                          user={user}
                        />
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell className={cn(directoryCellClass, 'tabular-nums')}>
                        {user.generationSpend && user.generationSpend.tokens > 0
                          ? formatGenerationSpend(user.generationSpend, currency)
                          : '—'}
                      </TableCell>
                      <TableCell className={directoryCellClass}>
                        <DirectoryDeleteButton
                          busy={busy}
                          canDelete={canDelete}
                          onDelete={() => {
                            deleteMutation.reset()
                            setPendingDelete(user)
                          }}
                          user={user}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {viewState === 'ready' && usersQuery.data ? (
            <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-[var(--nora-divider)] px-3.5 py-3">
              <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)] tabular-nums">
                {`Показано ${shownFrom}–${shownTo} из ${usersQuery.data.total}`}
                {pagination?.wasBounded ? ` · первые ${pagination.reachableUsers}` : ''}
              </p>
              {(pagination?.totalPages ?? 1) > 1 ? (
                <DirectoryPager
                  onPage={setPage}
                  page={usersQuery.data.page}
                  totalPages={pagination?.totalPages ?? 1}
                />
              ) : null}
            </div>
          ) : null}
        </div>
        </div>
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

function DirectoryRoleSelect({
  busy,
  currentUserId,
  onRole,
  user,
}: {
  busy: boolean
  currentUserId: string
  onRole: (role: UserRole) => void
  user: AdminUserSummary
}) {
  return (
    <Select
      disabled={busy}
      onValueChange={(value) => {
        const parsedRole = userRoleSchema.safeParse(value)
        if (parsedRole.success && parsedRole.data !== user.role) onRole(parsedRole.data)
      }}
      value={user.role}
    >
      <SelectTrigger
        aria-label={`Роль для ${user.email}`}
        className="!h-8 !min-h-8 w-fit !gap-1.5 !rounded-full !bg-[var(--nora-input-bg)] !px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-normal"
      >
        <span className="truncate text-left">{user.role}</span>
      </SelectTrigger>
      <SelectContent className={productToolbarSelectContentClass}>
        <SelectItem
          className={productToolbarSelectItemClass}
          disabled={user.id === currentUserId && user.role === 'admin'}
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
  )
}

function DirectoryDeleteButton({
  busy,
  canDelete,
  onDelete,
  user,
}: {
  busy: boolean
  canDelete: boolean
  onDelete: () => void
  user: AdminUserSummary
}) {
  return (
    <NoraIconButton
      aria-label={`Удалить ${user.email}`}
      className="!size-8 !rounded-full !bg-[var(--nora-input-bg)] hover:!bg-[var(--nora-error)] hover:!text-white"
      data-catalog-delete=""
      disabled={busy || !canDelete}
      onClick={() => {
        if (!canDelete) return
        onDelete()
      }}
    >
      <Trash2Icon />
    </NoraIconButton>
  )
}

const roleFilterLabel: Record<UserRole | 'all', string> = {
  all: 'Все',
  user: 'user',
  mentor: 'mentor',
  admin: 'admin',
}

function DirectoryToolbar({
  draftQuery,
  onQuery,
  onRole,
  role,
}: {
  draftQuery: string
  onQuery: (value: string) => void
  onRole: (value: UserRole | 'all') => void
  role: UserRole | 'all'
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1.5">
      <GenerationCurrencySelect className="!h-8 !min-h-8 shrink-0 !bg-[var(--nora-input-bg)] max-md:!w-auto max-md:!min-w-0 max-md:!px-2.5" />
      <DirectoryRoleFilter onChange={onRole} value={role} />
      <NoraSearch
        aria-label="Поиск пользователей"
        className="h-8 min-h-8 w-full min-w-0 max-w-[240px] flex-1 !rounded-full !bg-[var(--nora-input-bg)]"
        icon={<SearchIcon />}
        inputClassName="!text-[13px] !font-normal leading-5 truncate"
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Имя, ник или почта…"
        value={draftQuery}
      />
    </div>
  )
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
        className="!h-8 !min-h-8 w-fit shrink-0 !rounded-full !bg-[var(--nora-input-bg)] !px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-normal max-md:!px-2.5"
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
      'inline-flex !h-6 !min-h-6 !w-6 !min-w-6 items-center justify-center rounded-full px-0 font-[family-name:var(--nora-font)] text-[12px] font-normal',
      active
        ? 'bg-[var(--nora-text)] text-[var(--nora-panel)]'
        : 'bg-[var(--nora-panel)] text-[var(--nora-text)] hover:bg-[var(--nora-button-bg-hover)]',
    )

  return (
    <nav aria-label="Страницы пользователей" className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
      <button
        aria-label="Предыдущая страница"
        className={cn(pageClass(false), 'disabled:pointer-events-none disabled:opacity-40')}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <ChevronLeftIcon className="size-3" />
      </button>
      {directoryPageItems(page, totalPages).map((item, index) =>
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
        <ChevronRightIcon className="size-3" />
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
