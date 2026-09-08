const AUTHORED_PLAN_ID_RE = /^plan_[A-Za-z0-9_-]{1,72}$/
const CATALOG_PLAN_ID_RE = /^catalog_[A-Za-z0-9_-]{1,72}$/
const PLAN_START_DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const SAVED_PLAN_ID_MAX = 80
const COVER_IMAGE_MAX = 2048
const TITLE_MAX = 120
const DESCRIPTION_MAX = 2000
const MAX_AUTHORED_PLANS = 20
const MAX_SAVED_PLAN_IDS = 80
const MAX_SELECTED_PLAN_IDS = 20
const MAX_PLAN_STARTS = 40

const GOALS = new Set(['Похудение', 'Набор', 'Поддержание', 'Здоровье'])

export type AuthoredUserPlanRecord = {
  id: string
  title: string
  description: string
  coverImage: string
  createdAt: string
  goal: 'Похудение' | 'Набор' | 'Поддержание' | 'Здоровье' | null
  sourceCatalogId?: string
}

export type PlanStartRecord = {
  planId: string
  dayKey: string
}

export type UserPlanLibraryFields = {
  authoredPlans: AuthoredUserPlanRecord[]
  savedPlanIds: string[]
  selectedPlanIds: string[]
  planStarts: PlanStartRecord[]
}

export function emptyPlanLibrary(): UserPlanLibraryFields {
  return {
    authoredPlans: [],
    savedPlanIds: [],
    selectedPlanIds: [],
    planStarts: [],
  }
}

export function normalizePlanLibrary(
  input: {
    authoredPlans?: unknown
    savedPlanIds?: unknown
    selectedPlanIds?: unknown
    planStarts?: unknown
  },
  nowIso: string,
): UserPlanLibraryFields {
  return {
    authoredPlans: uniqueAuthoredPlans(input.authoredPlans, nowIso).slice(0, MAX_AUTHORED_PLANS),
    savedPlanIds: uniquePlanIds(input.savedPlanIds).slice(0, MAX_SAVED_PLAN_IDS),
    selectedPlanIds: uniquePlanIds(input.selectedPlanIds).slice(0, MAX_SELECTED_PLAN_IDS),
    planStarts: uniquePlanStarts(input.planStarts).slice(0, MAX_PLAN_STARTS),
  }
}

function uniqueAuthoredPlans(value: unknown, nowIso: string): AuthoredUserPlanRecord[] {
  if (!Array.isArray(value)) return []
  const plans: AuthoredUserPlanRecord[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const plan = parseAuthoredPlan(item, nowIso)
    if (!plan || seen.has(plan.id)) continue
    seen.add(plan.id)
    plans.push(plan)
  }
  return plans
}

function parseAuthoredPlan(value: unknown, nowIso: string): AuthoredUserPlanRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const id = parsePlanId(record.id)
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  if (!id || !AUTHORED_PLAN_ID_RE.test(id) || !title) return null
  const sourceCatalogId =
    typeof record.sourceCatalogId === 'string' ? record.sourceCatalogId.trim() : ''
  const createdAt =
    typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
      ? new Date(record.createdAt).toISOString()
      : nowIso
  return {
    id,
    title: title.slice(0, TITLE_MAX),
    description: parseBoundedString(record.description, DESCRIPTION_MAX),
    coverImage: parseCoverImage(record.coverImage),
    createdAt,
    goal: parseGoal(record.goal),
    ...(CATALOG_PLAN_ID_RE.test(sourceCatalogId) ? { sourceCatalogId } : {}),
  }
}

function uniquePlanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const id = parsePlanId(item)
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function uniquePlanStarts(value: unknown): PlanStartRecord[] {
  if (Array.isArray(value)) {
    const starts: PlanStartRecord[] = []
    const seen = new Set<string>()
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const record = item as Record<string, unknown>
      const start = parsePlanStart(record.planId, record.dayKey)
      if (!start || seen.has(start.planId)) continue
      seen.add(start.planId)
      starts.push(start)
    }
    return starts
  }
  if (!value || typeof value !== 'object') return []
  const starts: PlanStartRecord[] = []
  const seen = new Set<string>()
  for (const [planId, dayKey] of Object.entries(value as Record<string, unknown>)) {
    const start = parsePlanStart(planId, dayKey)
    if (!start || seen.has(start.planId)) continue
    seen.add(start.planId)
    starts.push(start)
  }
  return starts
}

function parsePlanStart(planIdValue: unknown, dayKeyValue: unknown): PlanStartRecord | null {
  const planId = parsePlanId(planIdValue)
  const dayKey = typeof dayKeyValue === 'string' ? dayKeyValue.trim() : ''
  if (!planId || !PLAN_START_DAY_RE.test(dayKey)) return null
  return { planId, dayKey }
}

function parsePlanId(value: unknown) {
  if (typeof value !== 'string') return ''
  const id = value.trim()
  return id && id.length <= SAVED_PLAN_ID_MAX ? id : ''
}

function parseCoverImage(value: unknown) {
  if (typeof value !== 'string') return ''
  const cover = value.trim()
  if (!cover || cover.startsWith('data:') || cover.length > COVER_IMAGE_MAX) return ''
  return cover
}

function parseBoundedString(value: unknown, max: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function parseGoal(value: unknown): AuthoredUserPlanRecord['goal'] {
  return typeof value === 'string' && GOALS.has(value)
    ? (value as AuthoredUserPlanRecord['goal'])
    : null
}
