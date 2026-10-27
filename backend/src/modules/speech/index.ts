import type { MiddlewareHandler } from 'hono'

import type { AuthHttpEnv } from '../auth'
import { createSpeechService } from './application/speech-service'
import { createNeuralSpeaker } from './infrastructure/neural-speaker'
import { createSpeechRoutes } from './transport/routes'

export function createSpeechModule(options: { requireAuth: MiddlewareHandler<AuthHttpEnv> }) {
  const service = createSpeechService(createNeuralSpeaker())
  return createSpeechRoutes({ requireAuth: options.requireAuth, service })
}
