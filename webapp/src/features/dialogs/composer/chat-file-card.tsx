import { XIcon } from '@/components/icons'

import { cn } from '@/lib/utils'

import { DIALOG_ATTACH_REMOVE_CLASS } from './field'

export function chatFileBadge(name: string) {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
  if (extension === 'pdf') return { mark: 'PDF', hint: 'Документ PDF', tone: 'bg-[#d64545] text-white' }
  if (extension === 'xlsx' || extension === 'xlsm' || extension === 'xls') {
    return { mark: 'XLS', hint: 'Таблица Excel', tone: 'bg-[#1f7a4d] text-white' }
  }
  if (extension === 'csv') return { mark: 'CSV', hint: 'Таблица CSV', tone: 'bg-[#1f7a4d] text-white' }
  if (extension === 'docx' || extension === 'doc') return { mark: 'DOC', hint: 'Документ Word', tone: 'bg-[#2b579a] text-white' }
  return { mark: 'TXT', hint: 'Текстовый файл', tone: 'bg-[#5c6570] text-white' }
}

export function ChatFileCard({
  name,
  onRemove,
  disabled,
  placement,
}: {
  name: string
  onRemove?: () => void
  disabled?: boolean
  placement: 'composer' | 'bubble'
}) {
  const badge = chatFileBadge(name)
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2',
        placement === 'composer'
          ? 'relative h-14 max-w-64 border border-[var(--nora-border)] bg-[var(--nora-surface)] pr-7'
          : 'mb-2 max-w-full bg-black/10',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold tracking-[0.04em]',
          badge.tone,
        )}
      >
        {badge.mark}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13px] leading-5 font-medium',
            placement === 'composer' ? 'text-[var(--nora-text)]' : 'text-inherit',
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            'block truncate text-[11px] leading-4',
            placement === 'composer' ? 'text-[var(--nora-text-secondary)]' : 'opacity-70',
          )}
        >
          {badge.hint}
        </span>
      </span>
      {onRemove ? (
        <button
          aria-label="Удалить файл"
          className={DIALOG_ATTACH_REMOVE_CLASS}
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          <XIcon className="size-3" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  )
}
