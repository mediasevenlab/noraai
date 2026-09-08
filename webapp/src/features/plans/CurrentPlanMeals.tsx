import * as React from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarIcon, ArrowLeftRightIcon, UtensilsIcon, XIcon, ZapIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/features/auth'
import { questionnaireDailyCalorieTarget, useQuestionnaireQuery } from '@/features/users'
import {
  apiMealIdForCatalogPreview,
  CALORIE_BALANCE_CHIP_CLASS,
  calorieBalanceTone,
  catalogFavoriteCreateDraft,
  Cover,
  createMyMeal,
  deleteMyMeal,
  favoriteMealIdsForSync,
  favoritesQueryKeys,
  imagesForDiaryMeal,
  isApiMealId,
  isPlanPreviewMealId,
  isRationPlanDone,
  MealCard,
  MealDialogHero,
  MealMacrosPlaque,
  MealOpenDetail,
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  mealCardOrigin,
  mealCanShareToFeed,
  mealImageFromUrl,
  mealsCountLabel,
  mealsQueryKeys,
  readDiaryState,
  readSavedMealIds,
  reconcileLocalFavoriteIds,
  shareMyMeal,
  useUserFavoritesQuery,
  writeSavedMealIds,
  type MealEntry,
  type MealMacrosRevealState,
} from '@/features/diary'
import { cn } from '@/lib/utils'
import { putUserFavorites } from '@/platform/account-favorites'
import { notifyHybridFavoriteAdded } from '@/platform/hybrid-notifications'
import { mergeFavoriteIds } from '@/platform/saved-ids'

import { defaultPlanDayKey, PLAN_DAY_TAB_SLOTS, planDayTabParts, type WeekPlanDay } from './week-plan'
import {
  MOBILE_DOCK_FAB_ICON_CLASS,
  MOBILE_DOCK_PILL_CLASS,
  PLAN_MOBILE_DOCK_MOVE_ID,
} from './mobile-dock'
import {
  PlanMealDragGhost,
  PlanMealDragHandle,
  PlanMealGrid,
  usePlanMealDrag,
} from './PlanMealsBoard'
import {
  applyPlanMealLayout,
  layoutFromDays,
  movePlanMeals,
  readPlanMealLayout,
  writePlanMealLayout,
} from './plan-meal-layout'

const EMPTY_GALLERIES: Record<string, Record<string, string[]>> = {}

const PLAN_DAY_BADGE_CLASS =
  'ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[color-mix(in_srgb,var(--nora-input-bg)_55%,var(--nora-canvas))] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-[var(--nora-text-secondary)] backdrop-blur-[16px]'
const PLAN_DAY_TAB_CLASS =
  'nora-press-grow relative flex h-[4.75rem] flex-col items-center justify-between rounded-full bg-[var(--nora-inset)] px-1 pb-2 pt-2.5 outline-none focus-visible:shadow-[var(--nora-shadow-focus)]'
const PLAN_DAY_TAB_SELECTED_CLASS = 'bg-[#2C2C2E]'
const PLAN_DAY_TAB_PLACEHOLDER_CLASS =
  'relative flex h-[4.75rem] flex-col items-center justify-between rounded-full bg-[color-mix(in_srgb,var(--nora-inset)_46%,var(--nora-panel))] px-1 pb-2 pt-2.5'

