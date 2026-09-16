import { ArrowLeftIcon, BookOpenIcon, CalendarDaysIcon, CameraIcon } from 'lucide-react'

import { DiaryNewsPage, requestAddMeal, DIARY_MOBILE_DOCK_MOVE_ID } from '@/features/diary'
import { cn } from '@/lib/utils'

import {
  MOBILE_DOCK_BOTTOM_CLASS,
  MOBILE_DOCK_FAB_CLASS,
  MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS,
  MOBILE_DOCK_FAB_ICON_CLASS,
  PLAN_MOBILE_DOCK_ACTION_ID,
  PLAN_MOBILE_DOCK_EXTRA_ID,
  PLAN_MOBILE_DOCK_MOVE_ID,
  PLAN_MOBILE_DOCK_EDIT_ID,
} from './mobile-dock'
import { CurrentPlanPage, PlanPage } from './pages'
import { PLAN_PILL_TAB_CLASS, planToolbarPillClass } from './PlanToolbar'

export type GeneralNutritionView = 'diary' | 'plan'

const GENERAL_VIEWS = [
  { value: 'diary', label: 'Дневник', icon: BookOpenIcon },
  { value: 'plan', label: 'Рационы', icon: CalendarDaysIcon },
] as const

const GENERAL_HEADING = {
  title: 'Мой дневник',
  description: 'Дневник и рационы на одной странице — переключайтесь в панели.',
} as const

function GeneralViewSwitcher({
  className,
  variant = 'toolbar',
  view,
  onViewChange,
}: {
  className?: string
  variant?: 'toolbar' | 'fab'
  view: GeneralNutritionView
  onViewChange: (view: GeneralNutritionView) => void
}) {
  return (
    <div
      aria-label="Раздел"
      className={cn(
        variant === 'fab'
          ? 'ios-float-pill flex h-12 shrink-0 items-center rounded-full p-1'
          : cn(planToolbarPillClass, 'shrink-0 p-1'),
        className,
      )}
      role="group"
    >
      {GENERAL_VIEWS.map((option) => (
        <button
          aria-pressed={view === option.value}
          className={cn(PLAN_PILL_TAB_CLASS, 'gap-1')}
          data-active={view === option.value || undefined}
          key={option.value}
          onClick={() => {
            if (option.value === view) return
            onViewChange(option.value)
          }}
          type="button"
        >
          <option.icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
          {option.label}
        </button>
      ))}
    </div>
  )
}

function GeneralMobileDock({
  inPlanDetail,
  onBack,
  onViewChange,
  view,
}: {
  inPlanDetail: boolean
  onBack?: () => void
  onViewChange: (view: GeneralNutritionView) => void
  view: GeneralNutritionView
}) {
  return (
    <div className={cn(MOBILE_DOCK_BOTTOM_CLASS, 'left-4 flex items-center gap-2')}>
      {onBack ? (
        <>
          <button
            aria-label="Назад"
            className={MOBILE_DOCK_FAB_CLASS}
            onClick={onBack}
            type="button"
          >
            <ArrowLeftIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
          </button>
          <span className="flex items-center gap-2 empty:hidden" id={PLAN_MOBILE_DOCK_EDIT_ID} />
        </>
      ) : null}
      {inPlanDetail ? (
        <span className="flex items-center gap-2 empty:hidden" id={PLAN_MOBILE_DOCK_MOVE_ID} />
      ) : (
        <>
          <GeneralViewSwitcher onViewChange={onViewChange} variant="fab" view={view} />
          {view === 'diary' ? (
            <>
              <span className="flex items-center gap-2 empty:hidden" id={DIARY_MOBILE_DOCK_MOVE_ID} />
              <button
                aria-label="Добавить приём"
                className={MOBILE_DOCK_FAB_CLASS}
                data-diary-add-meal=""
                onClick={() => {
                  requestAddMeal()
                }}
                type="button"
              >
                <CameraIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS} strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <span className="flex items-center gap-2 empty:hidden" id={PLAN_MOBILE_DOCK_ACTION_ID} />
          )}
        </>
      )}
      <span className="flex items-center gap-2 empty:hidden" id={PLAN_MOBILE_DOCK_EXTRA_ID} />
    </div>
  )
}

export function GeneralNutritionPage({
  library,
  openPlanId,
  view,
  onClosePlan,
  onLibraryChange,
  onOpenPlan,
  onViewChange,
}: {
  library?: 'mine' | 'mentor' | 'catalog'
  openPlanId?: string
  view: GeneralNutritionView
  onClosePlan: () => void
  onLibraryChange?: (library: 'mine' | 'mentor' | 'catalog') => void
  onOpenPlan: (planId: string) => void
  onViewChange: (view: GeneralNutritionView) => void
}) {
  const desktopSwitcher = (
    <GeneralViewSwitcher className="max-md:hidden" onViewChange={onViewChange} view={view} />
  )
  const inPlanDetail = view === 'plan' && Boolean(openPlanId)
  const page =
    view === 'plan' && openPlanId ? (
      <CurrentPlanPage
        onBack={onClosePlan}
        onOpenPlan={onOpenPlan}
        planId={openPlanId === 'current' ? undefined : openPlanId}
        showMobileBackDock={false}
      />
    ) : view === 'plan' ? (
      <PlanPage
        heading={{
          ...GENERAL_HEADING,
          badge: library === 'catalog' ? 'Каталог' : 'План',
          title: library === 'catalog' ? 'Каталог' : GENERAL_HEADING.title,
          description:
            library === 'catalog'
              ? 'Готовые планы на семь дней. Добавьте в «Мои», чтобы менять приёмы.'
              : GENERAL_HEADING.description,
        }}
        library={library}
        onLibraryChange={onLibraryChange}
        onOpenPlan={onOpenPlan}
        toolbarStart={library === 'catalog' ? undefined : desktopSwitcher}
      />
    ) : (
      <DiaryNewsPage
        heading={{ ...GENERAL_HEADING, badge: 'Дневник' }}
        toolbarStart={desktopSwitcher}
      />
    )

  return (
    <div className="max-md:pb-24">
      {page}
      <GeneralMobileDock
        inPlanDetail={inPlanDetail}
        onBack={inPlanDetail ? onClosePlan : undefined}
        onViewChange={onViewChange}
        view={view}
      />
    </div>
  )
}
