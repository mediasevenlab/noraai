import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  formatDailyCalorieChip,
  formatDailyCalories,
  groupMealsByDay,
  rationsCountLabel,
} from '../src/features/diary/diary-feed'
import type { MealEntry } from '../src/features/diary/meals-catalog'
import {
  periodPickerActions,
  visibleMonthsForBounds,
} from '../src/features/diary/DiaryPeriodPicker'

function readJoined(paths: readonly string[]) {
  return paths
    .map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
    .join('\n')
}

/** Collapse JSX/source wrapping so chrome tests do not depend on Prettier line breaks. */
function oneLine(source: string) {
  return source.replace(/\s+/g, ' ')
}

const news = readJoined([
  '../src/components/nora/product-sheet.tsx',
  '../src/features/diary/pages/news.tsx',
  '../src/features/diary/diary-feed.ts',
  '../src/features/diary/composer-ui.tsx',
  '../src/features/diary/meal-sheet.tsx',
  '../src/features/diary/MealOpenDetail.tsx',
  '../src/features/diary/MealAddDraftDialog.tsx',
  '../src/features/diary/MealCard.tsx',
])

test('calorie chip shows the same kcal unit as the menu', () => {
  expect(formatDailyCalorieChip(2200)).toBe(formatDailyCalories(2200))
  expect(formatDailyCalorieChip(2200)).toMatch(/ккал$/)
})

test('a diary day lists meals copied from a ration in ration order', () => {
  const at = (day: number, hours: number, minutes: number) =>
    new Date(2026, 9, day, hours, minutes).toISOString()
  const meal = (id: string, stamp: string) => ({ id, at: stamp }) as MealEntry
  const groups = groupMealsByDay([
    meal('shawarma', at(17, 19, 30)),
    meal('waffle', at(17, 16, 30)),
    meal('buckwheat', at(17, 13, 0)),
    meal('eggs', at(17, 8, 30)),
    meal('sunday', at(18, 8, 30)),
  ])
  expect(groups.map((group) => group.dayKey)).toEqual(['2026-10-18', '2026-10-17'])
  expect(groups[1]!.meals.map((item) => item.id)).toEqual([
    'eggs',
    'buckwheat',
    'waffle',
    'shawarma',
  ])
})

test('ration count in the plan picker uses the Russian plural', () => {
  expect(rationsCountLabel(0)).toBe('0 рационов')
  expect(rationsCountLabel(1)).toBe('1 рацион')
  expect(rationsCountLabel(2)).toBe('2 рациона')
  expect(rationsCountLabel(4)).toBe('4 рациона')
  expect(rationsCountLabel(5)).toBe('5 рационов')
  expect(rationsCountLabel(11)).toBe('11 рационов')
  expect(rationsCountLabel(21)).toBe('21 рацион')
  expect(rationsCountLabel(22)).toBe('22 рациона')
})

test('meal dialog hero is a fifth taller than the 240px default', () => {
  expect(news).toContain('h-[min(52.8vw,288px)]')
  expect(news).toContain('sm:h-[322px]')
  expect(news).not.toContain('h-[min(47.6vw,259px)]')
  expect(news).not.toContain('max-h-[min(41.4vw,225px)]')
  expect(news).not.toContain('max-h-[min(36vw,196px)]')
  expect(news).not.toContain('sm:h-[252px]')
  const addHero = readFileSync(
    new URL('../src/features/diary/meal-add-hero-preview.tsx', import.meta.url),
    'utf8',
  )
  expect(addHero).toContain('dotsOffset="raised"')
  expect(addHero).toContain('absolute inset-0 size-full object-cover')
  expect(addHero).not.toContain('data-meal-add-cover-stub=""')
  expect(addHero).not.toContain('p-2.5 sm:p-3')
  expect(news).toContain('bottom-[3.4rem]')
  expect(news).toContain('flex flex-wrap py-1')
})

test('meal dialog hero can double height from a preview toggle', () => {
  expect(news).toContain('Увеличить превью')
  expect(news).toContain('Уменьшить превью')
  expect(news).toContain('group-data-[hero-expanded]/preview:h-[min(88vw,480px)]')
  expect(news).toContain('sm:group-data-[hero-expanded]/preview:h-[322px]')
  expect(news).toContain('bg-[var(--nora-panel)]/72')
  expect(news).toContain('backdrop-blur-[16px]')
  expect(news).toContain('bottom-3.5 right-3.5')
  expect(news).toContain('sm:hidden')
  expect(news).not.toContain('bottom-3.5 right-4')
})

test('calendar and search sit on the right of the diary toolbar', () => {
  expect(news).toContain(
    'ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0',
  )
  expect(news).toContain('ml-auto px-1')
  expect(news).not.toContain('ml-auto px-1 md:w-[16rem] md:shrink-0')
  expect(news).toContain('flex w-full min-w-0 items-center pt-1')
  expect(news).not.toContain('overflow-x-auto py-2.5 no-scrollbar')
})

test('diary toolbar has no calorie goal dropdown', () => {
  const page = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  const toolbar = page.slice(
    page.indexOf('diary-toolbar-press flex min-w-0 flex-1 items-center gap-2'),
    page.indexOf('{toolbarEnd ?'),
  )
  expect(toolbar).not.toContain('NoraSelect')
  expect(toolbar).not.toContain('DAILY_CALORIE_OPTIONS')
  expect(toolbar).not.toContain('formatDailyCalorieChip')
  expect(toolbar).not.toContain('data-diary-calorie-chip')
  expect(toolbar).not.toContain('setDailyCalories')
  expect(page).toContain('questionnaireDailyCalorieTarget(')
  expect(page).toContain('useQuestionnaireQuery(isOwnAccount)')
  const stats = page.slice(
    page.indexOf('function FeedDayStats('),
    page.indexOf('export function NewsPage('),
  )
  expect(stats.indexOf('FlameIcon')).toBeLessThan(stats.indexOf('ZapIcon'))
  expect(stats.indexOf('Список покупок')).toBeLessThan(stats.indexOf('FlameIcon'))
  expect(stats).toContain('Б:')
  expect(stats).toContain('Ж:')
  expect(stats).toContain('У:')
})

test('diary toolbar can show the whole selected plan', () => {
  const page = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  const toolbar = page.slice(
    page.indexOf('diary-toolbar-press flex min-w-0 flex-1 items-center gap-2'),
    page.indexOf('{toolbarEnd ?'),
  )
  expect(toolbar).toContain('selectedPlanIds.size > 0')
  expect(toolbar).toContain('data-diary-whole-plan=""')
  expect(toolbar).toContain('План')
  expect(toolbar).not.toContain('Весь план')
  expect(toolbar).toContain('disabled={tab === "Избранное"}')
  expect(toolbar).not.toContain('tab !== "Избранное" && selectedPlanIds.size > 0')
  expect(toolbar).toContain('aria-pressed={tab === "Избранное"}')
  expect(toolbar).toContain('BookmarkIcon')
  expect(toolbar).toContain('Избранное')
  expect(toolbar.indexOf('data-diary-whole-plan=""')).toBeLessThan(
    toolbar.indexOf('aria-pressed={tab === "Избранное"}'),
  )
  expect(toolbar).not.toContain('{FEED_TABS.map')
  expect(toolbar).toContain('aria-pressed={tab !== "Избранное" && showWholePlan}')
  expect(toolbar).toContain('LayersIcon')
  expect(toolbar).toContain('tab !== "Избранное" && showWholePlan && "fill-current"')
  expect(toolbar).not.toContain('CircleIcon')
  expect(toolbar).not.toContain('CircleCheckIcon')
  expect(toolbar).not.toContain('CalendarRangeIcon')
  expect(toolbar).toContain('[&>svg]:size-3.5')
  expect(toolbar).toContain('CirclePlusIcon')
  expect(page).toContain('setShowWholePlan((current) => !current)')
  expect(page).toContain('showWholePlan,')
})

test('mobile calorie chip hugs its number instead of a fixed 118px width', () => {
  const toolbar = news.slice(
    news.indexOf('diary-toolbar-press flex min-w-0 flex-1 items-center gap-2'),
    news.indexOf('{toolbarEnd ?'),
  )
  expect(toolbar).not.toContain('productToolbarCapsuleSelectClass')
  expect(toolbar).not.toContain('formatDailyCalorieChip(kcal)')
  expect(news).toContain('w-full min-w-0 shrink-0 !gap-2 !overflow-visible !py-0 !pr-2 !pl-3.5')
  expect(news).toContain('w-max min-w-[var(--anchor-width)]')
  expect(news).toContain("rounded-[16px]!")
  expect(news).toContain("rounded-[12px]!")
  expect(news).toContain('hover:text-[var(--nora-text)]')
  expect(news).toContain('data-selected:bg-[var(--nora-tint)]')
  expect(toolbar).toContain(
    'ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0',
  )
  expect(toolbar).toContain('ml-auto px-1')
  expect(toolbar).not.toContain('ml-auto px-1 md:w-[16rem] md:shrink-0')
  expect(toolbar).not.toContain('ml-auto gap-0.5')
})

test('mobile search grows up to the first remaining toolbar capsule', () => {
  expect(news).toContain('export const productToolbarSearchCollapseClass')
  expect(news).toContain("productToolbarSearchCollapseClass = 'max-md:hidden'")
  expect(news).toContain('searchOpen && showPlanChip && productToolbarSearchCollapseClass')
  expect(news).toContain('const showPlanChip = Boolean(')
  const planChip = news.slice(
    news.indexOf('data-diary-whole-plan=""') - 400,
    news.indexOf('data-diary-whole-plan=""'),
  )
  expect(planChip).not.toContain('productToolbarSearchCollapseClass')
  expect(planChip).not.toContain('max-md:max-w-0')
  const feed = readFileSync(
    new URL('../src/features/diary/pages/feed.tsx', import.meta.url),
    'utf8',
  )
  expect(feed).toContain("aria-label=\"Лента\"")
  expect(feed).not.toContain('productToolbarSearchCollapseClass')
  expect(feed).toContain("searchOpen && 'max-md:min-w-0 max-md:flex-1'")
  const kindGroup = feed.slice(
    feed.indexOf('aria-label="Лента"'),
    feed.indexOf('FEED_KINDS.map'),
  )
  expect(kindGroup).not.toContain('productToolbarSearchCollapseClass')
  expect(kindGroup).not.toContain('max-md:max-w-0')
  const planToolbar = readFileSync(
    new URL('../src/features/plans/PlanToolbar.tsx', import.meta.url),
    'utf8',
  )
  expect(planToolbar).toContain("searchOpen && 'max-md:flex-1'")
  expect(planToolbar).toContain('searchOpen && productToolbarSearchCollapseClass')
})

