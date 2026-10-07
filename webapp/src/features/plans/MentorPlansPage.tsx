import * as React from 'react'
import { ArrowLeftIcon, CalendarRangeIcon, PencilIcon, UtensilsIcon } from '@/components/icons'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '@/components/ui/toast'

import { NoraButton } from '@/components/nora/primitives'
import {
  ProductFeedEmpty,
  SectionLoading,
  productFeedToolbarRowClass,
} from '@/components/nora/product-sheet'
import { useAuth } from '@/features/auth'
import { DeleteCardDialog } from '@/features/diary/DeleteCardDialog'
import { planCardDeletePrompt } from '@/features/diary/delete-card-prompt'
import { daysCountLabel, mealsCountLabel, mealsQueryKeys, shareMyRation, useSharedRationsQuery } from '@/features/diary'
import {
  emptyRationDraft,
  getMentorUserPlans,
  mentorPlanUpsertFromDays,
  mentorRationToEntry,
  planAssignmentQueryKey,
  putMentorUserPlans,
  RationEditorDialog,
  rationPlanDayDrafts,
  rationToDraft,
  RationUserPicker,
  useCreateMentorPlanMutation,
  useDeleteMentorPlanMutation,
  useMentorPlansQuery,
  useMentorUsersQuery,
  useUpdateMentorPlanMutation,
  type RationDraft,
  type RationEntry,
} from '@/features/mentor'
import { parsePlanGoal } from '@/platform/authored-plans'

import { CurrentPlanMeals } from './CurrentPlanMeals'
import { orderRationCopiesAfterSource, rationCopyTitle } from './ration-copy'
import { PlanPageShell } from './PlanPageShell'
import { planFeedGridClass, readPlanCardLayout, writePlanCardLayout, type PlanCardLayout } from './plan-card-layout'
import {
  MOBILE_DOCK_BOTTOM_CLASS,
  MOBILE_DOCK_FAB_CLASS,
  MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS,
  MOBILE_DOCK_FAB_ICON_CLASS,
  MOBILE_DOCK_PILL_CLASS,
} from './mobile-dock'
import { PlanToolbar, planToolbarPillClass, visiblePlanCards, type PlanFeedTab } from './PlanToolbar'
import { WeekPlanCard } from './WeekPlanCard'
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
  const [copyingPlanId, setCopyingPlanId] = React.useState<string | null>(null)
  const deletePlan = useDeleteMentorPlanMutation()
  const [draft, setDraft] = React.useState<RationDraft | null>(null)
  const [deletePlanTarget, setDeletePlanTarget] = React.useState<{ id: string; title: string } | null>(
    null,
  )
  const [sendPlan, setSendPlan] = React.useState<RationEntry | null>(null)
  const [assigningUserId, setAssigningUserId] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<PlanFeedTab>('Все')
  const [cardLayout, setCardLayout] = React.useState<PlanCardLayout>(readPlanCardLayout)
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
    return orderRationCopiesAfterSource(visiblePlanCards(items, query, new Set(), tab, 'mentor'))
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

  async function copyPlan(planId: string, title: string) {
    if (copyingPlanId) return
    const source = plansQuery.data?.items.find((item) => item.id === planId)
    if (!source || source.meals.length === 0) {
      toast.error('В этом рационе пока нет приёмов')
      return
    }
    const titles = (plansQuery.data?.items ?? []).map((item) => item.title)
    setCopyingPlanId(planId)
    try {
      await createPlan.mutateAsync({
        title: rationCopyTitle(title, titles),
        description: source.description,
        goal: source.goal,
        ...(source.image ? { image: source.image } : {}),
        meals: source.meals,
      })
      toast.success('Рацион скопирован')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось скопировать рацион')
    } finally {
      setCopyingPlanId(null)
    }
  }

  async function saveCreatedPlan(days: readonly RationEntry[]) {
    const body = mentorPlanUpsertFromDays(days)
    if (!body) {
      toast.error('Добавьте хотя бы один приём с названием')
      return
    }
    try {
      const created = await createPlan.mutateAsync(body)
      setDraft(null)
      toast.success('План сохранён')
      void navigate({ to: '/mentor/plans/$planId', params: { planId: created.plan.id } })
    } catch {
      toast.error('Не удалось сохранить план')
    }
  }

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
    <>
    <PlanPageShell
      description="Соберите рацион и отправьте его своим пользователям. У них он появится в разделе «План»."
      title="Рационы"
    >
      <PlanToolbar
        cardLayout={cardLayout}
        onCardLayoutChange={(next) => {
          setCardLayout(next)
          writePlanCardLayout(next)
        }}
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
        <SectionLoading label="Загрузка планов" />
      ) : cards.length === 0 ? (
        <ProductFeedEmpty
          description="Создайте план и отправьте его пользователю через кнопку на карточке."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Пока нет планов"
        />
      ) : (
        <section className={planFeedGridClass(cardLayout)}>
          {cards.map((plan) => (
            <WeekPlanCard
              actionLabel="Отправить"
              key={plan.id}
              layout={cardLayout}
              onOpen={() => {
                void navigate({ to: '/mentor/plans/$planId', params: { planId: plan.id } })
              }}
              copying={copyingPlanId === plan.id}
              onCopy={() => void copyPlan(plan.id, plan.title)}
              onDelete={() => setDeletePlanTarget({ id: plan.id, title: plan.title })}
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
        onSave={(ration) => saveCreatedPlan([ration])}
        onSaveDays={(days) => saveCreatedPlan(days)}
        open={draft != null}
        ownerId={userId}
      />
      <DeleteCardDialog
        confirmLabel={planCardDeletePrompt(deletePlanTarget?.title ?? '').confirmLabel}
        description={planCardDeletePrompt(deletePlanTarget?.title ?? '').description}
        pending={deletePlan.isPending}
        onConfirm={() => {
          if (!deletePlanTarget || deletePlan.isPending) return
          const planId = deletePlanTarget.id
          deletePlan.mutate(planId, {
            onSuccess: () => {
              setDeletePlanTarget(null)
              toast.success('Рацион удалён')
            },
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : 'Не удалось удалить рацион')
            },
          })
        }}
        onOpenChange={(open) => {
          if (!open && !deletePlan.isPending) setDeletePlanTarget(null)
        }}
        open={deletePlanTarget !== null}
        title={planCardDeletePrompt(deletePlanTarget?.title ?? '').title}
      />
    </PlanPageShell>
    <div className={`${MOBILE_DOCK_BOTTOM_CLASS} left-4 md:hidden`}>
      <button
        aria-label="Создать рацион"
        className={MOBILE_DOCK_FAB_CLASS}
        onClick={() => setDraft(emptyRationDraft())}
        type="button"
      >
        <UtensilsIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_ACTIVE_CLASS} strokeWidth={1.75} />
      </button>
    </div>
    </>
  )
}

