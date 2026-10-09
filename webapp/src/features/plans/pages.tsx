import * as React from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftIcon, BookmarkIcon, CalendarRangeIcon, PencilIcon, UtensilsIcon } from '@/components/icons'
import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toast'

import { NoraButton } from '@/components/nora/primitives'
import { DeleteCardDialog } from '@/features/diary/DeleteCardDialog'
import { planCardDeletePrompt } from '@/features/diary/delete-card-prompt'
import { cn } from '@/lib/utils'
import {
  ProductFeedEmpty,
  SectionLoading,
  productFeedToolbarRowClass,
  productFeedToolbarStickyClass,
} from '@/components/nora/product-sheet'
import { useAuth } from '@/features/auth'
import { userGeneralSearch } from '@/features/navigation'
import {
  AUTHORED_PLAN_ID_PREFIX,
  createAuthoredPlan,
  emptyRationDraft,
  isAuthoredPlanId,
  mentorRationToEntry,
  rationPlanWeekDays,
  RationEditorDialog,
  useCreateMentorPlanMutation,
  useMentorPlansQuery,
  usePlanAssignmentQuery,
  type RationDraft,
  type RationEntry,
} from '@/features/mentor'
import {
  authoredCloneOfSharedRation,
  matchingMentorPlanByTitle,
  MENTOR_FEED_PLAN_CAP,
  mentorPlanRequestFromSharedRation,
  daysCountLabel,
  orderByLatestBookmark,
  mealsCountLabel,
  mealsForWeekPlan,
  mealRemovedWithRation,
  mealsQueryKeys,
  planOccurrenceDiaryAt,
  shareMyRation,
  usableMealCover,
  useSharedRationsQuery,
} from '@/features/diary'
import {
  authoredPlanCanShareToFeed,
  isAssignedPlanId,
  parsePlanGoal,
  writeAssignedPlans,
} from '@/platform/authored-plans'
import { notifyHybridFavoriteAdded } from '@/platform/hybrid-notifications'
import { forgetMyRation } from '@/features/users/api'
import {
  hiddenRationIds,
  hideRation,
  rationCardNeedsLocalHide,
  unhideRation,
} from './hidden-rations'
import { orderRationCopiesAfterSource, rationCanCopyForEdit, rationCopyTitle, rationDaysForCopy } from './ration-copy'
import { readPlanStartDate, suggestedPlanStartDate } from '@/platform/plan-start'
import { dayKeyFromDate, startOfLocalDay } from '@/platform/plan-slots'
import { withAuthoredPlan, withoutAuthoredPlan } from '@/platform/plan-library-local'

import { CurrentPlanMeals } from './CurrentPlanMeals'
import {
  MOBILE_DOCK_BOTTOM_CLASS,
  MOBILE_DOCK_FAB_CLASS,
  MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS,
  MOBILE_DOCK_FAB_ICON_CLASS,
  MOBILE_DOCK_PILL_CLASS,
  PLAN_MOBILE_DOCK_ACTION_ID,
  PLAN_MOBILE_DOCK_EDIT_ID,
  PLAN_MOBILE_DOCK_EXTRA_ID,
} from './mobile-dock'
import {
  authoredCloneOfCatalog,
  catalogPlanById,
  isCatalogPlanId,
  PLAN_CATALOG,
} from './plan-catalog'
import { stampRationDaysOntoPlan, catalogCloneErrorMessage, firstDurablePlanCover } from './plan-create'
import { PlanOutlineDialog } from './PlanOutlineDialog'
import { PlanPageShell } from './PlanPageShell'
import {
  applyPlanMealLayout,
  layoutFromDays,
  planLayoutDayCount,
  readPlanMealLayout,
  writePlanMealLayout,
} from './plan-meal-layout'
import {
  WEEK_PLAN_OUTLINE_KEY,
  writePlanOutline,
} from './plan-outline'
import { planFeedGridClass, readPlanCardLayout, writePlanCardLayout, type PlanCardLayout } from './plan-card-layout'
import { PlanStartDialog } from './PlanStartDialog'
import { useSyncedPlanLibrary } from './use-plan-library'
import { PlanToolbar, visiblePlanCards, partitionPlanCards, PlanGroupHeading, PLAN_GROUP_ICONS, planToolbarPillClass, type PlanFeedTab, type PlanLibrary } from './PlanToolbar'
import { useCurrentWeekPlan } from './use-current-week-plan'
import { WeekPlanCard } from './WeekPlanCard'
import { buildWeekPlan, buildWeekPlanFromCatalog, buildWeekPlanFromRation, buildWeekPlanFromSharedRation, formatPlanActiveRange, nextPlanDayCount, padPlanDaysForEditor, planOccupancyMarks, rationDaysFromSharedRation, removeEmptyPlanDay, sharedRationSnapshotFromWeekPlan, type WeekPlan } from './week-plan'

