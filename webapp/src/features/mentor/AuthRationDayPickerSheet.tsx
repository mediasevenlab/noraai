import * as React from 'react'

import { useLatest } from '@/lib/use-latest'
import { authDemoClear, authDemoTimeout } from '@/features/diary'

import {
  authDemoPlanMeals,
  authRationAddDemoDay,
  authRationDayBusyAtMs,
  authRationDayCloseAtMs,
  authRationDayPressAtMs,
  authRationDaySuccessAtMs,
} from './auth-ration-demo'
import { RationDayPickerBody } from './RationDayPicker'
import type { RationEntry } from './rations-catalog'

export function AuthRationDayPickerSheet({
  collapsing = false,
  play,
  ration,
  startMs = 0,
  onCaptionId,
  onComplete,
}: {
  collapsing?: boolean
  play: boolean
  ration: RationEntry
  startMs?: number
  onCaptionId?: (id: 'rationDay') => void
  onComplete?: () => void
}) {
  const monday = React.useMemo(() => authRationAddDemoDay(), [])
  const assignedMeals = React.useMemo(
    () =>
      authDemoPlanMeals(ration).map((meal) => ({
        id: meal.id,
        title: meal.title,
        recordedAt: meal.at,
        assumptions: meal.assumptions ?? [],
      })),
    [ration],
  )
  const [pressedDayKey, setPressedDayKey] = React.useState<string | null>(null)
  const [addingDayKey, setAddingDayKey] = React.useState<string | null>(null)
  const [assigned, setAssigned] = React.useState(false)
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)

  React.useEffect(() => {
    onCaptionIdRef.current?.('rationDay')
  }, [onCaptionIdRef])

  React.useEffect(() => {
    if (!play) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const origin = Math.max(0, startMs)
    const pressAt = authRationDayPressAtMs()
    const busyAt = authRationDayBusyAtMs()
    const successAt = authRationDaySuccessAtMs()
    if (origin >= successAt) {
      setAssigned(true)
    } else if (origin >= busyAt) {
      setAddingDayKey(monday.dayKey)
    } else if (origin >= pressAt) {
      setPressedDayKey(monday.dayKey)
    }

    const at = (ms: number, fn: () => void) => {
      if (ms <= origin) return null
      return authDemoTimeout(fn, ms - origin)
    }
    const timers = [
      at(pressAt, () => setPressedDayKey(monday.dayKey)),
      at(busyAt, () => {
        setPressedDayKey(null)
        setAddingDayKey(monday.dayKey)
      }),
      at(successAt, () => {
        setAddingDayKey(null)
        setAssigned(true)
      }),
      at(authRationDayCloseAtMs(), () => onCompleteRef.current?.()),
    ]
    return () => {
      for (const id of timers) {
        if (id != null) authDemoClear(id)
      }
    }
  }, [monday.dayKey, play, onCompleteRef])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-collapsing={collapsing ? '' : undefined}
      data-ration-day-picker="demo"
    >
      <RationDayPickerBody
        addingDayKey={addingDayKey}
        collapsing={collapsing}
        demoPressedDayKey={pressedDayKey}
        hideClose
        meals={assigned ? assignedMeals : []}
        onSelectDay={() => undefined}
        ration={ration}
        rations={[ration]}
      />
    </div>
  )
}