export function CurrentPlanMeals({
  completedIds,
  days,
  onDetachPlanMeal,
  planId,
  readOnly = false,
  canReorder,
}: {
  completedIds: ReadonlySet<string>
  days: readonly WeekPlanDay[]
  onDetachPlanMeal: (mealId: string) => void
  planId?: string
  readOnly?: boolean
  canReorder?: boolean
}) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const user = auth.user
  const subjectId = user?.role === 'user' ? user.id : undefined
  const savedScope = { userId: subjectId ?? 'guest', email: user?.email }
  const [saved, setSaved] = React.useState(() => readSavedMealIds(savedScope))
  const savedIdentity = `${savedScope.userId}:${savedScope.email ?? ''}`
  const [loadedIdentity, setLoadedIdentity] = React.useState(savedIdentity)
  if (loadedIdentity !== savedIdentity) {
    setLoadedIdentity(savedIdentity)
    setSaved(readSavedMealIds(savedScope))
  }
  const allowReorder = canReorder ?? !readOnly
  const [layout, setLayout] = React.useState(() => readPlanMealLayout(savedScope, planId ?? ''))
  const layoutKey = `${planId ?? ''}:${savedIdentity}`
  const [loadedLayoutKey, setLoadedLayoutKey] = React.useState(layoutKey)
  if (loadedLayoutKey !== layoutKey) {
    setLoadedLayoutKey(layoutKey)
    setLayout(readPlanMealLayout(savedScope, planId ?? ''))
  }
  const appliedDays = React.useMemo(
    () => applyPlanMealLayout(days, layout),
    [days, layout],
  )
  const [previewDays, setPreviewDays] = React.useState<WeekPlanDay[] | null>(null)
  const boardDays = previewDays ?? appliedDays
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [openMacrosReveal, setOpenMacrosReveal] = React.useState<MealMacrosRevealState>({
    rolling: false,
  })
  const meals = boardDays.flatMap((day) => day.meals)
  const openMeal = openId ? meals.find((meal) => meal.id === openId) ?? null : null
  const openMealImages = openMeal ? imagesForDiaryMeal(openMeal, EMPTY_GALLERIES) : []
  const favoritesQuery = useUserFavoritesQuery(Boolean(subjectId && user))
  const questionnaireQuery = useQuestionnaireQuery(Boolean(user && subjectId && user.id === subjectId))
  const dailyCalories =
    questionnaireDailyCalorieTarget(questionnaireQuery.data?.answers) ??
    (subjectId ? readDiaryState(subjectId)?.dailyCalories : undefined) ??
    2200
  const [selectedDayKey, setSelectedDayKey] = React.useState(() => defaultPlanDayKey(boardDays))
  const fillDayRow = boardDays.length <= PLAN_DAY_TAB_SLOTS
  const dayTabWidthClass = fillDayRow ? 'min-w-0 flex-1' : 'w-14 shrink-0'
  const placeholderCount = fillDayRow ? PLAN_DAY_TAB_SLOTS - boardDays.length : 0
  const selectedDay =
    boardDays.find((day) => day.dayKey === selectedDayKey) ?? boardDays[0] ?? null
  if (selectedDay && selectedDay.dayKey !== selectedDayKey) {
    setSelectedDayKey(selectedDay.dayKey)
  }
  const dayTabListRef = React.useRef<HTMLDivElement>(null)
  const [picking, setPicking] = React.useState(false)
  const [pickedIds, setPickedIds] = React.useState<Set<string>>(() => new Set())
  const [dockMove, setDockMove] = React.useState<HTMLElement | null>(null)
  const drag = usePlanMealDrag({
    canReorder: allowReorder && !picking,
    days: boardDays,
    onDaysChange: setPreviewDays,
    onHoverDay: picking ? undefined : setSelectedDayKey,
  })
  const dragging = drag.drag
  React.useLayoutEffect(() => {
    setDockMove(allowReorder ? document.getElementById(PLAN_MOBILE_DOCK_MOVE_ID) : null)
  }, [allowReorder])

  React.useEffect(() => {
    if (dragging || !previewDays) return
    const next = layoutFromDays(previewDays)
    setLayout(next)
    if (planId) writePlanMealLayout(savedScope, planId, next)
    setPreviewDays(null)
  }, [dragging, planId, previewDays, savedScope.email, savedScope.userId])

  React.useEffect(() => {
    const selected = dayTabListRef.current?.querySelector('[aria-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selectedDay?.dayKey])

  React.useEffect(() => {
    if (!subjectId || !user) {
      setSaved(new Set())
      return
    }
    if (!favoritesQuery.data) return
    const scope = { userId: subjectId, email: user.email }
    const local = readSavedMealIds(scope)
    const merged = mergeFavoriteIds(favoritesQuery.data.mealIds, local)
    const next = new Set(merged)
    setSaved(next)
    writeSavedMealIds(scope, next)
    const remoteSet = new Set(favoritesQuery.data.mealIds)
    const localApi = favoriteMealIdsForSync(merged)
    if (localApi.some((id) => !remoteSet.has(id))) {
      void putUserFavorites(auth.transport, { mealIds: localApi })
        .then((remote) => {
          queryClient.setQueryData(favoritesQueryKeys.forUser(subjectId), remote)
          const reconciled = reconcileLocalFavoriteIds(merged, remote.mealIds)
          setSaved(reconciled)
          writeSavedMealIds(scope, reconciled)
        })
        .catch(() => {
          // Keep local bookmarks; a later visit retries quietly.
        })
    }
  }, [auth.transport, favoritesQuery.data, queryClient, subjectId, user])

  function cachedSubjectMeals() {
    if (!subjectId) return []
    const cached = queryClient.getQueryData<{ items?: Array<{ id: string; assumptions?: string[] }> }>(
      mealsQueryKeys.forSubject(subjectId),
    )
    return cached?.items ?? []
  }

  async function persistFavoriteIds(next: Set<string>, options?: { quiet?: boolean }) {
    setSaved(next)
    writeSavedMealIds(savedScope, next)
    try {
      const remote = await putUserFavorites(auth.transport, {
        mealIds: favoriteMealIdsForSync(next),
      })
      queryClient.setQueryData(favoritesQueryKeys.forUser(subjectId), remote)
      const reconciled = reconcileLocalFavoriteIds(next, remote.mealIds)
      setSaved(reconciled)
      writeSavedMealIds(savedScope, reconciled)
      return true
    } catch {
      if (!options?.quiet) {
        toast.error('Не удалось сохранить избранное', { id: 'favorites-save-failed' })
      } else if (subjectId) {
        void queryClient.invalidateQueries({ queryKey: favoritesQueryKeys.forUser(subjectId) })
      }
      return false
    }
  }

  async function toggleSave(meal: MealEntry) {
    if (!subjectId) return
    const willSave = !saved.has(meal.id)
    if (isPlanPreviewMealId(meal.id) && willSave) {
      try {
        const image = await mealImageFromUrl(meal.image)
        const created = await createMyMeal(auth.transport, {
          ...catalogFavoriteCreateDraft(meal),
          ...(image ? { imageBase64: image.base64, imageMime: image.mime } : {}),
        })
        const next = new Set(saved)
        next.add(meal.id)
        next.add(created.meal.id)
        await persistFavoriteIds(next, { quiet: true })
        await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(subjectId) })
        toast.success('Добавлено в избранное', { id: 'favorite-added' })
        void notifyHybridFavoriteAdded(meal.title)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось добавить в избранное')
      }
      return
    }
    const next = new Set(saved)
    if (willSave) next.add(meal.id)
    else {
      next.delete(meal.id)
      const linked = apiMealIdForCatalogPreview(meal.id, cachedSubjectMeals())
      if (linked) next.delete(linked)
    }
    const ok = await persistFavoriteIds(next)
    if (!ok) return
    if (willSave) {
      toast.success('Добавлено в избранное', { id: 'favorite-added' })
      void notifyHybridFavoriteAdded(meal.title)
    } else toast('Убрано из избранного', { id: 'favorite-removed' })
  }

  async function deleteMeal(meal: MealEntry) {
    if (!subjectId || !user) return
    if (isRationPlanDone(meal, completedIds)) {
      onDetachPlanMeal(meal.id)
      if (openId === meal.id) setOpenId(null)
      toast.success('Убрано из плана')
      return
    }
    const isApiMeal = Boolean(meal.fromApi || isApiMealId(meal.id))
    try {
      if (isApiMeal) {
        await deleteMyMeal(auth.transport, meal.id)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(subjectId) }),
          queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() }),
        ])
      }
      if (openId === meal.id) setOpenId(null)
      toast.success('Убрано из плана')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить карточку')
    }
  }

  async function shareMeal(meal: MealEntry) {
    if (!subjectId || !user) return
    const isApiMeal = Boolean(meal.fromApi || isApiMealId(meal.id))
    if (!isApiMeal) {
      toast.error('Опубликовать можно только сохранённый приём')
      return
    }
    if (!mealCanShareToFeed(meal) && !meal.shared) {
      toast.error('В ленту можно отправить только свой приём')
      return
    }
    const nextShared = !meal.shared
    try {
      await shareMyMeal(auth.transport, meal.id, { shared: nextShared })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(subjectId) }),
        queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() }),
      ])
      toast.success(nextShared ? 'Приём опубликован в ленте' : 'Приём скрыт из ленты')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить публикацию')
    }
  }

  function mealDayKey(mealId: string) {
    return boardDays.find((day) => day.meals.some((item) => item.id === mealId))?.dayKey
  }

  function togglePicking() {
    setPicking((current) => {
      if (current) setPickedIds(new Set())
      return !current
    })
  }

  function togglePick(mealId: string) {
    setPickedIds((current) => {
      const next = new Set(current)
      if (next.has(mealId)) next.delete(mealId)
      else next.add(mealId)
      return next
    })
  }

  function commitDays(next: WeekPlanDay[]) {
    const stored = layoutFromDays(next)
    setLayout(stored)
    if (planId) writePlanMealLayout(savedScope, planId, stored)
    setPreviewDays(null)
  }

  function movePickedTo(dayKey: string) {
    if (pickedIds.size === 0 || dayKey === selectedDayKey) return
    const ordered = boardDays.flatMap((day) =>
      day.meals.filter((meal) => pickedIds.has(meal.id)).map((meal) => meal.id),
    )
    commitDays(movePlanMeals(boardDays, ordered, dayKey))
    setPickedIds(new Set())
    setPicking(false)
    setSelectedDayKey(dayKey)
    toast.success('Приёмы перемещены', { id: 'plan-meals-moved' })
  }

  function mealCard(meal: MealEntry) {
    const dayKey = mealDayKey(meal.id)
    const day = dayKey ? boardDays.find((item) => item.dayKey === dayKey) : null
    const order = day ? day.meals.findIndex((item) => item.id === meal.id) + 1 : undefined
    return (
      <MealCard
        completedIds={completedIds}
        footerStart={
          allowReorder && !picking && dayKey ? (
            <PlanMealDragHandle onPointerDown={(event) => drag.startDrag(event, meal, dayKey)} />
          ) : null
        }
        images={imagesForDiaryMeal(meal, EMPTY_GALLERIES)}
        key={meal.id}
        meal={meal}
        onDelete={() => {
          if (!readOnly) void deleteMeal(meal)
        }}
        onOpen={() => setOpenId(meal.id)}
        onShare={() => {
          if (!readOnly) void shareMeal(meal)
        }}
        onToggleSave={() => {
          void toggleSave(meal)
        }}
        orderBadge={order && order > 0 ? order : undefined}
        readOnly={readOnly}
        saved={saved.has(meal.id)}
        selected={picking && pickedIds.has(meal.id)}
        showPlanState={false}
      />
    )
  }

  function dayMeta(day: WeekPlanDay) {
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5 py-3">
        <div className={PLAN_DAY_BADGE_CLASS}>
          <CalendarIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
          {day.short}
        </div>
        <div
          className={cn(
            PLAN_DAY_BADGE_CLASS,
            CALORIE_BALANCE_CHIP_CLASS[calorieBalanceTone(day.kcal, dailyCalories)],
          )}
        >
          <ZapIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
          <span className="tabular-nums">{day.kcal} ккал</span>
        </div>
        <div className={cn(PLAN_DAY_BADGE_CLASS, 'ml-auto')}>
          <UtensilsIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
          {mealsCountLabel(day.mealsCount)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        <div
          aria-label="Дни плана"
          className={cn(
            'flex w-full gap-1.5',
            fillDayRow ? '' : 'no-scrollbar overflow-x-auto overscroll-x-contain',
          )}
          ref={dayTabListRef}
          role="tablist"
        >
          {boardDays.map((day, index) => {
              const parts = planDayTabParts(day, index)
              const active = day.dayKey === selectedDay?.dayKey
              const daysLocked = picking && pickedIds.size === 0
              return (
                <button
                  aria-disabled={daysLocked || undefined}
                  aria-label={day.done ? `${parts.label}, выполнен` : parts.label}
                  aria-pressed={active}
                  aria-selected={active}
                  className={cn(
                    PLAN_DAY_TAB_CLASS,
                    dayTabWidthClass,
                    active && !daysLocked && PLAN_DAY_TAB_SELECTED_CLASS,
                    daysLocked && 'pointer-events-none opacity-40',
                  )}
                  data-plan-day-index={day.meals.length}
                  data-plan-day-tab={day.dayKey}
                  data-selected={active && !daysLocked ? '' : undefined}
                  disabled={daysLocked}
                  key={day.dayKey}
                  onClick={() => {
                    if (daysLocked) return
                    if (picking && pickedIds.size > 0) {
                      movePickedTo(day.dayKey)
                      return
                    }
                    setSelectedDayKey(day.dayKey)
                  }}
                  role="tab"
                  type="button"
                >
                  <CalendarIcon
                    aria-hidden
                    className={cn(
                      'size-3.5',
                      active ? 'text-[#888888]' : 'text-[var(--nora-text-secondary)]',
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="mt-auto inline-flex size-7 items-center justify-center">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-[13px] font-semibold leading-none tabular-nums',
                        active
                          ? 'bg-[var(--nora-tint)] text-white'
                          : 'bg-[var(--nora-panel)] text-[var(--nora-text)]',
                      )}
                    >
                      {parts.ordinal}
                    </span>
                  </span>
                </button>
              )
            })}
            {Array.from({ length: placeholderCount }, (_, index) => {
              const ordinal = boardDays.length + index + 1
              return (
                <span
                  aria-hidden
                  className={cn(PLAN_DAY_TAB_PLACEHOLDER_CLASS, dayTabWidthClass, 'pointer-events-none')}
                  key={`plan-day-placeholder-${ordinal}`}
                >
                  <CalendarIcon
                    aria-hidden
                    className="size-3.5 text-[color-mix(in_srgb,var(--nora-text)_20%,var(--nora-panel))]"
                    strokeWidth={1.75}
                  />
                  <span className="relative mt-auto inline-flex size-7 items-center justify-center">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nora-inset)_28%,var(--nora-panel))] text-[13px] font-semibold leading-none tabular-nums text-[color-mix(in_srgb,var(--nora-text)_22%,var(--nora-panel))]">
                      {ordinal}
                    </span>
                  </span>
                </span>
              )
            })}
        </div>
        {selectedDay ? (
          <section className="flex flex-col gap-3">
            {dayMeta(selectedDay)}
            <PlanMealGrid
              canReorder={allowReorder && !picking}
              day={selectedDay}
              drag={dragging}
              onOpenMeal={setOpenId}
              onPointerUp={drag.onPointerUp}
              onTogglePick={togglePick}
              pickedIds={pickedIds}
              picking={picking}
              renderMeal={mealCard}
            />
          </section>
        ) : null}
      </div>
      <div className="hidden flex-col gap-6 md:flex">
        {boardDays.map((day) => (
          <section className="flex flex-col gap-3" key={day.dayKey}>
            {dayMeta(day)}
            <PlanMealGrid
              canReorder={allowReorder}
              day={day}
              drag={dragging}
              onOpenMeal={setOpenId}
              onPointerUp={drag.onPointerUp}
              renderMeal={mealCard}
            />
          </section>
        ))}
      </div>
      <PlanMealDragGhost days={boardDays} drag={dragging} renderMeal={mealCard} />
      {dockMove && allowReorder
        ? createPortal(
            <button
              aria-pressed={picking}
              className={MOBILE_DOCK_PILL_CLASS}
              data-active={picking || undefined}
              onClick={togglePicking}
              type="button"
            >
              {picking ? (
                <XIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
              ) : (
                <ArrowLeftRightIcon
                  aria-hidden
                  className={MOBILE_DOCK_FAB_ICON_CLASS}
                  strokeWidth={1.75}
                />
              )}
              {picking ? 'Отмена' : 'Переместить'}
            </button>,
            dockMove,
          )
        : null}
      <Dialog
        open={Boolean(openMeal)}
        onOpenChange={(open) => {
          if (!open) {
            setOpenId(null)
            setOpenMacrosReveal({ rolling: false })
          }
        }}
      >
        <DialogContent
          className={MEAL_DIALOG_FRAME_CLASS}
          data-modal-frame="meal"
          showCloseButton={false}
        >
          {openMeal ? (
            <>
              <MealDialogHero
                macros={
                  <MealMacrosPlaque
                    meal={openMeal}
                    rolling={openMacrosReveal.rolling}
                    rollingKeys={openMacrosReveal.rollingKeys}
                  />
                }
                origin={mealCardOrigin(openMeal)}
                preview={
                  <Cover
                    className={MEAL_DIALOG_COVER_CLASS}
                    images={openMealImages}
                    key={openMeal.id}
                    meal={openMeal}
                    sizes="lg"
                  />
                }
              />
              <MealOpenDetail
                completedIds={completedIds}
                meal={openMeal}
                onMacrosRevealChange={setOpenMacrosReveal}
                subjectUserId={subjectId}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
