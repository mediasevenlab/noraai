import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListIcon, PlusIcon, SearchIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import type { ListSharedRationsResponse, SharedRation } from '@web-app-demo/contracts'

import {
  ProductFeedEmpty,
  SectionLoading,
  productCardAuthorAnchorClass,
  productCardCoverKcalBadgeClass,
  productCardGoalAnchorClass,
  productCardOriginAnchorClass,
  productDesktopCardMinHeightClass,
  productListCardHeightClass,
  productSheetFrostFillClass,
  type ProductCardOrigin,
} from '@/components/nora/product-sheet'
import { NoraAvatar, NoraButton, NoraHoverTip, NoraIconButton } from '@/components/nora/primitives'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { snapshotFromPlanLibrary } from '@/platform/account-plan-library'
import { withAuthoredPlan } from '@/platform/plan-library-local'

import { createMyMeal, likeSharedRation } from './api'
import { daysCountLabel, mealsCountLabel, mealsPerDayLabel } from './diary-feed'
import { feedGridClass, type FeedCardLayout } from './feed-card-layout'
import { type DiaryPeriodFilter } from './DiaryPeriodPicker'
import {
  canAddSharedRationToMine,
  createAuthoredPlanFromSharedRation,
  matchingMentorPlanByTitle,
  MENTOR_FEED_PLAN_CAP,
  mentorPlanRequestFromSharedRation,
  sharedRationAddLabel,
  sharedRationMealCreateDrafts,
} from './feed-ration-clone'
import { filterSharedRations, type FeedGoal } from './feed-filters'
import { displayPlanCover } from './meal-cover'
import { mealImageFromUrl } from './meal-image-pick'
import { authorInitials, FeedListAuthorLabel, MealLikeButton } from './MealCard'
import { MealFeedPhoto } from './meal-feed-photo'
import { mealsQueryKeys, planLibraryQueryKeys, usePlanLibraryQuery, useSharedRationsQuery } from './queries'
import { useSyncedPlanLibrary } from './use-plan-library'

function patchSharedRationLike(
  previous: ListSharedRationsResponse | undefined,
  rationId: string,
  liked: boolean,
): ListSharedRationsResponse | undefined {
  if (!previous) return previous
  return {
    items: previous.items.map((item) => {
      if (item.id !== rationId) return item
      let likeCount = item.likeCount
      if (liked && !item.liked) likeCount += 1
      if (!liked && item.liked) likeCount = Math.max(0, likeCount - 1)
      return { ...item, liked, likeCount }
    }),
  }
}

const FEED_AUTHOR_CHIP_CLASS = cn(
  'ios-glass-glare-soft inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border-0 py-1 pr-2.5 pl-1',
  productSheetFrostFillClass,
)

function RationSummaryPlaque({ ration }: { ration: SharedRation }) {
  const mealsCount = ration.meals.length
  const filled = ration.days > 0 && mealsCount > 0
  return (
    <div
      className={cn(
        'flex h-10 min-h-10 items-center gap-2 rounded-[12px] px-2',
        filled
          ? 'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]'
          : 'bg-[color-mix(in_srgb,var(--nora-inset)_78%,var(--nora-panel))] text-[var(--nora-text-tertiary)]',
      )}
      data-plan-summary=""
    >
      <span
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          filled
            ? 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]'
            : 'bg-transparent text-[var(--nora-text-tertiary)]',
        )}
      >
        <ListIcon aria-hidden className="size-3.5" strokeWidth={2} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-left font-[family-name:var(--nora-font)] text-[12px] font-normal leading-4',
          filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
        )}
      >
        {daysCountLabel(ration.days)}
      </span>
      <span
        className={cn(
          'inline-flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 max-md:hidden',
          'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
          'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
          filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
        )}
      >
        {ration.kcal} ккал
      </span>
      <span
        aria-label={mealsCountLabel(mealsCount)}
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          'bg-[color-mix(in_srgb,var(--nora-panel)_80%,transparent)]',
          'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tabular-nums',
          filled ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-tertiary)]',
        )}
      >
        {mealsCount}
      </span>
    </div>
  )
}

const FEED_RATION_PLUS_CLASS =
  'nora-press-grow size-6! shrink-0 rounded-full! bg-[var(--nora-input-bg)] text-[var(--nora-text-secondary)] shadow-none hover:bg-[color-mix(in_srgb,var(--nora-input-bg)_82%,var(--nora-text)_10%)] hover:text-[var(--nora-text)] active:bg-[color-mix(in_srgb,var(--nora-input-bg)_75%,var(--nora-text)_12%)] [&_svg]:size-4'

