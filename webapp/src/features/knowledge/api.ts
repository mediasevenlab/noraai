import {
  deleteKnowledgeResponseSchema,
  knowledgeBaseListSchema,
  knowledgeBaseSchemaResponse,
  knowledgeFileSchema,
  type KnowledgeBase,
  type KnowledgeBaseList,
  type KnowledgeFile,
} from '@web-app-demo/contracts'

import type { AuthenticatedTransport } from '@/platform/api'

export function listKnowledgeBases(transport: AuthenticatedTransport) {
  return transport.request('/api/users/me/knowledge-bases', knowledgeBaseListSchema)
}

export function createKnowledgeBase(transport: AuthenticatedTransport, name: string) {
  return transport.request('/api/users/me/knowledge-bases', knowledgeBaseSchemaResponse, {
    method: 'POST',
    body: { name },
  })
}

export function renameKnowledgeBase(transport: AuthenticatedTransport, baseId: string, name: string) {
  return transport.request(`/api/users/me/knowledge-bases/${baseId}`, knowledgeBaseSchemaResponse, {
    method: 'PATCH',
    body: { name },
  })
}

export function deleteKnowledgeBase(transport: AuthenticatedTransport, baseId: string) {
  return transport.request(`/api/users/me/knowledge-bases/${baseId}`, deleteKnowledgeResponseSchema, {
    method: 'DELETE',
  })
}

export function uploadKnowledgeFile(transport: AuthenticatedTransport, baseId: string, file: File) {
  const body = new FormData()
  body.set('file', file)
  return transport.request(`/api/users/me/knowledge-bases/${baseId}/files`, knowledgeFileSchema, {
    method: 'POST',
    body,
  })
}

export function deleteKnowledgeFile(transport: AuthenticatedTransport, baseId: string, fileId: string) {
  return transport.request(
    `/api/users/me/knowledge-bases/${baseId}/files/${fileId}`,
    deleteKnowledgeResponseSchema,
    { method: 'DELETE' },
  )
}

export type { KnowledgeBase, KnowledgeBaseList, KnowledgeFile }
