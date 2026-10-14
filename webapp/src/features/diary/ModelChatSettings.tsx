import * as React from 'react'
import { HistoryIcon, XIcon } from '@/components/icons'
import { SettingsEntry } from '@/components/settings-canvas'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { ApiRequestError, type AuthenticatedTransport } from '@/platform/api'
import { cn } from '@/lib/utils'

import { chatWithNoraModel } from './api'
import { ComposerAttachChips } from './composer-ui'
import { ComposerTypedText } from './composer-typed-text'
import { ComposerPressSurface } from './ComposerPressSurface'
import { MealAttachMenu, queueMealImageFile } from './meal-attach-menu'
import { pastedMealImageFiles, type MealImageMime } from './meal-image-pick'
import {
  MEAL_COMPOSER_FIELD_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
  MEAL_MODAL_CHIP_CLASS,
  MealComposerSendButton,
  mealComposerSendTone,
} from './meal-sheet'
import { MealVoiceControls } from './MealVoiceControls'
import { appendVoiceTranscript } from './voice-input'

const PHOTO_LIMIT = 4

type ChatImage = { base64: string; mime: MealImageMime }

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  text: string
  images?: ChatImage[]
  previews?: string[]
  model?: string
  /** Shown in the window, never sent back to the model. */
  local?: boolean
  /** Status line while the model is still working. */
  pending?: boolean
  /** Fresh reply types in, the same way a formed meal card fills. */
  typing?: boolean
}

type Attach = {
  id: string
  base64: string
  mime: MealImageMime
  name: string
  previewUrl: string
}

function lineId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

function replyError(error: unknown) {
  if (error instanceof ApiRequestError && error.message.trim()) return error.message
  return 'Не удалось получить ответ. Попробуйте ещё раз.'
}

