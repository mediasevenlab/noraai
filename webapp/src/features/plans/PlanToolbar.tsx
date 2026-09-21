import * as React from 'react'
import { BookmarkIcon, GraduationCapIcon, UserIcon, UtensilsIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  productFeedToolbarRowClass,
  productToolbarSearchCollapseClass,
} from '@/components/nora/product-sheet'
import { ProductToolbarSearch } from '@/components/nora/toolbar-search'
import { cn } from '@/lib/utils'
import { isAssignedPlanId } from '@/platform/authored-plans'

import { isCatalogPlanId } from './plan-catalog'
import type { WeekPlan } from './week-plan'

const toolbarPillClass = 'ios-float-pill flex h-9 shrink-0 items-center'
export const planToolbarPillClass = toolbarPillClass

export type PlanLibrary = 'mine' | 'catalog' | 'mentor'

export const PLAN_TABS = ['Все', 'Избранное'] as const
export type PlanFeedTab = (typeof PLAN_TABS)[number]

export const PLAN_PILL_TAB_CLASS =
  'ios-float-seg nora-press-grow inline-flex h-full flex-none items-center justify-center rounded-full px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)]'

const PLAN_GROUP_PLAQUE_CLASS =
  'ios-glass-glare inline-flex h-7 min-h-7 max-h-7 w-fit shrink-0 items-center gap-1 rounded-full border-0 py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none backdrop-blur-[16px]'

const PLAN_GROUP_PLAQUE_TONE = {
  mine: 'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]',
  mentor: 'bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]',
} as const

export function PlanGroupPlaque({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon
  label: string
  tone: keyof typeof PLAN_GROUP_PLAQUE_TONE
}) {
  return (
    <div className={cn(PLAN_GROUP_PLAQUE_CLASS, PLAN_GROUP_PLAQUE_TONE[tone])}>
      <Icon aria-hidden className="size-[13px]" strokeWidth={1.75} />
      {label}
    </div>
  )
}

export function PlanGroupHeading({
  count,
  icon,
  label,
  tone,
}: {
  count: number
  icon: LucideIcon
  label: string
  tone: keyof typeof PLAN_GROUP_PLAQUE_TONE
}) {
  return (
    <div className="flex items-center justify-between gap-2" data-plan-group-heading="">
      <PlanGroupPlaque icon={icon} label={label} tone={tone} />
      <PlanGroupPlaque icon={UtensilsIcon} label={String(count)} tone={tone} />
    </div>
  )
}

export function partitionPlanCards(plans: readonly WeekPlan[]): {
  mine: WeekPlan[]
  mentor: WeekPlan[]
} {
  const mine: WeekPlan[] = []
  const mentor: WeekPlan[] = []
  for (const plan of plans) {
    if (isAssignedPlanId(plan.id)) mentor.push(plan)
    else mine.push(plan)
  }
  return { mine, mentor }
}

export const PLAN_GROUP_ICONS = {
  mine: UserIcon,
  mentor: GraduationCapIcon,
} as const

export function visiblePlanCards(
  plans: readonly WeekPlan[],
  query: string,
  savedIds: ReadonlySet<string> = new Set(),
  tab: PlanFeedTab = 'Все',
  library?: PlanLibrary,
): WeekPlan[] {
  const needle = query.trim().toLowerCase()
  return plans.filter((plan) => {
    if (tab === 'Избранное' && !savedIds.has(plan.id)) return false
    const catalog = isCatalogPlanId(plan.id)
    if (library === 'catalog') {
      if (!catalog) return false
    } else if (library === 'mine' || library === 'mentor') {
      if (catalog) return false
    }
    if (!needle) return true
    return plan.title.toLowerCase().includes(needle)
  })
}

export function PlanToolbar({
  canCreate = true,
  query,
  searchOpen,
  tab,
  toolbarStart,
  onCreate,
  onQueryChange,
  onSearchOpenChange,
  onTabChange,
}: {
  canCreate?: boolean
  query: string
  searchOpen: boolean
  tab: PlanFeedTab
  toolbarStart?: React.ReactNode
  onCreate: () => void
  onQueryChange: (query: string) => void
  onSearchOpenChange: (open: boolean) => void
  onTabChange: (tab: PlanFeedTab) => void
}) {
  return (
    <section className="flex flex-col">
      <div className="flex w-full min-w-0 items-center pt-1">
        <div className={productFeedToolbarRowClass}>
          {toolbarStart}
          <button
            aria-pressed={tab === 'Избранное'}
            className={cn(
              toolbarPillClass,
              'nora-press-grow shrink-0 gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)] [&>svg]:size-3.5',
            )}
            data-active={tab === 'Избранное' || undefined}
            onClick={() => onTabChange(tab === 'Избранное' ? 'Все' : 'Избранное')}
            type="button"
          >
            <BookmarkIcon
              aria-hidden
              className={cn(tab === 'Избранное' && 'fill-current')}
              strokeWidth={1.75}
            />
            Избранное
          </button>
          <div className={cn('ml-auto flex min-w-0 items-center gap-2', searchOpen && 'max-md:flex-1')}>
            <div
              className={cn(
                toolbarPillClass,
                searchOpen
                  ? 'min-w-0 max-md:flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0'
                  : 'px-1',
              )}
              data-plans-search=""
              data-search-open={searchOpen ? '' : undefined}
            >
              <ProductToolbarSearch
                expanded={searchOpen}
                onExpandedChange={onSearchOpenChange}
                onValueChange={onQueryChange}
                value={query}
              />
            </div>
          </div>
          {canCreate ? (
            <button
              aria-label="Создать рацион"
              className={cn(
                toolbarPillClass,
                'nora-press-grow inline-flex shrink-0 flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-3.5',
                'max-md:hidden max-sm:size-9 max-sm:px-0',
                searchOpen && productToolbarSearchCollapseClass,
              )}
              onClick={onCreate}
              type="button"
            >
              <UtensilsIcon aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">Создать рацион</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
