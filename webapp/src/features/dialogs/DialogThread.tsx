import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from '@assistant-ui/react'
import { useEffect, useRef, useState } from 'react'

import { Volume2Icon } from 'lucide-react'

import {
  ArrowUpIcon,
  BrainIcon,
  GlobeIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  XIcon,
} from '@/components/icons'

import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth'
import { MercuryOrb } from '@/features/auth/mercury/mercury-orb'
import { ComposerAttachChips } from './composer/attach-chips'
import { ChatFileCard } from './composer/chat-file-card'
import { ComposerPressSurface } from './composer/ComposerPressSurface'
import {
  DIALOG_COMPOSER_FIELD_CLASS,
  dialogComposerSendClass,
  dialogComposerSendTone,
} from './composer/field'
import { MealAttachMenu } from './composer/meal-attach-menu'
import {
  isChatDocumentFile,
  mealAttachLimitMessage,
  pastedMealImageFiles,
  takeMealAttachRoom,
} from './composer/meal-image-pick'
import { MealVoiceControls } from './composer/MealVoiceControls'
import { appendVoiceTranscript } from './composer/voice-input'
import { KnowledgeBaseMenu } from '@/features/knowledge'

import { DialogMarkdown } from './markdown'
import { internetEnabled, setInternetEnabled, subscribeInternetOpen } from './internet-open'
import { reasoningExpanded, setReasoningExpanded, subscribeReasoningOpen } from './reasoning-open'
import { reasoningStatusLabel } from './reasoning-time'

const DIALOG_TEXT_CLASS =
  'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

const USER_BUBBLE_RADIUS =
  'rounded-tl-[20px] rounded-tr-[20px] rounded-br-[6px] rounded-bl-[20px]'

const COMPOSER_INPUT_CLASS =
  'max-h-40 min-h-[22px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 outline-none placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)] no-scrollbar disabled:opacity-60 ' +
  DIALOG_TEXT_CLASS +
  ' text-[var(--nora-text)]'

const MESSAGE_ACTION_CLASS =
  'group inline-flex size-7 items-center justify-center rounded-md text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)] disabled:pointer-events-none disabled:opacity-40'

function DialogImage() {
  return (
    <MessagePartPrimitive.Image
      alt=""
      className="mb-2 max-h-52 max-w-full rounded-2xl object-cover"
    />
  )
}

function DialogText() {
  return (
    <p className="whitespace-pre-wrap">
      <MessagePartPrimitive.Text
        smooth={{ drainMs: 700, maxCharIntervalMs: 18, maxCharsPerFrame: 4 }}
      />
      <MessagePartPrimitive.InProgress>
        <span className="ml-0.5 inline-block animate-pulse">▍</span>
      </MessagePartPrimitive.InProgress>
    </p>
  )
}

function DialogAssistantText() {
  return (
    <div>
      <DialogMarkdown />
      <MessagePartPrimitive.InProgress>
        <span className="ml-0.5 inline-block animate-pulse">▍</span>
      </MessagePartPrimitive.InProgress>
    </div>
  )
}

