import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { FileTextIcon, PencilIcon, PlusIcon, XIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import { toast } from '@/components/ui/toast'
import { SidebarSection } from '@/components/dashboard/SidebarSection'
import { sidebarTip } from '@/components/dashboard/sidebar-tip'
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import { useSidebar } from '@/components/ui/sidebar'
import { ruUploadDate } from '@/lib/ru-when'
import type { MeetingSummary } from '@web-app-demo/contracts'

import { deleteMeeting, listMeetings, renameMeetingTitle } from './api'
import { notifyMeetings, subscribeMeetings } from './selection'

function statusMark(meeting: MeetingSummary) {
  if (meeting.status === 'failed') return 'ошибка'
  if (meeting.status !== 'queued' && meeting.status !== 'running') return ''
  if (meeting.progress > 0) return `${meeting.progress}%`
  if (meeting.status === 'queued') return 'в очереди'
  return 'считаем'
}

export function MeetingsNavigation({
  disabled = false,
  to,
}: {
  disabled?: boolean
  to: '/app/meetings' | '/mentor/meetings'
}) {
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const sectionHit = query.length > 0 && 'встречи'.includes(query)
  const auth = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const selectedId = useRouterState({
    select: (state) => {
      const id = (state.location.search as { id?: unknown }).id
      return typeof id === 'string' ? id : ''
    },
  })
  const { setOpenMobile } = useSidebar()
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState('')
  const skipTitle = useRef(false)

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

  const showNew = !query || sectionHit || 'новая встреча'.includes(query)
  const shown = meetings.filter((meeting) => !query || sectionHit || meeting.title.toLowerCase().includes(query))
  if (query && !showNew && shown.length === 0) return null

  function open(id?: string) {
    setOpenMobile(false)
    void navigate({ to, search: { id } })
  }

  async function saveTitle(meeting: MeetingSummary) {
    const next = draft.trim()
    setEditingId('')
    if (!next || next === meeting.title) return
    try {
      const saved = await renameMeetingTitle(auth.transport, meeting.id, next)
      setMeetings((current) => current.map((item) => (item.id === meeting.id ? { ...item, title: saved.title } : item)))
      notifyMeetings()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось переименовать встречу')
    }
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
    <nav aria-label="Встречи">
      <SidebarSection forceOpen={query.length > 0} label="Встречи" storageKey="nora-sidebar-meetings">
          <SidebarMenu>
            {showNew ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled={disabled}
                isActive={!disabled && pathname === to && !selectedId}
                onClick={() => open(undefined)}
                tooltip="Новая встреча"
              >
                <PlusIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">Новая встреча</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            ) : null}
            {shown.map((meeting) => {
              const mark = statusMark(meeting)
              return (
                <SidebarMenuItem key={meeting.id}>
                  {editingId === meeting.id ? (
                    <input
                      aria-label="Название встречи"
                      autoFocus
                      className="h-8 w-full rounded-md border-0 bg-transparent px-2 text-[13px] text-sidebar-foreground outline-none"
                      maxLength={120}
                      value={draft}
                      onBlur={() => {
                        if (skipTitle.current) {
                          skipTitle.current = false
                          return
                        }
                        void saveTitle(meeting)
                      }}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          skipTitle.current = true
                          setDraft(meeting.title)
                          setEditingId('')
                        }
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  ) : (
                    <SidebarMenuButton
                      className="group-has-data-[sidebar=menu-action]/menu-item:!pr-16"
                      disabled={disabled}
                      isActive={pathname === to && selectedId === meeting.id}
                      onClick={() => open(meeting.id)}
                      tooltip={sidebarTip(meeting.title, ruUploadDate(meeting.createdAt))}
                    >
                      <FileTextIcon />
                      <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                        {meeting.title}
                        {mark ? <span className="text-[var(--nora-text-secondary)]"> · {mark}</span> : null}
                      </span>
                    </SidebarMenuButton>
                  )}
                  {disabled || editingId === meeting.id ? null : (
                    <>
                      <SidebarMenuAction
                        aria-label="Переименовать встречу"
                        className="right-7"
                        showOnHover
                        onClick={() => {
                          setDraft(meeting.title)
                          setEditingId(meeting.id)
                        }}
                      >
                        <PencilIcon />
                      </SidebarMenuAction>
                      <SidebarMenuAction aria-label="Удалить встречу" onClick={() => void remove(meeting.id)} showOnHover>
                        <XIcon />
                      </SidebarMenuAction>
                    </>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
      </SidebarSection>
    </nav>
  )
}
