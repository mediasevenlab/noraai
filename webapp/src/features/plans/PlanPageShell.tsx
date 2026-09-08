import type { ReactNode } from 'react'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { NoraBadge } from '@/components/nora/primitives'
import { productFeedPageClass } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

export function PlanPageShell({
  badge,
  children,
  description,
  showHeaderOnMobile = false,
  title,
}: {
  badge: string
  children: ReactNode
  description: string
  showHeaderOnMobile?: boolean
  title: string
}) {
  return (
    <div className="news-page relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 420px at 12% -10%, color-mix(in srgb, var(--nora-tint) var(--dash-glow-tint), transparent), transparent 60%),
            radial-gradient(700px 380px at 90% 0%, color-mix(in srgb, var(--nora-component) var(--dash-glow-component), transparent), transparent 55%),
            linear-gradient(180deg, var(--nora-canvas) 0%, var(--dash-atmosphere-mid) 48%, var(--nora-canvas) 100%)
          `,
        }}
      />
      <div className={productFeedPageClass}>
        <header className={showHeaderOnMobile ? undefined : 'hidden md:block'}>
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className={noraPageTitleClass}>{title}</h1>
            <NoraBadge variant="blue">{badge}</NoraBadge>
          </div>
          <p className={cn('mt-1.5 whitespace-pre-line', noraPageDescriptionClass)}>{description}</p>
        </header>
        {children}
      </div>
    </div>
  )
}