function DialogMessageActions() {
  return (
    <div className="mt-1 flex items-center gap-1">
      <ActionBarPrimitive.Root
        className="flex items-center gap-0.5"
        hideWhenRunning
      >
        <ActionBarPrimitive.Copy aria-label="Копировать" className={MESSAGE_ACTION_CLASS}>
          <CopyIcon className="size-3.5 group-data-[copied=true]:hidden" />
          <CheckIcon className="hidden size-3.5 group-data-[copied=true]:block" />
        </ActionBarPrimitive.Copy>
        <AuiIf condition={(state) => state.message.role === 'user'}>
          <ActionBarPrimitive.Edit aria-label="Изменить" className={MESSAGE_ACTION_CLASS}>
            <PencilIcon className="size-3.5" />
          </ActionBarPrimitive.Edit>
        </AuiIf>
        <AuiIf condition={(state) => state.message.role === 'assistant'}>
          <ActionBarPrimitive.Reload aria-label="Сгенерировать заново" className={MESSAGE_ACTION_CLASS}>
            <RefreshCwIcon className="size-3.5" />
          </ActionBarPrimitive.Reload>
          <AuiIf
            condition={(state) =>
              state.message.speech?.status.type !== 'running'
              && state.message.speech?.status.type !== 'starting'
            }
          >
            <ActionBarPrimitive.Speak aria-label="Прослушать" className={MESSAGE_ACTION_CLASS}>
              <Volume2Icon className="size-3.5" />
            </ActionBarPrimitive.Speak>
          </AuiIf>
          <AuiIf
            condition={(state) =>
              state.message.speech?.status.type === 'running'
              || state.message.speech?.status.type === 'starting'
            }
          >
            <ActionBarPrimitive.StopSpeaking aria-label="Остановить озвучку" className={MESSAGE_ACTION_CLASS}>
              <SquareIcon className="size-3.5 fill-current" />
            </ActionBarPrimitive.StopSpeaking>
          </AuiIf>
        </AuiIf>
      </ActionBarPrimitive.Root>
      <BranchPickerPrimitive.Root
        className="flex items-center text-[12px] leading-4 text-[var(--nora-text-secondary)]"
        hideWhenSingleBranch
      >
        <BranchPickerPrimitive.Previous aria-label="Предыдущий вариант" className={MESSAGE_ACTION_CLASS}>
          <ChevronLeftIcon className="size-3.5" />
        </BranchPickerPrimitive.Previous>
        <span className="min-w-8 text-center tabular-nums">
          <BranchPickerPrimitive.Number />
          <span className="px-0.5">/</span>
          <BranchPickerPrimitive.Count />
        </span>
        <BranchPickerPrimitive.Next aria-label="Следующий вариант" className={MESSAGE_ACTION_CLASS}>
          <ChevronRightIcon className="size-3.5" />
        </BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>
    </div>
  )
}

function DialogAttachmentView({
  attachment,
}: {
  attachment: { name: string; content?: ReadonlyArray<{ type: string; image?: string; filename?: string }> }
}) {
  const image = attachment.content?.find((part) => part.type === 'image' && part.image)
  if (image?.image) {
    return (
      <img
        alt={attachment.name || 'Фото'}
        className="mb-2 max-h-52 max-w-full rounded-2xl object-cover"
        src={image.image}
      />
    )
  }
  const fileName = attachment.content?.find((part) => part.type === 'file')?.filename || attachment.name
  if (!fileName) return null
  return <ChatFileCard name={fileName} placement="bubble" />
}

function useInternetOpen() {
  const [open, setOpen] = useState(internetEnabled)
  useEffect(() => {
    const unsubscribe = subscribeInternetOpen(() => setOpen(internetEnabled()))
    return () => {
      unsubscribe()
    }
  }, [])
  return open
}