test('diary search expands the trailing pill without stretching across desktop', () => {
  const search = readFileSync(
    new URL('../src/components/nora/toolbar-search.tsx', import.meta.url),
    'utf8',
  )
  expect(search).toContain('export function ProductToolbarSearch')
  expect(search).toContain('aria-label="Поиск"')
  expect(search).toContain('aria-expanded={expanded}')
  expect(search).toContain('onExpandedChange(true)')
  expect(search).toContain('placeholder="Поиск"')
  expect(search).toContain('Закрыть поиск')
  expect(search).toContain("event.key !== 'Escape'")
  expect(search).not.toContain('aria-disabled="true"')
  expect(search).not.toContain('NoraSearch')
  expect(search).toContain('md:hidden')
  expect(search).toContain('text-[var(--nora-text-secondary)]')
  expect(search).not.toContain('text-[var(--nora-text-tertiary)]')
  expect(search).not.toContain('hidden md:flex')
  expect(search).not.toContain('hidden md:contents')
  expect(search).not.toContain('hidden md:inline-flex')
  expect(news).toContain('ProductToolbarSearch')
  expect(news).toContain(
    'searchOpen\n                          ? "ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0"\n                          : "ml-auto px-1"',
  )
  expect(news).not.toContain(
    'searchOpen\n                          ? "ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0"\n                          : "ml-auto px-1 md:w-[16rem] md:shrink-0"',
  )
  expect(news).toContain('setSearchOpen')
  expect(news).toContain('filterDiaryMeals(')
  expect(news).toContain('isDiaryFeedMealVisible(')
  expect(news).toContain('usePlanLibraryQuery(')
  expect(news).toContain('selectedPlanId')
  expect(news).toContain('useUserFavoritesQuery(')
  expect(news).toContain('putUserFavorites(')
  expect(news).not.toContain("id: 'favorites-load-failed'")
  expect(news).toContain('favoriteMealIdsForSync(')
  expect(news).toContain('reconcileLocalFavoriteIds(')
  expect(news).toContain('async function toggleSave')
  expect(news).toContain('if (!ok) return')
  expect(news).toContain('id: "favorite-added"')
  expect(news).toContain('id: "favorite-removed"')
  expect(news).toContain('id: "favorites-save-failed"')
  expect(news).toContain('data-search-open={searchOpen ? "" : undefined}')
  expect(news).not.toContain('data-diary-calorie-chip')
  expect(news).toContain('className={cn(diaryToolbarPillClass, "size-9 justify-center p-0")}')
  expect(news).not.toContain('-translate-x-3 opacity-0')
})

test('mobile diary toolbar can switch cards to a one-row list', () => {
  const page = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  const card = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  expect(page).toContain('data-diary-card-layout=""')
  expect(page).toContain('"size-9 justify-center p-0 md:hidden"')
  expect(page).toContain('Rows2Icon')
  expect(page).toContain('LayoutGridIcon')
  expect(page).toContain('Показать карточки списком')
  expect(page).toContain('Показать карточки сеткой')
  expect(page).toContain('diaryFeedGridClass(cardLayout)')
  expect(page).toContain('layout={cardLayout}')
  expect(page).toContain('writeDiaryCardLayout(')
  expect(page).toContain('readDiaryCardLayout')
  expect(card).toContain("layout = 'grid'")
  expect(card).toContain('max-md:flex-row max-md:items-stretch')
  expect(card).toContain('max-md:aspect-square')
  expect(card).toContain('max-md:h-full')
  expect(card).toContain('max-md:flex max-md:self-stretch max-md:p-2')
  expect(card).toContain('data-card-layout={layout}')
  expect(card).toContain('.slice(0, list && variant !== \'feed\' ? 2 : 3)')
  expect(card).toContain('max-md:h-10')
  expect(card).toContain('max-md:pt-2 max-md:pb-0')
  expect(card).toContain("label={list ? 'В рацион' : 'В план'}")
  expect(card).not.toContain('labeled={list}')
  expect(card).not.toContain('MEAL_CARD_FOOTER_PLUS_LABEL_CLASS')
  expect(card).toContain('part="bju"')
  expect(card).toContain('part="kcal"')
  expect(card).toContain("className={cn(list && 'max-md:hidden')}")
  expect(card).not.toContain('hideMobileBookmark')
  expect(card).not.toContain('max-md:w-[8.25rem]')
})

test('mobile calendar is an icon button without the period label', () => {
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPeriodPicker.tsx', import.meta.url),
    'utf8',
  )
  expect(picker).toContain('diaryToolbarIconButtonClass')
  expect(picker).toContain('aria-label={`Период: ${label}`}')
  expect(picker).not.toContain('max-md:hidden')
  expect(picker).not.toContain('{label}</span>')
})

test('mobile period calendar opens as a stacked two-month window', () => {
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPeriodPicker.tsx', import.meta.url),
    'utf8',
  )
  expect(picker).toContain('data-diary-period-dialog=""')
  expect(picker).toContain('flex min-w-0 flex-1 items-baseline gap-2')
  expect(picker).not.toContain('mt-0.5 line-clamp-2')
  expect(picker).toContain('data-diary-period-calendar="top"')
  expect(picker).toContain('data-diary-period-calendar="bottom"')
  expect(picker).not.toContain('data-modal-frame="diary-period"')
  expect(picker).not.toContain("'md:hidden'")
  expect(picker).not.toContain("'hidden md:inline-flex'")
  expect(picker).toContain('numberOfMonths={1}')
  expect(picker).toContain('density="sheet"')
  expect(picker).not.toContain('density="popover"')
  expect(picker).not.toContain('data-diary-period-calendar="left"')
  expect(picker).not.toContain('data-diary-period-calendar="right"')
  expect(picker).not.toContain('data-diary-period-desktop=""')
  expect(picker).toContain('h-[var(--nora-control-h)]')
  expect(picker).toContain('mt-2 grid grid-cols-2 gap-1.5')
  expect(picker).toContain('onMonthChange={onMonthChange}')
  expect(picker).toContain('setVisibleMonths')
  expect(picker).toContain('visibleMonthsForBounds')
  expect(picker).toContain('periodPickerActions')
  expect(picker).toContain('data-diary-period-actions=""')
  expect(picker).toContain('data-diary-period-divider=""')
  expect(picker).toContain('Сбросить')
  expect(picker).toContain('Сохранить')
  expect(picker).toContain('variant="primary"')
  expect(picker).toContain('productCardFooterCtaClass')
  expect(picker).toContain('RotateCcwIcon')
  expect(picker).toContain('!h-10 !min-h-10 !max-h-10')
  expect(picker).toContain('mt-3 grid grid-cols-2 gap-2')
  expect(picker).toContain('border-t border-[var(--nora-divider)]')
  expect(picker).toContain("'flex h-8 w-full items-center justify-center px-10'")
  expect(picker).toContain('h-auto')
  expect(picker).toContain('top-auto')
  expect(picker).toContain('!pb-0')
  expect(picker).not.toContain('max-w-[22rem]')
  expect(picker).toContain("'relative flex w-full flex-col'")
  expect(picker).not.toContain("'relative flex flex-row gap-4'")
  expect(picker).toContain('noraSheetCalendarClass')
  const calendar = readFileSync(
    new URL('../src/components/ui/calendar.tsx', import.meta.url),
    'utf8',
  )
  expect(calendar).toContain('[--cell-size:2.5rem]')
  expect(calendar).toContain('[--cell-radius:14px]')
  expect(calendar).toContain('compactDays')
  expect(picker).toContain('compactDays={sheet}')
  expect(picker).toContain('rounded-full')
  expect(picker).toContain('rdp-button_previous')
  expect(picker).toContain('rdp-button_next')
  expect(picker).not.toContain('PopoverContent')
})

test('period picker save and reset follow draft versus the full diary', () => {
  const defaultRange = {
    from: new Date(2026, 6, 28),
    to: new Date(2026, 8, 21),
  }
  const custom = {
    from: new Date(2026, 7, 1),
    to: new Date(2026, 7, 10),
  }
  const other = {
    from: new Date(2026, 8, 1),
    to: new Date(2026, 8, 11),
  }

  expect(
    periodPickerActions({ applied: null, defaultRange, draft: undefined }),
  ).toEqual({ saveEnabled: false, resetEnabled: false })
  expect(
    periodPickerActions({ applied: null, defaultRange, draft: defaultRange }),
  ).toEqual({ saveEnabled: false, resetEnabled: false })
  expect(
    periodPickerActions({ applied: null, defaultRange, draft: custom }),
  ).toEqual({ saveEnabled: true, resetEnabled: true })
  expect(
    periodPickerActions({
      applied: null,
      defaultRange,
      draft: { from: custom.from },
    }),
  ).toEqual({ saveEnabled: false, resetEnabled: true })
  expect(
    periodPickerActions({ applied: custom, defaultRange, draft: custom }),
  ).toEqual({ saveEnabled: false, resetEnabled: true })
  expect(
    periodPickerActions({ applied: custom, defaultRange, draft: other }),
  ).toEqual({ saveEnabled: true, resetEnabled: true })
  expect(
    periodPickerActions({ applied: custom, defaultRange, draft: defaultRange }),
  ).toEqual({ saveEnabled: false, resetEnabled: true })

  expect(visibleMonthsForBounds(defaultRange.from, defaultRange.to)).toEqual({
    top: new Date(2026, 6, 1),
    bottom: new Date(2026, 8, 1),
  })
  expect(
    visibleMonthsForBounds(new Date(2026, 8, 11), new Date(2026, 8, 21)),
  ).toEqual({
    top: new Date(2026, 7, 1),
    bottom: new Date(2026, 8, 1),
  })
})

