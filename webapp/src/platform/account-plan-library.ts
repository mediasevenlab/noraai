import {
  authoredUserPlanSchema,
  putUserPlanLibraryRequestSchema,
  type AuthoredUserPlan,
  type PutUserPlanLibraryRequest,
  type UserPlanLibrary,
} from '@web-app-demo/contracts'
import { z } from 'zod'

import type { AuthenticatedTransport } from '@/platform/api'
import type { AuthoredPlan } from '@/platform/authored-plans'
import type { PlanLibrarySnapshot } from '@/platform/plan-library-local'

const authoredUserPlanWireSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    coverImage: z.string().optional(),
    createdAt: z.string(),
    goal: z.unknown().nullable().optional(),
    sourceCatalogId: z.string().optional(),
  })
  .passthrough()

const planStartWireSchema = z
  .object({
    planId: z.string(),
    dayKey: z.string(),
  })
  .passthrough()

const userPlanLibraryWireSchema = z
  .object({
    authoredPlans: z.array(z.unknown()).optional(),
    savedPlanIds: z.array(z.unknown()).optional(),
    selectedPlanIds: z.array(z.unknown()).optional(),
    planStarts: z.array(z.unknown()).optional(),
    updatedAt: z.unknown().nullable().optional(),
  })
  .passthrough()

function coerceIds(ids: readonly unknown[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of ids) {
    if (typeof value !== 'string') continue
    const id = value.trim()
    if (!id || id.length > 80 || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function coerceAuthoredPlan(value: unknown): AuthoredPlan | null {
  const parsed = authoredUserPlanWireSchema.safeParse(value)
  if (!parsed.success) return null
  const id = parsed.data.id.trim()
  const title = parsed.data.title.trim()
  if (!id.startsWith('plan_') || !title) return null
  const sourceCatalogId = parsed.data.sourceCatalogId?.trim() ?? ''
  const goal = parsed.data.goal
  return {
    id,
    title,
    description: parsed.data.description?.trim() ?? '',
    coverImage: sanitizeCoverImage(parsed.data.coverImage ?? ''),
    createdAt: parsed.data.createdAt,
    goal:
      goal === 'Похудение' || goal === 'Набор' || goal === 'Поддержание' || goal === 'Здоровье'
        ? goal
        : null,
    ...(sourceCatalogId.startsWith('catalog_') ? { sourceCatalogId } : {}),
  }
}

function coercePlanStart(value: unknown): { planId: string; dayKey: string } | null {
  const parsed = planStartWireSchema.safeParse(value)
  if (!parsed.success) return null
  const planId = parsed.data.planId.trim()
  const dayKey = parsed.data.dayKey.trim()
  if (!planId || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null
  return { planId, dayKey }
}

function sanitizeCoverImage(value: string) {
  const cover = value.trim()
  if (!cover || cover.startsWith('data:') || cover.length > 2048) return ''
  return cover
}

export function toUserPlanLibrary(raw: z.infer<typeof userPlanLibraryWireSchema>): UserPlanLibrary {
  const authoredPlans: AuthoredUserPlan[] = []
  const seen = new Set<string>()
  for (const item of raw.authoredPlans ?? []) {
    const plan = coerceAuthoredPlan(item)
    if (!plan || seen.has(plan.id)) continue
    seen.add(plan.id)
    authoredPlans.push({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      coverImage: plan.coverImage,
      createdAt: Number.isNaN(Date.parse(plan.createdAt))
        ? new Date(0).toISOString()
        : new Date(plan.createdAt).toISOString(),
      goal: plan.goal,
      ...(plan.sourceCatalogId ? { sourceCatalogId: plan.sourceCatalogId } : {}),
    })
  }
  const planStarts: UserPlanLibrary['planStarts'] = []
  const seenStarts = new Set<string>()
  for (const item of raw.planStarts ?? []) {
    const start = coercePlanStart(item)
    if (!start || seenStarts.has(start.planId)) continue
    seenStarts.add(start.planId)
    planStarts.push(start)
  }
  return {
    authoredPlans,
    savedPlanIds: coerceIds(raw.savedPlanIds ?? []),
    selectedPlanIds: coerceIds(raw.selectedPlanIds ?? []),
    planStarts,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  }
}

export function snapshotFromPlanLibrary(library: UserPlanLibrary): PlanLibrarySnapshot {
  return {
    authoredPlans: library.authoredPlans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      coverImage: plan.coverImage,
      createdAt: plan.createdAt,
      goal: plan.goal,
      ...(plan.sourceCatalogId ? { sourceCatalogId: plan.sourceCatalogId } : {}),
    })),
    savedPlanIds: library.savedPlanIds,
    selectedPlanIds: library.selectedPlanIds,
    planStarts: Object.fromEntries(library.planStarts.map((item) => [item.planId, item.dayKey])),
  }
}

export function putRequestFromSnapshot(
  snapshot: PlanLibrarySnapshot,
  now = new Date(),
): PutUserPlanLibraryRequest {
  const authoredPlans = snapshot.authoredPlans.flatMap((plan) => {
    const createdAt = Number.isNaN(Date.parse(plan.createdAt))
      ? now.toISOString()
      : new Date(plan.createdAt).toISOString()
    const parsed = authoredUserPlanSchema.safeParse({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      coverImage: sanitizeCoverImage(plan.coverImage),
      createdAt,
      goal: plan.goal,
      ...(plan.sourceCatalogId ? { sourceCatalogId: plan.sourceCatalogId } : {}),
    })
    return parsed.success ? [parsed.data] : []
  })
  return putUserPlanLibraryRequestSchema.parse({
    authoredPlans,
    savedPlanIds: snapshot.savedPlanIds,
    selectedPlanIds: snapshot.selectedPlanIds,
    planStarts: Object.entries(snapshot.planStarts).map(([planId, dayKey]) => ({ planId, dayKey })),
  })
}

export function isEmptyPlanLibrary(library: UserPlanLibrary) {
  return (
    library.authoredPlans.length === 0 &&
    library.savedPlanIds.length === 0 &&
    library.selectedPlanIds.length === 0 &&
    library.planStarts.length === 0
  )
}

export function getUserPlanLibrary(transport: AuthenticatedTransport) {
  return transport
    .request('/api/users/me/plan-library', userPlanLibraryWireSchema)
    .then(toUserPlanLibrary)
}

export function putUserPlanLibrary(
  transport: AuthenticatedTransport,
  input: PutUserPlanLibraryRequest,
) {
  return transport
    .request('/api/users/me/plan-library', userPlanLibraryWireSchema, {
      method: 'PUT',
      body: putUserPlanLibraryRequestSchema.parse(input),
    })
    .then(toUserPlanLibrary)
}
