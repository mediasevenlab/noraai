import * as React from 'react'

import { cn } from '@/lib/utils'
import { useLatest } from '@/lib/use-latest'

import { authDemoClear, authDemoTimeout } from './auth-demo-playback'
import {
  authPlanMealDemoCloseAtMs,
  authPlanMealDemoCompleteAtMs,
  authPlanMealDemoCompletePressAtMs,
  type AuthDemoCaptionId,
} from './auth-meal-carousel'
import { imagesForDiaryMeal, Cover, MealMacrosPlaque } from './MealCard'
import { MEAL_DIALOG_COVER_CLASS, MealDialogHero, RATION_PENDING_COVER_CLASS } from './meal-sheet'
import { MealOpenDetail } from './MealOpenDetail'
import type { MealEntry } from './meals-catalog'
import { mealCardOrigin } from './ration-import'

export function AuthPlanMealIdleSheet({
  meal,
  play,
  collapsing = false,
  onCaptionId,
  onComplete,
  onMarkDone,
}: {
  meal: MealEntry
  play: boolean
  collapsing?: boolean
  onCaptionId?: (id: AuthDemoCaptionId) => void
  onComplete?: () => void
  onMarkDone?: (mealId: string) => void
}) {
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)
  const onMarkDoneRef = useLatest(onMarkDone)
  const images = imagesForDiaryMeal(meal, {})
  const [completePressed, setCompletePressed] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const completedIds = React.useMemo(
    () => (done ? new Set([meal.id]) : new Set<string>()),
    [done, meal.id],
  )

  React.useEffect(() => {
    onCaptionIdRef.current?.(done ? 'planDone' : 'planMeal')
  }, [done, onCaptionIdRef])

  React.useEffect(() => {
    if (!play) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDone(true)
      onMarkDoneRef.current?.(meal.id)
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const timers = [
      authDemoTimeout(() => setCompletePressed(true), authPlanMealDemoCompletePressAtMs()),
      authDemoTimeout(() => {
        setCompletePressed(false)
        setDone(true)
        onMarkDoneRef.current?.(meal.id)
      }, authPlanMealDemoCompleteAtMs()),
      authDemoTimeout(() => onCompleteRef.current?.(), authPlanMealDemoCloseAtMs()),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [meal.id, onCompleteRef, onMarkDoneRef, play])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-collapsing={collapsing ? '' : undefined}
      data-slot="auth-plan-meal-idle"
    >
      <MealDialogHero
        macros={collapsing ? null : <MealMacrosPlaque meal={meal} />}
        origin={collapsing ? undefined : mealCardOrigin(meal)}
        preview={
          <Cover
            className={cn(
              MEAL_DIALOG_COVER_CLASS,
              'transition-[height,max-height,filter] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0',
              collapsing
                ? 'h-[168px] max-h-[168px] sm:!h-[168px] sm:!max-h-[168px] duration-[620ms]'
                : 'duration-700',
              !done && RATION_PENDING_COVER_CLASS,
            )}
            images={images}
            meal={meal}
            sizes="lg"
          />
        }
        showClose={false}
      />
      <div
        className={cn(
          'min-h-0 flex-1 transition-opacity ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
      >
        <MealOpenDetail
          allowCompletePlan
          completedIds={completedIds}
          demoPressedComplete={completePressed}
          hideClose
          meal={meal}
          onCompletePlan={() => undefined}
          readOnly
        />
      </div>
    </div>
  )
}
