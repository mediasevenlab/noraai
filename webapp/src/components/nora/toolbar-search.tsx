import * as React from 'react'
import { SearchIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const toolbarIconButtonClass =
  'nora-press-grow inline-flex size-9 shrink-0 items-center justify-center !rounded-full !border-0 !bg-transparent !shadow-none outline-none hover:text-[var(--nora-text)] disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-3.5 [&>svg]:!text-current'

const INPUT_CLASS =
  'min-w-0 flex-1 cursor-text border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[16px] font-normal leading-5 text-[var(--nora-text)] outline-none placeholder:font-light placeholder:text-[var(--nora-input-placeholder)] md:text-[13px] md:leading-none'

/**
 * Feed toolbar search: inactive icon until pressed, then the field opens.
 * Mobile shows a close control; desktop collapses with Escape or an empty icon tap.
 */
export function ProductToolbarSearch({
  disabled,
  expanded,
  value,
  onExpandedChange,
  onValueChange,
}: {
  disabled?: boolean
  expanded: boolean
  value: string
  onExpandedChange: (open: boolean) => void
  onValueChange: (value: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const active = expanded || Boolean(value)

  React.useEffect(() => {
    if (!expanded) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [expanded])

  function clearOrCollapse() {
    if (value) {
      onValueChange('')
      inputRef.current?.focus()
      return
    }
    onExpandedChange(false)
  }

  return (
    <div className={cn('flex h-9 items-center', expanded && 'min-w-0 flex-1')}>
      <button
        aria-expanded={expanded}
        aria-label="Поиск"
        className={cn(
          toolbarIconButtonClass,
          active
            ? 'text-[var(--nora-text)]'
            : 'text-[var(--nora-text-secondary)]',
        )}
        disabled={disabled}
        onClick={() => {
          if (!expanded) {
            onExpandedChange(true)
            return
          }
          if (!value) {
            onExpandedChange(false)
            return
          }
          inputRef.current?.focus()
        }}
        type="button"
      >
        <SearchIcon strokeWidth={1.75} />
      </button>
      {expanded ? (
        <div className="flex min-w-0 flex-1 items-center">
          <input
            aria-label="Поиск"
            className={INPUT_CLASS}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              if (value) onValueChange('')
              else onExpandedChange(false)
            }}
            placeholder="Поиск"
            ref={inputRef}
            value={value}
          />
          <button
            aria-label={value ? 'Очистить поиск' : 'Закрыть поиск'}
            className={cn(toolbarIconButtonClass, 'text-[var(--nora-text-secondary)] md:hidden')}
            disabled={disabled}
            onClick={clearOrCollapse}
            type="button"
          >
            <XIcon strokeWidth={1.75} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
