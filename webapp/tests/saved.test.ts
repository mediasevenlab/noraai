import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const diaryIndex = readFileSync(
  new URL('../src/features/diary/index.ts', import.meta.url),
  'utf8',
)
const mentorIndex = readFileSync(
  new URL('../src/features/mentor/index.ts', import.meta.url),
  'utf8',
)
const appNav = readFileSync(
  new URL('../src/features/users/UserAppNavigation.tsx', import.meta.url),
  'utf8',
)
const pages = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const routes = readFileSync(new URL('../src/routes.tsx', import.meta.url), 'utf8')
const planToolbar = readFileSync(
  new URL('../src/features/plans/PlanToolbar.tsx', import.meta.url),
  'utf8',
)
const planPage = readFileSync(new URL('../src/features/plans/pages.tsx', import.meta.url), 'utf8')
const feedPage = readFileSync(
  new URL('../src/features/diary/pages/feed.tsx', import.meta.url),
  'utf8',
)
const rationsFeed = readFileSync(
  new URL('../src/features/diary/SharedRationsFeed.tsx', import.meta.url),
  'utf8',
)
const generalPage = readFileSync(
  new URL('../src/features/plans/GeneralNutritionPage.tsx', import.meta.url),
  'utf8',
)
const shell = readFileSync(
  new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
  'utf8',
)

test('global saved collection is gone; favorites stay in diary and plans', () => {
  expect(existsSync(new URL('../src/features/saved/index.ts', import.meta.url))).toBe(false)
  expect(existsSync(new URL('../src/features/saved/pages/saved.tsx', import.meta.url))).toBe(false)
  expect(existsSync(new URL('../src/features/diary/SavedDiaryMealsFeed.tsx', import.meta.url))).toBe(
    false,
  )
  expect(diaryIndex).not.toContain('SavedDiaryMealsFeed')
  expect(mentorIndex).not.toContain('SavedRationsFeed')
  expect(appNav).not.toContain('/app/saved')
  expect(appNav).not.toContain('Сохраненное')
  expect(appNav).not.toContain('SHOW_SAVED_NAV')
  expect(pages).toContain('search={userGeneralSearch()} to="/app/general"')
  expect(routes).toContain("path: '/app/saved'")
  expect(planToolbar).toContain("PLAN_TABS = ['Все', 'Избранное']")
  expect(planToolbar).toContain('aria-pressed={tab === \'Избранное\'}')
  expect(planToolbar).toContain('BookmarkIcon')
  expect(planToolbar).toContain("tab === 'Избранное' && 'fill-current'")
  expect(planToolbar).not.toContain('aria-label="Избранное"')
  expect(planToolbar).not.toContain('{PLAN_TABS.map')
  expect(planToolbar).toContain('Создать рацион')
  expect(planToolbar).not.toContain('Создать план')
  expect(planToolbar).not.toContain('PLAN_OWNER_LIBRARIES')
  expect(planToolbar).not.toContain("label: 'Мои'")
  expect(planToolbar).not.toContain("label: 'Наставник'")
  expect(planToolbar).not.toContain("label: 'Все цели'")
  expect(planToolbar).not.toContain("label: 'Все планы'")
  expect(planToolbar).not.toContain('chevron="circle"')
  expect(planToolbar).not.toContain('productToolbarCapsuleSelectClass')
  expect(feedPage).toContain('chevron="circle"')
  expect(feedPage).toContain('productToolbarCapsuleSelectClass')
  expect(planToolbar).toContain('ProductToolbarSearch')
  expect(planToolbar).not.toContain("searchOpen && 'max-md:overflow-hidden'")
  expect(planToolbar).toContain("searchOpen && 'max-md:flex-1'")
  expect(planToolbar).toContain('searchOpen && productToolbarSearchCollapseClass')
  expect(planToolbar).toContain('md:flex-none md:w-[16rem] md:shrink-0')
  expect(planToolbar).not.toContain('px-1 md:w-[16rem] md:shrink-0')
  expect(feedPage).toContain("FEED_KINDS.map")
  expect(feedPage).toContain("'Приёмы'")
  expect(feedPage).toContain("'Рационы'")
  expect(feedPage).toContain('Мои лайки')
  expect(feedPage).toContain('HeartIcon')
  expect(feedPage).toContain('productToolbarSearchCollapseClass')
  expect(feedPage).not.toContain("FEED_TABS")
  expect(feedPage).toContain('SharedRationsFeed')
  expect(feedPage).toContain('ml-auto flex min-w-0 items-center gap-2')
  expect(feedPage).toContain('md:flex-none md:w-[16rem] md:shrink-0')
  expect(feedPage).toContain('DiaryPeriodPicker')
  expect(feedPage).toContain('disabled={searchOpen}')
  expect(feedPage).toContain('data-feed-search=""')
  expect(feedPage).toContain("max-md:w-0 max-md:opacity-0 w-9")
  expect(feedPage).toContain('subjectKey="feed"')
  expect(rationsFeed).toContain('data-plan-summary=""')
  expect(rationsFeed).toContain('daysCountLabel(ration.days)')
  expect(rationsFeed).toContain('ration.meals.length')
  expect(rationsFeed).toContain('ListIcon')
  expect(rationsFeed).toContain('PlusIcon')
  expect(rationsFeed).toContain('canAddSharedRationToMine')
  expect(rationsFeed).toContain('FEED_RATION_PLUS_CLASS')
  expect(rationsFeed).toContain('onOpenRation')
  expect(rationsFeed).not.toContain('DialogContent')
  expect(rationsFeed).not.toContain('MealDialogHero')
  expect(pages).toContain('sharedRationId={rationId}')
  expect(pages).toContain('CurrentPlanPage')
  expect(pages).toContain('userFeedSearch')
  expect(planToolbar).toContain('max-md:hidden max-sm:size-9')
  expect(planToolbar).not.toContain('data-plan-library')
  expect(planPage).toContain('Пока нет избранных планов')
  expect(planPage).toContain('onTabChange={setTab}')
  expect(planPage).not.toContain('onLibraryChange={changeLibrary}')
})

