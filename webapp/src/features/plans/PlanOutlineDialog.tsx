import * as React from 'react'
import { toast } from 'sonner'

import {
  RationEditorDialog,
  type RationDraft,
  type RationEntry,
  type RationGoal,
} from '@/features/mentor'

import {
  applyPlanDayDrafts,
  newMealRationsFromPlanDrafts,
  weekPlanDaysToDraftDays,
} from './plan-outline-editor'
import { padPlanDaysForEditor, type WeekPlanDay } from './week-plan'

export function PlanOutlineDialog({
  coverImage = '',
  dayCount = 0,
  days,
  description,
  goal,
  onOpenChange,
  onSave,
  open,
  ownerId,
  planId,
  title,
}: {
  coverImage?: string
  dayCount?: number
  days: readonly WeekPlanDay[]
  description: string
  goal?: RationGoal | null
  onOpenChange: (open: boolean) => void
  onSave: (next: {
    title: string
    description: string
    coverImage: string
    days: WeekPlanDay[]
    newDayRations: RationEntry[]
  }) => void | Promise<void>
  open: boolean
  ownerId: string
  planId: string
  title: string
}) {
  const paddedDays = React.useMemo(
    () => padPlanDaysForEditor(days, new Date(), dayCount),
    [dayCount, days],
  )
  const initialDays = React.useMemo(() => weekPlanDaysToDraftDays(paddedDays), [paddedDays])
  const draft = React.useMemo<RationDraft>(
    () => ({
      id: planId,
      title,
      description,
      coverImage,
      goal: goal ?? 'Поддержание',
      meals: initialDays[0] ?? [],
    }),
    [coverImage, description, goal, initialDays, planId, title],
  )

  return (
    <RationEditorDialog
      draft={draft}
      initialDays={initialDays}
      mode="plan"
      onOpenChange={onOpenChange}
      onSave={() => undefined}
      onSaveDayDrafts={async (form, dayDrafts) => {
        const nextTitle = form.title.trim()
        if (!nextTitle) {
          toast.error('Назовите план')
          return
        }
        await onSave({
          title: nextTitle,
          description: form.description.trim(),
          coverImage: form.coverImage?.trim() ?? '',
          days: applyPlanDayDrafts(paddedDays, dayDrafts),
          newDayRations: newMealRationsFromPlanDrafts(paddedDays, dayDrafts, form),
        })
      }}
      open={open}
      outline
      ownerId={ownerId}
    />
  )
}
