import * as React from 'react'
import { CalendarDaysIcon, LayoutGridIcon, Rows2Icon, HeartIcon, UtensilsIcon } from '@/components/icons'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { productFeedPageClass, productFeedToolbarRowClass, productToolbarSearchCollapseClass } from '@/components/nora/product-sheet'
import { ProductToolbarSearch } from '@/components/nora/toolbar-search'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import {
  diaryToolbarIconButtonClass,
  diaryToolbarPairDividerClass,
  diaryToolbarPillClass,
  DiaryPeriodPicker,
  type DiaryPeriodFilter,
} from '../DiaryPeriodPicker'
import {
  readFeedCardLayout,
  writeFeedCardLayout,
  type FeedCardLayout,
} from '../feed-card-layout'
import {
  FEED_KINDS,
  type FeedKind,
} from '../feed-filters'
import { SharedMealsFeed } from '../SharedMealsFeed'
import { SharedRationsFeed } from '../SharedRationsFeed'

const FEED_PILL_TAB_CLASS =
  'ios-float-seg nora-press-grow inline-flex h-full flex-none items-center justify-center gap-1 rounded-full px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)]'

const FEED_KIND_ICON = {
  Приёмы: UtensilsIcon,
  Рационы: CalendarDaysIcon,
} as const

export function SharedMealsFeedPage({
  onOpenRation,
}: {
  onOpenRation: (rationId: string) => void
}) {
  const auth = useAuth()
  const [query, setQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [kind, setKind] = React.useState<FeedKind>('Приёмы')
  const [likedOnly, setLikedOnly] = React.useState(false)
  const [period, setPeriod] = React.useState<DiaryPeriodFilter | null>(null)
  const [cardLayout, setCardLayout] = React.useState<FeedCardLayout>(readFeedCardLayout)
  const periodStart = auth.user?.createdAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 180)

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
          </div>
          <p className={cn('mt-1.5', noraPageDescriptionClass)}>
            Приёмы и рационы, которыми поделились пользователи: состав, КБЖУ и лайки.
          </p>
        </header>
        <div className="flex flex-col gap-5 max-md:mb-2.5">
          <section className="flex flex-col">
            <div className="flex w-full min-w-0 items-center pt-1">
              <div className={productFeedToolbarRowClass}>
                <div
                  aria-label="Лента"
                  className={cn(diaryToolbarPillClass, 'p-1')}
                  role="group"
                >
                  {FEED_KINDS.map((option) => {
                    const Icon = FEED_KIND_ICON[option]
                    return (
                      <button
                        aria-pressed={kind === option}
                        className={FEED_PILL_TAB_CLASS}
                        data-active={kind === option || undefined}
                        key={option}
                        onClick={() => setKind(option)}
                        type="button"
                      >
                        <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                        {option}
                      </button>
                    )
                  })}
                </div>
                <button
                  aria-pressed={likedOnly}
                  className={cn(
                    diaryToolbarPillClass,
                    'nora-press-grow shrink-0 gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)] [&>svg]:size-3.5',
                    searchOpen && productToolbarSearchCollapseClass,
                  )}
                  data-active={likedOnly || undefined}
                  onClick={() => setLikedOnly((current) => !current)}
                  type="button"
                >
                  <HeartIcon
                    aria-hidden
                    className={cn(likedOnly && 'fill-current')}
                    strokeWidth={1.75}
                  />
                  Лайки
                </button>
                <div
                  className={cn(
                    'ml-auto flex min-w-0 items-center gap-2',
                    searchOpen && 'max-md:min-w-0 max-md:flex-1',
                  )}
                >
                  <div
                    className={cn(
                      diaryToolbarPillClass,
                      searchOpen
                        ? 'min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0'
                        : 'px-1',
                    )}
                    data-feed-search=""
                    data-search-open={searchOpen ? '' : undefined}
                  >
                    <div
                      className={cn(
                        'overflow-hidden transition-[width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                        searchOpen
                          ? 'max-md:w-0 max-md:opacity-0 w-9'
                          : 'w-9',
                      )}
                    >
                      <DiaryPeriodPicker
                        disabled={searchOpen}
                        onFilterChange={setPeriod}
                        periodStart={periodStart}
                        subjectKey="feed"
                      />
                    </div>
                    <span
                      aria-hidden
                      className={cn(
                        diaryToolbarPairDividerClass,
                        searchOpen && 'max-md:hidden',
                      )}
                    />
                    <ProductToolbarSearch
                      expanded={searchOpen}
                      onExpandedChange={setSearchOpen}
                      onValueChange={setQuery}
                      value={query}
                    />
                  </div>
                </div>
                <div className={cn(diaryToolbarPillClass, 'size-9 justify-center p-0 md:hidden')}>
                  <button
                    aria-label={
                      cardLayout === 'list'
                        ? 'Показать карточки сеткой'
                        : 'Показать карточки списком'
                    }
                    aria-pressed={cardLayout === 'list'}
                    className={cn(
                      diaryToolbarIconButtonClass,
                      cardLayout === 'list' && 'text-[var(--nora-text)]',
                    )}
                    data-feed-card-layout=""
                    onClick={() => {
                      const next = cardLayout === 'list' ? 'grid' : 'list'
                      setCardLayout(next)
                      writeFeedCardLayout(next)
                    }}
                    type="button"
                  >
                    {cardLayout === 'list' ? (
                      <LayoutGridIcon aria-hidden strokeWidth={1.75} />
                    ) : (
                      <Rows2Icon aria-hidden strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
          {kind === 'Рационы' ? (
            <SharedRationsFeed
              layout={cardLayout}
              likedOnly={likedOnly}
              onOpenRation={onOpenRation}
              origin="feed"
              period={period}
              query={query}
            />
          ) : (
            <SharedMealsFeed
              layout={cardLayout}
              likedOnly={likedOnly}
              origin="feed"
              period={period}
              query={query}
            />
          )}
        </div>
      </div>
    </div>
  )
}
