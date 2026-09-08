import * as React from 'react'
import { CalendarRangeIcon } from 'lucide-react'

import { NoraButton } from '@/components/nora/primitives'
import { ProductFeedEmpty, productFeedGridClass } from '@/components/nora/product-sheet'
import { useAuth } from '@/features/auth'
import {
  mentorRationToEntry,
  usePlanAssignmentQuery,
} from '@/features/mentor'
import { parsePlanGoal } from '@/platform/authored-plans'

import { CurrentPlanMeals } from './CurrentPlanMeals'
import { WeekPlanCard, WeekPlanCardSkeleton } from './WeekPlanCard'
import { buildWeekPlanFromRation } from './week-plan'

export function MenteeAssignedPlans({ userId }: { userId: string }) {
  const auth = useAuth()
  const assignment = usePlanAssignmentQuery(userId, true)
  const [openPlanId, setOpenPlanId] = React.useState<string | null>(null)
  const savedScope = { userId: auth.user?.id ?? 'guest', email: auth.user?.email }
  const cards = React.useMemo(
    () =>
      (assignment.data?.authoredPlans ?? []).map((item) =>
        buildWeekPlanFromRation({
          coverImage: item.image,
          goal: parsePlanGoal(item.goal),
          planId: item.id,
          ration: mentorRationToEntry(item),
          title: item.title,
        }),
      ),
    [assignment.data?.authoredPlans],
  )
  const openPlan = openPlanId ? cards.find((plan) => plan.id === openPlanId) ?? null : null

  if (assignment.isPending) {
    return (
      <section className={productFeedGridClass}>
        <WeekPlanCardSkeleton />
      </section>
    )
  }

  if (assignment.isError) {
    return (
      <ProductFeedEmpty
        action={
          <NoraButton onClick={() => void assignment.refetch()} variant="tinted">
            Повторить
          </NoraButton>
        }
        description="Проверьте соединение и попробуйте ещё раз."
        icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
        title="Не удалось загрузить планы"
      />
    )
  }

  if (openPlan) {
    return (
      <div className="flex flex-col gap-4">
        <NoraButton
          className="self-start"
          onClick={() => setOpenPlanId(null)}
          variant="tinted"
        >
          К планам
        </NoraButton>
        {openPlan.days.length === 0 ? (
          <ProductFeedEmpty
            description="В этом плане пока нет приёмов."
            icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
            title="План пустой"
          />
        ) : (
          <CurrentPlanMeals
            completedIds={new Set()}
            days={openPlan.days}
            onDetachPlanMeal={() => undefined}
            readOnly
          />
        )}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <ProductFeedEmpty
        description="Наставник ещё не отправил план этому пользователю."
        icon={<CalendarRangeIcon aria-hidden strokeWidth={1.75} />}
        title="Пока нет планов"
      />
    )
  }

  return (
    <section className={productFeedGridClass}>
      {cards.map((plan) => (
        <WeekPlanCard
          key={plan.id}
          onOpen={() => setOpenPlanId(plan.id)}
          plan={plan}
          savedScope={savedScope}
        />
      ))}
    </section>
  )
}
