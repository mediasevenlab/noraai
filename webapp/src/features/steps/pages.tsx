import { ArrowUpRightIcon, GitBranchIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { STEP_ITEMS, STEPS_META } from './model'

export function StepsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-10 px-6 py-8 md:px-10 md:py-12 lg:flex-row lg:gap-16">
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-[280px] lg:self-start">
        <div>
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {STEPS_META.eyebrow}
          </div>
          <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-0.04em] text-foreground md:text-[48px]">
            {STEPS_META.title}
          </h1>
          <div className="mt-2 text-[13px] font-medium text-muted-foreground">
            {STEPS_META.subtitle} · сейчас {STEPS_META.currentVersion}
          </div>
        </div>

        <p className="max-w-[32ch] text-[13px] leading-relaxed text-muted-foreground">
          {STEPS_META.description}
        </p>

        <div className="text-[12px] text-muted-foreground">
          {STEPS_META.historyLabel}
        </div>

        <Link
          to="/admin/stack"
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
        >
          {STEPS_META.ctaLabel}
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRightIcon className="size-3.5" />
          </span>
        </Link>
      </aside>

      <section className="min-w-0 flex-1" aria-label="Шаги разработки">
        <ul className="flex flex-col divide-y divide-border/70">
          {STEP_ITEMS.map((item, index) => {
            const isCurrent = index === STEP_ITEMS.length - 1
            return (
              <li key={`${item.badge}-${item.title}`} className="py-6 first:pt-0">
                <div className="text-[12px] font-semibold text-foreground">
                  {item.category}
                  {isCurrent ? (
                    <span className="ml-2 font-medium text-primary">текущая</span>
                  ) : null}
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
                {item.href ? (
                  <a
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                    href={item.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <GitBranchIcon className="size-3.5" />
                    github.com/di-sukharev/vibe
                    <ArrowUpRightIcon className="size-3.5" />
                  </a>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