test('desktop add button stays inside the diary toolbar row', () => {
  const toolbar = news.slice(
    news.indexOf('diary-toolbar-press flex min-w-0 flex-1 items-center gap-2'),
    news.indexOf('{toolbarEnd ?'),
  )
  expect(toolbar).toContain('Добавить')
  expect(toolbar).toContain('max-md:hidden')
  expect(toolbar).toContain('diaryToolbarPillClass')
  expect(toolbar).not.toContain('ios-float-seg')
  expect(toolbar).not.toContain('data-active=""')
  expect(toolbar).not.toContain('rounded-full bg-[var(--nora-text)] text-[var(--nora-panel)]')
  expect(toolbar).not.toContain('productCardFooterCtaClass')
  expect(toolbar).not.toContain('variant="tinted"')
})

test('mobile diary hides the page title block', () => {
  expect(news).toContain('<header className="hidden md:block">')
  expect(news).toContain('noraPageTitleClass')
  expect(news).toContain('noraPageDescriptionClass')
  expect(news).not.toContain('font-heading text-[22px] font-bold tracking-[-0.03em]')
})

test('empty diary shows a plaque, and loading shows a spinner', () => {
  expect(news).toContain('<SectionLoading')
  expect(news).toContain('Загрузка дневника')
  expect(news).toContain('data-slot="section-loading"')
  expect(news).toContain('В дневнике пока пусто')
  expect(news).toContain('data-slot="section-empty"')
  expect(news).toContain('Ничего не найдено')
  expect(news).not.toContain('<ProductFeedSkeletonSlots')
  expect(news).not.toContain('<SkeletonMealCard layout={cardLayout} />')
})

test('feed empty messages use a section plaque', () => {
  expect(news).toContain('<ProductFeedEmpty')
  expect(news).toContain('origin="diary"')
  expect(news).not.toContain('shadow-[inset_0_0_0_1px_var(--dash-card-ring)]')
  const emptySource = readFileSync(
    new URL('../src/components/nora/primitives.tsx', import.meta.url),
    'utf8',
  )
  const empty = emptySource.slice(
    emptySource.indexOf('export const noraProductTitleClass'),
    emptySource.indexOf('/* ---------- Divider ---------- */'),
  )
  const sheet = readFileSync(
    new URL('../src/components/nora/product-sheet.tsx', import.meta.url),
    'utf8',
  )
  const feedEmpty = sheet.slice(sheet.indexOf('export function ProductFeedEmpty'))
  expect(feedEmpty).toContain('data-slot="section-empty"')
  expect(feedEmpty).toContain('<NoraEmpty')
  expect(feedEmpty).not.toContain('data-slot="meal-card"')
  expect(feedEmpty).not.toContain('data-empty-card=""')
  expect(empty).toContain('export const noraPlaqueClass')
  expect(empty).toContain('export const noraPlaqueIconClass')
  expect(empty).toContain('size-8 shrink-0')
  expect(empty).toContain('[&_svg]:size-3.5')
  expect(empty).toContain('rounded-[14px]')
  expect(empty).toContain('bg-[var(--nora-input-bg)]/72')
  expect(empty).toContain('className={noraProductTitleClass}')
  expect(empty).not.toContain('text-xs font-semibold')
  expect(empty).not.toContain('[&_svg]:size-7')
  expect(sheet).not.toContain("'px-3 py-6 sm:px-4 sm:py-8'")
  expect(sheet).not.toContain("'px-6 py-12 sm:py-14'")
})

test('page chrome keeps the section heading scale', () => {
  const layout = readFileSync(
    new URL('../src/components/PageLayout.tsx', import.meta.url),
    'utf8',
  )
  expect(layout).toContain('font-heading text-[22px] font-bold tracking-[-0.03em]')
  expect(layout).toContain(
    'text-[13px] font-[250] leading-relaxed whitespace-normal text-[color-mix(in_srgb,var(--nora-text-secondary)_50%,var(--nora-text-tertiary)_50%)]',
  )
  expect(layout).not.toContain('export const noraPageTitleClass = noraProductTitleClass')
})

test('day stats use modal-tab capsules in one scroll row', () => {
  const stats = news.slice(
    news.indexOf('function FeedDayStats('),
    news.indexOf('export function NewsPage('),
  )
  expect(news).toContain('DAY_STAT_CHIP_CLASS')
  expect(news).toContain('ios-glass-glare')
  expect(news).toContain(
    'ios-glass-glare flex h-8 min-h-8 max-h-8 items-center rounded-full',
  )
  expect(news).toContain(
    'inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0',
  )
  expect(news).toContain(
    'bg-[var(--nora-input-bg)]',
  )
  expect(stats).toContain('DAY_STAT_CHIP_CLASS')
  expect(stats).toContain('DAY_DATE_CHIP_CLASS')
  expect(stats).not.toContain('DAY_PAST_CHIP_CLASS')
  expect(stats).toContain('DAY_PLAN_CHIP_CLASS')
  expect(stats).toContain('planMode && stampKey <= todayKey')
  expect(stats).toContain('localCalendarDayKey(new Date())')
  expect(stats).toContain('data-diary-day-plan')
  expect(news).toContain('planMode={showWholePlan}')
  expect(stats).toContain('className="size-[13px] text-white"')
  expect(stats).toContain('bg-[var(--nora-badge-yellow-bg)]')
  expect(stats).toContain('bg-[var(--nora-badge-red-bg)]')
  expect(stats).toContain('DAY_CHIPS_ROW_CLASS')
  expect(news).toContain(
    'relative z-[1] flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain select-none max-md:-mx-2 max-md:px-2 py-3 -my-3 no-scrollbar md:overflow-visible',
  )
  expect(stats).not.toContain('max-md:-mt-3')
  expect(stats).toContain('flex w-max shrink-0 items-center gap-2')
  expect(stats).toContain('ml-auto flex w-max shrink-0 items-center gap-2')
  expect(stats.indexOf('FlameIcon')).toBeLessThan(stats.indexOf('UtensilsIcon'))
  expect(stats).toContain('size-[13px]')
  expect(stats).toContain('CalendarIcon')
  expect(stats).not.toContain('weekdayIconClass(')
  expect(stats).not.toContain('weekdayToneClass(')
  expect(stats).toContain('Список покупок')
  expect(stats).toContain('ShoppingBagIcon')
  expect(stats).toContain('hidden size-7 justify-center px-0')
  expect(stats).not.toContain('ios-float-chip')
  expect(stats).not.toContain('ShoppingCartIcon')
  expect(stats).not.toContain('ShoppingBasketIcon')
  expect(stats).toContain('bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]')
  expect(stats).toContain('bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]')
  expect(stats).toContain('onBoughtChange={setBought}')
  expect(stats).toContain('DayShoppingDialog')
  expect(stats).not.toContain('ListChecksIcon')
  expect(stats).not.toContain('DayActivityRingsMark')
  expect(stats).not.toContain('DayActivityDialog')
  expect(stats).not.toContain('Дневная статистика')
  expect(stats.indexOf('CalendarIcon')).toBeLessThan(stats.indexOf('Список покупок'))
  expect(stats.indexOf('Список покупок')).toBeLessThan(stats.indexOf('FlameIcon'))
  expect(stats.indexOf('FlameIcon')).toBeLessThan(stats.indexOf('ZapIcon'))
  expect(stats).toContain('size-7 justify-center px-0')
  expect(stats).toContain('FlameIcon')
  expect(stats).not.toContain('CookieIcon')
  expect(stats).toContain('UtensilsIcon')
  expect(stats).toContain('ZapIcon')
  expect(stats).toContain('mealsCountLabel(totals.count)')
  expect(stats).not.toContain('DropletIcon')
  expect(stats).toContain('Белки')
  expect(stats).toContain('Жиры')
  expect(stats).toContain('Углеводы')
  expect(stats).toContain('{formatCount(totals.protein)}')
  expect(stats).toContain('{formatCount(totals.fat)}')
  expect(stats).toContain('{formatCount(totals.carbs)}')
  expect(stats).toContain('{formatCount(totals.kcal)}')
  expect(stats).toContain('{formatCount(dailyCalories)} ккал')
  expect(stats).not.toContain('ChevronRightIcon')
  expect(stats).not.toContain('Показать БЖУ')
  expect(stats).not.toContain('diaryToolbarPillClass')
  expect(stats).not.toContain('ios-float-status')
  expect(news).toContain('<FeedDayStats')
})

test('diary favorites tab can bulk-add meals to a plan like a diary day', () => {
  const page = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(page).toContain('const FAVORITES_PICK_KEY = "favorites"')
  expect(page).toContain('function FeedFavoritesPickBar(')
  expect(page).toContain('mealCount={filtered.length}')
  expect(page).toContain('{mealsCountLabel(mealCount)}')
  expect(page).not.toContain('Избранное · {mealsCountLabel(mealCount)}')
  expect(page).toContain('data-diary-favorites-pick=""')
  const favoritesBar = page.slice(
    page.indexOf('function FeedFavoritesPickBar('),
    page.indexOf('function FeedDayStats('),
  )
  expect(favoritesBar).toContain('DAY_STAT_CHIP_CLASS')
  expect(favoritesBar).toContain('UtensilsIcon')
  expect(favoritesBar).not.toContain('DAY_DATE_CHIP_CLASS')
  expect(favoritesBar).not.toContain('BookmarkIcon')
  expect(page).toContain('Выбрать избранные приёмы')
  expect(page).toContain('togglePickDay(FAVORITES_PICK_KEY)')
  expect(page).toContain('diaryMealCard(meal, FAVORITES_PICK_KEY)')
  expect(page).toContain('pickingDayKey === FAVORITES_PICK_KEY')
  expect(page).toContain('pickingDayKey !== FAVORITES_PICK_KEY')
  expect(page).toContain('orderDiaryDayByPlanLayout(group.meals, diaryPlanSlotIndex)')
  expect(page).not.toContain('{filtered.map((meal) => diaryMealCard(meal))}')
})

