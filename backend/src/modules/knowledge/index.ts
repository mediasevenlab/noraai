import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AppEnv } from '../../env'
import type { AuthHttpEnv } from '../auth'
import { createKnowledgeService } from './application/knowledge-service'
import { extractKnowledgeDocument } from './infrastructure/extract-document'
import { createKnowledgeRepository } from './infrastructure/knowledge-repository'
import { createVisionScanReader } from './infrastructure/read-scan'
import { createKnowledgeRoutes } from './transport/routes'

export { attachedFileContext, chooseAttachedFile, combineKnowledgeContext, copiedKnowledgeTable, directKnowledgeReply } from './domain/retrieve'

export function createKnowledgeModule(options: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  env?: Pick<AppEnv, 'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_VISION_MODEL'>
}) {
  const readScan =
    options.env?.LLM_BASE_URL && options.env.LLM_API_KEY
      ? createVisionScanReader({
          baseUrl: options.env.LLM_BASE_URL,
          apiKey: options.env.LLM_API_KEY,
          model: options.env.LLM_VISION_MODEL,
        })
      : undefined
  const service = createKnowledgeService({
    repository: createKnowledgeRepository(options.db),
    extract: (name, bytes) => extractKnowledgeDocument(name, bytes, readScan),
  })
  return {
    routes: createKnowledgeRoutes({ requireAuth: options.requireAuth, service }),
    loadContext(input: { userId: string; baseIds: readonly string[]; query: string }) {
      return service.context(input.userId, input.baseIds, input.query)
    },
    readDocument(name: string, bytes: Buffer) {
      return extractKnowledgeDocument(name, bytes, readScan)
    },
  }
}
