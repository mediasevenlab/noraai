import * as React from 'react'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { productFeedPageClass, productFeedToolbarRowClass, productToolbarCapsuleSelectClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import { NoraBadge, NoraSelect } from '@/components/nora/primitives'
import { ProductToolbarSearch } from '@/components/nora/toolbar-search'
import { cn } from '@/lib/utils'

import {
  diaryToolbarChipClass,
  diaryToolbarPillClass,
} from '../DiaryPeriodPicker'
import {
  FEED_GOALS,
  FEED_TABS,
  type FeedGoal,
  type SharedMealsFeedTab,
} from '../feed-filters'
import { SharedMealsFeed } from '../SharedMealsFeed'

const FEED_GOAL_FILTERS = [
  { value: 'all', label: 'Все цели' },
  ...FEED_GOALS.map((goal) => ({ value: goal, label: goal })),
]
const FEED_PILL_TAB_CLASS =
  'ios-float-seg nora-press-grow inline-flex h-full flex-none items-center justify-center rounded-full px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)]'
const COMPACT_SELECT_CONTENT_CLASS = productToolbarSelectContentClass
const COMPACT_SELECT_ITEM_CLASS = productToolbarSelectItemClass

function isFeedGoal(value: string): value is FeedGoal {
  return (FEED_GOALS as readonly string[]).includes(value)
}

export function SharedMealsFeedPage() {
  const [query, setQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [tab, setTab] = React.useState<SharedMealsFeedTab>('Все')
  const [goal, setGoal] = React.useState<FeedGoal | null>(null)

  React.useEffect(() => {
    if (!searchOpen) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-feed-search]')) return
      if (query.trim()) return
      setSearchOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [query, searchOpen])

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
        <header className="hidden md:block">
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className={noraPageTitleClass}>Лента</h1>
            <NoraBadge variant="blue">Лента</NoraBadge>
          </div>
          <p className={cn('mt-1.5', noraPageDescriptionClass)}>
            Приёмы, которыми поделились пользователи: состав, КБЖУ и лайки.
          </p>
        </header>
        <div className="flex flex-col gap-5">
          <section className="flex flex-col">
            <div className="flex w-full min-w-0 items-center pt-1">
              <div className={productFeedToolbarRowClass}>
                <div
                  aria-label="Лента"
                  className={cn(
                    diaryToolbarPillClass,
                    'p-1',
                    searchOpen &&
                      'max-md:pointer-events-none max-md:max-w-0 max-md:overflow-hidden max-md:opacity-0',
                  )}
                  role="group"
                >
                  {FEED_TABS.map((option) => (
                    <button
                      aria-pressed={tab === option}
                      className={FEED_PILL_TAB_CLASS}
                      data-active={tab === option || undefined}
                      key={option}
                      onClick={() => setTab(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    'flex h-9 max-h-9 items-center transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    searchOpen
                      ? 'max-md:pointer-events-none max-md:max-w-0 max-md:overflow-hidden max-md:opacity-0 max-w-[12rem] overflow-visible'
                      : 'max-w-[12rem] overflow-visible',
                  )}
                >
                  <div className={cn(diaryToolbarPillClass, 'h-9 max-h-9')}>
                    <NoraSelect
                      chevron="circle"
                      className={cn(productToolbarCapsuleSelectClass, diaryToolbarChipClass)}
                      contentClassName={COMPACT_SELECT_CONTENT_CLASS}
                      itemClassName={COMPACT_SELECT_ITEM_CLASS}
                      itemIndicator="end"
                      items={[...FEED_GOAL_FILTERS]}
                      onValueChange={(value) => {
                        if (value == null || value === 'all') {
                          setGoal(null)
                          return
                        }
                        if (isFeedGoal(value)) setGoal(value)
                      }}
                      value={goal ?? 'all'}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    diaryToolbarPillClass,
                    searchOpen
                      ? 'ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0'
                      : 'ml-auto px-1',
                  )}
                  data-feed-search=""
                  data-search-open={searchOpen ? '' : undefined}
                >
                  <ProductToolbarSearch
                    expanded={searchOpen}
                    onExpandedChange={setSearchOpen}
                    onValueChange={setQuery}
                    value={query}
                  />
                </div>
              </div>
            </div>
          </section>
          <SharedMealsFeed goal={goal} origin="feed" query={query} tab={tab} />
        </div>
      </div>
    </div>
  )
}
