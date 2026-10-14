import type { MealEngine } from '@web-app-demo/contracts'

import type { DbClient } from '../../../db'

export type MealEngineSettings = {
  engine: MealEngine
  thinking: boolean
}

export function createMealEngineStore(db: DbClient) {
  return {
    async get(userId: string): Promise<MealEngine> {
      const settings = await this.getSettings(userId)
      return settings.engine
    },
    async thinking(userId: string): Promise<boolean> {
      const settings = await this.getSettings(userId)
      return settings.thinking
    },
    async getSettings(userId: string): Promise<MealEngineSettings> {
      const row = await db.user.findUnique({
        where: { id: userId },
        select: { mealEngine: true, geminiThinking: true },
      })
      return {
        engine: row?.mealEngine === 'nora' ? 'nora' : 'gemini',
        thinking: row?.geminiThinking !== false,
      }
    },
    async set(userId: string, engine: MealEngine, thinking?: boolean): Promise<MealEngineSettings> {
      await db.user.update({
        where: { id: userId },
        data: {
          mealEngine: engine,
          ...(thinking === undefined ? {} : { geminiThinking: thinking }),
        },
      })
      return this.getSettings(userId)
    },
  }
}