function SharedRationCard({
  ration,
  addLabel,
  canAdd,
  adding,
  layout = 'grid',
  showAdd = true,
  onOpen,
  onAdd,
  onToggleLike,
}: {
  ration: SharedRation
  addLabel: string
  canAdd: boolean
  adding: boolean
  layout?: FeedCardLayout
  showAdd?: boolean
  onOpen: () => void
  onAdd: () => void
  onToggleLike: () => void
}) {
  const list = layout === 'list'
  return (
    <article
      className={cn(
        'group flex h-full min-w-0 cursor-pointer flex-col',
        list ? 'max-md:flex-row max-md:items-stretch' : 'max-md:min-h-[327px]',
        list && productListCardHeightClass,
        productDesktopCardMinHeightClass,
      )}
      data-card-layout={layout}
      data-slot="meal-card"
      onClick={onOpen}
    >
      <div className={cn('relative px-2 pt-2 max-md:shrink-0', list && 'max-md:flex max-md:self-stretch max-md:p-2', 'md:flex md:min-h-0 md:flex-1 md:flex-col')}>
        <div
          className={cn(
            'relative h-[204px] w-full overflow-hidden bg-[var(--nora-inset)] sm:h-[216px] md:h-[224px] md:h-auto md:min-h-0 md:flex-1',
            list && 'max-md:aspect-square max-md:!h-full max-md:!w-auto max-md:!max-h-none',
          )}
          data-haptic="card"
          data-slot="meal-card-preview"
        >
          <MealFeedPhoto priority sizes="md" src={displayPlanCover(ration.coverImage)} />
          {list ? (
            <div className={cn(productCardGoalAnchorClass, 'md:hidden')}>
              <span className={productCardCoverKcalBadgeClass}>{ration.kcal} ккал</span>
            </div>
          ) : null}
          <div
            className={cn(
              list ? productCardAuthorAnchorClass : productCardOriginAnchorClass,
              list && 'max-md:hidden md:top-2 md:bottom-auto',
            )}
          >
            <div className={FEED_AUTHOR_CHIP_CLASS}>
              <NoraAvatar size="sm">{authorInitials(ration.authorName ?? 'Пользователь')}</NoraAvatar>
              <span className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[11.5px] font-medium leading-none text-[var(--nora-text)]">
                {ration.authorName ?? 'Пользователь'}
              </span>
            </div>
          </div>
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/62 to-transparent px-3 pt-7 pb-2 text-left',
              list && 'max-md:hidden',
            )}
          >
            <h3 className="truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-5 text-white">
              {ration.title}
            </h3>
            <p className="mt-1 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-white/80">
              {mealsPerDayLabel(ration.meals.length, ration.days)}
            </p>
          </div>
        </div>
      </div>
      <div className={cn('flex min-w-0 flex-col max-md:flex-1', list && 'max-md:min-w-0')}>
        {list ? (
          <div className="hidden px-3 pt-2.5 max-md:block">
            <h3 className="truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-5 text-[var(--nora-text)]">
              {ration.title}
            </h3>
            <p className="mt-0.5 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)]">
              {mealsPerDayLabel(ration.meals.length, ration.days)}
            </p>
          </div>
        ) : null}
        <div
          className={cn(
            'flex flex-col justify-center px-3 sm:px-4',
            list ? 'pt-2.5 max-md:flex-none max-md:pt-3' : 'min-h-0 flex-1 md:flex-none md:pt-2.5',
          )}
        >
          <RationSummaryPlaque ration={ration} />
        </div>
        <div className={cn('flex flex-col px-3 sm:px-4', list ? 'mt-auto pt-2.5' : 'md:pt-2')}>
          <div
            aria-hidden
            className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)] dark:border-[var(--nora-border-strong)]"
          />
          <div
            className="flex items-center gap-2 py-2.5"
            data-slot="meal-card-footer"
            onClick={(event) => event.stopPropagation()}
          >
            {showAdd ? (
            <NoraHoverTip label={addLabel}>
              <NoraIconButton
                aria-label={addLabel}
                className={cn(FEED_RATION_PLUS_CLASS, list && 'max-md:hidden')}
                disabled={!canAdd || adding}
                onClick={(event) => {
                  event.stopPropagation()
                  onAdd()
                }}
              >
                <PlusIcon className="size-4" />
              </NoraIconButton>
            </NoraHoverTip>
            ) : null}
            {list ? <FeedListAuthorLabel name={ration.authorName ?? 'Пользователь'} /> : null}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {list && showAdd ? (
                <NoraHoverTip label={addLabel}>
                  <NoraIconButton
                    aria-label={addLabel}
                    className={cn(FEED_RATION_PLUS_CLASS, 'md:hidden')}
                    disabled={!canAdd || adding}
                    onClick={(event) => {
                      event.stopPropagation()
                      onAdd()
                    }}
                  >
                    <PlusIcon className="size-4" />
                  </NoraIconButton>
                </NoraHoverTip>
              ) : null}
              <MealLikeButton
                likeCount={ration.likeCount}
                liked={ration.liked}
                onToggle={onToggleLike}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function SharedRationsFeed({
  query = '',
  origin = 'feed',
  likedOnly = false,
  goal = null,
  layout = 'grid',
  period = null,
  onOpenRation,
}: {
  query?: string
  origin?: ProductCardOrigin
  likedOnly?: boolean
  goal?: FeedGoal | null
  layout?: FeedCardLayout
  period?: DiaryPeriodFilter | null
  onOpenRation: (rationId: string) => void
}) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const rationsQuery = useSharedRationsQuery()
  const isMentor = auth.user?.role === 'mentor'
  const canUseLibrary = auth.user?.role === 'user'
  const planLibraryQuery = usePlanLibraryQuery(canUseLibrary)
  const { snapshot, persist } = useSyncedPlanLibrary(canUseLibrary)
  const mentorPlansQuery = useQuery({
    queryKey: ['session', 'mentor', 'plans'] as const,
    enabled: Boolean(isMentor && auth.user),
    queryFn: async () => {
      const api = await import('@/features/mentor/api')
      return api.listMentorPlans(auth.transport)
    },
  })
  const mentorPlans = mentorPlansQuery.data?.items ?? []
  const [addingId, setAddingId] = React.useState<string | null>(null)
  const rations = rationsQuery.data?.items ?? []
  const authored = planLibraryQuery.data
    ? snapshotFromPlanLibrary(planLibraryQuery.data).authoredPlans
    : snapshot.authoredPlans
  const visible = React.useMemo(
    () => filterSharedRations(rations, { likedOnly, goal, query, period }),
    [rations, likedOnly, goal, query, period],
  )
  const filtersActive = likedOnly || Boolean(query.trim()) || goal != null || period != null

  const likeMutation = useMutation({
    mutationFn: ({ rationId, liked }: { rationId: string; liked: boolean }) =>
      likeSharedRation(auth.transport, rationId, { liked }),
    onMutate: async ({ rationId, liked }) => {
      await queryClient.cancelQueries({ queryKey: mealsQueryKeys.sharedRations() })
      const previous = queryClient.getQueryData<ListSharedRationsResponse>(
        mealsQueryKeys.sharedRations(),
      )
      queryClient.setQueryData(
        mealsQueryKeys.sharedRations(),
        patchSharedRationLike(previous, rationId, liked),
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(mealsQueryKeys.sharedRations(), context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Не удалось поставить лайк',
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: mealsQueryKeys.sharedRations() })
    },
  })

  function toggleLike(ration: SharedRation) {
    likeMutation.mutate({ rationId: ration.id, liked: !ration.liked })
  }

  function rationCanAdd(ration: SharedRation) {
    if (isMentor) {
      return (
        !ration.own
        && matchingMentorPlanByTitle(ration.title, mentorPlans) == null
        && mentorPlans.length < MENTOR_FEED_PLAN_CAP
      )
    }
    return canUseLibrary && canAddSharedRationToMine(ration, authored)
  }

  function rationAddLabel(ration: SharedRation) {
    if (!isMentor) return sharedRationAddLabel(ration, authored)
    if (ration.own) return 'Это ваш рацион'
    if (matchingMentorPlanByTitle(ration.title, mentorPlans)) return 'Уже в ваших рационах'
    if (mentorPlans.length >= MENTOR_FEED_PLAN_CAP) return 'Уже 20 рационов'
    return 'В мои'
  }

  async function addRationToMentor(ration: SharedRation) {
    if (!auth.user) return
    if (ration.own) {
      toast('Это ваш рацион')
      return
    }
    if (matchingMentorPlanByTitle(ration.title, mentorPlans)) {
      toast('Уже в ваших рационах')
      return
    }
    if (mentorPlans.length >= MENTOR_FEED_PLAN_CAP) {
      toast.error('Уже 20 рационов')
      return
    }
    const body = mentorPlanRequestFromSharedRation(ration)
    if (!body) {
      toast.error('Не удалось добавить рацион')
      return
    }
    setAddingId(ration.id)
    try {
      const api = await import('@/features/mentor/api')
      await api.createMentorPlan(auth.transport, body)
      await queryClient.invalidateQueries({ queryKey: ['session', 'mentor', 'plans'] })
      toast.success('Рацион добавлен в ваши рационы')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить рацион')
    } finally {
      setAddingId(null)
    }
  }

  async function addRationToMine(ration: SharedRation) {
    if (isMentor) {
      await addRationToMentor(ration)
      return
    }
    if (!canUseLibrary || !auth.user) {
      toast('Добавить рацион в «Мои» можно из аккаунта пользователя')
      return
    }
    if (!canAddSharedRationToMine(ration, authored)) {
      toast(sharedRationAddLabel(ration, authored))
      return
    }
    if (authored.length >= 20) {
      toast.error('В «Мои» уже 20 рационов')
      return
    }
    const created = createAuthoredPlanFromSharedRation(ration)
    if (!created) {
      toast.error('Не удалось добавить рацион')
      return
    }
    setAddingId(ration.id)
    try {
      const drafts = sharedRationMealCreateDrafts(ration, created.id)
      for (const [index, body] of drafts.entries()) {
        const photo = ration.meals[index]?.image.trim() ?? ''
        const src = photo && !photo.startsWith('data:') ? photo : ''
        const image = src ? await mealImageFromUrl(src) : null
        await createMyMeal(auth.transport, {
          ...body,
          ...(image ? { imageBase64: image.base64, imageMime: image.mime } : {}),
        })
      }
      persist(withAuthoredPlan(snapshot, created))
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.forSubject(auth.user.id) })
      await queryClient.invalidateQueries({ queryKey: planLibraryQueryKeys.forUser(auth.user.id) })
      toast.success('Рацион добавлен в «Мои»')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить рацион')
    } finally {
      setAddingId(null)
    }
  }

  if (rationsQuery.isError) {
    return (
      <ProductFeedEmpty
        action={
          <NoraButton
            variant="tinted"
            onClick={() => {
              void rationsQuery.refetch()
            }}
          >
            Повторить
          </NoraButton>
        }
        description="Проверьте соединение и попробуйте ещё раз."
        origin={origin}
        title="Не удалось загрузить ленту"
      />
    )
  }

  if (rationsQuery.isLoading) {
    return <SectionLoading label="Загрузка рационов" />
  }

  if (rations.length === 0 && !filtersActive) {
    return (
      <ProductFeedEmpty
        description="Опубликованные рационы появятся здесь."
        origin={origin}
        title="Рационов пока нет"
      />
    )
  }

  if (visible.length === 0) {
    const likesEmpty = likedOnly && !query.trim() && goal == null && period == null
    return (
      <ProductFeedEmpty
        description={
          likesEmpty
            ? 'Лайкните рацион в ленте — он появится здесь.'
            : period
              ? 'В этом периоде пока нет опубликованных рационов.'
            : goal
              ? 'С этой целью пока нет опубликованных рационов.'
              : 'Смягчите поиск — в ленте остаются только опубликованные рационы.'
        }
        icon={<SearchIcon aria-hidden strokeWidth={1.75} />}
        origin={origin}
        title={likesEmpty ? 'Пока нет лайков' : 'Ничего не найдено'}
      />
    )
  }

  return (
    <section className={feedGridClass(layout)}>
      {visible.map((ration) => (
        <SharedRationCard
          addLabel={rationAddLabel(ration)}
          adding={addingId === ration.id}
          canAdd={rationCanAdd(ration)}
          key={ration.id}
          showAdd={!isMentor}
          layout={layout}
          onAdd={() => {
            void addRationToMine(ration)
          }}
          onOpen={() => onOpenRation(ration.id)}
          onToggleLike={() => toggleLike(ration)}
          ration={ration}
        />
      ))}
    </section>
  )
}