test('diary feed stamps pending plan meals from the live plan layout', () => {
  const page = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(page).toContain('function diaryPlanSlotIndex(meal: MealEntry)')
  expect(page).toContain('orderDiaryDayByPlanLayout(group.meals, diaryPlanSlotIndex)')
  expect(page).toContain('function diaryAtForMeal(meal: MealEntry, now = new Date())')
  expect(page).toContain('planOccurrenceDiaryAtWithLayout')
  expect(page).toContain('readPlanMealLayout')
  expect(page).toContain('at: diaryAtForMeal(meal)')
  expect(page).toContain(
    'const stayAt = meal ? diaryAtById[id] ?? diaryAtForMeal(meal) : undefined',
  )
  expect(page).not.toContain('delete nextAt[id]')
  expect(page).toContain('new Set(Object.keys(diaryAtById))')
})

test('day activity dialog shows three iOS-style rings for the selected day', () => {
  const dialog = readFileSync(
    new URL('../src/features/diary/DayActivityDialog.tsx', import.meta.url),
    'utf8',
  )
  const rings = readFileSync(
    new URL('../src/features/diary/day-activity-rings.ts', import.meta.url),
    'utf8',
  )
  expect(dialog).toContain('data-day-activity-dialog')
  expect(dialog).toContain('DayActivityRingsMark')
  expect(dialog).toContain('<DayActivityRingsMark animated rings={rings} size={ACTIVITY_RING_DIALOG_SIZE} />')
  expect(dialog).toContain('strokeDashoffset={stroke.gap}')
  expect(dialog).toContain('transition-[stroke-dashoffset]')
  expect(dialog).toContain('ring.label')
  expect(dialog).toContain('rotate(-90')
  expect(dialog).toContain('!text-[15px] !font-medium !leading-6')
  expect(rings).toContain("label: 'Калории'")
  expect(rings).toContain("label: 'Выполнение'")
  expect(rings).toContain("label: 'Приёмы'")
  expect(rings).toContain('function weekActivityRings(')
  expect(news).toContain('const SHOW_DIARY_WEEK_ACTIVITY = false')
  expect(news).toContain('data-week-activity=""')
  expect(news).toContain('aria-label="Статистика"')
  expect(dialog).toContain('data-activity-scope="week"')
  expect(dialog).toContain('useState<ActivityScope>(() => currentActivityDayKey())')
  expect(dialog).toContain('if (next) setScope(currentActivityDayKey())')
  expect(dialog).toContain('Нед')
  expect(dialog).toContain('mondayWeekPlanDays(')
  expect(dialog).toContain('dayActivityRings(')
  expect(dialog).toContain('weekActivityRings(')
  expect(news).not.toContain('weekActivityRings(')
  expect(oneLine(news)).toContain(
    '<ChartNoAxesCombinedIcon aria-hidden className="size-4" strokeWidth={1.75} />',
  )
  expect(news).not.toContain('ActivityIcon')
  expect(news).not.toContain('ActivityRingsIcon')
  expect(news).not.toContain('<DayActivityRingsMark rings={weekRings}')
  expect(dialog).toContain('data-active:bg-[var(--nora-tint-dimmed)]')
  expect(dialog).toContain('data-active:text-[var(--nora-tint)]')
  expect(dialog).not.toContain('weekdayToneClass(')
  expect(dialog).toContain('mt-2 font-[family-name:var(--nora-font)] text-[12px]')
  expect(dialog).toContain('data-today={day.isToday ? \'\' : undefined}')
  expect(dialog).toContain('min-h-12 items-center gap-2.5 rounded-[14px]')
  expect(dialog).toContain('activityRingLayout(')
  expect(news).not.toContain('data-diary-calorie-chip')
  expect(news.indexOf('data-week-activity=""')).toBeLessThan(news.indexOf('data-diary-search=""'))
})

test('day shopping dialog lists ration groceries like the planner rows', () => {
  const dialog = readFileSync(
    new URL('../src/features/diary/DayShoppingDialog.tsx', import.meta.url),
    'utf8',
  )
  expect(dialog).toContain('data-day-shopping-dialog')
  expect(dialog).toContain('Покупки')
  expect(dialog).toContain('купить')
  expect(dialog).toContain('куплено')
  expect(dialog).toContain('bg-[var(--nora-input-bg)]/72')
  expect(dialog).toContain('hover:bg-[var(--nora-input-bg)]')
  expect(dialog).toContain('dayShoppingItems(')
  expect(dialog).toContain('toggleBoughtShoppingKey(')
  expect(dialog).toContain('CircleCheckIcon')
  expect(dialog).toContain('CircleIcon')
  expect(dialog).not.toContain('ShoppingBasketIcon')
})

test('diary toolbar uses floating white iOS pills with a drop shadow', () => {
  expect(news).toContain('diaryToolbarPillClass')
  expect(news).toContain('BookmarkIcon')
  expect(news).toContain('LayersIcon')
  expect(news).toContain('text-[13px] font-normal leading-none')
  expect(news).toContain('flex w-full min-w-0 items-center pt-1')
  expect(news).toContain('aria-pressed={tab === "Избранное"}')
  expect(news).not.toContain('NoraSegmented')
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPeriodPicker.tsx', import.meta.url),
    'utf8',
  )
  expect(picker).toContain('ios-float-pill flex h-9 shrink-0 items-center')
  expect(picker).toContain('!h-9 !min-h-9 !max-h-9')
  expect(picker).toContain('inline-flex size-9')
  const css = readFileSync(new URL('../src/styles/nora-ui.css', import.meta.url), 'utf8')
  expect(css).toContain('.ios-float-pill')
  expect(css).toContain('.ios-float-pill-dock')
  expect(css).toContain('0 4px 10px')
  expect(css).toContain('0 8px 20px')
  expect(css).toContain('@media (max-width: 767px)')
  expect(css).toContain('top toolbar pills are 30% lighter than the bottom dock')
  expect(css).toContain('color-mix(in srgb, var(--nora-text) 8.4%, transparent)')
  expect(css).toContain('color-mix(in srgb, var(--nora-text) 12.6%, transparent)')
  expect(css).not.toContain('0 3px 8px color-mix(in srgb, var(--nora-text) 8%, transparent)')
  expect(css).toContain('.ios-float-pill[data-search-open]')
  expect(css).toContain('.scheme-editor-dark .ios-float-pill')
  expect(css).toContain('background: var(--nora-input-bg)')
  expect(css).toContain('inset 0 1px 0 color-mix(in srgb, white 14%, transparent)')
})

test('diary sections have no toolbar divider', () => {
  expect(news).toContain('flex flex-col gap-5 max-md:mb-2.5')
  expect(news).not.toContain('mt-3 border-t border-[var(--nora-divider)] max-md:hidden')
  expect(news).not.toContain('ProductSectionToolbarMark')
  expect(news).not.toContain('data-slot="product-section-mark"')
})

test('diary toolbar buttons share the composer press jump', () => {
  expect(news).toContain('diary-toolbar-press')
  expect(news).not.toContain('diary-toolbar-press flex w-full min-w-0 items-center gap-2 py-1')
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPeriodPicker.tsx', import.meta.url),
    'utf8',
  )
  expect(picker).toContain('nora-press-grow')
})

test('meal cards use frosted glass with the same top glare as diary chips', () => {
  const css = readFileSync(new URL('../src/styles/card-hover.css', import.meta.url), 'utf8')
  expect(css).toContain("[data-slot='meal-card'],")
  expect(css).toContain("[data-slot='meal-card-skeleton']")
  expect(css).not.toContain("[data-slot='feed-empty']")
  expect(css).toContain('inset 0 1px 0 var(--meal-card-glare)')
  expect(css).toContain('[data-slot=\'meal-card\']::before')
  expect(css).toContain('color-mix(in srgb, white 32%, transparent)')
  expect(css).toContain('color-mix(in srgb, white 12%, transparent)')
  expect(css).toContain('backdrop-filter: blur(16px)')
  expect(css).toContain('color-mix(in srgb, var(--nora-panel) 92%, transparent)')
  expect(css).toContain('calc(var(--meal-card-shadow-alpha, 5%) * 0.6)')
  expect(css).toContain('var(--meal-card-shadow-alpha, 5%)')
  expect(css).toContain('--meal-card-shadow-ink: var(--nora-text)')
  expect(css).toContain('--meal-card-shadow-ink: #000000')
  expect(css).not.toContain('var(--meal-card-shadow-blur, 12px) transparent')
  expect(css).toContain('@supports not ((backdrop-filter: blur(1px))')
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  expect(card).not.toContain('bg-[var(--dash-card-bg)]')
  expect(card).not.toContain('overflow-hidden')
  expect(card).toContain('px-2 pt-2')
  expect(card).toContain('data-meal-id={meal.id}')
  expect(news).toContain('nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent')
  expect(news).toContain("className={cn('size-4', saved && 'fill-current')}")
})

test('feed skeleton preview fills the card width like a real cover', () => {
  const skeleton = news.slice(news.indexOf('function SkeletonMealCard('))
  expect(skeleton).toContain('w-full')
  expect(skeleton).toContain('aspect-[4/3]')
})

test('meal composer uses 16px on mobile so iOS does not zoom', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  expect(css).toContain('textarea,')
  expect(css).not.toContain('textarea:not([data-meal-composer])')
  expect(css).not.toContain('textarea[data-meal-composer]')
})

test('dropdown hover darkens label text like other capsules', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  expect(css).toContain('[data-slot="select-item"]:hover')
  expect(css).toContain('background: var(--nora-menu-item-hover) !important')
  expect(css).toContain('color: var(--nora-text) !important')
  expect(css).toContain('[data-slot="select-item"][data-selected]')
})

test('toasts use the same frost and top glare as diary chrome', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  const sonner = readFileSync(new URL('../src/components/ui/sonner.tsx', import.meta.url), 'utf8')
  expect(sonner).toContain('cn-toast ios-glass-glare')
  expect(css).toContain("color-mix(in srgb, var(--nora-panel) 72%, transparent)")
  expect(css).toContain('inset 0 1px 0 color-mix(in srgb, white 70%, transparent)')
  expect(css).toContain('backdrop-filter: blur(16px) saturate(160%)')
  expect(css).not.toContain('box-shadow: var(--nora-toast-shadow) !important')
})

test('detail tabs grow on press like composer buttons', () => {
  expect(news).toContain('nora-press-grow')
})

