import { useAui, useAuiState } from '@assistant-ui/react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { MessageCircleIcon, PlusIcon, XIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { dialogDatesLabel, ruCalendarDate } from '@/lib/ru-when'
import { cn } from '@/lib/utils'

function dialogWhen(userId: string, remoteId: string | undefined, lastMessageAt?: Date) {
  const stored = userId && remoteId
    ? dialogDatesLabel(localStorage.getItem(`dialogs:${userId}:messages:${remoteId}`))
    : ''
  return stored || (lastMessageAt ? ruCalendarDate(lastMessageAt) : '')
}

export function MobileDialogList({
  onOpen,
  to,
  userId,
}: {
  onOpen: () => void
  to: '/app/dialogs' | '/mentor/dialogs'
  userId: string
}) {
  const aui = useAui()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const items = useAuiState((state) => state.threads.threadItems)
  const mainId = useAuiState((state) => state.threads.mainThreadId)

  function openNew() {
    aui.threads.switchToNewThread()
    onOpen()
    if (pathname !== to) void navigate({ to })
  }

  function openThread(id: string) {
    aui.threads.item({ id }).switchTo()
    onOpen()
    if (pathname !== to) void navigate({ to })
  }

  function remove(id: string) {
    try {
      aui.threads.item({ id }).delete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить диалог')
    }
  }

  return (
    <ul className="flex flex-col gap-1.5">
      <li>
        <button
          type="button"
          onClick={openNew}
          className={cn(rowClass(false), 'w-full text-left')}
        >
          <Mark accent icon={PlusIcon} />
          <span className="min-w-0 flex-1 truncate text-[15px]">Новый диалог</span>
        </button>
      </li>
      {items.length === 0 ? (
        <li className="px-1 py-4 text-center text-[13px] text-[var(--nora-text-tertiary)]">
          Пока нет диалогов
        </li>
      ) : items.map((item) => {
        const active = pathname === to && item.id === mainId
        const title = item.title?.trim() || 'Новый диалог'
        const when = dialogWhen(userId, item.remoteId, item.lastMessageAt)
        return (
          <li key={item.id} className={rowClass(active)}>
            <button
              type="button"
              onClick={() => openThread(item.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Mark active={active} icon={MessageCircleIcon} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{title}</span>
                {when ? (
                  <span className={cn('block truncate text-[12px]', active ? 'text-white/75' : 'text-[var(--nora-text-tertiary)]')}>
                    {when}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              aria-label="Удалить диалог"
              onClick={() => remove(item.id)}
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                active ? 'text-white/80' : 'text-[var(--nora-text-tertiary)]',
              )}
            >
              <XIcon className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function rowClass(active: boolean) {
  return cn(
    'flex h-14 items-center gap-3 rounded-[14px] px-3 outline-none',
    active
      ? 'bg-[var(--nora-tint)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_32%,transparent)]'
      : 'ios-glass-tile text-[var(--nora-text)]',
  )
}

function Mark({
  accent = false,
  active = false,
  icon: Icon,
}: {
  accent?: boolean
  active?: boolean
  icon: typeof PlusIcon
}) {
  const filled = accent || active
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
        accent ? 'bg-[var(--nora-tint)]' : active ? 'bg-white/20' : 'ios-glass-glyph',
      )}
    >
      <Icon className={cn('size-4', filled ? 'text-white' : 'text-[var(--nora-text-secondary)]')} strokeWidth={1.75} />
    </span>
  )
}
