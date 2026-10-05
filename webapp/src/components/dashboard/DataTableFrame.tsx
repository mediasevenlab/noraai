import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function DataTableFrame({
  children,
  description,
  nextDisabled,
  onNext,
  onPrevious,
  previousDisabled,
  controls,
  summary,
  title,
  toolbar,
}: {
  children: ReactNode
  controls?: ReactNode
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
    <div
      className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] border border-[var(--nora-divider)] bg-[var(--dash-card-bg,var(--nora-panel))]"
      data-catalog-frame=""
    >
      <div
        className="flex flex-col gap-3 border-b border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center sm:justify-between"
        data-catalog-band="top"
      >
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--nora-font)] text-[13px] font-[550] leading-5 text-[var(--nora-text)]">
            {title}
          </h2>
          {description ? (
            <p className="font-[family-name:var(--nora-font)] text-[12px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
              {description}
            </p>
          ) : null}
        </div>
        {toolbar ? (
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>

      <div
        className="flex flex-col items-stretch justify-between gap-3 border-t border-[var(--nora-divider)] p-3.5 sm:flex-row sm:items-center"
        data-catalog-band="bottom"
      >
        <p className="font-[family-name:var(--nora-font)] text-[12px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
          {summary}
        </p>
        {controls ?? (
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