test('meal dialog closes from a close button in the tab row', () => {
  const closeBtn = news.slice(
    news.indexOf('function MealDialogCloseButton'),
    news.indexOf('function MealDetailTabRow'),
  )
  expect(closeBtn).toContain('aria-label="Закрыть"')
  expect(closeBtn).toContain('!bg-[var(--nora-inset)]')
  expect(closeBtn).toContain('!text-[var(--nora-text-secondary)]')
  expect(closeBtn).not.toContain('!bg-[var(--nora-text)]')
  expect(closeBtn).not.toContain('!text-[var(--nora-panel)]')
  expect(closeBtn).not.toContain('text-[var(--nora-text-tertiary)]')
  expect(closeBtn).toContain('strokeWidth={2.25}')
  expect(closeBtn).toContain('rounded-full')
  expect(closeBtn).toContain('[&_svg]:block')
  expect(closeBtn).not.toContain('sm:hidden')
  expect(news).toContain('MEAL_DIALOG_HERO_CLOSE_CLASS')
  expect(news).toContain('group-hover/preview:opacity-100')
  expect(news).toContain('top-3.5 right-3.5')
  expect(news).not.toContain('aria-label="Назад"')
  expect(closeBtn).not.toContain('ChevronLeftIcon')
  expect(news).not.toContain('Прокрутить содержимое')
  expect(news).not.toContain('Прокрутить вкладки')
})

test('meal dialog buttons share frost and top glare', () => {
  expect(news).toContain('MEAL_MODAL_CHIP_CLASS')
  expect(news).toContain('ios-glass-glare-soft rounded-full border-0')
  expect(news).toContain('MEAL_DETAIL_TAB_CLASS')
  expect(news).toContain('!bg-[var(--nora-inset)]')
  expect(news).not.toContain('!bg-[var(--nora-input-bg)]/72')
  expect(news).not.toContain("!bg-[color-mix(in_srgb,var(--nora-text)_12%,var(--nora-input-bg))]")
  expect(news).toContain('ios-glass-glare-soft h-8 min-h-8 max-h-8')
  expect(news).toContain('MEAL_COMPOSER_FIELD_CLASS')
  const composerCss = readFileSync(
    new URL('../src/styles/composer-press.css', import.meta.url),
    'utf8',
  )
  expect(composerCss).toContain('.composer-press-surface.meal-composer-field')
  expect(composerCss).toContain('inset 0 1px 0 color-mix(in srgb, white 28%, transparent)')
  expect(composerCss).toContain('0 8px 24px color-mix(in srgb, var(--nora-text) 14%, transparent)')
  expect(composerCss).toContain('inset 0 1px 0 color-mix(in srgb, white 10%, transparent)')
  const noraCss = readFileSync(new URL('../src/styles/nora-ui.css', import.meta.url), 'utf8')
  expect(noraCss).toContain('.ios-glass-glare-soft')
  expect(noraCss).toContain('white 32%')
  expect(noraCss).toContain('white 12%')
  expect(news).toContain('MEAL_MODAL_SEND_CLASS')
  expect(news).toContain('MealComposerSendButton')
  expect(news).toContain('mealComposerSendTone')
  expect(news).toContain('MEAL_ATTACH_REMOVE_CLASS')
  expect(news).toContain('bg-[var(--nora-input-bg)]/72')
  expect(news).toContain('bg-[var(--nora-text)]/58')
  expect(news).toContain('disabled:opacity-100')
  expect(news).toContain(
    'ios-glass-glare inline-flex cursor-pointer items-center justify-center rounded-full',
  )
  const attach = readFileSync(
    new URL('../src/features/diary/meal-attach-menu.tsx', import.meta.url),
    'utf8',
  )
  expect(attach).toContain('ios-glass-glare')
  expect(attach).toContain('bg-[var(--nora-input-bg)]/72')
  expect(attach).toContain('pickHybridMealImage')
  expect(attach).toContain("pickSource('camera')")
  const voice = readFileSync(
    new URL('../src/features/diary/MealVoiceControls.tsx', import.meta.url),
    'utf8',
  )
  expect(voice).toContain('ios-glass-glare')
  expect(voice).toContain('bg-[var(--nora-input-bg)]/72')
  expect(voice).toContain('bg-[var(--nora-text)]/72')
})

test('android chrome keeps colored badge and send-button fills', () => {
  const noraCss = readFileSync(new URL('../src/styles/nora-ui.css', import.meta.url), 'utf8')
  const androidGlare = noraCss.slice(
    noraCss.indexOf('html[data-android] .ios-glass-glare,'),
    noraCss.indexOf('/* Dark plaques'),
  )
  expect(androidGlare).toContain('backdrop-filter: none !important')
  expect(androidGlare).toContain('@layer base')
  expect(androidGlare).not.toContain('background: var(--nora-panel)')
})

test('meal dialog close, preview expand, and card actions grow on press', () => {
  expect(news).toContain("'nora-press-grow absolute bottom-3.5 right-3.5")
  expect(news).toContain("'nora-press-grow absolute top-4 right-4 z-[2] hidden size-7 sm:inline-flex'")
  expect(news).toContain('hidden size-7 sm:inline-flex')
  expect(news).toContain('nora-press-grow size-6! shrink-0 !bg-transparent')
})

test('diary card footer keeps bookmark and share without an overflow menu', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  const actions = news.slice(
    news.indexOf('function CardActions('),
    news.indexOf('function FeedListAuthorLabel('),
  )
  const macros = news.slice(
    news.indexOf('function MacrosLine'),
    news.indexOf('function RollingMacroValue'),
  )
  expect(actions).not.toContain('aria-label="Ещё"')
  expect(actions).not.toContain('MoreHorizontalIcon')
  expect(actions).not.toContain('DropdownMenu')
  expect(actions).toContain('Поделиться')
  expect(actions).toContain('Скрыть из ленты')
  expect(actions).not.toContain('Удалить')
  expect(actions).toContain('hideFooterShare')
  expect(actions).toContain('data-demo-pressed={savePressed ? \'\' : undefined}')
  expect(actions).not.toContain('Открыть')
  expect(actions).toContain('Share2Icon')
  expect(actions.indexOf('Share2Icon')).toBeLessThan(actions.indexOf('BookmarkIcon'))
  expect(news).toContain('MEAL_CARD_FOOTER_PLUS_CLASS')
  expect(news).not.toContain('MEAL_CARD_FOOTER_PLUS_LABEL_CLASS')
  expect(news).not.toContain('hideMobileBookmark')
  expect(card).toContain('MealCardAddButton')
  expect(news).toContain('rounded-full! bg-[var(--nora-input-bg)]')
  expect(actions).toContain('text-[var(--nora-tint)]')
  expect(actions).toContain('aria-label={shareLabel}')
  expect(actions).toContain('canShare')
  expect(actions).toContain('disabled={!canShare}')
  expect(actions).not.toContain('{canShare && !hideFooterShare')
  expect(card).toContain('onShare={onShare}')
  expect(card).toContain('shared={Boolean(meal.shared)}')
  expect(card).toContain('canShare={canShare}')
  expect(card).toContain('mealCanShareToFeed(meal)')
  expect(card).toContain('variant === \'feed\'')
  expect(card).toContain('productCardAuthorAnchorClass')
  expect(card).toContain('FEED_AUTHOR_CHIP_CLASS')
  expect(card).not.toContain('formatMealStamp(meal.at)')
  expect(card).not.toContain('formatWeekdayMealStamp(meal.at)')
  expect(card).toContain('ml-auto flex shrink-0 items-center gap-1')
  expect(card).toContain('disabled={!onAddToPlan || addingToPlan}')
  expect(card).not.toContain('readOnly || !onAddToPlan ? null')
  expect(card).toContain("label={list ? 'В рацион' : 'В план'}")
  expect(card.indexOf('MealCardAddButton')).toBeLessThan(card.indexOf('<CardActions'))
  const firstFeed = card.indexOf("{variant === 'feed' ? (")
  const secondFeed = card.indexOf("{variant === 'feed' ? (", firstFeed + 1)
  const overlay = card.slice(firstFeed, secondFeed)
  const feedFooter = card.slice(secondFeed, card.indexOf(') : (', secondFeed))
  expect(overlay).toContain('productCardAuthorAnchorClass')
  expect(overlay).toContain('authorInitials')
  expect(overlay).toContain('revealAuthor')
  expect(feedFooter).toContain('MealCardAddButton')
  expect(feedFooter).toContain('MealLikeButton')
  expect(feedFooter.indexOf('MealCardAddButton')).toBeLessThan(feedFooter.indexOf('MealLikeButton'))
  expect(feedFooter).toContain('ml-auto flex shrink-0 items-center gap-1')
  expect(feedFooter).not.toContain('MealAuthorByline')
  expect(news).toContain('bottom-2 left-2')
  expect(news).toContain('mealCanShareToFeed(meal) && !meal.shared')
  expect(news).toContain('tab !== "Избранное"')
  expect(news).toContain('showPlanState={tab !== "Избранное"}')
  expect(news).not.toContain('showPlanState={!favoritesTab}')
  expect(news).toContain('picking={Boolean(pickingDayKey)}')
  expect(news).toContain('tab === "Избранное" ? undefined')
  expect(news).toContain('feedView')
  expect(news).toContain('{feedView || previewOnly ? null : (')
  expect(news).toContain('previewOnly={isDiaryMealOnFutureDay(openMeal)}')
  expect(news).toContain('isDiaryMealOnFutureDay(meal)')
  expect(news).toContain('if (meal && isDiaryMealOnFutureDay({ at: diaryAtForMeal(meal) })) return')
  expect(news).toContain('at: diaryAtForMeal(openMealSource)')
  expect(news).toContain('!previewOnly && isPlannedDiaryMeal(meal)')
  expect(news).not.toContain('navigator.share')
  expect(card).not.toContain('clipboard.writeText')
  expect(news).toContain('shareMyMeal(')
  expect(news).toContain('Приём опубликован в ленте')
  expect(card).toContain('hidden size-7 sm:inline-flex')
  expect(card).toContain('aria-label="Удалить"')
  expect(macros).toContain('font-light')
  expect(macros).toContain('font-normal text-[var(--nora-text)]')
  expect(macros).not.toContain('font-medium text-[var(--nora-text)]')
  expect(macros).toContain('{meal.kcal} ккал')
  expect(macros).toContain("' · Б: '")
  expect(macros).toContain("{' · Ж: '}")
  expect(macros).toContain("{' · У: '}")
})