function useReasoningOpen() {
  const [open, setOpen] = useState(reasoningExpanded)
  useEffect(() => {
    const unsubscribe = subscribeReasoningOpen(() => setOpen(reasoningExpanded()))
    return () => {
      unsubscribe()
    }
  }, [])
  return open
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

function useElapsed(active: boolean) {
  const started = useRef(Date.now())
  const now = useNow(active)
  useEffect(() => {
    if (active) started.current = Date.now()
  }, [active])
  return Math.max(0, now - started.current)
}

function DialogThinking() {
  const running = useAuiState(
    (state) => state.message.role === 'assistant' && state.message.status.type === 'running',
  )
  const hasThought = useAuiState((state) => state.message.content.some((part) => part.type === 'reasoning'))
  const elapsed = useElapsed(running && !hasThought)
  if (!running || hasThought) return null
  return (
    <p className="mb-2 text-[13px] leading-5 text-[var(--nora-text-secondary)]">
      {reasoningStatusLabel(elapsed, true)}
    </p>
  )
}

function DialogReasoningPart({
  text,
  timing,
  providerMetadata,
}: {
  text: string
  timing?: { startedAt: number; completedAt?: number }
  providerMetadata?: { nora?: { searched?: boolean } }
}) {
  const body = text.trim()
  const live = timing?.completedAt == null
  const now = useNow(live && timing != null)
  const spent = timing ? Math.max(0, (timing.completedAt ?? now) - timing.startedAt) : 0
  const scroller = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const node = scroller.current
    if (node) node.scrollTop = node.scrollHeight
  }, [body])
  return (
    <div className="mb-2">
      <p className="inline-flex items-center gap-1 text-[13px] leading-5 text-[var(--nora-text-secondary)]">
        <ChevronRightIcon className="size-3.5 shrink-0 rotate-90" />
        {reasoningStatusLabel(spent, live, providerMetadata?.nora?.searched === true)}
      </p>
      {body ? (
        <p
          className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap pl-5 text-[13px] leading-5 text-[var(--nora-text-secondary)]"
          ref={scroller}
        >
          {body}
        </p>
      ) : null}
    </div>
  )
}

function DialogInternetToggle() {
  const open = useInternetOpen()
  return (
    <button
      aria-label="Интернет"
      aria-pressed={open}
      className={cn(dialogComposerToolClass(open), 'size-8')}
      onClick={() => setInternetEnabled(!open)}
      type="button"
    >
      <GlobeIcon className="size-4" />
    </button>
  )
}

function DialogReasoningToggle() {
  const open = useReasoningOpen()
  return (
    <button
      aria-label="Рассуждения"
      aria-pressed={open}
      className={cn(dialogComposerToolClass(open), 'size-8')}
      onClick={() => setReasoningExpanded(!open)}
      type="button"
    >
      <BrainIcon className="size-4" />
    </button>
  )
}

