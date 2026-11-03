import { useSyncExternalStore } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { BookmarkIcon } from '@/components/icons'
import { ruRecordedAt } from '@/lib/ru-when'

import { notesFor, removeNote, subscribeNotes } from './store'

export function MobileNoteList({
  onOpen,
  to,
  userId,
}: {
  onOpen: () => void
  to: '/app/notes' | '/mentor/notes'
  userId: string
}) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const notes = useSyncExternalStore(subscribeNotes, () => notesFor(userId), () => notesFor(userId))

  return (
    <ul className="flex flex-col gap-1.5">
      {notes.length === 0 ? (
        <li className="px-1 py-6 text-center text-[13px] leading-5 text-[var(--nora-text-tertiary)]">
          Пока нет заметок. Отметьте сообщение в диалоге.
        </li>
      ) : notes.map((note) => {
        const preview = note.text.replace(/\s+/g, ' ').trim()
        const when = ruRecordedAt(note.savedAt)
        return (
          <li key={note.id} className="flex min-h-14 items-center gap-3 rounded-[14px] px-3 ios-glass-tile text-[var(--nora-text)]">
            <button
              type="button"
              onClick={() => {
                onOpen()
                if (pathname !== to) void navigate({ to })
              }}
              className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full ios-glass-glyph">
                <BookmarkIcon className="size-4 text-[var(--nora-text-secondary)]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{preview || 'Заметка'}</span>
                <span className="block truncate text-[12px] text-[var(--nora-text-tertiary)]">
                  {note.source}
                  {when ? ` · ${when}` : ''}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Убрать из заметок"
              onClick={() => removeNote(userId, note.id)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--nora-text-tertiary)]"
            >
              <BookmarkIcon className="size-3.5 fill-current" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