test('meal card macros put colons after БЖУ letters', () => {
  const card = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  const macros = card.slice(
    card.indexOf('function MacrosLine('),
    card.indexOf('function RollingMacroValue('),
  )
  expect(macros).toContain("' · Б: '")
  expect(macros).toContain("{' · Ж: '}")
  expect(macros).toContain("{' · У: '}")
})

test('card favorite bookmarks use blue when saved', () => {
  const actions = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  const ration = readFileSync(
    new URL('../src/features/mentor/RationCard.tsx', import.meta.url),
    'utf8',
  )
  const plan = readFileSync(
    new URL('../src/features/plans/WeekPlanCard.tsx', import.meta.url),
    'utf8',
  )
  for (const source of [actions, ration]) {
    expect(source).toContain("saved ? 'Убрать' : 'Сохранить'")
    expect(source).toContain('text-[var(--nora-tint)]')
  }
  expect(plan).toContain("saved ? 'Убрать из избранного' : 'В избранное'")
  expect(plan).toContain('text-[var(--nora-tint)]')
  expect(ration).toContain('{ration.description}')
  expect(ration).toContain('whitespace-pre-line')
})

test('feed card trash uses the same frosted overlay as modal preview chips', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  expect(card).toContain('MEAL_DIALOG_OVERLAY_CHIP_CLASS')
  expect(news).toContain(
    "bg-[var(--nora-panel)]/72 text-[var(--nora-text-tertiary)] backdrop-blur-[16px]",
  )
  expect(card).not.toContain('bg-[var(--nora-surface)]')
  expect(card).not.toContain("shadow-[0_1px_2px_rgb(0_0_0_/_0.12)]")
})

test('mobile meal cards follow the ration thumbnail type scale', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  expect(card).toContain('px-2 pt-2')
  expect(card).toContain('px-3 pt-3 sm:px-4 sm:pt-3.5')
  expect(card).toContain('text-[15px] font-medium leading-6')
  expect(card).toContain('mt-2 mb-2 h-[3.75rem] shrink-0 overflow-clip')
  expect(card).toContain("className={cn('shrink-0', list && 'max-md:hidden')}")
  expect(card).toContain('.slice(0, list && variant !== \'feed\' ? 2 : 3)')
  expect(card).toContain('mealCompositionLines(meal)')
  expect(card).toContain('•')
  expect(card).not.toContain('line-clamp-3')
  expect(card).toContain('text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]')
  expect(card).not.toContain('text-[14px] font-semibold')
  expect(card).not.toContain('font-[350]')
  expect(card).not.toContain('min-h-0')
  expect(card).toContain('mt-auto pt-2.5')
  expect(card).not.toContain('min-h-11')
  expect(card).toContain('MEAL_CARD_FOOTER_DIVIDER_CLASS')
  expect(card).toContain('className={MEAL_CARD_FOOTER_CLASS}')
  expect(news).toContain("const MEAL_CARD_FOOTER_DIVIDER_CLASS =")
  expect(news).toContain("const MEAL_CARD_FOOTER_CLASS = 'flex items-center justify-between gap-2 py-2.5'")
  expect(news).toContain(
    "'border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)] dark:border-[var(--nora-border-strong)]'",
  )
  expect(card).toContain('data-slot="meal-card-footer"')
  expect(card).toContain('text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]')
  expect(news).toContain('grid-cols-2 items-stretch gap-2')
})

test('meal cards keep origin in data attributes without a preview badge', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  expect(news).toContain('NewspaperIcon')
  expect(news).toContain('UtensilsCrossedIcon')
  expect(news).toContain('GraduationCapIcon')
  expect(news).not.toContain('BookUserIcon')
  expect(news).toContain("'bg-[var(--nora-panel)]/72 backdrop-blur-[16px]'")
  expect(news).toContain('productSheetFrostFillClass')
  expect(news).toContain("origin={mealCardOrigin(openMeal)}")
  expect(news).toContain('origin="diary"')
  expect(card).toContain('mealCardOrigin(meal)')
  expect(card).toContain('data-card-origin={origin}')
  expect(card).toContain('data-slot="meal-card-preview"')
  expect(card).not.toContain('<ProductCardOriginBadge')
  expect(news).not.toContain('<ProductCardOriginBadge origin={origin}')
})

test('unread meal cards overlay a fading mark on the preview', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  expect(card).toContain('data-slot="meal-card-unread"')
  expect(card).toContain('SparklesIcon')
  expect(card).toContain('transition-opacity duration-700')
  expect(card.indexOf('data-slot="meal-card-unread"')).toBeGreaterThan(
    card.indexOf('data-slot="meal-card-preview"'),
  )
  expect(news).toContain('rememberViewedMealIds')
  expect(news).toContain('meal.unread')
})

test('ration-imported diary cards are muted but stay openable', () => {
  const card = news.slice(
    news.indexOf('function MealCard('),
    news.indexOf('function SkeletonMealCard('),
  )
  const done = news.slice(
    news.indexOf('function RationPlanDoneButton('),
    news.indexOf('function MealCard('),
  )
  expect(card).toContain('isRationPlanPending(')
  expect(card).toContain('isRationPlanDone(')
  expect(card).toContain("label={onAddToPlan ? 'В план' : onAddToDiary ? 'В дневник' : 'В план'}")
  expect(card).toContain('data-from-ration={fromRation ? \'\' : undefined}')
  expect(card).toContain('data-ration-done={done ? \'\' : undefined}')
  expect(card).toContain("grayscale && 'grayscale'")
  expect(card).toContain('RATION_PENDING_COVER_CLASS')
  expect(card).toContain('productCardOriginAnchorClass')
  expect(card).not.toContain('showPlanState && pending')
  expect(card).toContain('picking ? null : showPlanState && (done || logged)')
  expect(card).not.toContain('picking ? null : showPlanState && done ?')
  expect(card).not.toContain('RATION_PLANNED_CARD_BADGE_CLASS')
  expect(card).not.toContain('RATION_LOGGED_CARD_BADGE_CLASS')
  expect(card).not.toContain('По плану')
  expect(card).not.toContain('Запланировано')
  expect(card).toContain('aria-label="Выполнено"')
  expect(card).toContain('aria-label="Выбран"')
  expect(card).toContain('Выполнено')
  expect(card).toContain('Выбран')
  expect(card).not.toContain('aria-label="Выполнен"')
  expect(card).toContain('RATION_DONE_CARD_BADGE_CLASS')
  expect(card).toContain('RATION_PICKED_CARD_BADGE_CLASS')
  expect(card).toContain('CircleCheckIcon aria-hidden className="size-3"')
  expect(news).toContain('h-[22px] min-h-[22px] max-h-[22px]')
  expect(news).not.toContain('size-7 min-h-7 max-h-7')
  expect(news).not.toContain('size-[22px] min-h-[22px] max-h-[22px]')
  expect(card).not.toContain('scheme-editor-dark')
  expect(card).not.toContain("data-scheme={selected ? 'editor-dark' : undefined}")
  expect(card).not.toContain('>Рацион</span>')
  expect(card).not.toContain('RationPlanDoneButton')
  expect(done).toContain('Выполнить')
  expect(done).toContain('Выполнено')
  expect(done).toContain('aria-pressed={done}')
  expect(done).toContain('CircleIcon')
  expect(done).toContain('CircleCheckIcon')
  expect(done).toContain('h-8 min-h-8 max-h-8')
  expect(done).toContain('bg-[var(--nora-input-bg)]/72')
  expect(done).toContain('bg-[var(--nora-success)] text-white')
  expect(done).not.toContain("color-mix(in_srgb,var(--nora-panel)_78%")
  expect(news).toContain('toggleRationMealDone(')
  expect(news).toContain('setMyMealPlanDone(')
  expect(news).toContain('diaryAtForMeal(')
  expect(news).toContain('planOccurrenceDiaryAtWithLayout(')
  expect(news).toContain('mealListAfterPlanDone(')
  expect(news).toContain('recordedAt: stayAt')
  expect(news).toContain('result.meal')
  expect(news).toContain('isRationImportedMeal(meal)')
  expect(news).toContain('isPlannedDiaryMeal(meal)')
  expect(news).toContain("'bg-[var(--nora-success)] text-white'")
  expect(news).toContain('bg-[var(--nora-success)] text-white')
  expect(news).not.toContain('bg-[#16A34A]')
  expect(news).not.toContain("'bg-[#52525B] text-white'")
  expect(news).toContain('RATION_PENDING_COVER_CLASS')
  expect(news).toContain('ration-pending-cover')
  expect(news).toContain('after:bg-[var(--planned-cover-wash)]')
  expect(news).not.toContain('after:bg-[color-mix(in_srgb,var(--nora-tint)_32%,transparent)]')
  expect(news).not.toContain("RATION_PENDING_COVER_CLASS = 'grayscale'")
  expect(news).not.toContain('after:bg-[#007AFF]/30')
  expect(news).not.toContain('hue-rotate(175deg)')
  expect(news).not.toContain('after:mix-blend-color')
  const completeFn = news.slice(
    news.indexOf('function toggleRationMealDone'),
    news.indexOf('async function deleteMeal'),
  )
  expect(completeFn).toContain('diaryAtForMeal(meal)')
  expect(completeFn).toContain('writeDiaryPlanAtById(')
  expect(completeFn).toContain('recordedAt: stayAt')
  expect(completeFn).toContain('pinned.id')
  expect(completeFn).not.toContain('invalidateQueries')
  expect(news).toContain('diaryMealCanCopyToPlan(meal, completedIds)')
  expect(news).not.toContain('diaryMealCanCopyToPlan(openMeal, completedIds)')
  expect(card).not.toContain('CalendarIcon')
  expect(card).not.toContain('grayscale-[0.4]')
  expect(card).not.toContain('opacity-55')
  expect(card).toContain('onOpen')
  expect(card).not.toContain("pending && 'pointer-events-none")
  expect(oneLine(news)).toContain(
    'const openMealPending = openMeal ? isRationPlanPending(openMeal, completedIds) : false',
  )
  const openDialog = news.slice(news.indexOf('open={!!openMeal}'))
  expect(oneLine(openDialog)).toContain(
    'openMealPending && tab !== "Избранное" && RATION_PENDING_COVER_CLASS',
  )
})

