import { FileTypeIcon, fileTypeInfo } from '@/components/file-type-icon'
import { XIcon } from '@/components/icons'

import { cn } from '@/lib/utils'

import { DIALOG_ATTACH_REMOVE_CLASS } from './field'

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
  const info = fileTypeInfo(name)
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5',
        placement === 'composer'
          ? 'relative max-w-64 border border-[var(--nora-border)] bg-[var(--nora-surface)] pr-7'
          : 'mb-2 max-w-full bg-black/10',
      )}
    >
      <FileTypeIcon name={name} />
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
          {info.hint}
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
