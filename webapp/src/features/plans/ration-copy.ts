import type { RationEntry, RationGoal, RationMeal } from '@/features/mentor'

import type { WeekPlan } from './week-plan'

const COPY_SUFFIX = / копия (\d+)$/u

/** Keep «копия N» immediately after the card it was copied from, further right in the row. */
export function orderRationCopiesAfterSource<T extends { title: string }>(plans: readonly T[]): T[] {
  const originals: T[] = []
  const copies: Array<{ plan: T; base: string; number: number; index: number }> = []
  plans.forEach((plan, index) => {
    const title = plan.title.trim()
    const match = COPY_SUFFIX.exec(title)
    if (!match) {
      originals.push(plan)
      return
    }
    copies.push({
      plan,
      base: title.slice(0, match.index).trim(),
      number: Number(match[1]),
      index,
    })
  })
  copies.sort((left, right) => left.number - right.number || left.index - right.index)

  const result = [...originals]
  const unmatched: typeof copies = []
  for (const copy of copies) {
    const at = indexAfterSource(result, copy.base, copy.number)
    if (at == null) unmatched.push(copy)
    else result.splice(at, 0, copy.plan)
  }
  for (const copy of unmatched.sort((left, right) => left.index - right.index)) {
    result.splice(Math.min(copy.index, result.length), 0, copy.plan)
  }
  return result
}

function indexAfterSource(plans: readonly { title: string }[], base: string, number: number) {
  let last = -1
  plans.forEach((plan, index) => {
    const title = plan.title.trim()
    if (title === base) {
      last = index
      return
    }
    const match = COPY_SUFFIX.exec(title)
    if (!match) return
    const earlier = Number(match[1]) < number && title.slice(0, match.index).trim() === base
    if (earlier) last = index
  })
  return last === -1 ? null : last + 1
}

/** Next «копия N» title. Copying an existing copy keeps numbering on the original name. */
export function rationCopyTitle(
  sourceTitle: string,
  existingTitles: readonly string[],
  maxLength = 120,
): string {
  const trimmed = sourceTitle.trim()
  const base = trimmed.replace(COPY_SUFFIX, '').trim() || trimmed || 'Рацион'
  const pattern = new RegExp(`^${escapeRegExp(base)} копия (\\d+)$`, 'u')
  let next = 1
  for (const title of existingTitles) {
    const match = pattern.exec(title.trim())
    if (!match) continue
    const number = Number(match[1])
    if (number >= next) next = number + 1
  }
  const suffix = ` копия ${next}`
  const room = Math.max(1, maxLength - suffix.length)
  const stem = base.length > room ? base.slice(0, room).trim() : base
  return `${stem}${suffix}`.slice(0, maxLength)
}

/** One editor day per filled day, so a copy can be saved and then edited. */
export function rationDaysForCopy(plan: WeekPlan, goal: RationGoal = 'Поддержание'): RationEntry[] {
  const resolvedGoal = plan.goal ?? plan.days.find((day) => day.ration?.goal)?.ration?.goal ?? goal
  const days: RationEntry[] = []
  for (const day of plan.days) {
    const meals = mealsForCopyDay(day)
    if (meals.length === 0) continue
    const ration = day.ration
    days.push({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      goal: resolvedGoal,
      days: 1,
      kcal: ration?.kcal ?? meals.reduce((sum, meal) => sum + meal.kcal, 0),
      protein: ration?.protein ?? meals.reduce((sum, meal) => sum + meal.protein, 0),
      fat: ration?.fat ?? meals.reduce((sum, meal) => sum + meal.fat, 0),
      carbs: ration?.carbs ?? meals.reduce((sum, meal) => sum + meal.carbs, 0),
      mealsPerDay: meals.length,
      image: ration?.image || plan.coverImage,
      source: 'План',
      meals,
    })
  }
  return days
}

function mealsForCopyDay(day: WeekPlan['days'][number]): RationMeal[] {
  const fromRation = (day.ration?.meals ?? []).filter((meal) => meal.title.trim())
  if (fromRation.length > 0) {
    return fromRation.map((meal) => {
      const diary = day.meals.find((item) => item.title === meal.title && item.meal === meal.slot)
      const steps = meal.steps.length > 0 ? meal.steps : stepsFromComment(diary?.clientComment)
      const { dayIndex: _dayIndex, ...rest } = meal
      return { ...rest, steps }
    })
  }
  return day.meals
    .filter((meal) => meal.title.trim())
    .map((meal) => ({
      slot: meal.meal,
      title: meal.title,
      ingredients: meal.ingredients,
      steps: stepsFromComment(meal.clientComment),
      image: meal.image,
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
    }))
}

function stepsFromComment(comment: string | undefined) {
  return (comment ?? '')
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
