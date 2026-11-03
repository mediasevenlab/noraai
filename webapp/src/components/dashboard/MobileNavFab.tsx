import { Link, useRouterState } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'
import type { LucideIcon } from '@/components/icons'
import {
  ChevronLeftIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from '@/components/icons'
import { lazy, Suspense, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { composerDockHeight, subscribeComposerDock } from '@/components/dashboard/composer-dock'
import {
  dialogNavPath,
  meetingNavPath,
  mobileNavSection,
  notesNavPath,
  type MobileNavSection,
} from '@/components/dashboard/mobile-nav-section'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { useMentorUsersQuery } from '@/features/mentor'
import { useCurrentUserMentorQuery } from '@/features/users'
import { cn } from '@/lib/utils'

const MobileDialogList = lazy(() =>
  import('@/features/dialogs').then((mod) => ({ default: mod.MobileDialogList })),
)
const MobileMeetingList = lazy(() =>
  import('@/features/meetings').then((mod) => ({ default: mod.MobileMeetingList })),
)
const MobileNoteList = lazy(() =>
  import('@/features/notes').then((mod) => ({ default: mod.MobileNoteList })),
)

export type MobileNavItem = {
  /** Highlight as a call-to-action, even when the route is not active. */
  accent?: boolean
  /** Fill the tile when this section is the current one. */
  active?: boolean
  disabled?: boolean
  icon: LucideIcon
  label: string
  needsMentor?: boolean
  /** Custom handler instead of navigating to `to`. */
  onSelect?: () => void
  to: WorkspaceRoutePath
}

type Panel = 'root' | 'mentor-users' | MobileNavSection

function MobileNavGlassButton({
  ariaLabel,
  children,
  danger,
  onClick,
}: {
  ariaLabel: string
  children: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'nora-press-grow inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 outline-none',
        'focus-visible:shadow-[var(--nora-shadow-focus)]',
        danger
          ? 'bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]'
          : 'ios-glass-glyph text-[var(--nora-text-secondary)]',
      )}
    >
      {children}
    </button>
  )
}

function MobileNavTileIcon({
  accent,
  active,
  icon: Icon,
}: {
  accent?: boolean
  active?: boolean
  icon: LucideIcon
}) {
  const filled = Boolean(accent || active)
  return (
    <span
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full',
        filled
          ? 'bg-white/20 text-white'
          : 'ios-glass-glyph text-[var(--nora-text-secondary)]',
      )}
    >
      <Icon aria-hidden className="size-[18px]" strokeWidth={1.5} />
    </span>
  )
}

function mobileNavTileClass(accent?: boolean, locked?: boolean, active?: boolean) {
  const filled = !locked && Boolean(accent || active)
  return cn(
    'flex h-[4.75rem] w-full flex-col items-start justify-center gap-1.5 rounded-[22px] border-0 px-3.5 text-left outline-none',
    locked
      ? 'cursor-default text-[var(--nora-text-tertiary)] opacity-70 ios-glass-tile'
      : cn(
          'nora-press-grow cursor-pointer focus-visible:shadow-[var(--nora-shadow-focus)]',
          filled
            ? 'bg-[var(--nora-tint)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_32%,transparent)]'
            : 'ios-glass-tile text-[var(--nora-text)]',
        ),
  )
}

/**
 * Phone-first bottom sheet navigation. Desktop keeps the sidebar; this FAB + sheet
 * is the thumb-reachable menu on small screens.
 */
