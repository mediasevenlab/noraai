import * as React from 'react'
import { CalendarRangeIcon } from '@/components/icons'

import { NoraButton } from '@/components/nora/primitives'
import { ProductFeedEmpty, SectionLoading } from '@/components/nora/product-sheet'
import { useAuth } from '@/features/auth'
import { mealDtoToEntry, useMealsQuery } from '@/features/diary'
import { DeleteCardDialog } from '@/features/diary/DeleteCardDialog'
import { planCardDeletePrompt } from '@/features/diary/delete-card-prompt'
import {
  mentorRationToEntry,
  useCreateMentorPlanMutation,
  useDeleteMentorPlanMutation,
  useMentorPlansQuery,
  usePlanAssignmentQuery,
} from '@/features/mentor'
import { toast } from '@/components/ui/toast'
import { parsePlanGoal } from '@/platform/authored-plans'

import { CurrentPlanMeals } from './CurrentPlanMeals'
import { planFeedGridClass } from './plan-card-layout'
import { PlanGroupHeading, PLAN_GROUP_ICONS } from './PlanToolbar'
import { WeekPlanCard } from './WeekPlanCard'
import { rationCopyTitle } from './ration-copy'
import { buildWeekPlan, buildWeekPlanFromRation, type WeekPlan } from './week-plan'

