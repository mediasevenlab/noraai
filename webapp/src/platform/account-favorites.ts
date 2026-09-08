import {
  putUserFavoritesRequestSchema,
  type PutUserFavoritesRequest,
  type UserFavorites,
} from '@web-app-demo/contracts'
import { z } from 'zod'

import type { AuthenticatedTransport } from '@/platform/api'

/** Wire payload may include leftover demo ids or extra fields; do not fail the whole read. */
const userFavoritesWireSchema = z
  .object({
    mealIds: z.array(z.unknown()).optional(),
    updatedAt: z.unknown().nullable().optional(),
  })
  .passthrough()

export function coerceFavoriteMealIds(ids: readonly unknown[]): string[] {
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

function toUserFavorites(raw: z.infer<typeof userFavoritesWireSchema>): UserFavorites {
  return {
    mealIds: coerceFavoriteMealIds(raw.mealIds ?? []),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  }
}

export function getUserFavorites(transport: AuthenticatedTransport) {
  return transport
    .request('/api/users/me/favorites', userFavoritesWireSchema)
    .then(toUserFavorites)
}

export function putUserFavorites(
  transport: AuthenticatedTransport,
  input: PutUserFavoritesRequest,
) {
  const mealIds = coerceFavoriteMealIds(input.mealIds)
  return transport
    .request('/api/users/me/favorites', userFavoritesWireSchema, {
      method: 'PUT',
      body: putUserFavoritesRequestSchema.parse({ mealIds }),
    })
    .then(toUserFavorites)
}