export function MentorPlanDetailPage({ planId }: { planId: string }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const plansQuery = useMentorPlansQuery()
  const updatePlan = useUpdateMentorPlanMutation()
  const [editing, setEditing] = React.useState(false)
  const source = plansQuery.data?.items.find((item) => item.id === planId)
  const entry = source ? mentorRationToEntry(source) : null
  const plan = entry
    ? buildWeekPlanFromRation({
        coverImage: source?.image,
        goal: parsePlanGoal(entry.goal),
        planId: entry.id,
        ration: entry,
        title: entry.title,
      })
    : null
  const editDraft = entry ? rationToDraft(entry) : null

  function goBack() {
    void navigate({ to: '/mentor/plans' })
  }

  async function saveEdited(days: readonly RationEntry[]) {
    const body = mentorPlanUpsertFromDays(days)
    if (!body) {
      toast.error('Добавьте хотя бы один приём с названием')
      return
    }
    try {
      await updatePlan.mutateAsync({ planId, body })
      setEditing(false)
      toast.success('Рацион сохранён')
    } catch {
      toast.error('Не удалось сохранить рацион')
    }
  }

  const editButtonClass = `${planToolbarPillClass} nora-press-grow inline-flex shrink-0 flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]`

  return (
    <>
      <PlanPageShell
        coverImage={plan?.coverImage}
        description={plan?.description.trim() || 'Приёмы по дням этого рациона.'}
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
        title={plan?.title ?? 'Рацион'}
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
            title="Не удалось загрузить рацион"
          />
        ) : plansQuery.isPending ? (
          <SectionLoading label="Загрузка рациона" />
        ) : plan == null || entry == null ? (
          <ProductFeedEmpty
            action={
              <NoraButton onClick={goBack} variant="tinted">
                К рационам
              </NoraButton>
            }
            description="Этот рацион больше не сохранён."
            icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
            title="Рацион не найден"
          />
        ) : plan.days.length === 0 ? (
          <ProductFeedEmpty
            action={
              <NoraButton onClick={goBack} variant="tinted">
                К рационам
              </NoraButton>
            }
            description="В этом рационе пока нет приёмов."
            icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
            title="Рацион пустой"
          />
        ) : (
          <>
            <section className="flex max-md:hidden flex-col">
              <div className="flex w-full min-w-0 items-center pt-1">
                <div className={productFeedToolbarRowClass}>
                  <button
                    aria-label="Назад"
                    className={`${planToolbarPillClass} nora-press-grow size-9 shrink-0 justify-center p-0 text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-4`}
                    onClick={goBack}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden />
                  </button>
                  <button className={editButtonClass} onClick={() => setEditing(true)} type="button">
                    <PencilIcon aria-hidden className="size-4" strokeWidth={1.75} />
                    Изменить
                  </button>
                </div>
              </div>
            </section>
            <CurrentPlanMeals
              completedIds={new Set()}
              days={plan.days}
              onDetachPlanMeal={() => undefined}
              readOnly
            />
          </>
        )}
      </PlanPageShell>
      {plan != null ? (
        <div className={`${MOBILE_DOCK_BOTTOM_CLASS} left-4 flex items-center gap-2 md:hidden`}>
          <button
            aria-label="Назад"
            className={MOBILE_DOCK_FAB_CLASS}
            onClick={goBack}
            type="button"
          >
            <ArrowLeftIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
          </button>
          <button className={MOBILE_DOCK_PILL_CLASS} onClick={() => setEditing(true)} type="button">
            <PencilIcon aria-hidden className={MOBILE_DOCK_FAB_ICON_CLASS} strokeWidth={1.75} />
            Изменить
          </button>
        </div>
      ) : null}
      {editDraft && entry ? (
        <RationEditorDialog
          draft={editDraft}
          initialDays={rationPlanDayDrafts(entry)}
          mode="plan"
          onOpenChange={setEditing}
          onSave={(ration) => saveEdited([ration])}
          onSaveDays={(days) => saveEdited(days)}
          open={editing}
          ownerId={auth.user?.id ?? 'guest'}
        />
      ) : null}
    </>
  )
}
