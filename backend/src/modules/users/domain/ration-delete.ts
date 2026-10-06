/** Hidden stamps copied onto diary meals that came from a ration. */
export const RATION_DIARY_SOURCE_MARK = 'Добавлено из рациона'
export const RATION_DIARY_DONE_MARK = 'Выполнено по плану'
export const RATION_PLAN_ID_PREFIX = 'Рацион:'
export const WEEK_PLAN_ID_PREFIX = 'План:'
export const MEAL_AUTHOR_PHOTO_MARK = 'Добавлено своё фото'

const RATION_PLAN_ID_RE = /^[A-Za-z0-9:_-]{1,80}$/

export function isDeletableRationId(planId: string) {
  return RATION_PLAN_ID_RE.test(planId)
}

export function mealRemovedWithRation(input: {
  assumptions: readonly string[]
  versionCount: number
  hasAuthorPhoto: boolean
  planIds: ReadonlySet<string>
}): boolean {
  const belongs = input.assumptions.some((item) => {
    const planId = planIdFromStamp(item)
    return planId != null && input.planIds.has(planId)
  })
  if (!belongs) return false
  if (input.assumptions.includes(RATION_DIARY_DONE_MARK)) return false
  if (input.hasAuthorPhoto || input.assumptions.includes(MEAL_AUTHOR_PHOTO_MARK)) return false
  if (input.versionCount > 1) return false
  return (
    input.assumptions.includes(RATION_DIARY_SOURCE_MARK)
    || input.assumptions.some((item) => item.startsWith(RATION_PLAN_ID_PREFIX))
  )
}

export function rationIdsRemovedWith(planId: string, authoredPlans: unknown): Set<string> {
  const ids = new Set<string>([planId])
  if (!Array.isArray(authoredPlans)) return ids
  for (const plan of authoredPlans) {
    if (!plan || typeof plan !== 'object') continue
    const record = plan as { id?: unknown; sourceCatalogId?: unknown }
    const id = typeof record.id === 'string' ? record.id : ''
    const source = typeof record.sourceCatalogId === 'string' ? record.sourceCatalogId : ''
    if (id && (id === planId || source === planId || ids.has(source))) ids.add(id)
  }
  return ids
}

export function jsonWithoutPlanIds(value: unknown, removed: ReadonlySet<string>): unknown {
  if (!Array.isArray(value)) return value
  return value.filter((item) => typeof item !== 'string' || !removed.has(item))
}

export function authoredPlansWithoutRation(value: unknown, removed: ReadonlySet<string>): unknown {
  if (!Array.isArray(value)) return value
  return value.filter((plan) => {
    if (!plan || typeof plan !== 'object') return true
    const record = plan as { id?: unknown; sourceCatalogId?: unknown }
    const id = typeof record.id === 'string' ? record.id : ''
    const source = typeof record.sourceCatalogId === 'string' ? record.sourceCatalogId : ''
    if (id && removed.has(id)) return false
    if (source && removed.has(source)) return false
    return true
  })
}

export function planStartsWithoutRation(value: unknown, removed: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.filter((item) => {
      if (!item || typeof item !== 'object') return true
      const planId = (item as { planId?: unknown }).planId
      return typeof planId !== 'string' || !removed.has(planId)
    })
  }
  if (!value || typeof value !== 'object') return value
  const next: Record<string, unknown> = {}
  for (const [planId, dayKey] of Object.entries(value as Record<string, unknown>)) {
    if (!removed.has(planId)) next[planId] = dayKey
  }
  return next
}

function planIdFromStamp(item: string): string | null {
  if (item.startsWith(WEEK_PLAN_ID_PREFIX)) {
    const id = item.slice(WEEK_PLAN_ID_PREFIX.length).trim()
    return id || null
  }
  if (item.startsWith(RATION_PLAN_ID_PREFIX)) {
    const id = item.slice(RATION_PLAN_ID_PREFIX.length).trim()
    return id || null
  }
  return null
}
