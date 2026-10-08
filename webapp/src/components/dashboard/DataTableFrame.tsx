import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function DataTableFrame({
  children,
  description,
  nextDisabled,
  onNext,
  onPrevious,
  previousDisabled,
  controls,
  hideTopBand = false,
  leadingClassName,
  scrollHeader = false,
  summary,
  title,
  toolbar,
}: {
  children: ReactNode
  controls?: ReactNode
  description?: string
  /** The table draws its own title row on the same columns. */
  hideTopBand?: boolean
  /** Width of the title block. Matches the table's first column when the tools should start at column two. */
  leadingClassName?: string
  nextDisabled: boolean
  onNext: () => void
  onPrevious: () => void
  previousDisabled: boolean
  /** Title and tools stay on one line. What does not fit scrolls sideways. */
  scrollHeader?: boolean
  summary: string
  title: string
  toolbar?: ReactNode
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[12px] bg-[var(--nora-panel)]"
      data-catalog-frame=""
    >
      {hideTopBand ? null : (
      <div
        className={
          scrollHeader
            ? 'flex flex-nowrap items-center overflow-x-auto border-b border-[var(--nora-divider)] py-3.5 pr-3.5'
            : 'flex flex-col gap-3 border-b border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center sm:justify-between'
        }
        data-catalog-band="top"
      >
        <div className={scrollHeader ? cn('shrink-0 overflow-hidden pl-4 pr-3', leadingClassName) : 'min-w-0'}>
          <h2 className="truncate font-[family-name:var(--nora-font)] text-[13px] font-[550] leading-5 whitespace-nowrap text-[var(--nora-text)]">
            {title}
          </h2>
          {description ? (
            <p className="truncate font-[family-name:var(--nora-font)] text-[12px] font-[250] leading-5 whitespace-nowrap text-[var(--nora-text-tertiary)]">
              {description}
            </p>
          ) : null}
        </div>
        {toolbar ? (
          <div className={scrollHeader ? 'flex shrink-0 items-center gap-2' : 'flex flex-wrap items-center gap-2'}>{toolbar}</div>
        ) : null}
      </div>
      )}

      <div className="min-w-0">{children}</div>

      <div
        className={
          scrollHeader
            ? 'flex flex-nowrap items-center justify-between gap-3 overflow-x-auto border-t border-[var(--nora-divider)] px-4 py-3'
            : 'flex flex-col items-stretch justify-between gap-3 border-t border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center'
        }
        data-catalog-band="bottom"
      >
        <p className={cn('font-[family-name:var(--nora-font)] text-[12px] font-[250] leading-5 text-[var(--nora-text-tertiary)]', scrollHeader && 'shrink-0 whitespace-nowrap')}>
          {summary}
        </p>
        {controls ? (
          <div className={scrollHeader ? 'shrink-0' : undefined}>{controls}</div>
        ) : (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            className="!h-8 !min-h-8 min-w-[5.75rem] !rounded-full !bg-[var(--nora-panel)] !px-3.5 font-[family-name:var(--nora-font)] !text-[13px] !font-normal"
            disabled={previousDisabled}
            onClick={onPrevious}
            type="button"
            variant="outline"
          >
            Назад
          </Button>
          <Button
            className="!h-8 !min-h-8 min-w-[5.75rem] !rounded-full !bg-[var(--nora-panel)] !px-3.5 font-[family-name:var(--nora-font)] !text-[13px] !font-normal"
            disabled={nextDisabled}
            onClick={onNext}
            type="button"
            variant="outline"
          >
            Вперёд
          </Button>
        </div>
        )}
      </div>
    </div>
  )
}
