import { MoreHorizontalIcon, SearchIcon } from '@/components/icons'
import {
  userRoleSchema,
  type AdminUserSummary,
  type UserDto,
  type UserRole,
} from '@web-app-demo/contracts'
import { useState, type FormEvent } from 'react'

import { DataTableFrame } from '@/components/dashboard'
import { NoraIconButton, NoraSearch } from '@/components/nora/primitives'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type PendingRoleChange = {
  role: UserRole
  user: AdminUserSummary
}

export function UserDirectory({ currentUser }: { currentUser: UserDto }) {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<AdminUserSummary | null>(null)
  const [pendingRole, setPendingRole] = useState<PendingRoleChange | null>(null)
  const usersQuery = useAdminUsersQuery({
    q: query || undefined,
    page,
    pageSize: 20,
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

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setQuery(draftQuery.trim())
  }

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

  const shownCount = usersQuery.data?.items.length
  const description = usersQuery.data
    ? `${shownCount} показано`
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
          description={description}
          nextDisabled={!pagination?.canGoNext}
          onNext={() => setPage((current) => current + 1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          previousDisabled={page <= 1}
          summary={summary}
          title="Каталог пользователей"
          toolbar={
            <form className="flex items-center gap-2" onSubmit={submitSearch}>
              <NoraSearch
                aria-label="Поиск пользователей"
                className="w-[220px]"
                icon={<SearchIcon />}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Поиск пользователей…"
                value={draftQuery}
              />
              <Button type="submit" variant="outline">
                Найти
              </Button>
            </form>
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
            <Table className="min-w-[720px] text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3.5 text-xs font-medium text-[var(--nora-text)]">
                    Пользователь
                  </TableHead>
                  <TableHead className="text-xs font-medium text-[var(--nora-text)]">
                    Никнейм
                  </TableHead>
                  <TableHead className="text-xs font-medium text-[var(--nora-text)]">
                    ID
                  </TableHead>
                  <TableHead className="text-xs font-medium text-[var(--nora-text)]">
                    Роль
                  </TableHead>
                  <TableHead className="text-xs font-medium text-[var(--nora-text)]">
                    Создан
                  </TableHead>
                  <TableHead className="w-10 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.items.map((user) => {
                  const canDelete = canDeleteAdminUser(currentUser.id, user)
                  const busy = deleteMutation.isPending
                  return (
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
                      <TableCell className="h-auto py-2.5 text-xs font-medium text-[var(--nora-text-secondary)]">
                        {user.nickname ?? '—'}
                      </TableCell>
                      <TableCell className="h-auto py-2.5 text-xs font-medium text-[var(--nora-text-secondary)]">
                        {user.publicId}
                      </TableCell>
                      <TableCell className="h-auto py-2.5">
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
                            className="h-[var(--nora-control-h,30px)] w-[132px] text-xs"
                            size="sm"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              disabled={user.id === currentUser.id && user.role === 'admin'}
                              value="user"
                            >
                              Пользователь
                            </SelectItem>
                            <SelectItem value="mentor">Наставник</SelectItem>
                            <SelectItem value="admin">Администратор</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="h-auto py-2.5 text-xs font-medium text-[var(--nora-text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="h-auto px-2 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <NoraIconButton
                                aria-label={`Действия для ${user.email}`}
                                disabled={busy}
                              />
                            }
                          >
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              disabled={!canDelete}
                              onClick={() => {
                                if (!canDelete) return
                                deleteMutation.reset()
                                setPendingDelete(user)
                              }}
                              variant="destructive"
                            >
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

function DirectoryLoading() {
  return (
    <div aria-label="Загрузка пользователей" className="grid gap-3 p-3.5" role="status">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
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
    <div className="p-3.5">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Пользователи не найдены</EmptyTitle>
          <EmptyDescription>
            {hasQuery
              ? 'Попробуйте другое имя или email.'
              : 'Пока нет доступных аккаунтов.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
