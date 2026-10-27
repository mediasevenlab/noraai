import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { createMeetingsService } from './application/meetings-service'
import { createMeetingAudioStore } from './infrastructure/meeting-audio-store'
import { createMeetingTranscriber } from './infrastructure/meeting-transcriber'
import { createMeetingsRepository } from './infrastructure/meetings-repository'
import { createMeetingRoutes } from './transport/routes'

export function createMeetingsModule(options: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  env?: Pick<AppEnv, 'LLM_MEETINGS_URL' | 'LLM_API_KEY'>
}) {
  const transcriber = options.env?.LLM_MEETINGS_URL
    ? createMeetingTranscriber({
        baseUrl: options.env.LLM_MEETINGS_URL,
        apiKey: options.env.LLM_API_KEY,
      })
    : undefined
  const service = createMeetingsService({
    repository: createMeetingsRepository(options.db),
    transcriber,
    audio: createMeetingAudioStore(),
  })
  return {
    routes: createMeetingRoutes({ requireAuth: options.requireAuth, service }),
    loadForChat(input: { userId: string; meetingIds: readonly string[]; query: string }) {
      return service.chatContext(input.userId, input.meetingIds, input.query)
    },
  }
}
