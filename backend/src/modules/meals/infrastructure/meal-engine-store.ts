import type { MealEngine } from '@web-app-demo/contracts'

import type { DbClient } from '../../../db'

export function createMealEngineStore(db: DbClient) {
  return {
    async get(userId: string): Promise<MealEngine> {
      const row = await db.user.findUnique({
        where: { id: userId },
        select: { mealEngine: true },
      })
      return row?.mealEngine === 'nora' ? 'nora' : 'gemini'
    },
    async set(userId: string, engine: MealEngine): Promise<MealEngine> {
      await db.user.update({
        where: { id: userId },
        data: { mealEngine: engine },
      })
      return engine
    },
  }
}
