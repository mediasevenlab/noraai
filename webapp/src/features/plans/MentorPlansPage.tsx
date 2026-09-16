import * as React from 'react'
import { CalendarRangeIcon } from 'lucide-react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { NoraButton } from '@/components/nora/primitives'
import {
  ProductFeedEmpty,
  ProductFeedSkeletonSlots,
  productFeedGridClass,
} from '@/components/nora/product-sheet'
import { useAuth } from '@/features/auth'
import { daysCountLabel, mealsCountLabel, mealsQueryKeys, shareMyRation, SkeletonMealCard, useSharedRationsQuery } from '@/features/diary'
import {
  emptyRationDraft,
  getMentorUserPlans,
  mentorRationToEntry,
  planAssignmentQueryKey,
  putMentorUserPlans,
  RationEditorDialog,
  rationToUpsertRequest,
  RationUserPicker,
  useCreateMentorPlanMutation,
  useDeleteMentorPlanMutation,
  useMentorPlansQuery,
  useMentorUsersQuery,
  type RationDraft,
  type RationEntry,
} from '@/features/mentor'
import { parsePlanGoal } from '@/platform/authored-plans'

import { CurrentPlanMeals } from './CurrentPlanMeals'
import { PlanPageShell } from './PlanPageShell'
import { PlanToolbar, visiblePlanCards, type PlanFeedTab } from './PlanToolbar'
import { WeekPlanCard, WeekPlanCardSkeleton } from './WeekPlanCard'
import { buildWeekPlanFromRation, sharedRationSnapshotFromWeekPlan } from './week-plan'

export function MentorPlansPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = auth.user?.id ?? 'guest'
  const savedScope = { userId, email: auth.user?.email }
  const plansQuery = useMentorPlansQuery()
  const sharedRationsQuery = useSharedRationsQuery()
  const sharedSourceIds = React.useMemo(
    () => new Set((sharedRationsQuery.data?.items ?? []).map((item) => item.sourcePlanId)),
    [sharedRationsQuery.data?.items],
  )
  const createPlan = useCreateMentorPlanMutation()
  const deletePlan = useDeleteMentorPlanMutation()
  const [draft, setDraft] = React.useState<RationDraft | null>(null)
  const [sendPlan, setSendPlan] = React.useState<RationEntry | null>(null)
  const [assigningUserId, setAssigningUserId] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<PlanFeedTab>('Все')
  const [query, setQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const mentees = useMentorUsersQuery({ page: 1, pageSize: 100 })

  const assignmentQueries = useQueries({
    queries: (mentees.data?.items ?? []).map((user) => ({
      enabled: sendPlan != null,
      queryKey: planAssignmentQueryKey('mentor', user.id),
      queryFn: () => getMentorUserPlans(auth.transport, user.id),
    })),
  })

  const assignedUserIds = React.useMemo(() => {
    if (!sendPlan) return new Set<string>()
    const ids = new Set<string>()
    for (const [index, user] of (mentees.data?.items ?? []).entries()) {
      if (assignmentQueries[index]?.data?.planIds.includes(sendPlan.id)) {
        ids.add(user.id)
      }
    }
    return ids
  }, [assignmentQueries, mentees.data?.items, sendPlan])

  const cards = React.useMemo(() => {
    const items = (plansQuery.data?.items ?? []).map((item) => {
      const ration = mentorRationToEntry(item)
      return buildWeekPlanFromRation({
        coverImage: item.image,
        goal: parsePlanGoal(item.goal),
        planId: item.id,
        ration,
        title: item.title,
      })
    })
    return visiblePlanCards(items, query, new Set(), tab, 'mentor')
  }, [plansQuery.data?.items, query, tab])

  const assignPlan = React.useCallback(async (menteeId: string) => {
    if (!sendPlan || assigningUserId) return
    setAssigningUserId(menteeId)
    try {
      const current = await getMentorUserPlans(auth.transport, menteeId)
      if (current.planIds.includes(sendPlan.id)) {
        toast('Этот план уже есть у пользователя')
        return
      }
      const next = await putMentorUserPlans(auth.transport, menteeId, {
        planIds: [...current.planIds, sendPlan.id],
      })
      queryClient.setQueryData(planAssignmentQueryKey('mentor', menteeId), next)
      toast.success('План отправлен')
    } catch {
      toast.error('Не удалось отправить план')
    } finally {
      setAssigningUserId(null)
    }
  }, [assigningUserId, auth.transport, queryClient, sendPlan])

  async function toggleShare(plan: (typeof cards)[number]) {
    const nextShared = !sharedSourceIds.has(plan.id)
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

  return (
    <PlanPageShell
      badge="Планы"
      description="Соберите план и отправьте его своим пользователям. У них он появится в разделе «План»."
      title="План"
    >
      <PlanToolbar
        onCreate={() => setDraft(emptyRationDraft())}
        onQueryChange={setQuery}
        onSearchOpenChange={setSearchOpen}
        onTabChange={setTab}
        query={query}
        searchOpen={searchOpen}
        tab={tab}
      />
      {plansQuery.isError ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => void plansQuery.refetch()} variant="tinted">
              Повторить
            </NoraButton>
          }
          description="Проверьте соединение и попробуйте ещё раз."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Не удалось загрузить планы"
        />
      ) : plansQuery.isPending ? (
        <section className={productFeedGridClass}>
          <WeekPlanCardSkeleton />
        </section>
      ) : cards.length === 0 ? (
        <ProductFeedEmpty
          description="Создайте план и отправьте его пользователю через кнопку на карточке."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Пока нет планов"
        />
      ) : (
        <section className={productFeedGridClass}>
          {cards.map((plan) => (
            <WeekPlanCard
              actionLabel="Отправить"
              key={plan.id}
              onDelete={() => {
                void deletePlan.mutateAsync(plan.id).then(
                  () => toast.success('План удалён'),
                  () => toast.error('Не удалось удалить план'),
                )
              }}
              onOpen={() => {
                void navigate({ to: '/mentor/plans/$planId', params: { planId: plan.id } })
              }}
              onSelect={() => {
                const source = plansQuery.data?.items.find((item) => item.id === plan.id)
                if (source) setSendPlan(mentorRationToEntry(source))
              }}
              onShare={() => void toggleShare(plan)}
              plan={plan}
              savedScope={savedScope}
              shared={sharedSourceIds.has(plan.id)}
            />
          ))}
        </section>
      )}
      <RationUserPicker
        assignedUserIds={assignedUserIds}
        assigningUserId={assigningUserId}
        emptyText={
          mentees.isError
            ? 'Не удалось загрузить пользователей'
            : 'Пока нет подключённых пользователей'
        }
        onOpenChange={(open) => {
          if (!open && !assigningUserId) setSendPlan(null)
        }}
        onSelectUser={(menteeId) => {
          if (!sendPlan || assigningUserId) return
          void assignPlan(menteeId)
        }}
        open={sendPlan != null}
        pending={mentees.isPending}
        ration={sendPlan}
        users={mentees.data?.items ?? []}
      />
      <RationEditorDialog
        draft={draft}
        mode="plan"
        onOpenChange={(open) => {
          if (!open) setDraft(null)
        }}
        onSave={async (ration) => {
          try {
            const created = await createPlan.mutateAsync(rationToUpsertRequest(ration))
            setDraft(null)
            toast.success('План сохранён')
            void navigate({ to: '/mentor/plans/$planId', params: { planId: created.plan.id } })
          } catch {
            toast.error('Не удалось сохранить план')
          }
        }}
        open={draft != null}
        ownerId={userId}
      />
    </PlanPageShell>
  )
}

