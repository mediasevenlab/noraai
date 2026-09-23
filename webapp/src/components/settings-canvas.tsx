import type { ReactNode } from 'react'
import { ArrowUpRightIcon } from 'lucide-react'

import { NoraBadge } from '@/components/nora/primitives'
import { cn } from '@/lib/utils'

/** Как дата под названием приёма. */
const settingsCaptionClass =
  'font-[family-name:var(--nora-font)] text-[12px] font-normal leading-5 text-[var(--nora-text-tertiary)]'

/** Как строка состава в окне приёма. */
const settingsBodyClass =
  'font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]'

/**
 * Поля и кнопки: на десктопе кегль 13px и высота 32px.
 * На узком экране поля 16px и 40px — iOS зумит фокус, если кегль меньше 16px.
 */
const settingsControlsClass = cn(
  'mt-4 rounded-[16px] bg-[var(--settings-substrate,var(--nora-inset))] px-3.5 py-3.5',
  '[&_form]:!gap-2.5',
  '[&_[data-slot=field-group]]:!mt-0',
  '[&_[data-slot=field-label]]:!mb-0.5 [&_[data-slot=field-label]]:!font-[family-name:var(--nora-font)] [&_[data-slot=field-label]]:!text-[13px] [&_[data-slot=field-label]]:!font-medium [&_[data-slot=field-label]]:!leading-5 [&_[data-slot=field-label]]:!text-[var(--nora-text)]',
  '[&_[data-slot=field-description]]:!mt-0 [&_[data-slot=field-description]]:!font-[family-name:var(--nora-font)] [&_[data-slot=field-description]]:!text-[12px] [&_[data-slot=field-description]]:!font-light [&_[data-slot=field-description]]:!leading-5 [&_[data-slot=field-description]]:!text-[var(--nora-text-tertiary)]',
  '[&_[data-slot=input]]:!h-10 [&_[data-slot=input]]:!min-h-10 [&_[data-slot=input]]:!bg-[var(--nora-panel)] [&_[data-slot=input]]:!px-3 [&_[data-slot=input]]:!text-[16px] [&_[data-slot=input]]:!font-normal [&_[data-slot=input]]:!leading-5',
  'lg:[&_[data-slot=input]]:!h-8 lg:[&_[data-slot=input]]:!min-h-8 lg:[&_[data-slot=input]]:!text-[13px]',
  '[&_[data-slot=select-trigger]]:!h-10 [&_[data-slot=select-trigger]]:!min-h-10 [&_[data-slot=select-trigger]]:!bg-[var(--nora-panel)] [&_[data-slot=select-trigger]]:!px-3 [&_[data-slot=select-trigger]]:!text-[16px] [&_[data-slot=select-trigger]]:!font-normal',
  'lg:[&_[data-slot=select-trigger]]:!h-8 lg:[&_[data-slot=select-trigger]]:!min-h-8 lg:[&_[data-slot=select-trigger]]:!text-[13px]',
  '[&_[data-settings-field]]:!h-10 [&_[data-settings-field]]:!min-h-10 [&_[data-settings-field]]:!bg-[var(--nora-panel)] [&_[data-settings-field]]:!text-[16px]',
  'lg:[&_[data-settings-field]]:!h-8 lg:[&_[data-settings-field]]:!min-h-8 lg:[&_[data-settings-field]]:!text-[13px]',
  '[&_button:not([data-choice-plaque])]:!h-10 [&_button:not([data-choice-plaque])]:!min-h-10 [&_button:not([data-choice-plaque])]:!px-3 [&_button:not([data-choice-plaque])]:!text-[13px] [&_button:not([data-choice-plaque])]:!font-normal',
  'lg:[&_button:not([data-choice-plaque])]:!h-8 lg:[&_button:not([data-choice-plaque])]:!min-h-8',
  '[&_button:not([data-choice-plaque])_span]:!text-[16px] [&_button:not([data-choice-plaque])_span]:!font-normal',
  'lg:[&_button:not([data-choice-plaque])_span]:!text-[13px]',
)

/** Раскладка страницы настроек в том же виде, что «Разработка». */
export function SettingsCanvas({
  actions,
  children,
  ctaLabel = 'Настройки',
  description,
  eyebrow,
  meta,
  panelsId = 'settings-panels',
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  ctaLabel?: string
  description: string
  eyebrow: string
  meta?: string
  panelsId?: string
  title: string
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-10 px-3 py-8 sm:px-6 md:px-10 md:py-12 lg:flex-row lg:gap-16 lg:px-12">
      <aside className="hidden w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:flex lg:w-[280px] lg:self-start">
        <div>
          <div className={cn('mb-1', settingsCaptionClass)}>{eyebrow}</div>
          <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-0.04em] text-foreground md:text-[48px]">
            {title}
          </h1>
          {meta ? <div className={cn('mt-2', settingsCaptionClass)}>{meta}</div> : null}
        </div>

        <p className={cn(settingsBodyClass, 'max-w-[32ch] leading-relaxed')}>{description}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {actions ? (
            <div className="hidden shrink-0 items-center gap-1.5 lg:flex lg:flex-nowrap">{actions}</div>
          ) : (
            <a
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
              href={`#${panelsId}`}
            >
              {ctaLabel}
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRightIcon className="size-3.5" />
              </span>
            </a>
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1" aria-label={title} id={panelsId}>
        <ul className="flex flex-col divide-y divide-border/70">
          {children}
        </ul>
        {actions ? <div aria-hidden className="h-16 lg:hidden" /> : null}
      </section>
      {actions ? (
        <div
          className="fixed z-40 flex flex-wrap-reverse items-center gap-2 lg:hidden left-4 right-[4.75rem] bottom-[max(1rem,var(--app-safe-bottom,env(safe-area-inset-bottom)))]"
          data-settings-dock=""
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}

/** Один раздел настроек — как запись в списке версий. */
export function SettingsEntry({
  badge,
  children,
  description,
  title,
}: {
  badge?: string
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <li className="w-full py-6 first:pt-0 lg:ml-auto lg:w-lg lg:max-w-full">
      <div className="flex items-center justify-between gap-x-4">
        <h2 className="min-w-0 font-heading text-[22px] leading-tight font-bold tracking-[-0.02em] text-foreground md:text-[24px]">
          {title}
        </h2>
        {badge ? <NoraBadge className="shrink-0" variant="blue">{badge}</NoraBadge> : null}
      </div>
      <p className={cn('mt-1 max-w-[54ch]', settingsBodyClass)}>{description}</p>
      <div className={settingsControlsClass}>{children}</div>
    </li>
  )
}