test('sidebar keeps Общее as the only diary and plan surface', () => {
  expect(appNav).toContain('label="Питание"')
  expect(appNav).toContain("label: 'Мой дневник'")
  expect(appNav).not.toContain('label="Общее"')
  expect(appNav).not.toContain("label: 'Общее'")
  expect(appNav).toContain("label: 'Каталог'")
  expect(appNav).toContain("to: '/app/general'")
  expect(appNav).toContain("userGeneralSearch('plan', undefined, 'catalog')")
  expect(appNav).toContain('label="Социальная сеть"')
  expect(appNav).toContain('userFeedSearch()')
  expect(appNav).toContain('to="/app/feed"')
  expect(appNav).toContain('to="/app/general"')
  expect(appNav).not.toContain('UserNavLink')
  expect(appNav).not.toContain('Соц. сеть')
  expect(appNav).not.toContain('SHOW_USER_SPLIT_NUTRITION_NAV')
  expect(appNav).not.toContain("to: '/app/diary'")
  expect(appNav).not.toContain("to: '/app/plan'")
  expect(shell).toContain("label: 'Каталог'")
  expect(shell).toContain("userGeneralSearch('plan', undefined, 'catalog')")
  expect(shell).not.toContain('isUserSplitNutritionNavPath')
  expect(shell).not.toContain('SHOW_USER_SPLIT_NUTRITION_NAV')
  expect(pages).toContain('UserGeneralPage')
  expect(pages).toContain('GeneralNutritionPage')
  expect(routes).toContain("path: '/app/general'")
  expect(routes).toContain("path: '/app/feed'")
  expect(routes).toContain('rationId')
  expect(generalPage).toContain("title: 'Мой дневник'")
  expect(generalPage).toContain('PlanPage')
  expect(generalPage).toContain("'Дневник'")
  expect(generalPage).toContain("'План'")
  expect(generalPage).toContain('ios-float-pill')
  expect(generalPage).toContain('ios-float-pill-dock')
  expect(generalPage).toContain("variant === 'fab' && 'font-medium'")
  expect(generalPage).toContain('PLAN_MOBILE_DOCK_EXTRA_ID')
  expect(generalPage).toContain('max-md:hidden')
  expect(generalPage).toContain('left-4')
  expect(generalPage).toContain("variant === 'fab'")
  expect(generalPage).toContain('BookOpenIcon')
  expect(generalPage).toContain('CalendarDaysIcon')
  expect(generalPage).toContain('CameraIcon')
  expect(generalPage).not.toContain('UtensilsIcon')
  expect(generalPage).toContain('MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS')
  expect(generalPage.lastIndexOf('PLAN_MOBILE_DOCK_ACTION_ID')).toBeLessThan(
    generalPage.lastIndexOf('PLAN_MOBILE_DOCK_EXTRA_ID'),
  )
  expect(generalPage).toContain('PLAN_MOBILE_DOCK_MOVE_ID')
  expect(generalPage).toContain('PLAN_MOBILE_DOCK_EDIT_ID')
  expect(generalPage).toContain('DIARY_MOBILE_DOCK_MOVE_ID')
  expect(generalPage).toContain('inPlanDetail')
  expect(generalPage).toContain('requestAddMeal')
  expect(generalPage).toContain('aria-label="Добавить приём"')
  expect(generalPage).toContain("view === 'diary'")
  expect(generalPage).toContain('data-diary-add-meal')
  expect(pages).toContain('openPlanId')
  expect(pages).toContain('onOpenPlan')
  expect(pages).toContain('userGeneralSearch()')
  expect(pages).toContain("userGeneralSearch('plan')")
  expect(pages).toContain("userGeneralSearch('plan', 'current')")
  expect(routes).toContain('planId')
})