test('planned diary cards keep a muted cover without a plan badge', () => {
  const sheet = readFileSync(
    new URL('../src/features/diary/meal-sheet.tsx', import.meta.url),
    'utf8',
  )
  const card = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  expect(sheet).not.toContain('RATION_PLANNED_CARD_BADGE_CLASS')
  expect(card).not.toContain('По плану')
  expect(card).not.toContain('Запланировано')
  expect(card).toContain('RATION_PENDING_COVER_CLASS')
})

test('planned card titles use the same color as completed ones', () => {
  const card = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  expect(card).toContain(
    'truncate shrink-0 font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 tracking-normal text-[var(--nora-text)]',
  )
  expect(card).not.toContain("pending ? 'text-[var(--nora-text-secondary)]' : 'text-[var(--nora-text)]'")
})

test('self-uploaded diary cards do not get a cover badge', () => {
  const sheet = readFileSync(
    new URL('../src/features/diary/meal-sheet.tsx', import.meta.url),
    'utf8',
  )
  const card = readFileSync(
    new URL('../src/features/diary/MealCard.tsx', import.meta.url),
    'utf8',
  )
  expect(sheet).not.toContain('RATION_LOGGED_CARD_BADGE_CLASS')
  expect(card).not.toContain('showPlanState && logged')
  expect(card).not.toContain('RATION_LOGGED_CARD_BADGE_CLASS')
  expect(card).toContain("data-logged-meal={logged ? '' : undefined}")
  expect(card).toContain('mealCanShareToFeed(meal)')
})

test('mentee questionnaire keeps the view switcher clickable and hides diary filters', () => {
  const toolbar = news.slice(
    news.indexOf('<div className="relative z-10 flex w-full min-w-0 items-center pt-1">'),
    news.indexOf('{body ?? ('),
  )
  expect(toolbar.indexOf('{toolbarExtra ?')).toBeGreaterThan(-1)
  expect(toolbar.indexOf('{toolbarExtra ?')).toBeLessThan(
    toolbar.indexOf('{toolbarDisabled ? null : ('),
  )
  expect(toolbar.indexOf('{toolbarDisabled ? null : (')).toBeLessThan(
    toolbar.indexOf('aria-pressed={tab === "Избранное"}'),
  )
  expect(toolbar.indexOf('aria-pressed={tab === "Избранное"}')).toBeLessThan(toolbar.indexOf('{toolbarEnd ?'))
  expect(toolbar).not.toContain('pointer-events-none opacity-40')
})

test('product feeds cannot expand past the viewport', () => {
  expect(news).toContain('contain-inline-size')
  expect(news).not.toContain('overflow-x-clip')
  expect(news).toContain(
    'overflow-x-auto overscroll-x-contain py-8 -my-8 no-scrollbar max-md:-mx-3 max-md:w-[calc(100%+1.5rem)] max-md:px-3 md:overflow-visible',
  )
  expect(news).toContain('pointer-events-none')
  expect(news).toContain('[&>*]:pointer-events-auto')
  expect(news).not.toContain('max-md:pb-8 max-md:-mb-8')
  expect(news).toContain('min-w-0 w-full grid-cols-2')
  expect(news).toContain(
    "'group flex h-full min-w-0 cursor-pointer flex-col transition-[filter] duration-700 ease-out motion-reduce:duration-0'",
  )
})

test('mobile diary page uses tighter side padding so cards can fit KBJU on one line', () => {
  expect(news).toContain(
    'flex w-full min-w-0 contain-inline-size flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4',
  )
  expect(news).not.toContain(
    'flex w-full flex-col gap-3 px-5 py-3 sm:gap-4 sm:px-6 sm:py-4',
  )
  const macros = news.slice(
    news.indexOf('function MacrosLine'),
    news.indexOf('function RollingMacroValue'),
  )
  expect(macros).toContain('truncate')
  expect(macros).toContain('text-[12px]')
  expect(macros).toContain('font-light')
  expect(macros).not.toContain('sm:text-[13px]')
  expect(macros).not.toContain('tracking-tight')
})

test('meal photos crossfade in the feed and dialog instead of sliding', () => {
  const slides = news.slice(
    news.indexOf('function MealPhotoSlides('),
    news.indexOf('function Cover('),
  )
  const photo = readFileSync(
    new URL('../src/features/diary/meal-feed-photo.tsx', import.meta.url),
    'utf8',
  )
  expect(slides).toContain('transition-opacity')
  expect(slides).toContain('opacity-100')
  expect(slides).toContain('opacity-0')
  expect(slides).toContain('touch-pan-y')
  expect(slides).not.toContain('touch-pan-x')
  expect(slides).not.toContain('useEmblaCarousel')
  expect(slides).not.toContain('emblaApi')
  expect(slides).toContain('MealFeedPhoto')
  expect(photo).toContain('loading="eager"')
  expect(photo).toContain('mealPhotoNeedsPreview')
  expect(news).toContain('prefetchMealPhoto')
  expect(news).toContain('const MEAL_PHOTO_FADE_MS = 280')
  expect(news).not.toContain("import useEmblaCarousel from 'embla-carousel-react'")
  expect(slides).toContain('Предыдущее фото')
  expect(slides).toContain('Следующее фото')
  expect(slides).toContain('md:group-hover/photos:opacity-100')
  expect(slides).toContain('hidden size-7 -translate-y-1/2 md:inline-flex')
  expect(news).toContain("window.matchMedia('(min-width: 768px)')")
})

test('forming meal rolls KBJU and spins the active step instead of tab skeletons', () => {
  expect(news).toContain('rolling={(showFormingSteps && !hasMeal) || refineMacros.rolling}')
  expect(news).toContain('mealFormingChatVisible')
  expect(news).toContain('formingForRevealRef')
  expect(news).toContain('leadBusy={index === shown.length - 1}')
  expect(news).toContain("leadBusy && 'animate-spin'")
  expect(news).not.toContain('MealDetailTabRowSkeleton')
  expect(news).not.toContain('MealVersionButtonSkeleton')
})

test('formed meal keeps the same hero and reveals title after KBJU settle', () => {
  expect(news).toContain('mealAddDialogHeroSlides')
  expect(news).toContain("setRevealPhase('title')")
  expect(news).toContain("setRevealPhase('composition')")
  expect(news).toContain('enter={reveal !== \'off\'}')
  expect(news).toContain("transitionProperty: 'opacity'")
  expect(news).not.toContain('mealTabEnterDelayMs')
  expect(news).toContain('locked={mealCardRevealLocksTabs(reveal)}')
  expect(news).toContain('pace="fast"')
  expect(news).toContain("setRefineReveal('waiting')")
  expect(news).toContain('mealRefiningSteps(ready.length > 0)')
  expect(news).not.toContain('MealGeneratingSkeleton')
})