export function MentorPlanDetailPage({ planId }: { planId: string }) {
  const navigate = useNavigate()
  const plansQuery = useMentorPlansQuery()
  const source = plansQuery.data?.items.find((item) => item.id === planId)
  const plan = source
    ? buildWeekPlanFromRation({
        coverImage: source.image,
        goal: parsePlanGoal(source.goal),
        planId: source.id,
        ration: mentorRationToEntry(source),
        title: source.title,
      })
    : null

  return (
    <PlanPageShell
      badge="План"
      coverImage={plan?.coverImage}
      description={plan?.description.trim() || 'Приёмы по дням этого плана.'}
      facts={
        plan
          ? [
              { label: 'Дней', value: daysCountLabel(plan.days.length) },
              { label: 'Приёмов', value: mealsCountLabel(plan.mealsCount) },
              { label: 'Калорийность', value: `${plan.kcal} ккал` },
            ]
          : []
      }
      showHeaderOnMobile
      title={plan?.title ?? 'План'}
    >
      {plansQuery.isError ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => void plansQuery.refetch()} variant="tinted">
              Повторить
            </NoraButton>
          }
          description="Проверьте соединение и попробуйте ещё раз."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Не удалось загрузить план"
        />
      ) : plansQuery.isPending ? (
        <ProductFeedSkeletonSlots Card={SkeletonMealCard} />
      ) : plan == null ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => void navigate({ to: '/mentor/plans' })} variant="tinted">
              К планам
            </NoraButton>
          }
          description="Этот план больше не сохранён."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="План не найден"
        />
      ) : plan.days.length === 0 ? (
        <ProductFeedEmpty
          action={
            <NoraButton onClick={() => void navigate({ to: '/mentor/plans' })} variant="tinted">
              К планам
            </NoraButton>
          }
          description="В этом плане пока нет приёмов."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="План пустой"
        />
      ) : (
        <CurrentPlanMeals
          completedIds={new Set()}
          days={plan.days}
          onDetachPlanMeal={() => undefined}
          readOnly
        />
      )}
    </PlanPageShell>
  )
}