export function PlanPage({
  heading,
  library: libraryProp,
  onLibraryChange,
  onOpenPlan,
  toolbarStart,
}: {
  heading?: {
    description: string
    title: string
  }
  library?: PlanLibrary
  onLibraryChange?: (library: PlanLibrary) => void
  onOpenPlan?: (planId: string) => void
  toolbarStart?: React.ReactNode
} = {}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { plan: weekPlan, meals, rations, completedIds, detachedIds, isPending, isError } =
    useCurrentWeekPlan()
  const savedScope = { userId: auth.user?.id ?? 'guest', email: auth.user?.email }
  const { snapshot, persist } = useSyncedPlanLibrary()
  const authored = snapshot.authoredPlans
  const sharedRationsQuery = useSharedRationsQuery()
  const sharedSourceIds = React.useMemo(
    () => new Set((sharedRationsQuery.data?.items ?? []).map((item) => item.sourcePlanId)),
    [sharedRationsQuery.data?.items],
  )
  const savedIds = React.useMemo(() => new Set(snapshot.savedPlanIds), [snapshot.savedPlanIds])
  const selectedPlanIds = React.useMemo(
    () => new Set(snapshot.selectedPlanIds),
    [snapshot.selectedPlanIds],
  )
  const assignment = usePlanAssignmentQuery(savedScope.userId, false, Boolean(auth.user))
  const [library, setLibrary] = React.useState<PlanLibrary>(libraryProp ?? 'mine')
  const resolvedLibrary = libraryProp ?? 'mine'
  if (resolvedLibrary !== library) {
    setLibrary(resolvedLibrary)
  }
  function changeLibrary(next: PlanLibrary) {
    setLibrary(next)
    onLibraryChange?.(next)
  }
  const [tab, setTab] = React.useState<PlanFeedTab>('Все')
  const [cardLayout, setCardLayout] = React.useState<PlanCardLayout>(readPlanCardLayout)
  const [query, setQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [createDraft, setCreateDraft] = React.useState<RationDraft | null>(null)
  const [startPickerPlanId, setStartPickerPlanId] = React.useState<string | null>(null)
  const [deletePlanTarget, setDeletePlanTarget] = React.useState<{ id: string; title: string } | null>(
    null,
  )
  const [deletingPlan, setDeletingPlan] = React.useState(false)
  const [copyingPlanId, setCopyingPlanId] = React.useState<string | null>(null)
  const [hiddenPlanIds, setHiddenPlanIds] = React.useState(() => hiddenRationIds(savedScope.userId))
  const hiddenIdentity = savedScope.userId
  const [loadedHiddenIdentity, setLoadedHiddenIdentity] = React.useState(hiddenIdentity)
  if (loadedHiddenIdentity !== hiddenIdentity) {
    setLoadedHiddenIdentity(hiddenIdentity)
    setHiddenPlanIds(hiddenRationIds(hiddenIdentity))
  }
  React.useEffect(() => {
    if (!hiddenPlanIds.has(weekPlan.id)) return
    if (!meals.some((meal) => mealRemovedWithRation(meal, weekPlan.id))) return
    unhideRation(savedScope.userId, weekPlan.id)
    setHiddenPlanIds(hiddenRationIds(savedScope.userId))
  }, [hiddenPlanIds, meals, savedScope.userId, weekPlan.id])
  const [creating, setCreating] = React.useState(false)
  const [dockAction, setDockAction] = React.useState<HTMLElement | null>(null)
  const savedIdentity = `${savedScope.userId}:${savedScope.email ?? ''}`

  React.useEffect(() => {
    if (!assignment.data) return
    writeAssignedPlans(
      savedScope,
      assignment.data.authoredPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        coverImage: plan.image,
        createdAt: plan.createdAt,
        goal: parsePlanGoal(plan.goal),
      })),
    )
  }, [assignment.data, savedIdentity])

  React.useLayoutEffect(() => {
    setDockAction(document.getElementById(PLAN_MOBILE_DOCK_ACTION_ID))
  }, [library])

  const authoredCards = React.useMemo(
    () =>
      authored.map((item) =>
        buildWeekPlan({
          completedIds,
          coverImage: item.coverImage,
          description: item.description,
          detachedIds,
          goal: item.goal,
          meals,
          planId: item.id,
          rations,
          title: item.title,
        }),
      ),
    [authored, completedIds, detachedIds, meals, rations],
  )
  const assignedCards = React.useMemo(
    () =>
      (assignment.data?.authoredPlans ?? []).map((item) => {
        const ration = mentorRationToEntry(item)
        const stamped = mealsForWeekPlan(meals, item.id, weekPlan.id)
        if (stamped.length > 0) {
          return buildWeekPlan({
            completedIds,
            coverImage: item.image,
            description: item.description,
            detachedIds,
            goal: parsePlanGoal(item.goal),
            meals,
            planId: item.id,
            rations,
            title: item.title,
          })
        }
        return buildWeekPlanFromRation({
          coverImage: item.image,
          goal: parsePlanGoal(item.goal),
          planId: item.id,
          ration,
          title: item.title,
        })
      }),
    [assignment.data, completedIds, detachedIds, meals, rations, weekPlan.id],
  )
  const catalogCards = React.useMemo(
    () => PLAN_CATALOG.map((item) => buildWeekPlanFromCatalog({ plan: item })),
    [],
  )
  const allCards = React.useMemo(
    () =>
      [weekPlan, ...authoredCards, ...assignedCards, ...catalogCards].filter((card) => {
        if (!hiddenPlanIds.has(card.id)) return true
        if (card.id.startsWith('week:')) {
          return meals.some((meal) => mealRemovedWithRation(meal, card.id))
        }
        return false
      }),
    [assignedCards, authoredCards, catalogCards, hiddenPlanIds, meals, weekPlan],
  )
  const cards = React.useMemo(() => {
    const visible = visiblePlanCards(allCards, query, savedIds, tab, library)
    if (tab !== 'Избранное') return visible
    return orderByLatestBookmark(visible, snapshot.savedPlanIds)
  }, [allCards, library, query, savedIds, snapshot.savedPlanIds, tab])
  const favoritesEmpty = tab === 'Избранное' && !query.trim()
  const catalogEmpty = library === 'catalog' && !favoritesEmpty

  function toggleSave(planId: string, title?: string) {
    const next = new Set(snapshot.savedPlanIds)
    const willSave = !next.has(planId)
    if (willSave) next.add(planId)
    else next.delete(planId)
    persist({ ...snapshot, savedPlanIds: [...next] })
    if (willSave) {
      toast.success('Добавлено в избранное')
      void notifyHybridFavoriteAdded(title ?? 'План')
    } else toast('Убрано из избранного')
  }

  const startPickerPlan =
    startPickerPlanId == null
      ? null
      : allCards.find((plan) => plan.id === startPickerPlanId) ?? null

  async function stampDaysOntoPlan(days: readonly RationEntry[], planId: string) {
    if (!auth.user || auth.user.role !== 'user') return []
    const createdMeals = await stampRationDaysOntoPlan(auth.transport, days, planId)
    queryClient.setQueryData<{ items: Array<(typeof createdMeals)[number]['meal']> }>(
      mealsQueryKeys.forSubject(auth.user.id),
      (previous) => {
        const kept = previous?.items ?? []
        return { ...previous, items: [...createdMeals.map((item) => item.meal), ...kept] }
      },
    )
    await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
    return createdMeals
  }

  async function stampRationOntoPlan(ration: RationEntry, planId: string) {
    await stampDaysOntoPlan([ration], planId)
  }

  async function addCatalogToMine(catalogId: string) {
    if (creating) return null
    const catalog = catalogPlanById(catalogId)
    if (!catalog) return null
    const existing = authoredCloneOfCatalog(authored, catalog.id)
    if (existing) {
      if (!auth.user || auth.user.role !== 'user') return null
      setCreating(true)
      try {
        await forgetMyRation(auth.transport, existing.id)
        persist(withoutAuthoredPlan(snapshot, existing.id))
        await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.all })
        toast('Рацион убран из «Мои»')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось убрать рацион')
      } finally {
        setCreating(false)
      }
      return null
    }
    if (!auth.user || auth.user.role !== 'user') {
      toast.error('Войдите, чтобы добавить план')
      return null
    }
    const created = createAuthoredPlan({
      coverImage: catalog.coverImage,
      description: catalog.description,
      goal: catalog.goal,
      sourceCatalogId: catalog.id,
      title: catalog.title,
    })
    if (!created) return null
    setCreating(true)
    try {
      const createdMeals = await stampRationDaysOntoPlan(auth.transport, catalog.days, created.id)
      queryClient.setQueryData<{ items: Array<(typeof createdMeals)[number]['meal']> }>(
        mealsQueryKeys.forSubject(auth.user.id),
        (previous) => {
          const kept = previous?.items ?? []
          return { ...previous, items: [...createdMeals.map((item) => item.meal), ...kept] }
        },
      )
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
      persist(withAuthoredPlan(snapshot, created))
      toast.success('План добавлен в «Мои»')
      return created.id
    } catch (error) {
      toast.error(catalogCloneErrorMessage(error))
      return null
    } finally {
      setCreating(false)
    }
  }

  function confirmPlanStart(date: Date) {
    if (!startPickerPlanId) return
    persist({
      ...snapshot,
      selectedPlanIds: [...new Set([...snapshot.selectedPlanIds, startPickerPlanId])],
      planStarts: {
        ...snapshot.planStarts,
        [startPickerPlanId]: dayKeyFromDate(startOfLocalDay(date)),
      },
    })
    setStartPickerPlanId(null)
    toast.success(`План с ${format(date, 'd MMMM', { locale: dateFnsRu })}`)
  }

  function clearSelectedPlan() {
    if (!startPickerPlanId) return
    persist({
      ...snapshot,
      selectedPlanIds: snapshot.selectedPlanIds.filter((id) => id !== startPickerPlanId),
    })
    setStartPickerPlanId(null)
    toast('План снят')
  }

  async function copyPlan(plan: WeekPlan) {
    if (!rationCanCopyForEdit(plan.id)) return
    if (copyingPlanId || creating) return
    if (!auth.user || auth.user.role !== 'user') {
      toast.error('Войдите, чтобы скопировать рацион')
      return
    }
    if (authored.length >= 20) {
      toast.error('В «Мои» уже 20 рационов')
      return
    }
    const days = rationDaysForCopy(plan)
    if (days.length === 0) {
      toast.error('В этом рационе пока нет приёмов')
      return
    }
    const title = rationCopyTitle(
      plan.title,
      authored.map((item) => item.title),
    )
    const origin = authored.find((item) => item.id === plan.id)
    const created = createAuthoredPlan({
      coverImage: plan.coverImage,
      dayCount: days.length,
      description: plan.description,
      goal: plan.goal,
      sourceCatalogId: isCatalogPlanId(plan.id) ? plan.id : origin?.sourceCatalogId,
      sourceMentorPlanId: isAssignedPlanId(plan.id) ? plan.id : origin?.sourceMentorPlanId,
      sourceSharedRationId: origin?.sourceSharedRationId,
      title,
    })
    if (!created) return
    setCopyingPlanId(plan.id)
    try {
      const createdMeals = await stampDaysOntoPlan(
        days.map((day) => ({ ...day, title })),
        created.id,
      )
      persist(
        withAuthoredPlan(snapshot, {
          ...created,
          coverImage: firstDurablePlanCover(
            created.coverImage,
            createdMeals.map((item) => item.meal),
          ),
        }),
      )
      if (library === 'catalog') changeLibrary('mine')
      toast.success('Рацион скопирован')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось скопировать рацион')
    } finally {
      setCopyingPlanId(null)
    }
  }

  async function deletePlan(planId: string) {
    if (isCatalogPlanId(planId)) return
    const userId = savedScope.userId
    if (rationCardNeedsLocalHide(planId)) {
      hideRation(userId, planId)
      setHiddenPlanIds(hiddenRationIds(userId))
    }
    setDeletingPlan(true)
    try {
      if (auth.user) await forgetMyRation(auth.transport, planId)
      const clone = isCatalogPlanId(planId) ? authoredCloneOfCatalog(authored, planId) : null
      const removedIds = [planId, clone?.id].filter((id): id is string => Boolean(id))
      const next = removedIds.reduce((library, id) => withoutAuthoredPlan(library, id), snapshot)
      if (JSON.stringify(next) !== JSON.stringify(snapshot)) persist(next)
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['session', 'plans'] })
      toast.success('Рацион удалён')
    } catch (error) {
      if (rationCardNeedsLocalHide(planId)) {
        unhideRation(userId, planId)
        setHiddenPlanIds(hiddenRationIds(userId))
      }
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить рацион')
    } finally {
      setDeletingPlan(false)
    }
  }

  async function toggleShare(plan: WeekPlan) {
    const nextShared = !sharedSourceIds.has(plan.id)
    const authoredPlan = authored.find((item) => item.id === plan.id)
    if (nextShared && !isAuthoredPlanId(plan.id)) {
      toast.error('Этот рацион нельзя отправить в ленту')
      return
    }
    if (nextShared && authoredPlan && !authoredPlanCanShareToFeed(authoredPlan)) {
      toast.error('Копию из каталога, ленты или рациона наставника нельзя отправить в ленту')
      return
    }
    const snapshotPayload = sharedRationSnapshotFromWeekPlan(plan)
    if (nextShared && !snapshotPayload) {
      toast.error('Добавьте приёмы, прежде чем делиться рационом')
      return
    }
    try {
      await shareMyRation(auth.transport, plan.id, {
        shared: nextShared,
        ...(nextShared && snapshotPayload ? { snapshot: snapshotPayload } : {}),
      })
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.sharedRations() })
      toast.success(nextShared ? 'Рацион появился в ленте' : 'Скрыто из ленты')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось поделиться рационом')
    }
  }

  async function selectPlan(planId: string) {
    const assigned = assignment.data?.authoredPlans.find((item) => item.id === planId)
    if (
      assigned &&
      mealsForWeekPlan(meals, planId, weekPlan.id).length === 0
    ) {
      try {
        await stampRationOntoPlan(mentorRationToEntry(assigned), planId)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось открыть план наставника')
        return
      }
    }
    setStartPickerPlanId(planId)
  }

  async function saveCreatedPlan(days: readonly RationEntry[], dayCount = days.length) {
    const ration = days[0]
    if (!ration || creating) return
    const created = createAuthoredPlan({
      coverImage:
        usableMealCover(days.map((day) => day.image).find(Boolean)) ||
        days.flatMap((day) => day.meals).map((meal) => usableMealCover(meal.image)).find(Boolean) ||
        ration.image,
      description: ration.description,
      goal: parsePlanGoal(ration.goal),
      id: ration.id,
      title: ration.title,
      dayCount,
    })
    if (!created) return
    setCreating(true)
    try {
      const createdMeals = await stampDaysOntoPlan(days, created.id)
      persist(
        withAuthoredPlan(snapshot, {
          ...created,
          coverImage: firstDurablePlanCover(
            created.coverImage,
            createdMeals.map((item) => item.meal),
          ),
        }),
      )
      setCreateDraft(null)
      toast.success('План создан')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать план')
    } finally {
      setCreating(false)
    }
  }

  const groupedCards = React.useMemo(() => {
    const groups = partitionPlanCards(cards)
    return {
      mine: orderRationCopiesAfterSource(groups.mine),
      mentor: orderRationCopiesAfterSource(groups.mentor),
    }
  }, [cards])

  function renderPlanCard(plan: WeekPlan) {
    const catalog = isCatalogPlanId(plan.id)
    const cloned = catalog ? Boolean(authoredCloneOfCatalog(authored, plan.id)) : false
    const selected = catalog ? cloned : selectedPlanIds.has(plan.id)
    return (
      <WeekPlanCard
        actionLabel={
          catalog ? (
            cloned ? (
              <>
                <span className="md:hidden">В рационах</span>
                <span className="hidden md:inline">Уже в рационах</span>
              </>
            ) : (
              'Добавить'
            )
          ) : undefined
        }
        activeRange={
          catalog || !selectedPlanIds.has(plan.id)
            ? undefined
            : formatPlanActiveRange(
                readPlanStartDate(savedScope, plan.id) ?? new Date(),
                plan.days.length,
              )
        }
        fromMentor={isAssignedPlanId(plan.id)}
        key={plan.id}
        layout={cardLayout}
        onOpen={() => {
          const nextId = plan.id === weekPlan.id ? 'current' : plan.id
          if (onOpenPlan) {
            onOpenPlan(nextId)
            return
          }
          void navigate({
            search: userGeneralSearch('plan', nextId),
            to: '/app/general',
          })
        }}
        onSelect={() => {
          if (catalog) {
            void addCatalogToMine(plan.id)
            return
          }
          void selectPlan(plan.id)
        }}
        onToggleSave={() => toggleSave(plan.id, plan.title)}
        copying={copyingPlanId === plan.id}
        onCopy={rationCanCopyForEdit(plan.id) ? () => void copyPlan(plan) : undefined}
        onDelete={
          catalog ? undefined : () => setDeletePlanTarget({ id: plan.id, title: plan.title })
        }
        onShare={() => void toggleShare(plan)}
        canShare={
          isAuthoredPlanId(plan.id) &&
          authoredPlanCanShareToFeed(authored.find((item) => item.id === plan.id) ?? {})
        }
        plan={plan}
        saved={savedIds.has(plan.id)}
        savedScope={savedScope}
        selected={selected}
        shared={sharedSourceIds.has(plan.id)}
      />
    )
  }

  const canCreate = library !== 'catalog'
  const createFab = canCreate ? (
    <button
      aria-label="Создать рацион"
      className={MOBILE_DOCK_FAB_CLASS}
      onClick={() => setCreateDraft(emptyRationDraft())}
      type="button"
    >
      <UtensilsIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS} strokeWidth={1.75} />
    </button>
  ) : null

  return (
    <>
    <PlanPageShell
      description={
        heading?.description
        ?? 'Семь дней без привязки к календарной неделе. Выберите план и дату старта — день 1 начнётся с неё.'
      }
      title={heading?.title ?? 'План'}
    >
      <div className="flex flex-col gap-5">
      <PlanToolbar
        canCreate={canCreate}
        cardLayout={cardLayout}
        onCardLayoutChange={(next) => {
          setCardLayout(next)
          writePlanCardLayout(next)
        }}
        onCreate={() => setCreateDraft(emptyRationDraft())}
        onQueryChange={setQuery}
        onSearchOpenChange={setSearchOpen}
        onTabChange={setTab}
        query={query}
        searchOpen={searchOpen}
        tab={tab}
        toolbarStart={toolbarStart}
      />
      {isError ? (
        <ProductFeedEmpty
          description="Проверьте соединение и попробуйте ещё раз."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Не удалось загрузить план"
        />
      ) : isPending ? (
        <SectionLoading label="Загрузка планов" />
      ) : cards.length === 0 ? (
        <ProductFeedEmpty
          action={
            <NoraButton
              onClick={() => {
                setTab('Все')
                changeLibrary('mine')
                setQuery('')
                setSearchOpen(false)
              }}
              variant="tinted"
            >
              Сбросить
            </NoraButton>
          }
          description={
            favoritesEmpty
              ? 'Закладка на карточке плана добавит его сюда.'
              : catalogEmpty
                ? 'Попробуйте другой поиск — в каталоге пять готовых планов.'
                : 'Смените поиск или создайте новый план.'
          }
          icon={
            favoritesEmpty ? (
              <BookmarkIcon aria-hidden strokeWidth={1.75} />
            ) : (
              <CalendarRangeIcon aria-hidden strokeWidth={1.75} />
            )
          }
          title={favoritesEmpty ? 'Пока нет избранных планов' : 'Нет таких планов'}
        />
      ) : library === 'catalog' ? (
        <section className={planFeedGridClass(cardLayout)}>{cards.map(renderPlanCard)}</section>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedCards.mine.length > 0 ? (
            <div className="flex flex-col gap-5">
              <PlanGroupHeading
                count={groupedCards.mine.length}
                icon={PLAN_GROUP_ICONS.mine}
                label="Мои"
                tone="mine"
              />
              <section className={planFeedGridClass(cardLayout)}>
                {groupedCards.mine.map(renderPlanCard)}
              </section>
            </div>
          ) : null}
          {groupedCards.mentor.length > 0 ? (
            <div className="flex flex-col gap-5">
              <PlanGroupHeading
                count={groupedCards.mentor.length}
                icon={PLAN_GROUP_ICONS.mentor}
                label="Наставник"
                tone="mentor"
              />
              <section className={planFeedGridClass(cardLayout)}>
                {groupedCards.mentor.map(renderPlanCard)}
              </section>
            </div>
          ) : null}
        </div>
      )}
      </div>
      <RationEditorDialog
        draft={createDraft}
        finalizeOptions={{ idPrefix: AUTHORED_PLAN_ID_PREFIX, source: 'План' }}
        mode="plan"
        onOpenChange={(open) => {
          if (!open && !creating) setCreateDraft(null)
        }}
        onSave={(ration) => {
          void saveCreatedPlan([ration])
        }}
        onSaveDays={(days, dayCount) => {
          void saveCreatedPlan(days, dayCount)
        }}
        open={createDraft != null}
        ownerId={savedScope.userId}
      />
      <PlanStartDialog
        dayCount={Math.max(
          1,
          startPickerPlan?.days.length ?? 0,
          authored.find((item) => item.id === startPickerPlanId)?.dayCount ?? 0,
        )}
        initialDate={suggestedPlanStartDate(
          startPickerPlanId ? readPlanStartDate(savedScope, startPickerPlanId) : null,
          Boolean(startPickerPlanId && selectedPlanIds.has(startPickerPlanId)),
        )}
        onClear={
          startPickerPlanId && selectedPlanIds.has(startPickerPlanId)
            ? clearSelectedPlan
            : undefined
        }
        onConfirm={confirmPlanStart}
        onOpenChange={(open) => {
          if (!open) setStartPickerPlanId(null)
        }}
        occupied={planOccupancyMarks(
          snapshot.selectedPlanIds
            .filter((id) => id !== startPickerPlanId)
            .flatMap((id) => {
              const card = allCards.find((plan) => plan.id === id)
              const start = snapshot.planStarts[id]
              if (!card || !start) return []
              const stored = authored.find((item) => item.id === id)?.dayCount ?? 0
              return [
                {
                  id,
                  title: card.title,
                  dayCount: card.days.length > 0 ? card.days.length : Math.max(1, stored),
                  start,
                },
              ]
            }),
        )}
        open={Boolean(startPickerPlan)}
        planTitle={startPickerPlan?.title ?? ''}
        selected={Boolean(startPickerPlanId && selectedPlanIds.has(startPickerPlanId))}
      />
    </PlanPageShell>
    {createFab && dockAction
      ? createPortal(createFab, dockAction)
      : createFab ? (
          <div className={`${MOBILE_DOCK_BOTTOM_CLASS} left-4 flex items-center gap-2`}>
            {createFab}
          </div>
        )         : null}
      <DeleteCardDialog
        confirmLabel={planCardDeletePrompt(deletePlanTarget?.title ?? '').confirmLabel}
        description={planCardDeletePrompt(deletePlanTarget?.title ?? '').description}
        pending={deletingPlan}
        onConfirm={() => {
          if (!deletePlanTarget || deletingPlan) return
          const planId = deletePlanTarget.id
          setDeletePlanTarget(null)
          void deletePlan(planId)
        }}
        onOpenChange={(open) => {
          if (!open) setDeletePlanTarget(null)
        }}
        open={deletePlanTarget !== null}
        title={planCardDeletePrompt(deletePlanTarget?.title ?? '').title}
      />
    </>
  )
}

