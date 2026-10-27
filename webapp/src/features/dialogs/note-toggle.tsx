import { useAuiState } from '@assistant-ui/react'
import { useSyncExternalStore } from 'react'

import { BookmarkIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth'
import { noteIsSaved, noteMessageId, subscribeNotes, toggleNote } from '@/features/notes'

import { ComposerToolTip } from './composer/tool-tip'

const NOTE_BUTTON_CLASS =
  'group inline-flex size-7 items-center justify-center rounded-md text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)] disabled:pointer-events-none disabled:opacity-40'

function messagePlainText(content: readonly { readonly type: string }[]) {
  return content
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export function DialogNoteToggle() {
  const userId = useAuth().user?.id ?? ''
  const messageId = useAuiState((state) => state.message.id)
  const role = useAuiState((state) => (state.message.role === 'assistant' ? 'assistant' : 'user'))
  const text = useAuiState((state) => messagePlainText(state.message.content))
  const source = useAuiState((state) => {
    const current = state.threads.threadItems.find((item) => item.id === state.threads.mainThreadId)
    return current?.title?.trim() || 'Диалог'
  })
  const storedId = noteMessageId(messageId || '', role, text)
  const saved = useSyncExternalStore(
    subscribeNotes,
    () => noteIsSaved(userId, storedId, text),
    () => false,
  )
  const label = saved ? 'Убрать из заметок' : 'В заметки'

  return (
    <ComposerToolTip label={label}>
      <button
        aria-label={label}
        aria-pressed={saved}
        className={NOTE_BUTTON_CLASS}
        disabled={!userId || !text || !storedId}
        onClick={() => {
          const result = toggleNote(userId, { id: storedId, role, text, source })
          if (result === 'rejected') toast.error('Не удалось сохранить заметку')
        }}
        type="button"
      >
        <BookmarkIcon className={cn('size-3.5', saved && 'fill-current text-[var(--nora-text)]')} />
      </button>
    </ComposerToolTip>
  )
}