function DialogMessage({ role }: { role: 'user' | 'assistant' }) {
  const mine = role === 'user'
  return (
    <MessagePrimitive.Root className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex min-w-0 flex-col', mine ? 'max-w-[min(100%,40rem)] items-end' : 'w-full max-w-3xl')}>
        <div className={cn('flex min-w-0 flex-col', mine ? 'items-end' : 'w-full')}>
        <div
          className={cn(
            'min-w-0 text-[var(--nora-text)]',
            DIALOG_TEXT_CLASS,
            mine
              ? cn(USER_BUBBLE_RADIUS, 'bg-[#242424] px-3.5 py-2 text-white dark:bg-[#f3f3f3] dark:text-[#171717]')
              : 'w-full',
          )}
        >
          <MessagePrimitive.Attachments>
            {({ attachment }) => <DialogAttachmentView attachment={attachment} />}
          </MessagePrimitive.Attachments>
          {mine ? null : <DialogThinking />}
          <MessagePrimitive.Parts
            components={{
              Text: mine ? DialogText : DialogAssistantText,
              Image: DialogImage,
              Reasoning: DialogReasoningPart,
            }}
          />
          <MessagePrimitive.Error>
            <p className="mt-2 text-[13px] leading-5 text-[var(--nora-error)]">
              Не удалось получить ответ.
            </p>
          </MessagePrimitive.Error>
        </div>
        <DialogMessageActions />
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

function DialogUserMessage() {
  return <DialogMessage role="user" />
}

function DialogAssistantMessage() {
  return <DialogMessage role="assistant" />
}

const EDIT_ICON_CLASS =
  'inline-flex size-6 items-center justify-center rounded-md text-[var(--nora-text-secondary)] transition-colors hover:text-[var(--nora-text)] disabled:pointer-events-none disabled:opacity-40'

const EDIT_FIELD_CLASS = cn(
  DIALOG_TEXT_CLASS,
  'col-start-1 row-start-1 w-full min-w-0 resize-none overflow-hidden border border-[color-mix(in_srgb,var(--nora-text)_12%,transparent)] bg-[var(--nora-input-bg)] px-3.5 py-2 text-[var(--nora-text)] outline-none',
  USER_BUBBLE_RADIUS,
)

function DialogEditField() {
  const text = useAuiState((state) => state.composer.text)
  const mirror = text.length > 0 ? text.replace(/\n$/, '\n\u00a0') : '\u00a0'
  return (
    <>
      <div className="grid w-fit max-w-full">
        <div
          aria-hidden
          className={cn(EDIT_FIELD_CLASS, 'invisible whitespace-pre-wrap break-words border-transparent')}
        >
          {mirror}
        </div>
        <ComposerPrimitive.Input
          aria-label="Изменить сообщение"
          autoFocus
          className={EDIT_FIELD_CLASS}
          cols={1}
          rows={1}
        />
      </div>
      <div className="flex items-center gap-1 pt-1 pl-1">
        <ComposerPrimitive.Cancel aria-label="Отмена" className={EDIT_ICON_CLASS}>
          <XIcon className="size-4" />
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send aria-label="Отправить" className={EDIT_ICON_CLASS}>
          <CheckIcon className="size-4" />
        </ComposerPrimitive.Send>
      </div>
    </>
  )
}

function DialogEditComposer() {
  return (
    <MessagePrimitive.Root className="flex w-full justify-end">
      <ComposerPrimitive.Root className="flex w-fit max-w-[min(100%,40rem)] flex-col items-start">
        <DialogEditField />
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

const DIALOG_MESSAGE_COMPONENTS = {
  UserMessage: DialogUserMessage,
  AssistantMessage: DialogAssistantMessage,
  UserEditComposer: DialogEditComposer,
}

function DialogComposerChips({ disabled }: { disabled: boolean }) {
  const aui = useAui()
  const signature = useAuiState((state) =>
    state.composer.attachments.map((attachment) => attachment.id).join('|'),
  )
  const [items, setItems] = useState<Array<{ id: string; name: string; src: string; kind: 'image' | 'file' }>>([])

  useEffect(() => {
    const created: string[] = []
    const next = aui.composer.getState().attachments.flatMap(
      (attachment): Array<{ id: string; name: string; src: string; kind: 'image' | 'file' }> => {
        if (attachment.type === 'document') {
          return [{ id: attachment.id, name: attachment.name, src: '', kind: 'file' }]
        }
        if (!attachment.file) return []
        const src = URL.createObjectURL(attachment.file)
        created.push(src)
        return [{ id: attachment.id, name: attachment.name, src, kind: 'image' }]
      },
    )
    setItems(next)
    return () => {
      for (const src of created) URL.revokeObjectURL(src)
    }
  }, [aui, signature])

  if (items.length === 0) return null
  return (
    <ComposerAttachChips
      disabled={disabled}
      items={items}
      onRemove={(id) => {
        void aui.composer.attachment({ id }).remove()
      }}
    />
  )
}

function DialogWelcome() {
  return (
    <div className="flex max-w-md flex-col items-center px-4 text-center">
      <MercuryOrb label="NoraAI" size={72} state="idle" />
      <h1 className="mt-6 font-[family-name:var(--nora-font)] text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--nora-text)]">
        Чем помочь?
      </h1>
      <p className={cn('mt-2 max-w-[26rem]', DIALOG_TEXT_CLASS, 'text-[var(--nora-text-secondary)]')}>
        Привет, я NoraAI. Напишите, продиктуйте, прикрепите фото или файл — помогу разобраться.
      </p>
    </div>
  )
}

function DialogComposer({ placeholder = 'Сообщение…' }: { placeholder?: string }) {
  const aui = useAui()
  const auth = useAuth()
  const text = useAuiState((state) => state.composer.text)
  const attachmentCount = useAuiState((state) => state.composer.attachments.length)
  const running = useAuiState((state) => state.thread.isRunning)
  const textRef = useRef(text)
  textRef.current = text
  const tone = dialogComposerSendTone({
    sending: running,
    hasDraft: text.trim().length > 0 || attachmentCount > 0,
  })

  async function addFiles(files: File[]) {
    const current = aui.composer.getState().attachments
    let hasDocument = current.some((attachment) => attachment.type === 'document')
    const accepted: File[] = []
    for (const file of files) {
      if (!isChatDocumentFile(file)) {
        accepted.push(file)
        continue
      }
      if (hasDocument) {
        toast.error('Можно прикрепить один файл')
        continue
      }
      hasDocument = true
      accepted.push(file)
    }
    const room = takeMealAttachRoom(current.length, accepted.length)
    if (room.overflow) toast.error(mealAttachLimitMessage())
    for (const file of accepted.slice(0, room.taken)) {
      try {
        await aui.composer.addAttachment(file)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось добавить фото')
      }
    }
  }

  return (
    <ComposerPrimitive.Root>
      <ComposerPressSurface className={DIALOG_COMPOSER_FIELD_CLASS}>
        <DialogComposerChips disabled={running} />
        <ComposerPrimitive.Input
          aria-label="Сообщение"
          className={COMPOSER_INPUT_CLASS}
          disabled={running}
          onPaste={(event) => {
            const files = pastedMealImageFiles(event)
            if (files.length > 0) void addFiles(files)
          }}
          placeholder={placeholder}
          rows={1}
        />
        <div className="flex items-center gap-2 pt-4">
          <MealAttachMenu
            disabled={running}
            onAttached={() => undefined}
            onFiles={(files) => {
              void addFiles(files)
            }}
          />
          <KnowledgeBaseMenu disabled={running} />
          <DialogReasoningToggle />
          <DialogInternetToggle />
          <div className="flex-1" />
          <MealVoiceControls
            disabled={running}
            onTranscript={(incoming) => {
              aui.composer.setText(appendVoiceTranscript(textRef.current, incoming))
            }}
            sendButton={
              <>
                <ComposerPrimitive.Cancel
                  aria-label="Остановить"
                  className={cn(dialogComposerSendClass('ready'), 'disabled:hidden')}
                >
                  <SquareIcon className="size-3.5 fill-current" />
                </ComposerPrimitive.Cancel>
                <AuiIf condition={(state) => !state.thread.isRunning}>
                  <ComposerPrimitive.Send
                    aria-label="Отправить"
                    className={dialogComposerSendClass(tone)}
                  >
                    <ArrowUpIcon className="size-[18px]" strokeWidth={1.75} />
                  </ComposerPrimitive.Send>
                </AuiIf>
              </>
            }
            transport={auth.transport}
          />
        </div>
      </ComposerPressSurface>
    </ComposerPrimitive.Root>
  )
}

export function DialogThread() {
  const empty = useAuiState((state) => state.thread.isEmpty)

  if (empty) {
    return (
      <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-16">
          <DialogWelcome />
          <div className="mt-8 w-full max-w-3xl">
            <DialogComposer placeholder="Начните печатать" />
          </div>
        </div>
      </ThreadPrimitive.Root>
    )
  }

  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-6">
          <ThreadPrimitive.Messages components={DIALOG_MESSAGE_COMPONENTS} />
        </div>
      </ThreadPrimitive.Viewport>
      <div className="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        <ThreadPrimitive.ScrollToBottom
          aria-label="К последнему сообщению"
          className="absolute -top-11 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--nora-border)] bg-[var(--nora-surface)] text-[var(--nora-text)] shadow-sm disabled:hidden"
        >
          <ChevronDownIcon className="size-4" />
        </ThreadPrimitive.ScrollToBottom>
        <DialogComposer />
      </div>
    </ThreadPrimitive.Root>
  )
}
