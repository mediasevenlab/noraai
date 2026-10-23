import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  WebSpeechSynthesisAdapter,
  type ChatModelAdapter,
  type ThreadMessage,
} from '@assistant-ui/react'
import { createLocalStorageAdapter } from '@assistant-ui/core/react'
import { useMemo, useRef, type ReactNode } from 'react'

import { useAuth } from '@/features/auth'
import { activeKnowledgeBases } from '@/features/knowledge'

import { streamNoraModel } from './api'
import { internetEnabled } from './internet-open'
import { reasoningExpanded } from './reasoning-open'
import { ApiRequestError } from '@/platform/api'

import { NoraImageAttachmentAdapter } from './attachments'
import { toNoraMessages } from './nora-messages'

const browserStorage = {
  async getItem(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value)
  },
  async removeItem(key: string) {
    localStorage.removeItem(key)
  },
}

const dialogTitleGenerator = {
  async generateTitle(messages: readonly ThreadMessage[]) {
    const first = messages.find((message) => message.role === 'user')
    const text = first?.content.find((part) => part.type === 'text')
    const value = text?.type === 'text' ? text.text.trim() : ''
    if (!value) return 'Новый диалог'
    return value.length > 48 ? `${value.slice(0, 45)}…` : value
  },
}

function modelReplyFailure(error: unknown) {
  if (error instanceof ApiRequestError && error.status >= 500) {
    return 'Модель сейчас не подключена, ответ не пришёл.'
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Не удалось получить ответ.'
}

function chatParts(input: {
  reasoning: string
  reply: string
  startedAt: number
  reasoningDoneAt?: number
  searched?: boolean
}) {
  const content: Array<
    | {
        type: 'reasoning'
        text: string
        timing: { startedAt: number; completedAt?: number }
        providerMetadata?: { nora: { searched: true } }
      }
    | { type: 'text'; text: string }
  > = []
  if (input.reasoning || input.reasoningDoneAt || input.searched) {
    content.push({
      type: 'reasoning',
      text: input.reasoning,
      timing: {
        startedAt: input.startedAt,
        ...(input.reasoningDoneAt ? { completedAt: input.reasoningDoneAt } : {}),
      },
      ...(input.searched ? { providerMetadata: { nora: { searched: true as const } } } : {}),
    })
  }
  if (input.reply) content.push({ type: 'text', text: input.reply })
  return { content }
}

function useNoraChatModel(): ChatModelAdapter {
  const transport = useAuth().transport
  const transportRef = useRef(transport)
  transportRef.current = transport
  return useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const payload = toNoraMessages(messages)
        const last = payload.at(-1)
        if (!last || last.role !== 'user') {
          throw new Error('Напишите сообщение или прикрепите фото')
        }
        const startedAt = Date.now()
        const thinkOn = reasoningExpanded()
        let reasoning = ''
        let reply = ''
        let searched = false
        let reasoningDoneAt: number | undefined
        try {
          for await (const event of streamNoraModel(
            transportRef.current,
            payload,
            abortSignal,
            internetEnabled(),
            activeKnowledgeBases(),
            thinkOn,
          )) {
            if (event.resetReply) reply = ''
            if (event.searched) searched = true
            if (event.reasoning && thinkOn) reasoning += event.reasoning
            if (event.reply) {
              if (!reasoningDoneAt) reasoningDoneAt = Date.now()
              reply += event.reply
            }
            if (!reasoning && !reply && !searched) continue
            yield chatParts({ reasoning, reply, startedAt, reasoningDoneAt, searched })
          }
        } catch (error) {
          if (abortSignal.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
          yield { content: [{ type: 'text' as const, text: modelReplyFailure(error) }] }
          return
        }
        if (!reply) {
          yield { content: [{ type: 'text' as const, text: 'Модель ничего не ответила. Попробуйте ещё раз.' }] }
          return
        }
        yield chatParts({
          reasoning,
          reply,
          startedAt,
          reasoningDoneAt: reasoningDoneAt ?? Date.now(),
          searched,
        })
      },
    }),
    [],
  )
}

export function DialogsRuntimeProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const chatModel = useNoraChatModel()
  const attachments = useMemo(() => new NoraImageAttachmentAdapter(), [])
  const speech = useMemo(() => new WebSpeechSynthesisAdapter(), [])
  const threadList = useMemo(
    () =>
      createLocalStorageAdapter({
        prefix: `dialogs:${userId}:`,
        storage: browserStorage,
        titleGenerator: dialogTitleGenerator,
      }),
    [userId],
  )
  const runtime = useRemoteThreadListRuntime({
    adapter: threadList,
    runtimeHook() {
      return useLocalRuntime(chatModel, { adapters: { attachments, speech } })
    },
  })

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}
