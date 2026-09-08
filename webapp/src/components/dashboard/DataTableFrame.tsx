import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function DataTableFrame({
  children,
  description,
  nextDisabled,
  onNext,
  onPrevious,
  previousDisabled,
  summary,
  title,
  toolbar,
}: {
  children: ReactNode
  description?: string
  nextDisabled: boolean
  onNext: () => void
  onPrevious: () => void
  previousDisabled: boolean
  summary: string
  title: string
  toolbar?: ReactNode
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="flex flex-col gap-3 border-b border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
            {title}
          </h2>
          {description ? (
            <p className="text-[11px] text-[var(--nora-text-tertiary)]">
              {description}
            </p>
          ) : null}
        </div>
        {toolbar ? (
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>

      <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center">
        <p className="text-[11px] text-[var(--nora-text-tertiary)]">{summary}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            className="min-w-[5.75rem] font-normal"
            disabled={previousDisabled}
            onClick={onPrevious}
            type="button"
            variant="outline"
          >
            Назад
          </Button>
          <Button
            className="min-w-[5.75rem] font-normal"
            disabled={nextDisabled}
            onClick={onNext}
            type="button"
            variant="outline"
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  )
}
