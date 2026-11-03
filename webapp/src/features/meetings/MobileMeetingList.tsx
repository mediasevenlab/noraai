import { useEffect, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import type { MeetingSummary } from '@web-app-demo/contracts'
import { FileTextIcon, PlusIcon, XIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth'
import { ruUploadDate } from '@/lib/ru-when'
import { cn } from '@/lib/utils'

import { deleteMeeting, listMeetings } from './api'
import { notifyMeetings, subscribeMeetings } from './selection'

function statusMark(meeting: MeetingSummary) {
  if (meeting.status === 'failed') return 'ошибка'
  if (meeting.status !== 'queued' && meeting.status !== 'running') return ''
  if (meeting.progress > 0) return `${meeting.progress}%`
  if (meeting.status === 'queued') return 'в очереди'
  return 'считаем'
}

export function MobileMeetingList({
  onOpen,
  to,
}: {
  onOpen: () => void
  to: '/app/meetings' | '/mentor/meetings'
}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const selectedId = useRouterState({
    select: (state) => {
      const id = (state.location.search as { id?: unknown }).id
      return typeof id === 'string' ? id : ''
    },
  })
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])

  useEffect(() => {
    let current = true
    function load() {
      void listMeetings(auth.transport)
        .then((result) => {
          if (current) setMeetings(result.meetings)
        })
        .catch(() => {
          if (current) setMeetings([])
        })
    }
    load()
    const unsubscribe = subscribeMeetings(load)
    const timer = window.setInterval(load, 2000)
    return () => {
      current = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [auth.transport])

  function open(id?: string) {
    onOpen()
    void navigate({ to, search: { id } })
  }

  async function remove(meetingId: string) {
    try {
      await deleteMeeting(auth.transport, meetingId)
      setMeetings((current) => current.filter((item) => item.id !== meetingId))
      if (selectedId === meetingId) open(undefined)
      notifyMeetings()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить встречу')
    }
  }

  return (
    <ul className="flex flex-col gap-1.5">
      <li>
        <button type="button" onClick={() => open(undefined)} className={cn(rowClass(false), 'w-full text-left')}>
          <Mark accent icon={PlusIcon} />
          <span className="min-w-0 flex-1 truncate text-[15px]">Новая встреча</span>
        </button>
      </li>
      {meetings.length === 0 ? (
        <li className="px-1 py-4 text-center text-[13px] text-[var(--nora-text-tertiary)]">
          Пока нет встреч
        </li>
      ) : meetings.map((meeting) => {
        const active = pathname === to && selectedId === meeting.id
        const mark = statusMark(meeting)
        const when = ruUploadDate(meeting.createdAt)
        return (
          <li key={meeting.id} className={rowClass(active)}>
            <button
              type="button"
              onClick={() => open(meeting.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Mark active={active} icon={FileTextIcon} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">
                  {meeting.title}
                  {mark ? <span className={active ? 'text-white/75' : 'text-[var(--nora-text-secondary)]'}> · {mark}</span> : null}
                </span>
                {when ? (
                  <span className={cn('block truncate text-[12px]', active ? 'text-white/75' : 'text-[var(--nora-text-tertiary)]')}>
                    {when}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              aria-label="Удалить встречу"
              onClick={() => void remove(meeting.id)}
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