export function ModelChatSettings({ transport }: { transport: AuthenticatedTransport }) {
  const [open, setOpen] = React.useState(false)
  const [lines, setLines] = React.useState<ChatLine[]>([])
  const [note, setNote] = React.useState('')
  const [attaches, setAttaches] = React.useState<Attach[]>([])
  const [busy, setBusy] = React.useState(false)
  const abortRef = React.useRef<AbortController | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const reading = attaches.some((item) => !item.base64)
  const canSend = !busy && !reading && (note.trim().length > 0 || attaches.some((item) => item.base64))

  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [lines, open])

  function dropPreviews(items: Attach[]) {
    for (const item of items) URL.revokeObjectURL(item.previewUrl)
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setLines([])
    setNote('')
    setAttaches((current) => {
      dropPreviews(current)
      return []
    })
  }

  function acceptFiles(files: File[]) {
    if (busy || files.length === 0) return
    const room = Math.max(0, PHOTO_LIMIT - attaches.length)
    if (room === 0 || files.length > room) toast.message('В тестовом чате не больше 4 фото')
    for (const file of files.slice(0, room)) {
      queueMealImageFile(file, {
        onPicked: ({ id, file: picked }) => {
          setAttaches((current) => [
            ...current,
            {
              id,
              base64: '',
              mime: 'image/jpeg',
              name: picked.name,
              previewUrl: URL.createObjectURL(picked),
            },
          ])
        },
        onAttached: ({ id, base64, mime, name }) => {
          setAttaches((current) =>
            current.map((item) => (item.id === id ? { ...item, base64, mime, name } : item)),
          )
        },
        onPickFailed: (id) => {
          setAttaches((current) => {
            const failed = current.find((item) => item.id === id)
            if (failed) URL.revokeObjectURL(failed.previewUrl)
            return current.filter((item) => item.id !== id)
          })
        },
      })
    }
  }

  async function send() {
    const text = note.trim()
    const photos = attaches.filter((item) => item.base64)
    if (!canSend) return
    const images = photos.map((item) => ({ base64: item.base64, mime: item.mime }))
    const userLine: ChatLine = {
      id: lineId(),
      role: 'user',
      text,
      images: images.length > 0 ? images : undefined,
      previews: photos.map((item) => `data:${item.mime};base64,${item.base64}`),
    }
    const pendingId = lineId()
    const history = [...lines.filter((line) => !line.local), userLine]
    setLines([
      ...history,
      { id: pendingId, role: 'assistant', text: 'Модель отвечает…', local: true, pending: true },
    ])
    setNote('')
    setAttaches([])
    dropPreviews(attaches)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await chatWithNoraModel(
        transport,
        history.map((line) => ({
          role: line.role,
          text: line.text,
          ...(line.images?.length ? { images: line.images } : {}),
        })),
        controller.signal,
      )
      if (controller.signal.aborted) return
      setLines((current) =>
        current.map((line) =>
          line.id === pendingId
            ? { id: pendingId, role: 'assistant', text: result.reply, model: result.model, typing: true }
            : line,
        ),
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setLines((current) =>
        current.map((line) =>
          line.id === pendingId
            ? { id: pendingId, role: 'assistant', text: replyError(error), local: true, typing: true }
            : line,
        ),
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
      }
    }
  }

  return (
    <SettingsEntry
      description="Временный чат, чтобы проверить текстовую модель и модель с картинками. Голос, текст и фото. Сброс начинает разговор заново."
      descriptionClassName="max-w-none line-clamp-none overflow-visible"
      title="Проверка моделей"
    >
      <button
        className="cursor-pointer rounded-full bg-[var(--settings-field-bg,var(--nora-panel))] px-3"
        onClick={() => setOpen(true)}
        type="button"
      >
        Открыть чат
      </button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className={MEAL_DIALOG_FRAME_CLASS}
          data-phone-full=""
          showCloseButton={false}
        >
          <DialogHeader className="min-w-0 shrink-0 gap-1 bg-[var(--nora-modal)] px-3 pt-3 text-left sm:px-4 sm:pt-3.5">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                Чат с моделью
              </DialogTitle>
              <DialogClose
                aria-label="Закрыть"
                className={cn(
                  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
                  'nora-press-grow size-8 shrink-0 sm:size-6',
                  'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                )}
              >
                <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
              </DialogClose>
            </div>
            <DialogDescription className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
              Фото уходит в модель с картинками, текст — в текстовую.
            </DialogDescription>
            <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2" ref={scrollerRef}>
            {lines.length === 0 ? (
              <p className="py-8 text-center text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                Напишите сообщение, продиктуйте его или прикрепите фото.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {lines.map((line) => (
                  <ChatBubble
                    key={line.id}
                    line={line}
                    onTyped={
                      line.typing
                        ? () => {
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id ? { ...item, typing: false } : item,
                              ),
                            )
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
          <div className="px-3 pt-1 pb-3">
            <ComposerPressSurface className={MEAL_COMPOSER_FIELD_CLASS}>
              <ComposerAttachChips
                disabled={busy}
                items={attaches.map((item) => ({
                  id: item.id,
                  name: item.name,
                  src: item.base64 ? `data:${item.mime};base64,${item.base64}` : item.previewUrl,
                }))}
                onRemove={(id) => {
                  setAttaches((current) => {
                    const removed = current.find((item) => item.id === id)
                    if (removed) URL.revokeObjectURL(removed.previewUrl)
                    return current.filter((item) => item.id !== id)
                  })
                }}
              />
              <textarea
                aria-label="Сообщение модели"
                className="field-sizing-content max-h-40 min-h-[20px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)] outline-none placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)] no-scrollbar"
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                onPaste={(event) => {
                  const files = pastedMealImageFiles(event)
                  if (files.length > 0) acceptFiles(files)
                }}
                placeholder="Уточнение или фото состава…"
                rows={1}
                value={note}
              />
              <div className="flex items-center gap-2 pt-4">
                <MealAttachMenu disabled={busy} onAttached={() => undefined} onFiles={acceptFiles} />
                <button
                  className={cn(
                    MEAL_MODAL_CHIP_CLASS,
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 py-0 pr-3 pl-2.5 text-[13px] font-normal leading-none text-[var(--nora-text)] hover:bg-[var(--nora-input-bg)]',
                  )}
                  onClick={reset}
                  type="button"
                >
                  <HistoryIcon className="size-3.5" strokeWidth={1.75} />
                  Сбросить
                </button>
                <div className="flex-1" />
                <MealVoiceControls
                  disabled={busy}
                  onTranscript={(text) => setNote((current) => appendVoiceTranscript(current, text))}
                  sendButton={
                    <MealComposerSendButton
                      idleLabel="Отправить"
                      onClick={() => void send()}
                      sendingLabel="Модель отвечает"
                      tone={mealComposerSendTone({ sending: busy, hasDraft: canSend })}
                    />
                  }
                  transport={transport}
                />
              </div>
            </ComposerPressSurface>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsEntry>
  )
}

function ChatBubble({ line, onTyped }: { line: ChatLine; onTyped?: () => void }) {
  const mine = line.role === 'user'
  return (
    <div className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex w-fit max-w-[85%] flex-col gap-1.5 rounded-[18px] px-3.5 py-2 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5',
          mine
            ? 'rounded-br-[6px] bg-[var(--nora-text)] text-[var(--nora-panel)]'
            : 'rounded-bl-[6px] bg-[color-mix(in_srgb,var(--nora-input-bg)_68%,var(--nora-panel))] text-[var(--nora-text-secondary)]',
        )}
      >
        {line.previews && line.previews.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {line.previews.map((src) => (
              <img alt="" className="size-14 rounded-[10px] object-cover" key={src} src={src} />
            ))}
          </div>
        ) : null}
        {line.text && line.role === 'assistant' && !line.pending ? (
          <ComposerTypedText live={line.typing === true} onComplete={onTyped} text={line.text} />
        ) : line.text ? (
          <p className="whitespace-pre-wrap">{line.text}</p>
        ) : null}
        {line.model && !line.typing ? (
          <p className="text-[11px] font-light text-[var(--nora-text-tertiary)]">{line.model}</p>
        ) : null}
      </div>
    </div>
  )
}