export function MenteeAssignedPlans({
  onDetailBack,
  userId,
}: {
  onDetailBack?: (back: (() => void) | null) => void
  userId: string
}) {
  const auth = useAuth()
  const mealsQuery = useMealsQuery(userId)
  const assignment = usePlanAssignmentQuery(userId, true)
  const [openPlanId, setOpenPlanId] = React.useState<string | null>(null)
  const plansQuery = useMentorPlansQuery()
  const createPlan = useCreateMentorPlanMutation()
  const deletePlan = useDeleteMentorPlanMutation()
  const [copyingPlanId, setCopyingPlanId] = React.useState<string | null>(null)
  async function copyAssignedPlan(plan: { id: string; title: string }) {
    if (copyingPlanId) return
    const source = assignment.data?.authoredPlans.find((item) => item.id === plan.id)
    if (!source || source.meals.length === 0) {
      toast.error('В этом рационе пока нет приёмов')
      return
    }
    setCopyingPlanId(plan.id)
    try {
      await createPlan.mutateAsync({
        title: rationCopyTitle(
          plan.title,
          (plansQuery.data?.items ?? []).map((item) => item.title),
        ),
        description: source.description,
        goal: source.goal,
        ...(source.image ? { image: source.image } : {}),
        meals: source.meals,
      })
      toast.success('Рацион скопирован в ваши рационы')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось скопировать рацион')
    } finally {
      setCopyingPlanId(null)
    }
  }
  const [deletePlanTarget, setDeletePlanTarget] = React.useState<{ id: string; title: string } | null>(
    null,
  )
  const closePlan = React.useCallback(() => setOpenPlanId(null), [])
  React.useEffect(() => {
    onDetailBack?.(openPlanId ? closePlan : null)
    return () => onDetailBack?.(null)
  }, [closePlan, onDetailBack, openPlanId])
  const savedScope = { userId: auth.user?.id ?? 'guest', email: auth.user?.email }
  const meals = React.useMemo(
    () => (mealsQuery.data?.items ?? []).map(mealDtoToEntry),
    [mealsQuery.data?.items],
  )
  const rations = React.useMemo(
    () => (assignment.data?.authoredPlans ?? []).map(mentorRationToEntry),
    [assignment.data?.authoredPlans],
  )
  const mentorPlans = React.useMemo(() => {
    return (assignment.data?.authoredPlans ?? []).map((item) => {
      const ration = mentorRationToEntry(item)
      const fromDiary = buildWeekPlan({
        coverImage: item.image,
        description: item.description,
        goal: parsePlanGoal(item.goal),
        meals,
        planId: item.id,
        rations,
        title: item.title,
      })
      if (fromDiary.days.length > 0) return fromDiary
      return buildWeekPlanFromRation({
        coverImage: item.image,
        goal: parsePlanGoal(item.goal),
        planId: item.id,
        ration,
        title: item.title,
      })
    })
  }, [assignment.data?.authoredPlans, meals, rations])
  const openPlan = openPlanId
    ? mentorPlans.find((plan) => plan.id === openPlanId) ?? null
    : null
  const pending = mealsQuery.isPending || assignment.isPending
  const failed = mealsQuery.isError || assignment.isError

  if (pending) {
    return <SectionLoading label="Загрузка рационов" />
  }

  if (failed) {
    return (
      <ProductFeedEmpty
        action={
          <NoraButton
            onClick={() => {
              void mealsQuery.refetch()
              void assignment.refetch()
            }}
            variant="tinted"
          >
            Повторить
          </NoraButton>
        }
        description="Проверьте соединение и попробуйте ещё раз."
        icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
        title="Не удалось загрузить рационы"
      />
    )
  }

  if (openPlan) {
    return (
      <MenteeRationDays plan={openPlan} />
    )
  }

  if (mentorPlans.length === 0) {
    return (
      <ProductFeedEmpty
        description="Рационы, которые вы отправите этому пользователю, появятся здесь."
        icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
        title="Пока нет рационов"
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <RationGroup
        fromMentor
        icon={PLAN_GROUP_ICONS.mentor}
        label="От наставника"
        plans={mentorPlans}
        savedScope={savedScope}
        tone="mentor"
        copyingPlanId={copyingPlanId}
        onCopy={(plan) => void copyAssignedPlan(plan)}
        onDelete={setDeletePlanTarget}
        onOpen={setOpenPlanId}
      />
      <DeleteCardDialog
        confirmLabel={planCardDeletePrompt(deletePlanTarget?.title ?? '').confirmLabel}
        description={planCardDeletePrompt(deletePlanTarget?.title ?? '').description}
        pending={deletePlan.isPending}
        onConfirm={() => {
          if (!deletePlanTarget || deletePlan.isPending) return
          deletePlan.mutate(deletePlanTarget.id, {
            onSuccess: () => {
              setDeletePlanTarget(null)
              if (openPlanId) setOpenPlanId(null)
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
    </div>
  )
}

function RationGroup({
  copyingPlanId = null,
  fromMentor = false,
  icon,
  label,
  plans,
  savedScope,
  tone,
  onCopy,
  onDelete,
  onOpen,
}: {
  copyingPlanId?: string | null
  fromMentor?: boolean
  icon: (typeof PLAN_GROUP_ICONS)['mine']
  label: string
  plans: WeekPlan[]
  savedScope: { userId: string; email?: string }
  tone: 'mine' | 'mentor'
  onCopy: (plan: { id: string; title: string }) => void
  onDelete: (plan: { id: string; title: string }) => void
  onOpen: (planId: string) => void
}) {
  if (plans.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      <PlanGroupHeading count={plans.length} icon={icon} label={label} tone={tone} />
      <section className={planFeedGridClass('grid')}>
        {plans.map((plan) => (
          <WeekPlanCard
            canShare={false}
            fromMentor={fromMentor}
            key={plan.id}
            copying={copyingPlanId === plan.id}
            onCopy={() => onCopy({ id: plan.id, title: plan.title })}
            onDelete={() => onDelete({ id: plan.id, title: plan.title })}
            onOpen={() => onOpen(plan.id)}
            plan={plan}
            savedScope={savedScope}
          />
        ))}
      </section>
    </div>
  )
}

function MenteeRationDays({
  plan,
}: {
  plan: WeekPlan
}) {
  return (
    <div className="flex flex-col gap-4">
      {plan.days.length === 0 ? (
        <ProductFeedEmpty
          description="В этом рационе пока нет приёмов."
          icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
          title="Рацион пустой"
        />
      ) : (
        <CurrentPlanMeals
          completedIds={new Set()}
          days={plan.days}
          onDetachPlanMeal={() => undefined}
          readOnly
        />
      )}
    </div>
  )
}