export function MobileNavFab({
  items,
  navigationLocked = false,
  onLogout,
  user,
  workspaceLabel,
}: {
  items: ReadonlyArray<MobileNavItem>
  navigationLocked?: boolean
  onLogout: () => void | Promise<void>
  user: UserDto
  workspaceLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('root')
  function closeMenu() {
    setOpen(false)
    setPanel('root')
  }
  const dockHeight = useSyncExternalStore(subscribeComposerDock, composerDockHeight, () => 0)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const mentorQuery = useCurrentUserMentorQuery(user.role === 'user')
  const hasMentor = user.role !== 'user' || Boolean(mentorQuery.data?.mentor)
  const isMentor = user.role === 'mentor'
  const mentorUsers = useMentorUsersQuery({ page: 1, pageSize: 100 }, isMentor)
  const displayName = user.displayName ?? user.email
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const sectionTo = items.find((item) => mobileNavSection(item.to) === panel)?.to ?? ''
  const dialogsTo = dialogNavPath(sectionTo)
  const meetingsTo = meetingNavPath(sectionTo)
  const notesTo = notesNavPath(sectionTo)
  const title =
    panel === 'mentor-users'
      ? 'Пользователи'
      : panel === 'dialogs'
        ? 'Диалоги'
        : panel === 'meetings'
          ? 'Встречи'
          : panel === 'notes'
            ? 'Заметки'
            : 'Меню'
  const subtitle =
    panel === 'mentor-users'
      ? mentorUsers.isPending
        ? 'Загрузка…'
        : `${mentorUsers.data?.items.length ?? 0} подопечных`
      : panel === 'dialogs'
        ? 'Выберите разговор'
        : panel === 'meetings'
          ? 'Выберите встречу'
          : panel === 'notes'
            ? 'Сохранённые сообщения'
            : `${workspaceLabel} · ${displayName}`

  return (
    <>
      {open ? null : (
        <button
          type="button"
          aria-label="Открыть меню"
          onClick={() => setOpen(true)}
          style={dockHeight > 0 ? { bottom: `calc(${dockHeight}px + 0.75rem)` } : undefined}
          className={cn(
            'ios-float-pill ios-float-pill-dock',
            'fixed z-40 md:hidden',
            'right-4',
            dockHeight > 0
              ? ''
              : 'bottom-[max(1rem,var(--app-safe-bottom,env(safe-area-inset-bottom)))]',
            'inline-flex size-12 cursor-pointer items-center justify-center rounded-full',
            'outline-none transition-[transform,opacity] active:scale-95',
            'focus-visible:shadow-[var(--nora-shadow-focus)]',
          )}
        >
          <MenuIcon
            aria-hidden
            className="size-4 text-[var(--nora-text-secondary)]"
            strokeWidth={1.75}
          />
        </button>
      )}

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true)
          else closeMenu()
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className={cn(
            'bg-[var(--nora-modal)] md:hidden gap-0 overflow-hidden p-0 shadow-none antialiased',
            'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0',
            'data-[side=bottom]:max-h-[min(84dvh,620px)] data-[side=bottom]:rounded-t-[var(--modal-sheet-radius)] data-[side=bottom]:rounded-b-none',
            panel === 'root' ? '' : 'data-[side=bottom]:h-[min(84dvh,620px)]',
            'data-[side=bottom]:border-x-0 data-[side=bottom]:border-b-0',
            'data-starting-style:opacity-100 data-ending-style:opacity-100',
            'data-[side=bottom]:data-starting-style:translate-y-0 data-[side=bottom]:data-ending-style:translate-y-0',
          )}
        >
          <SheetHeader className="gap-0 px-5 pt-3 pr-5 pb-3 text-left">
            <div className="flex items-center justify-between gap-2">
              {panel !== 'root' ? (
                <MobileNavGlassButton
                  ariaLabel="Назад"
                  onClick={() => setPanel('root')}
                >
                  <ChevronLeftIcon className="size-4" strokeWidth={2} />
                </MobileNavGlassButton>
              ) : (
                <MobileNavGlassButton
                  ariaLabel="Выйти"
                  danger
                  onClick={() => {
                    closeMenu()
                    void onLogout()
                  }}
                >
                  <LogOutIcon className="size-3.5" strokeWidth={2} />
                </MobileNavGlassButton>
              )}
              <div className="flex items-center gap-2">
                <MobileNavGlassButton
                  ariaLabel={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                >
                  {isDark ? (
                    <SunIcon className="size-3.5" strokeWidth={2} />
                  ) : (
                    <MoonIcon className="size-3.5" strokeWidth={2} />
                  )}
                </MobileNavGlassButton>
                <MobileNavGlassButton
                  ariaLabel="Закрыть меню"
                  onClick={closeMenu}
                >
                  <XIcon className="size-4" strokeWidth={2} />
                </MobileNavGlassButton>
              </div>
            </div>
            <SheetTitle className="mt-2 text-[20px] font-medium leading-6 tracking-[-0.02em] text-[var(--nora-text)]">
              {title}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px] font-normal leading-4 text-[var(--nora-text-tertiary)]">
              {subtitle}
            </SheetDescription>
          </SheetHeader>

          {panel === 'root' ? (
            <nav
              aria-label="Мобильная навигация"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <ul className="grid grid-cols-2 gap-2.5">
                {items.map((item) => {
                  const isMentorUsers =
                    isMentor && item.to === '/mentor/users'
                  const section = mobileNavSection(item.to)
                  const locked =
                    navigationLocked ||
                    Boolean(item.disabled) ||
                    (item.needsMentor && !hasMentor)
                  const hint =
                    item.needsMentor && !hasMentor
                      ? 'Нужен наставник'
                      : item.disabled
                        ? 'Скоро'
                        : undefined
                  const active = Boolean(item.active) && !locked
                  const tileBody = (
                    <>
                      <MobileNavTileIcon
                        accent={item.accent}
                        active={active}
                        icon={item.icon}
                      />
                      <span className="min-w-0 truncate text-[13px] font-medium leading-4 tracking-normal">
                        {item.label}
                      </span>
                      {hint ? (
                        <span className="truncate text-[11px] font-normal leading-none">
                          {hint}
                        </span>
                      ) : null}
                    </>
                  )

                  return (
                    <li key={item.onSelect ? `${item.to}:${item.label}` : item.to} className="min-w-0">
                      {locked ? (
                        <div aria-disabled className={mobileNavTileClass(item.accent, true, active)}>
                          {tileBody}
                        </div>
                      ) : isMentorUsers ? (
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setPanel('mentor-users')}
                          className={mobileNavTileClass(item.accent, false, active)}
                        >
                          {tileBody}
                        </button>
                      ) : section ? (
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setPanel(section)}
                          className={mobileNavTileClass(item.accent, false, active)}
                        >
                          {tileBody}
                        </button>
                      ) : item.onSelect ? (
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => {
                            closeMenu()
                            item.onSelect?.()
                          }}
                          className={mobileNavTileClass(item.accent, false, active)}
                        >
                          {tileBody}
                        </button>
                      ) : (
                        <Link
                          to={item.to}
                          aria-current={active ? 'page' : undefined}
                          onClick={closeMenu}
                          className={mobileNavTileClass(item.accent, false, active)}
                        >
                          {tileBody}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>
          ) : panel === 'mentor-users' ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {mentorUsers.isPending ? (
                <p className="px-1 py-6 text-center text-[13px] text-[var(--nora-text-tertiary)]">
                  Загрузка пользователей…
                </p>
              ) : mentorUsers.data?.items.length ? (
                <ul className="flex flex-col gap-1.5">
                  {mentorUsers.data.items.map((mentee) => {
                    const label =
                      mentee.displayName ?? mentee.nickname ?? mentee.email
                    const active = pathname === `/mentor/users/${mentee.id}`
                    return (
                      <li key={mentee.id}>
                        <Link
                          to="/mentor/users/$userId"
                          params={{ userId: mentee.id }}
                          search={{ view: 'profile' }}
                          onClick={closeMenu}
                          className={cn(
                            'nora-press-grow flex h-14 items-center gap-3 rounded-[14px] px-3 outline-none',
                            active
                              ? 'bg-[var(--nora-tint)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_32%,transparent)]'
                              : 'ios-glass-tile text-[var(--nora-text)]',
                            'focus-visible:shadow-[var(--nora-shadow-focus)]',
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                              active
                                ? 'bg-white/20'
                                : 'ios-glass-glyph',
                            )}
                          >
                            <UserIcon
                              className={cn(
                                'size-4',
                                active ? 'text-white' : 'text-[var(--nora-text-secondary)]',
                              )}
                              strokeWidth={1.75}
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px] font-normal tracking-[-0.01em]">
                            {label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-1 py-6 text-center text-[13px] text-[var(--nora-text-tertiary)]">
                  Пока нет подопечных
                </p>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Suspense
                fallback={(
                  <p className="px-1 py-6 text-center text-[13px] text-[var(--nora-text-tertiary)]">
                    Загрузка…
                  </p>
                )}
              >
                {panel === 'dialogs' && dialogsTo ? (
                  <MobileDialogList to={dialogsTo} userId={user.id} onOpen={closeMenu} />
                ) : null}
                {panel === 'meetings' && meetingsTo ? (
                  <MobileMeetingList to={meetingsTo} onOpen={closeMenu} />
                ) : null}
                {panel === 'notes' && notesTo ? (
                  <MobileNoteList to={notesTo} userId={user.id} onOpen={closeMenu} />
                ) : null}
              </Suspense>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
