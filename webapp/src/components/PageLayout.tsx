import type { PropsWithChildren, ReactNode } from 'react'

import { NoraBadge } from '@/components/nora/primitives'
import { Typography } from '@/components/typography'

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-5 md:gap-6 md:p-8">
      {children}
    </div>
  )
}

export const noraPageTitleClass =
  'font-heading text-[22px] font-bold tracking-[-0.03em] text-[var(--nora-text)]'

const noraDisplayTitleClass =
  'font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--nora-text)]'

export const noraPageDescriptionClass =
  'max-w-[440px] text-[13px] font-light leading-relaxed text-[color-mix(in_srgb,var(--nora-text-secondary)_50%,var(--nora-text-tertiary)_50%)]'

/** Заголовок страницы. По умолчанию: title + badge (без «Nora»).
 *  Админ: `showBrand` + `titleSize="display"` — строка Nora/badge, затем крупный title. */
export function NoraPageHeader({
  actions,
  align = 'start',
  badge,
  description,
  showBrand = false,
  title,
  titleSize = 'brand',
}: {
  actions?: ReactNode
  align?: 'start' | 'center'
  badge: string
  description: string
  showBrand?: boolean
  title: string
  titleSize?: 'brand' | 'display'
}) {
  const centered = align === 'center'
  const titleClass =
    titleSize === 'display' ? noraDisplayTitleClass : noraPageTitleClass
  const rowClass = centered
    ? 'mb-1.5 flex items-center justify-center gap-2'
    : 'mb-1.5 flex items-center gap-2'

  return (
    <header className={centered ? 'flex flex-col items-center text-center' : undefined}>
      {showBrand ? (
        <>
          <div className={rowClass}>
            <span className={noraPageTitleClass}>Nora</span>
            <NoraBadge variant="blue">{badge}</NoraBadge>
          </div>
          <h1 className={titleClass}>{title}</h1>
        </>
      ) : (
        <div className={rowClass}>
          <h1 className={titleClass}>{title}</h1>
          <NoraBadge variant="blue">{badge}</NoraBadge>
        </div>
      )}
      <div
        className={
          centered
            ? 'mt-1.5 flex w-full flex-col items-center gap-2'
            : 'mt-1.5 flex items-start justify-between gap-3'
        }
      >
        <p
          className={
            centered
              ? noraPageDescriptionClass
              : `min-w-0 flex-1 ${noraPageDescriptionClass}`
          }
        >
          {description}
        </p>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export function PageHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode
  description: ReactNode
  title: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <Typography as="h1" variant="h2">
          {title}
        </Typography>
        <Typography
          as="div"
          className="max-w-2xl text-[13px] leading-relaxed font-normal"
          tone="muted"
          variant="bodySm"
        >
          {description}
        </Typography>
      </div>
      {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
    </div>
  )
}

function PageHeaderActions({ children }: PropsWithChildren) {
  return <div>{children}</div>
}