test('composer close does not wait for cancel before unmounting', () => {
  expect(news).not.toMatch(/await runTurn\(\{\s*action:\s*'cancel'/)
  expect(news).toMatch(/action:\s*'cancel'/)
  const closeFn = news.slice(
    news.indexOf('function handleOpenChange'),
    news.indexOf('async function sendNote'),
  )
  const closeCall = closeFn.indexOf('onOpenChange(next)')
  const cancelCall = closeFn.indexOf("'cancel'")
  expect(closeCall).toBeGreaterThan(-1)
  expect(cancelCall).toBeGreaterThan(-1)
  expect(closeCall).toBeLessThan(cancelCall)
})

test('own diary meals can be copied into a chosen weekly plan day', () => {
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPlanDayPicker.tsx', import.meta.url),
    'utf8',
  )
  const newsPage = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(news).toContain("'В план'")
  expect(newsPage).toContain('diaryMealCanCopyToPlan(meal, completedIds)')
  expect(newsPage).not.toContain('diaryMealCanCopyToPlan(openMeal, completedIds)')
  const detail = readFileSync(
    new URL('../src/features/diary/MealOpenDetail.tsx', import.meta.url),
    'utf8',
  )
  expect(detail).not.toContain('В план')
  expect(detail).not.toContain('onAddToPlan')
  expect(newsPage).toContain('<DiaryPlanDayPicker')
  expect(newsPage).toContain('diaryMealCreatePlanDraft(')
  expect(newsPage).toContain('diaryMealsFreshForPlanDay(')
  expect(newsPage).toContain('data-diary-day-pick')
  expect(newsPage).toContain('DIARY_MOBILE_DOCK_MOVE_ID')
  expect(newsPage).toContain('В рацион')
  expect(newsPage).not.toContain('Добавить в план')
  expect(newsPage).not.toContain('Запланировать')
  expect(newsPage).not.toContain('Переместить')
  expect(newsPage).toContain('PlusIcon')
  expect(newsPage).not.toContain('ListIcon')
  expect(newsPage).not.toContain('ArrowLeftRightIcon')
  expect(newsPage).toContain('ios-float-pill')
  expect(newsPage).toContain('disabled:!text-[var(--nora-text-tertiary)]')
  expect(newsPage).toContain('disabled:opacity-100')
  expect(newsPage).toContain('pickedIds.size === 0')
  expect(newsPage).toContain('pickedCount === 0 ? DAY_STAT_CHIP_CLASS : DAY_PLAN_CHIP_CLASS')
  expect(newsPage).toContain(
    'bg-[var(--nora-tint)] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-white',
  )
  expect(newsPage).toContain('!bg-[var(--nora-tint)] !text-white')
  expect(newsPage).not.toContain('disabled:opacity-50')
  expect(newsPage).toContain("bg-[var(--nora-text)] py-0")
  expect(newsPage).toContain('dataset.diaryPicking')
  expect(newsPage).toContain('pickingDayKey !== group.dayKey &&')
  expect(newsPage).toContain('"opacity-45"')
  expect(newsPage).toContain("pickingDayKey === dayKey &&")
  expect(newsPage).toContain('pickLocked ? "opacity-45" : undefined')
  expect(newsPage).toContain('keepsWeeklyPlanOnDiaryDelete(')
  expect(newsPage).toContain('Убрано из дневника')
  expect(newsPage).toContain('writeSkippedPlanMealIds(')
  expect(newsPage).toContain('readSkippedPlanMealIds(')
  expect(newsPage).toContain('selectedPlanKey, subjectId')
  expect(newsPage).toContain('usePlanLibraryQuery(')
  expect(newsPage).not.toContain("from '@/features/mentor'")
  expect(newsPage).not.toContain('readUserAuthoredRations')
  expect(newsPage).not.toContain('appendMealToUserAuthoredRation')
  expect(newsPage).not.toContain('onSelectRation=')
  expect(picker).toContain('data-diary-plan-picker=""')
  expect(picker).not.toContain('data-modal-frame="meal"')
  expect(picker).toContain('h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))]')
  expect(picker).toContain('top-auto')
  expect(picker).not.toContain('top-[var(--modal-sheet-inset)] bottom-0')
  expect(picker).toContain('min-h-0 overflow-y-auto')
  expect(picker).toContain('data-diary-plan-select=""')
  expect(picker).toContain('flex shrink-0 flex-col gap-2 px-2 pt-2')
  expect(picker).not.toContain('mt-2.5 border-t border-[var(--nora-divider)] pt-2.5')
  expect(picker.indexOf('</DialogHeader>')).toBeLessThan(
    picker.indexOf('data-diary-plan-select=""'),
  )
  expect(picker).not.toContain('>План назначения<')
  expect(picker).not.toContain('>Дни плана<')
  expect(picker).toContain('data-diary-plan-divider=""')
  expect(picker).toContain('text-[13px] leading-4')
  expect(picker.indexOf('data-diary-plan-select=""')).toBeLessThan(
    picker.indexOf('data-diary-plan-divider=""'),
  )
  expect(picker).toContain('lockedPlan')
  expect(picker).toContain('allowPendingCopies')
  expect(picker).toContain('planDays')
  expect(picker).not.toContain('data-diary-add-destination=""')
  expect(picker).not.toContain("label: 'В рацион'")
  expect(picker).toContain('Добавить рацион')
  expect(picker).not.toContain('Добавить в план')
  expect(picker).not.toContain('День назначения')
  expect(picker).not.toContain('Без повторов')
  expect(picker).not.toContain('NoraSelect')
  expect(picker).toContain('data-diary-plan-card="new"')
  expect(picker).toContain('!selectedPlan && "grayscale"')
  expect(picker).not.toContain('data-diary-plan-cover-wash')
  expect(picker).not.toContain('mix-blend-color')
  expect(picker).toContain('data-diary-plan-scroll="back"')
  expect(picker).toContain('Показать предыдущие планы')
  expect(picker).toContain('planScrollEdges')
  expect(picker).toContain('overflow-x-auto')
  expect(picker).toContain('Новый план')
  expect(picker).toContain('w-[calc((100%-2rem)/5)]')
  expect(picker.indexOf('data-diary-plan-divider=""')).toBeLessThan(
    picker.indexOf('data-diary-new-plan=""'),
  )
  expect(picker).not.toContain('>Название<')
  expect(picker).not.toContain('>Описание<')
  expect(picker).toContain('data-diary-new-plan=""')
  expect(picker).toContain('data-diary-plan-title=""')
  expect(picker).toContain('data-diary-plan-description=""')
  expect(picker.indexOf('data-diary-new-plan=""')).toBeLessThan(
    picker.indexOf('data-diary-new-plan-divider=""'),
  )
  expect(picker).toContain('data-diary-plan-count=""')
  expect(picker).toContain('rationsCountLabel(plans.length)')
  expect(picker).toContain('max-md:hidden')
  expect(picker).toContain('data-diary-add-plan-day=""')
  expect(picker).toContain('Назовите план')
  expect(picker).toContain('Назовите план, добавьте дни и поставьте приём.')
  expect(picker).toContain('Коротко, что в плане')
  expect(picker).toContain('Добавить день')
  expect(picker).toContain('diaryNewPlanDays')
  expect(picker).toContain('NoraTextarea')
  expect(picker).toContain('onCreatePlan')
  expect(picker).toContain('dayCount: draftDayCount')
  expect(picker).toContain('onPlanDayCount')
  expect(newsPage).toContain('onCreatePlan=')
  expect(newsPage).toContain('title, coverImage, description, dayCount')
  expect(newsPage).toContain('diaryCreatePlanFromMeals(')
  expect(newsPage).toContain('withAuthoredPlan(')
  expect(picker).not.toContain('PLAN_DAY_TONE_CLASS')
  expect(picker).toContain('{day.label}')
  expect(picker).not.toContain('w-8 justify-center')
  expect(picker).not.toContain('{day.short}')
  expect(picker).not.toContain('CheckIcon')
  expect(picker).toContain('flex shrink-0 flex-col gap-2 px-2 pt-2')
  expect(picker).toContain('rounded-[16px] bg-[var(--nora-inset)] p-2.5')
  expect(picker).toContain('flex flex-col gap-2.5 px-3.5 pt-4')
  expect(picker).toContain('sr-only')
  expect(picker).not.toContain('line-clamp-2')
  expect(picker).toContain('Можно поставить в выбранный план, в один или несколько дней.')
  expect(picker).toContain('уже в рационе')
  expect(picker).toContain('lockedPlan ? "уже в дне" : "уже в рационе"')
  expect(picker).toContain('lockedPlan ? lockedTitle : "Добавить рацион"')
  expect(picker).not.toContain('уже в плане')
  expect(picker).toContain('size-2 rounded-full bg-[var(--nora-success)]')
  expect(picker).not.toContain('border-[var(--nora-success)] bg-[var(--nora-success)] text-white')
  expect(newsPage).toContain('meals={userMeals}')
  expect(newsPage).toContain('completedIds={completedIds}')
  expect(newsPage).toContain('diaryPlanCopiesOnDay(')
  expect(newsPage).toContain('Убрано из плана')
  expect(picker).toContain('occupancy.total > 0 && occupancy.fresh === 0')
  expect(picker).toContain('disabled={dayBusy || busy}')
  expect(picker).not.toContain('disabled={dayBusy || busy || already}')
  const addFn = newsPage.slice(
    newsPage.indexOf('async function addMealsToPlan'),
    newsPage.indexOf('const filtered'),
  )
  expect(addFn).not.toContain('setPlanMeals([])')
})

test('plan day picker stays open and occupied days can be toggled off', () => {
  const picker = readFileSync(
    new URL('../src/features/diary/DiaryPlanDayPicker.tsx', import.meta.url),
    'utf8',
  )
  const newsPage = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  const feed = readFileSync(
    new URL('../src/features/diary/SharedMealsFeed.tsx', import.meta.url),
    'utf8',
  )
  expect(picker).toContain('flex shrink-0 flex-col gap-2 px-2 pt-2')
  expect(picker).toContain('rounded-[16px] bg-[var(--nora-inset)] p-2.5')
  expect(picker).toContain('flex flex-col gap-2.5 px-3.5 pt-4')
  expect(picker).toContain('data-diary-plan-divider=""')
  expect(picker).not.toContain('>Дни плана<')
  expect(picker).not.toContain('CheckIcon')
  expect(picker).not.toContain("shadow-[0_1px_3px_color-mix(in_srgb,var(--nora-success)")
  expect(picker).toContain('disabled={dayBusy || busy}')
  expect(picker).not.toContain('disabled={dayBusy || busy || already}')
  const addFn = newsPage.slice(
    newsPage.indexOf('async function addMealsToPlan'),
    newsPage.indexOf('const filtered'),
  )
  expect(addFn).toContain('diaryPlanCopiesOnDay(')
  expect(addFn).toContain('Убрано из плана')
  expect(addFn).toContain('items.filter((item) => !copyIds.includes(item.id))')
  expect(addFn).not.toContain('setPlanMeals([])')
  const feedAdd = feed.slice(
    feed.indexOf('async function addMealToPlan'),
    feed.indexOf('if (mealsQuery.isError)'),
  )
  expect(feedAdd).toContain('diaryPlanCopiesOnDay(')
  expect(feedAdd).toContain('Убрано из плана')
  expect(feedAdd).not.toContain('setPlanMeal(null)')
  expect(feed).toContain('onCreatePlan=')
  expect(feed).toContain('title, coverImage, description, dayCount')
  expect(feed).toContain('diaryCreatePlanFromMeals(')
  expect(feed).toContain('onPlanDayCount=')
  expect(newsPage).toContain('onPlanDayCount=')
})

test('meal version select stays usable inside the meal dialog', () => {
  const detail = readFileSync(
    new URL('../src/features/diary/MealOpenDetail.tsx', import.meta.url),
    'utf8',
  )
  const newsPage = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(detail).toMatch(/<NoraSelect[\s\S]*?\bmodal\b/)
  expect(detail).toContain('disabled={!canRefine || sending || versionItems.length < 2}')
  expect(detail).not.toContain('disabled={!canRefine || busy || versionItems.length < 2}')
  expect(newsPage).toContain('disablePointerDismissal')
})

test('diary pick-mode add-to-plan chip is blue when meals are selected', () => {
  const newsPage = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(newsPage).toContain('В рацион')
  expect(newsPage).not.toContain('Добавить в план')
  expect(newsPage).not.toContain('Запланировать')
  expect(newsPage).toContain('const DAY_PLAN_CHIP_CLASS =')
  expect(newsPage).not.toContain('const DAY_PAST_CHIP_CLASS =')
  expect(newsPage).not.toContain('bg-[#16A34A]')
  expect(newsPage).not.toContain('bg-[#EAB308]')
  expect(newsPage).toContain(
    'bg-[var(--nora-tint)] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-white',
  )
  expect(newsPage).toContain(
    'pickedCount === 0 ? DAY_STAT_CHIP_CLASS : DAY_PLAN_CHIP_CLASS',
  )
  expect(newsPage).toContain('!bg-[var(--nora-tint)] !text-white')
})