export function CurrentPlanPage({
  onBack,
  onOpenPlan,
  planId,
  sharedRationId,
  showMobileBackDock = true,
}: {
  onBack?: () => void
  onOpenPlan?: (planId: string) => void
  planId?: string
  sharedRationId?: string
  showMobileBackDock?: boolean
}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mentorPlansQuery = useMentorPlansQuery(auth.user?.role === 'mentor')
  const createMentorPlan = useCreateMentorPlanMutation()
  const {
    plan: weekPlan,
    meals,
    rations,
    completedIds,
    detachedIds,
    detachPlanMeal,
    applyWeekOutline,
    isPending,
    isError,
  } = useCurrentWeekPlan()
  const savedScope = { userId: auth.user?.id ?? 'guest', email: auth.user?.email }
  const { snapshot, persist } = useSyncedPlanLibrary()
  const authored = snapshot.authoredPlans
  const assignment = usePlanAssignmentQuery(savedScope.userId, false, Boolean(auth.user))
  const sharedRationsQuery = useSharedRationsQuery()
  const sharedRation = sharedRationId
    ? (sharedRationsQuery.data?.items.find((item) => item.id === sharedRationId) ?? null)
    : null
  const [adding, setAdding] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [layoutRevision, setLayoutRevision] = React.useState(0)
  const ownAuthored = sharedRation?.own
    ? authored.find((item) => item.id === sharedRation.sourcePlanId) ?? null
    : null
  const resolvedPlanId = ownAuthored?.id ?? planId
  const catalog = resolvedPlanId ? catalogPlanById(resolvedPlanId) : null
  const cloned = catalog
    ? authoredCloneOfCatalog(authored, catalog.id)
    : sharedRation && !sharedRation.own
      ? authoredCloneOfSharedRation(authored, sharedRation.id)
      : null
  const feedPreview = Boolean(sharedRation && !ownAuthored)
  const plan = React.useMemo(() => {
    if (sharedRationId) {
      if (!sharedRation) return null
      if (feedPreview) return buildWeekPlanFromSharedRation({ ration: sharedRation })
    }
    if (!resolvedPlanId || resolvedPlanId === weekPlan.id) return weekPlan
    const authoredPlan = authored.find((item) => item.id === resolvedPlanId)
    if (authoredPlan) {
      return buildWeekPlan({
        completedIds,
        coverImage: authoredPlan.coverImage,
        description: authoredPlan.description,
        detachedIds,
        goal: authoredPlan.goal,
        meals,
        planId: authoredPlan.id,
        rations,
        title: authoredPlan.title,
      })
    }
    if (catalog) return buildWeekPlanFromCatalog({ plan: catalog })
    const assigned = assignment.data?.authoredPlans.find((item) => item.id === resolvedPlanId)
    if (!assigned) return null
    const stamped = mealsForWeekPlan(meals, assigned.id, weekPlan.id)
    if (stamped.length > 0) {
      return buildWeekPlan({
        completedIds,
        coverImage: assigned.image,
        description: assigned.description,
        detachedIds,
        goal: parsePlanGoal(assigned.goal),
        meals,
        planId: assigned.id,
        rations,
        title: assigned.title,
      })
    }
    return buildWeekPlanFromRation({
      coverImage: assigned.image,
      goal: parsePlanGoal(assigned.goal),
      planId: assigned.id,
      ration: mentorRationToEntry(assigned),
      title: assigned.title,
    })
  }, [
    assignment.data,
    authored,
    catalog,
    completedIds,
    detachedIds,
    feedPreview,
    meals,
    rations,
    resolvedPlanId,
    sharedRation,
    sharedRationId,
    weekPlan,
  ])
  const planStart = plan ? readPlanStartDate(savedScope, plan.id) : null
  const scheduledDays = React.useMemo(() => {
    if (!plan) return []
    return plan.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        at: planOccurrenceDiaryAt(meal, completedIds, new Date(), planStart),
      })),
    }))
  }, [completedIds, plan, planStart])
  const outlineDays = React.useMemo(() => {
    if (!plan) return scheduledDays
    return applyPlanMealLayout(scheduledDays, readPlanMealLayout(savedScope, plan.id))
  }, [layoutRevision, plan, savedScope.email, savedScope.userId, scheduledDays])
  const editorDayCount = React.useMemo(() => {
    if (!plan) return 0
    const stored = authored.find((item) => item.id === plan.id)?.dayCount ?? 0
    const layoutCount = planLayoutDayCount(
      readPlanMealLayout(savedScope, plan.id),
      rationPlanWeekDays().map((day) => day.dayKey),
    )
    return Math.max(stored, layoutCount, feedPreview ? sharedRation?.days ?? 0 : 0)
  }, [authored, feedPreview, layoutRevision, plan, savedScope.email, savedScope.userId, sharedRation?.days])
  const catalogView = Boolean(catalog)
  const canMutateDays = Boolean(plan && !catalogView && !feedPreview)
  const canEdit = Boolean(plan && !catalogView && !feedPreview && !isAssignedPlanId(plan.id))
  const [dockExtra, setDockExtra] = React.useState<HTMLElement | null>(null)
  const [dockEdit, setDockEdit] = React.useState<HTMLElement | null>(null)
  const [movingMeals, setMovingMeals] = React.useState(false)
  React.useLayoutEffect(() => {
    if (showMobileBackDock || !(catalogView || feedPreview)) {
      setDockExtra(null)
      return
    }
    setDockExtra(document.getElementById(PLAN_MOBILE_DOCK_EXTRA_ID))
  }, [catalogView, feedPreview, planId, sharedRationId, showMobileBackDock])
  React.useLayoutEffect(() => {
    if (showMobileBackDock) {
      setDockEdit(null)
      return
    }
    setDockEdit(document.getElementById(PLAN_MOBILE_DOCK_EDIT_ID))
  }, [planId, sharedRationId, showMobileBackDock])
  const loadingPlan = isPending || Boolean(sharedRationId && sharedRationsQuery.isPending)
  const loadError = isError || Boolean(sharedRationId && sharedRationsQuery.isError)
  const backListLabel = sharedRationId ? 'К ленте' : 'К планам'
  const headerFacts = React.useMemo(() => {
    if (!plan) return []
    const facts: Array<{ label: string; value: string }> = [
      { label: 'Дней', value: daysCountLabel(Math.max(editorDayCount, plan.days.length)) },
      { label: 'Приёмов', value: mealsCountLabel(plan.mealsCount) },
      { label: 'Калорийность', value: `${plan.kcal} ккал` },
    ]
    if (planStart) {
      facts.push({
        label: 'Период',
        value: formatPlanActiveRange(planStart, Math.max(1, editorDayCount, plan.days.length)),
      })
    }
    return facts
  }, [editorDayCount, plan, planStart])

  function goBack() {
    if (onBack) {
      onBack()
      return
    }
    void navigate({ search: userGeneralSearch('plan'), to: '/app/general' })
  }

  function openPlan(nextId: string) {
    if (onOpenPlan) {
      onOpenPlan(nextId)
      return
    }
    void navigate({ search: userGeneralSearch('plan', nextId), to: '/app/general' })
  }

  async function addCatalogToMine() {
    if (!catalog || adding) return
    if (!auth.user || auth.user.role !== 'user') {
      toast.error('Войдите, чтобы добавить план')
      return
    }
    if (cloned) {
      setAdding(true)
      try {
        await forgetMyRation(auth.transport, cloned.id)
        persist(withoutAuthoredPlan(snapshot, cloned.id))
        await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.all })
        toast('Рацион убран из «Мои»')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось убрать рацион')
      } finally {
        setAdding(false)
      }
      return
    }
    const created = createAuthoredPlan({
      coverImage: catalog.coverImage,
      description: catalog.description,
      goal: catalog.goal,
      sourceCatalogId: catalog.id,
      title: catalog.title,
    })
    if (!created) return
    setAdding(true)
    try {
      const createdMeals = await stampRationDaysOntoPlan(auth.transport, catalog.days, created.id)
      queryClient.setQueryData<{ items: Array<(typeof createdMeals)[number]['meal']> }>(
        mealsQueryKeys.forSubject(auth.user.id),
        (previous) => {
          const kept = previous?.items ?? []
          return { ...previous, items: [...createdMeals.map((item) => item.meal), ...kept] }
        },
      )
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
      persist(withAuthoredPlan(snapshot, created))
      toast.success('План добавлен в «Мои»')
    } catch (error) {
      toast.error(catalogCloneErrorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  const mentorSaved =
    auth.user?.role === 'mentor' && sharedRation
      ? matchingMentorPlanByTitle(sharedRation.title, mentorPlansQuery.data?.items ?? []) ?? null
      : null
  const alreadyInMine = Boolean(cloned || mentorSaved)

  async function addSharedRationToMentor() {
    if (!sharedRation || !auth.user || adding) return
    if (mentorSaved) {
      onOpenPlan?.(mentorSaved.id)
      return
    }
    if ((mentorPlansQuery.data?.items.length ?? 0) >= MENTOR_FEED_PLAN_CAP) {
      toast.error('Уже 20 рационов')
      return
    }
    const body = mentorPlanRequestFromSharedRation(sharedRation)
    if (!body) {
      toast.error('Не удалось добавить рацион')
      return
    }
    setAdding(true)
    try {
      const created = await createMentorPlan.mutateAsync(body)
      toast.success('Рацион добавлен в ваши рационы')
      onOpenPlan?.(created.plan.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить рацион')
    } finally {
      setAdding(false)
    }
  }

  async function addSharedRationToMine() {
    if (!sharedRation || sharedRation.own || adding) return
    if (auth.user?.role === 'mentor') {
      await addSharedRationToMentor()
      return
    }
    if (cloned) {
      openPlan(cloned.id)
      return
    }
    if (!auth.user || auth.user.role !== 'user') {
      toast.error('Войдите, чтобы добавить план')
      return
    }
    if (authored.length >= 20) {
      toast.error('В «Мои» уже 20 рационов')
      return
    }
    const created = createAuthoredPlan({
      coverImage: sharedRation.coverImage,
      dayCount: sharedRation.days,
      description: sharedRation.description,
      goal: sharedRation.goal,
      sourceSharedRationId: sharedRation.id,
      title: sharedRation.title,
    })
    if (!created) return
    setAdding(true)
    try {
      const createdMeals = await stampRationDaysOntoPlan(
        auth.transport,
        rationDaysFromSharedRation(sharedRation),
        created.id,
      )
      queryClient.setQueryData<{ items: Array<(typeof createdMeals)[number]['meal']> }>(
        mealsQueryKeys.forSubject(auth.user.id),
        (previous) => {
          const kept = previous?.items ?? []
          return { ...previous, items: [...createdMeals.map((item) => item.meal), ...kept] }
        },
      )
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
      persist(withAuthoredPlan(snapshot, created))
      toast.success('План добавлен в «Мои»')
      openPlan(created.id)
    } catch (error) {
      toast.error(catalogCloneErrorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  const addToMine =
    auth.user?.role === 'mentor'
      ? null
      : catalogView
        ? addCatalogToMine
        : feedPreview
          ? addSharedRationToMine
          : null

  const catalogMineButton = addToMine ? (
    <button
      className={MOBILE_DOCK_PILL_CLASS}
      disabled={adding}
      onClick={() => void addToMine()}
      type="button"
    >
      {catalogView
        ? alreadyInMine
          ? 'В рационах'
          : 'Добавить'
        : alreadyInMine
          ? 'Открыть в «Мои»'
          : 'Добавить'}
    </button>
  ) : null

  function openEditor() {
    setLayoutRevision((current) => current + 1)
    setEditing(true)
  }

  function addEmptyDay() {
    if (!plan) return
    const occupied = padPlanDaysForEditor(
      applyPlanMealLayout(scheduledDays, readPlanMealLayout(savedScope, plan.id)),
      new Date(),
      editorDayCount,
    )
    const nextCount = nextPlanDayCount(editorDayCount, occupied.length)
    if (nextCount <= occupied.length && nextCount <= editorDayCount) return
    const padded = padPlanDaysForEditor(occupied, new Date(), nextCount)
    const authoredPlan = authored.find((item) => item.id === plan.id)
    if (authoredPlan) {
      persist(
        withAuthoredPlan(snapshot, {
          ...authoredPlan,
          dayCount: nextCount,
        }),
      )
    }
    writePlanMealLayout(savedScope, plan.id, layoutFromDays(padded))
    setLayoutRevision((current) => current + 1)
  }

  function removeEmptyDay(dayKey: string) {
    if (!plan) return
    const occupied = padPlanDaysForEditor(
      applyPlanMealLayout(scheduledDays, readPlanMealLayout(savedScope, plan.id)),
      new Date(),
      editorDayCount,
    )
    const next = removeEmptyPlanDay(occupied, dayKey)
    if (next.length === occupied.length) return
    const authoredPlan = authored.find((item) => item.id === plan.id)
    if (authoredPlan) {
      persist(
        withAuthoredPlan(snapshot, {
          ...authoredPlan,
          dayCount: next.length,
        }),
      )
    }
    writePlanMealLayout(savedScope, plan.id, layoutFromDays(next))
    setLayoutRevision((current) => current + 1)
  }

  const desktopEditButton = canEdit ? (
    <button
      className={`${planToolbarPillClass} nora-press-grow inline-flex shrink-0 flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]`}
      data-plan-outline-open=""
      onClick={() => openEditor()}
      type="button"
    >
      <PencilIcon aria-hidden className="size-4" strokeWidth={1.75} />
      Изменить
    </button>
  ) : null
  const mobileEditButton = canEdit ? (
    <button
      className={cn(MOBILE_DOCK_PILL_CLASS, 'disabled:opacity-100')}
      data-plan-outline-open=""
      disabled={movingMeals}
      onClick={() => openEditor()}
      type="button"
    >
      <PencilIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
      Изменить
    </button>
  ) : null

  async function saveOutline(next: {
    title: string
    description: string
    coverImage: string
    days: typeof scheduledDays
    newDayRations: RationEntry[]
  }) {
    const title = next.title.trim()
    if (!title) {
      toast.error('Назовите план')
      return
    }
    if (!plan) return
    let stampedMeals: Array<{ meal: { imageUrl?: string } }> = []
    const hasNewMeals = next.newDayRations.some((ration) => ration.meals.length > 0)
    if (hasNewMeals) {
      if (!auth.user || auth.user.role !== 'user') {
        toast.error('Войдите, чтобы сохранить приёмы')
        return
      }
      try {
        const createdMeals = await stampRationDaysOntoPlan(
          auth.transport,
          next.newDayRations,
          plan.id,
        )
        stampedMeals = createdMeals
        queryClient.setQueryData<{ items: Array<(typeof createdMeals)[number]['meal']> }>(
          mealsQueryKeys.forSubject(auth.user.id),
          (previous) => {
            const kept = previous?.items ?? []
            return { ...previous, items: [...createdMeals.map((item) => item.meal), ...kept] }
          },
        )
        await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось сохранить приёмы')
        return
      }
    }
    const mealCover =
      next.days.flatMap((day) => day.meals).map((meal) => usableMealCover(meal.image)).find(Boolean) ||
      ''
    const coverImage = firstDurablePlanCover(next.coverImage || mealCover, [
      ...stampedMeals.map((item) => item.meal),
      ...next.days.flatMap((day) => day.meals).map((meal) => ({ imageUrl: usableMealCover(meal.image) })),
    ])
    const authoredPlan = authored.find((item) => item.id === plan.id)
    if (authoredPlan) {
      persist(
        withAuthoredPlan(snapshot, {
          ...authoredPlan,
          title,
          description: next.description.trim(),
          coverImage: coverImage || authoredPlan.coverImage,
          dayCount: next.days.length,
        }),
      )
    } else {
      const outline = { title, description: next.description.trim() }
      writePlanOutline(savedScope, WEEK_PLAN_OUTLINE_KEY, outline)
      applyWeekOutline(outline)
    }
    writePlanMealLayout(savedScope, plan.id, layoutFromDays(next.days))
    setLayoutRevision((current) => current + 1)
    setEditing(false)
    toast.success('План сохранён')
  }

  return (
    <>
    <PlanPageShell
      description={
        plan?.description.trim()
          ? plan.description
          : catalogView
            ? 'Готовый план на семь дней. Добавьте его в «Мои», чтобы менять приёмы.'
            : feedPreview
              ? 'План, которым поделились в ленте.'
              : 'Приёмы по дням, которые вы уже добавили из рационов.'
      }
      facts={headerFacts}
      coverImage={plan?.coverImage}
      onEdit={canEdit ? openEditor : undefined}
      showHeaderOnMobile
      title={plan?.title ?? 'План'}
    >
      {loadError ? (
        <ProductFeedEmpty
          description="Проверьте соединение и попробуйте ещё раз."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Не удалось загрузить план"
        />
      ) : loadingPlan ? (
        <SectionLoading label="Загрузка плана" />
      ) : plan == null ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => goBack()} variant="tinted">
              {backListLabel}
            </NoraButton>
          }
          description={
            sharedRationId
              ? 'Этот рацион больше не опубликован в ленте.'
              : 'Этот план больше не сохранён в аккаунте.'
          }
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="План не найден"
        />
      ) : plan.days.length === 0 ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => goBack()} variant="tinted">
              {backListLabel}
            </NoraButton>
          }
          description="Создайте план или откройте план от наставника, чтобы наполнить дни приёмами."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="В плане пока пусто"
        />
      ) : (
        <>
          <section className={`${productFeedToolbarStickyClass} max-md:hidden`}>
            <div className="flex w-full min-w-0 items-center pt-1">
              <div className={productFeedToolbarRowClass}>
                <button
                  aria-label="Назад"
                  className={`${planToolbarPillClass} nora-press-grow size-9 shrink-0 justify-center p-0 text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-4`}
                  onClick={() => goBack()}
                  type="button"
                >
                  <ArrowLeftIcon aria-hidden />
                </button>
                {desktopEditButton}
                {addToMine ? (
                  <button
                    className={`${planToolbarPillClass} nora-press-grow inline-flex shrink-0 flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] disabled:pointer-events-none disabled:opacity-50`}
                    disabled={adding}
                    onClick={() => void addToMine()}
                    type="button"
                  >
                    {catalogView
                      ? alreadyInMine
                        ? 'Уже в рационах'
                        : 'Добавить'
                      : alreadyInMine
                        ? 'Открыть в «Мои»'
                        : 'Добавить'}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
          <CurrentPlanMeals
            canReorder={canMutateDays}
            completedIds={completedIds}
            dayCount={editorDayCount}
            days={scheduledDays}
            layoutRevision={layoutRevision}
            onAddEmptyDay={canMutateDays ? addEmptyDay : undefined}
            onDetachPlanMeal={detachPlanMeal}
            onPickingChange={setMovingMeals}
            onRemoveEmptyDay={canMutateDays ? removeEmptyDay : undefined}
            planId={plan.id}
            pickIntoMentorPlans={auth.user?.role === 'mentor' && feedPreview}
            readOnly={catalogView || feedPreview}
          />
        </>
      )}
    </PlanPageShell>
    {showMobileBackDock ? (
      <div className={`${MOBILE_DOCK_BOTTOM_CLASS} left-4 flex items-center gap-2`}>
        <button
          aria-label="Назад"
          className={MOBILE_DOCK_FAB_CLASS}
          onClick={() => goBack()}
          type="button"
        >
          <ArrowLeftIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
        </button>
        {mobileEditButton}
        {catalogMineButton}
      </div>
    ) : (
      <>
        {mobileEditButton && dockEdit ? createPortal(mobileEditButton, dockEdit) : null}
        {catalogMineButton && dockExtra ? createPortal(catalogMineButton, dockExtra) : null}
      </>
    )}
    {plan && canEdit ? (
      <PlanOutlineDialog
        coverImage={plan.coverImage}
        dayCount={editorDayCount}
        days={outlineDays}
        description={plan.description}
        goal={plan.goal}
        onOpenChange={setEditing}
        onSave={(next) => void saveOutline(next)}
        open={editing}
        ownerId={auth.user?.id ?? 'guest'}
        planId={plan.id}
        title={plan.title}
      />
    ) : null}
    </>
  )
}
