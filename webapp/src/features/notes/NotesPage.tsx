import { useSyncExternalStore } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { BookmarkIcon } from '@/components/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth'
import { ruRecordedAt } from '@/lib/ru-when'
import { cn } from '@/lib/utils'

import { notesFor, removeNote, subscribeNotes, type SavedNote } from './store'

const TEXT_CLASS = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'
const USER_BUBBLE =
  'rounded-tl-[20px] rounded-tr-[20px] rounded-br-[6px] rounded-bl-[20px] bg-[#242424] px-3.5 py-2 text-white dark:bg-[#f3f3f3] dark:text-[#171717]'

export function NotesPage() {
  const userId = useAuth().user?.id ?? ''
  const notes = useSyncExternalStore(subscribeNotes, () => notesFor(userId), () => notesFor(userId))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {notes.length === 0 ? (
            <p className={cn('m-auto max-w-sm text-center text-[var(--nora-text-secondary)]', TEXT_CLASS)}>
              Пока нет заметок. Отметьте сообщение в диалоге.
            </p>
          ) : (
            notes.map((note) => (
              <NoteCard key={note.id} note={note} onRemove={() => removeNote(userId, note.id)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function NoteCard({ note, onRemove }: { note: SavedNote; onRemove: () => void }) {
  const mine = note.role === 'user'
  const when = ruRecordedAt(note.savedAt)
  return (
    <article className="flex w-full flex-col">
      <p className="mb-2 w-full text-center text-[12px] leading-4 text-[var(--nora-text-secondary)]">
        {mine ? 'Ваше сообщение' : 'Ответ Nora'}
        {' · '}
        {note.source}
        {when ? ` · ${when}` : ''}
      </p>
      <div className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}>
        <div className={cn('flex min-w-0 flex-col', mine ? 'max-w-[min(100%,40rem)] items-end' : 'w-full max-w-3xl')}>
          <div className={cn('min-w-0 text-[var(--nora-text)]', TEXT_CLASS, mine ? USER_BUBBLE : 'w-full')}>
            {mine ? (
              <p className="whitespace-pre-wrap">{note.text}</p>
            ) : (
              <div className="dialog-markdown [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-medium">
                <Markdown remarkPlugins={[remarkGfm]}>{note.text}</Markdown>
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center">
            <Tooltip>
              <TooltipTrigger
                render={(
                  <button
                    aria-label="Убрать из заметок"
                    aria-pressed
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--nora-text)] transition-colors hover:bg-[var(--nora-input-bg)]"
                    onClick={onRemove}
                    type="button"
                  >
                    <BookmarkIcon className="size-3.5 fill-current" />
                  </button>
                )}
              />
              <TooltipContent side="top" sideOffset={8}>
                Убрать из заметок
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </article>
  )
}
