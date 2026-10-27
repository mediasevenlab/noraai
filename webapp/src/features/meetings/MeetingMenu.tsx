import { useEffect, useRef, useState } from 'react'
import { useAuiState } from '@assistant-ui/react'
import { FileTextIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { composerPickerMenuClass, dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { MeetingSummary } from '@web-app-demo/contracts'

import { listMeetings } from './api'
import { bindThreadMeetings, subscribeMeetings, writeThreadMeetings } from './selection'

export function MeetingMenu({ disabled = false }: { disabled?: boolean }) {
  const auth = useAuth()
  const userId = auth.user?.id ?? ''
  const threadId = useAuiState((state) => state.threads.mainThreadId)
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const previousThread = useRef<string | null>(null)

  useEffect(() => {
    setSelected(bindThreadMeetings(userId, threadId, previousThread.current))
    previousThread.current = threadId
  }, [threadId, userId])

  useEffect(() => {
    let current = true
    function load() {
      if (!userId) return
      void listMeetings(auth.transport)
        .then((result) => {
          if (current) setMeetings(result.meetings.filter((meeting) => meeting.status === 'ready'))
        })
        .catch(() => {
          if (current) setMeetings([])
        })
    }
    load()
    const unsubscribe = subscribeMeetings(() => {
      if (current) load()
    })
    return () => {
      current = false
      unsubscribe()
    }
  }, [auth.transport, userId])

  function toggle(meetingId: string) {
    if (!userId) return
    const next = selected[0] === meetingId ? [] : [meetingId]
    writeThreadMeetings(userId, threadId, next)
    setSelected(next)
  }

  const readyIds = new Set(meetings.map((meeting) => meeting.id))
  const count = selected.filter((id) => readyIds.has(id)).length

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          disabled={disabled}
          nativeButton
          render={
            <TooltipTrigger
              render={
                <button
                  aria-label="Расшифровки"
                  className={cn(dialogComposerToolClass(count > 0, disabled), 'h-8 gap-1 px-2')}
                  disabled={disabled}
                  type="button"
                />
              }
            />
          }
        >
          <FileTextIcon className="size-4" />
          {count > 0 ? <span className="text-[12px] tabular-nums">{count}</span> : null}
        </DropdownMenuTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Расшифровки
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className={composerPickerMenuClass} side="top" sideOffset={8}>
        {meetings.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-[var(--nora-text-secondary)]">Сначала расшифруйте встречу.</p>
        ) : (
          meetings.map((meeting) => (
            <DropdownMenuCheckboxItem
              key={meeting.id}
              checked={selected.includes(meeting.id)}
              className="overflow-hidden"
              closeOnClick={false}
              title={meeting.title}
              onCheckedChange={() => toggle(meeting.id)}
            >
              <span className="block min-w-0 flex-1 truncate">{meeting.title}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
