import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { STACK_ITEMS, STACK_META } from './model'

export function StackPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-10 px-6 py-8 md:px-10 md:py-12 lg:flex-row lg:gap-16">
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-[280px] lg:self-start">
        <div>
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {STACK_META.eyebrow}
          </div>
          <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-0.04em] text-foreground md:text-[48px]">
            {STACK_META.title}
          </h1>
          <div className="mt-2 text-[13px] font-medium text-muted-foreground">
            {STACK_META.subtitle}
          </div>
        </div>

        <p className="max-w-[32ch] text-[13px] leading-relaxed text-muted-foreground">
          {STACK_META.description}
        </p>

        <div className="text-[12px] text-muted-foreground">
          {STACK_META.itemCount} технологий в каталоге
        </div>

        <Link
          to="/admin/ds/$pageId"
          params={{ pageId: 'overview' }}
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
        >
          {STACK_META.ctaLabel}
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRightIcon className="size-3.5" />
          </span>
        </Link>
      </aside>

      <section className="min-w-0 flex-1" aria-label="Список технологий">
        <ul className="flex flex-col divide-y divide-border/70">
          {STACK_ITEMS.map((item) => (
            <li key={`${item.category}-${item.title}`} className="py-6 first:pt-0">
              <div className="text-[12px] font-semibold text-foreground">
                {item.category}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 className="font-heading text-[22px] leading-tight font-bold tracking-[-0.02em] text-foreground md:text-[24px]">
                  {item.title}
                </h2>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {item.badge}
                </span>
              </div>
              <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
