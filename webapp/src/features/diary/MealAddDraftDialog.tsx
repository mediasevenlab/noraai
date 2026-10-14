import * as React from 'react'
import { toast } from '@/components/ui/toast'
import type { MealDto } from '@web-app-demo/contracts'

import { ProductSheetTabFade, productSheetTabDockClass } from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth'
import { useLatest } from '@/lib/use-latest'
import { cn } from '@/lib/utils'

import { getDiaryMealEngine, postMealComposerTurn } from './api'
import { appendAssistantMessage, composerAppPhotoAcceptedMessage, mergeComposerChat, type ComposerChatMessage } from './composer-chat'
import { ComposerPressSurface } from './ComposerPressSurface'
import {
  MEAL_REVEAL_BODY_FADE_MS,
  MEAL_REVEAL_MACRO_GAP_MS,
  mealAddRevealShouldStart,
  mealCardRevealInitialPhase,
  mealCardRevealShowsChat,
  mealCardRevealShowsDetail,
  mealFormingChatVisible,
  mealRevealMacroRolling,
  type MealCardRevealPhase,
  type MealMacrosRevealState,
} from './meal-card-reveal'
import { isComposerAnalyzingPlaceholder } from './meal-forming-steps'
import { MealAttachMenu, queueMealImageFile } from './meal-attach-menu'
import { MealAddHeroPreview } from './meal-add-hero-preview'
import {
  MEAL_ATTACH_LIMIT,
  mealAttachLimitMessage,
  pastedMealImageFiles,
  takeMealAttachRoom,
  type MealImageMime,
} from './meal-image-pick'
import { MealVoiceControls } from './MealVoiceControls'
import { appendVoiceTranscript } from './voice-input'
import type { MealEntry } from './meals-catalog'
import { mealCarouselImages, mealDtoToEntry } from './merge-meals'
import { formatMealStamp } from './diary-feed'
import {
  imagesForDiaryMeal,
  MealMacrosPlaque,
} from './MealCard'
import { MealOpenDetail } from './MealOpenDetail'
import { ComposerAttachChips, ComposerChatBubble, MealFormingStepList } from './composer-ui'
import {
  MEAL_COMPOSER_FIELD_CLASS,
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MEAL_DIALOG_HERO_FRAME_CLASS,
  MealComposerSendButton,
  MealDialogCloseButton,
  MealDialogHero,
  mealComposerSendTone,
  useMealDialogDismissLocked,
} from './meal-sheet'

const EMPTY_MEAL_MACROS = { kcal: 0, protein: 0, fat: 0, carbs: 0 } as const

export function MealAddDraftDialog({
  open,
  onOpenChange,
  onCreated,
  subjectUserId,
  formedMeal,
  mealGalleries = {},
  onCommitVersionGallery,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (mealId: string) => void
  subjectUserId?: string
  formedMeal?: MealEntry
  mealGalleries?: Record<string, Record<string, string[]>>
  onCommitVersionGallery?: (input: {
    mealId: string
    fromVersionId: string
    toVersionId: string
    toIndex?: number
    extraSrc: string | null
    replaceGallery?: string[]
  }) => void
}) {
  const auth = useAuth()
  const mealEngine = useQuery({
    queryKey: ['session', 'meal-engine'],
    queryFn: () => getDiaryMealEngine(auth.transport),
    enabled: open,
  })
  const noraEngine = mealEngine.data?.engine === 'nora'
  const dismissLocked = useMealDialogDismissLocked()
  const [note, setNote] = React.useState('')
  const [attaches, setAttaches] = React.useState<
    Array<{
      id: string
      base64: string
      mime: MealImageMime
      name: string
      previewUrl?: string
    }>
  >([])
  const [messages, setMessages] = React.useState<ComposerChatMessage[]>([])
  const [status, setStatus] = React.useState<'idle' | 'collecting' | 'busy' | 'done' | 'cancelled'>(
    'idle',
  )
  const [photoCount, setPhotoCount] = React.useState(0)
  const [createdMealDto, setCreatedMealDto] = React.useState<MealDto | null>(null)
  const [forming, setForming] = React.useState(false)
  const [busyTurn, setBusyTurn] = React.useState(false)
  const [revealPhase, setRevealPhase] = React.useState<MealCardRevealPhase>('steps')
  const [macroSettled, setMacroSettled] = React.useState(0)
  const [keepChat, setKeepChat] = React.useState(true)
  const [refineMacros, setRefineMacros] = React.useState<MealMacrosRevealState>({ rolling: false })
  const revealForIdRef = React.useRef<string | null>(null)
  const formingForRevealRef = React.useRef(false)
  const chatRef = React.useRef<HTMLDivElement>(null)
  const reservedAttachesRef = React.useRef(0)
  const createdRef = React.useRef<string | null>(null)
  const [openedAt, setOpenedAt] = React.useState<string | null>(null)
  if (open && !openedAt) setOpenedAt(new Date().toISOString())
  if (!open && openedAt) setOpenedAt(null)
  const turnQueueRef = React.useRef(Promise.resolve())
  const turnSeqRef = React.useRef(0)
  const onCreatedRef = useLatest(onCreated)
  const busy = busyTurn || status === 'busy'
  const photosEncoding = attaches.some((item) => !item.base64)
  const displayMeal = formedMeal ?? (createdMealDto ? mealDtoToEntry(createdMealDto) : null)
  const hasMeal = Boolean(displayMeal)
  const showDetail = mealCardRevealShowsDetail(revealPhase)
  const showChat = mealCardRevealShowsChat(revealPhase) || keepChat
  const showFormingSteps = mealFormingChatVisible({
    forming,
    hasMeal,
    phase: revealPhase,
  })
  const hasDraft =
    note.trim().length > 0
    || photoCount > 0
    || attaches.some((item) => item.base64)
  const sending = busy || photosEncoding || showFormingSteps
  const sendTone = mealComposerSendTone({
    sending,
    hasDraft: hasDraft && !hasMeal,
  })
  const canSend = sendTone === 'ready'
  const previewSlides = attaches.length
    ? attaches.map((item) =>
        item.previewUrl
        || (item.base64 ? `data:${item.mime};base64,${item.base64}` : ''),
      ).filter(Boolean)
    : []
  const formedImages = displayMeal
    ? (() => {
        const fromDiary = imagesForDiaryMeal(displayMeal, mealGalleries)
        if (fromDiary.length > 1) return fromDiary
        const extras = attaches
          .slice(1)
          .filter((item) => item.base64)
          .map((item) => `data:${item.mime};base64,${item.base64}`)
        return mealCarouselImages({ cover: displayMeal.image, extraImages: extras })
      })()
    : previewSlides

  const applySnapshot = React.useCallback(
    (snapshot: {
      status: typeof status
      messages: Array<{ role: 'assistant'; text: string }>
      photoCount: number
      meal?: MealDto
    }) => {
      setStatus(snapshot.status)
      setMessages((current) => mergeComposerChat(current, snapshot.messages))
      setPhotoCount(snapshot.photoCount)
      if (snapshot.meal) {
        setCreatedMealDto(snapshot.meal)
        if (createdRef.current !== snapshot.meal.id) {
          createdRef.current = snapshot.meal.id
          onCreatedRef.current?.(snapshot.meal.id)
        }
      }
    },
    [onCreatedRef],
  )

  const runTurn = React.useCallback(
    async (
      body: Parameters<typeof postMealComposerTurn>[1],
      options?: { quiet?: boolean },
    ) => {
      const seq = turnSeqRef.current
      const queued = turnQueueRef.current.then(async () => {
        if (turnSeqRef.current !== seq) return null
        if (!options?.quiet) setBusyTurn(true)
        try {
          const snapshot = await postMealComposerTurn(auth.transport, body)
          if (turnSeqRef.current !== seq) return snapshot
          if (options?.quiet) {
            setPhotoCount(snapshot.photoCount)
            if (snapshot.meal) {
              setCreatedMealDto(snapshot.meal)
              if (createdRef.current !== snapshot.meal.id) {
                createdRef.current = snapshot.meal.id
                onCreatedRef.current?.(snapshot.meal.id)
              }
            }
          } else {
            applySnapshot(snapshot)
          }
          return snapshot
        } catch (error) {
          if (turnSeqRef.current !== seq) return null
          toast.error(
            error instanceof Error && /413|too large|PAYLOAD_TOO_LARGE/i.test(error.message)
              ? 'Фото слишком большое. Снимок будет сжат, попробуйте ещё раз.'
              : error instanceof Error
                ? error.message
                : 'Не удалось отправить',
          )
          return null
        } finally {
          if (turnSeqRef.current === seq && !options?.quiet) setBusyTurn(false)
        }
      })
      turnQueueRef.current = queued.then(
        () => undefined,
        () => undefined,
      )
      return queued
    },
    [applySnapshot, auth.transport, onCreatedRef],
  )
  const runTurnRef = useLatest(runTurn)

  React.useEffect(() => {
    if (open) {
      void runTurnRef.current({ action: 'open' })
      return
    }
    turnSeqRef.current += 1
    turnQueueRef.current = Promise.resolve()
    const id = window.setTimeout(() => {
      setNote('')
      reservedAttachesRef.current = 0
      setAttaches((current) => {
        for (const item of current) {
          if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
        }
        return []
      })
      setMessages((current) => {
        for (const message of current) {
          if (message.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(message.imageUrl)
        }
        return []
      })
      setStatus('idle')
      setPhotoCount(0)
      setCreatedMealDto(null)
      setForming(false)
      formingForRevealRef.current = false
      setBusyTurn(false)
      setRevealPhase('steps')
      setMacroSettled(0)
      setKeepChat(true)
      setRefineMacros({ rolling: false })
      createdRef.current = null
      revealForIdRef.current = null
    }, 0)
    return () => window.clearTimeout(id)
  }, [open, runTurnRef])

  React.useEffect(() => {
    const viewport = chatRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    )
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages])

  React.useEffect(() => {
    const mealId = displayMeal?.id
    if (!open) {
      revealForIdRef.current = null
      formingForRevealRef.current = false
      const id = window.setTimeout(() => {
        setRevealPhase('steps')
        setMacroSettled(0)
        setKeepChat(true)
      }, 0)
      return () => window.clearTimeout(id)
    }
    if (!mealAddRevealShouldStart(revealForIdRef.current, mealId) || !mealId) {
      if (!mealId) {
        revealForIdRef.current = null
        const id = window.setTimeout(() => {
          setRevealPhase('steps')
          setMacroSettled(0)
        }, 0)
        return () => window.clearTimeout(id)
      }
      return
    }
    revealForIdRef.current = mealId
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = mealCardRevealInitialPhase({
      hasMeal: true,
      fromForming: formingForRevealRef.current,
      reducedMotion: reduced,
    })
    const startId = window.setTimeout(() => {
      setRevealPhase(next)
      if (next !== 'settle') {
        setMacroSettled(next === 'ready' ? 4 : 0)
        return
      }
      setMacroSettled(0)
    }, 0)
    if (next !== 'settle') {
      return () => window.clearTimeout(startId)
    }
    const timers = [1, 2, 3, 4].map((count) =>
      window.setTimeout(() => {
        setMacroSettled(count)
        if (count === 4) setRevealPhase('title')
      }, count * MEAL_REVEAL_MACRO_GAP_MS),
    )
    return () => {
      window.clearTimeout(startId)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [displayMeal?.id, open])

  if (mealCardRevealShowsChat(revealPhase) && !keepChat) {
    setKeepChat(true)
  }

  React.useEffect(() => {
    if (mealCardRevealShowsChat(revealPhase)) return
    const id = window.setTimeout(() => setKeepChat(false), MEAL_REVEAL_BODY_FADE_MS)
    return () => window.clearTimeout(id)
  }, [revealPhase])

  function handleOpenChange(next: boolean) {
    const shouldCancel = !next && open && !hasMeal
    onOpenChange(next)
    if (!shouldCancel) return
    void postMealComposerTurn(auth.transport, { action: 'cancel' }).catch(() => undefined)
  }

  async function sendNote() {
    if (!canSend) return
    const text = note.trim()
    const willForm =
      photoCount > 0
      || attaches.some((item) => item.base64)
      || (noraEngine && text.length > 0)
    if (willForm) {
      formingForRevealRef.current = true
      setForming(true)
    }
    const snapshot = await runTurn(text ? { action: 'note', note: text } : { action: 'flush' })
    if (!snapshot) {
      setForming(false)
      return
    }
    setNote('')
    if (snapshot.meal || snapshot.status !== 'busy') {
      setForming(false)
    }
  }

  async function removeAttach(index: number) {
    if (busy || hasMeal || showFormingSteps) return
    const item = attaches[index]
    const previewUrl =
      item?.previewUrl
      || (item?.base64 ? `data:${item.mime};base64,${item.base64}` : undefined)
    const remaining = Math.max(0, attaches.length - 1)
    reservedAttachesRef.current = remaining
    const deletedMessage: ComposerChatMessage = {
      role: 'assistant',
      text:
        remaining <= 0
          ? '📷 Фото удалено. Пришлите фото еды, затем голос или текст.'
          : `📷 Фото удалено. Осталось ${remaining}/${MEAL_ATTACH_LIMIT}. Можно добавить ещё или отправить.`,
      ...(previewUrl ? { imageUrl: previewUrl, imageFilter: 'grayscale' as const } : {}),
    }
    setMessages((current) => appendAssistantMessage(current, deletedMessage))
    if (item?.base64) {
      const snapshot = await runTurn({ action: 'remove-photo', photoIndex: index })
      if (!snapshot) {
        reservedAttachesRef.current = attaches.length
        setMessages((current) => {
          const last = current.at(-1)
          if (
            last?.text === deletedMessage.text &&
            last.imageUrl === deletedMessage.imageUrl
          ) {
            return current.slice(0, -1)
          }
          return [...current]
        })
        return
      }
    }
    setAttaches((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function acceptComposerFiles(files: File[]) {
    if (busy || hasMeal || showFormingSteps || files.length === 0) return
    const room = takeMealAttachRoom(
      Math.max(attaches.length, reservedAttachesRef.current),
      files.length,
    )
    if (room.taken === 0) {
      toast.message(mealAttachLimitMessage())
      return
    }
    if (room.overflow) toast.message(mealAttachLimitMessage())
    reservedAttachesRef.current = Math.max(attaches.length, reservedAttachesRef.current) + room.taken
    for (const file of files.slice(0, room.taken)) {
      queueMealImageFile(file, {
        onPicked: ({ id, file: picked }) => {
          const previewUrl = URL.createObjectURL(picked)
          setAttaches((current) => [
            ...current,
            {
              id,
              base64: '',
              mime: (picked.type as MealImageMime) || 'image/jpeg',
              name: picked.name,
              previewUrl,
            },
          ])
          setMessages((current) =>
            appendAssistantMessage(current, {
              role: 'assistant',
              text: composerAppPhotoAcceptedMessage(
                current.filter((message) => message.imageUrl).length + 1,
              ),
              imageUrl: previewUrl,
            }),
          )
        },
        onPickFailed: (id) => {
          reservedAttachesRef.current = Math.max(0, reservedAttachesRef.current - 1)
          setAttaches((current) => {
            const removed = current.find((item) => item.id === id)
            if (removed?.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(removed.previewUrl)
            }
            return current.filter((item) => item.id !== id)
          })
          setMessages((current) => [
            ...current,
            {
              role: 'assistant',
              text: '❌ Не удалось прикрепить фото. Попробуйте ещё раз.',
            },
          ])
        },
        onAttached: (parsed) => {
          setAttaches((current) =>
            current.map((item) =>
              item.id === parsed.id
                ? {
                    ...item,
                    base64: parsed.base64,
                    mime: parsed.mime,
                    name: parsed.name,
                  }
                : item,
            ),
          )
          void runTurn(
            {
              action: 'photo',
              imageBase64: parsed.base64,
              imageMime: parsed.mime,
            },
            { quiet: true },
          )
        },
      })
    }
  }

  return (
    <Dialog disablePointerDismissal={dismissLocked} open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={MEAL_DIALOG_FRAME_CLASS}
        data-modal-frame="meal"
        data-phone-full=""
        showCloseButton={false}
      >
        <MealDialogHero
          macros={
            <MealMacrosPlaque
              meal={displayMeal ?? EMPTY_MEAL_MACROS}
              rolling={(showFormingSteps && !hasMeal) || refineMacros.rolling}
              rollingKeys={
                revealPhase === 'settle'
                  ? mealRevealMacroRolling(macroSettled)
                  : refineMacros.rollingKeys
              }
            />
          }
          origin="diary"
          preview={
            <div
              className={cn(
                'relative w-full overflow-hidden bg-[var(--nora-inset)]',
                MEAL_DIALOG_HERO_FRAME_CLASS,
                MEAL_DIALOG_COVER_CLASS,
              )}
            >
              <MealAddHeroPreview slides={previewSlides.length > 0 ? previewSlides : formedImages} />
            </div>
          }
        />

        <div className="relative grid min-h-0 flex-1">
          {showChat ? (
            <div
              className={cn(
                'col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden transition-opacity duration-300 ease-out',
                showDetail && 'pointer-events-none opacity-0',
              )}
            >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <DialogHeader className="min-w-0 shrink-0 gap-1 bg-[var(--nora-modal)] px-3 pt-3 text-left sm:px-4 sm:pt-3.5">
                <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                  Карточка приёма пищи
                </DialogTitle>
                <DialogDescription className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                  {openedAt ? formatMealStamp(openedAt) : ' '}
                </DialogDescription>
                <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
              </DialogHeader>

              <div className="min-h-0 flex-1" ref={chatRef}>
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2 px-3 pt-3 pb-3 sm:px-4">
                    {messages
                      .filter((message) => message.role === 'assistant')
                      .filter((message) =>
                        showFormingSteps ? !isComposerAnalyzingPlaceholder(message.text) : true,
                      )
                      .map((message, index, assistantMessages) => (
                      <ComposerChatBubble
                        key={`${index}-${message.text.slice(0, 24)}`}
                        live={!showFormingSteps && index === assistantMessages.length - 1}
                        message={message}
                      />
                    ))}
                    {showFormingSteps ? (
                      <MealFormingStepList
                        photoCount={Math.max(
                          photoCount,
                          attaches.filter((item) => item.base64).length,
                        )}
                      />
                    ) : null}
                  </div>
                </ScrollArea>
              </div>

              <div className={productSheetTabDockClass}>
                <ProductSheetTabFade />
                {!showDetail ? (
                  <div className="relative mb-2 flex h-8 items-center justify-end md:hidden">
                    <MealDialogCloseButton />
                  </div>
                ) : null}
                <ComposerPressSurface className={MEAL_COMPOSER_FIELD_CLASS}>
                  <ComposerAttachChips
                    disabled={busy}
                    items={attaches
                      .map((item) => ({
                        id: item.id,
                        name: item.name,
                        src:
                          item.previewUrl
                          || (item.base64 ? `data:${item.mime};base64,${item.base64}` : ''),
                      }))
                      .filter((item) => item.src)}
                    onRemove={(id) => {
                      const index = attaches.findIndex((item) => item.id === id)
                      if (index >= 0) void removeAttach(index)
                    }}
                  />
                  <textarea
                    aria-label="Описание приёма"
                    className="field-sizing-content max-h-40 min-h-[20px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)] outline-none placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)] no-scrollbar disabled:opacity-60"
                    data-meal-composer=""
                    disabled={busy}
                    onChange={(event) => setNote(event.target.value)}
                    onPaste={(event) => {
                      const files = pastedMealImageFiles(event)
                      if (files.length > 0) acceptComposerFiles(files)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void sendNote()
                      }
                    }}
                    placeholder="Описание или фото приёма…"
                    rows={1}
                    value={note}
                  />
                  <div className="flex items-center gap-2 pt-4">
                    <MealAttachMenu
                      disabled={busy}
                      onAttached={() => undefined}
                      onFiles={acceptComposerFiles}
                    />
                    <div className="flex-1" />
                    <MealVoiceControls
                      disabled={busy}
                      onTranscript={(text) =>
                        setNote((current) => appendVoiceTranscript(current, text))
                      }
                      sendButton={
                        <MealComposerSendButton
                          onClick={() => void sendNote()}
                          tone={sendTone}
                        />
                      }
                      transport={auth.transport}
                    />
                  </div>
                </ComposerPressSurface>
              </div>
            </div>
            </div>
          ) : null}
          {displayMeal && showDetail ? (
            <div className="col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden animate-in fade-in-0 duration-300">
              <MealOpenDetail
                meal={displayMeal}
                onCommitVersionGallery={onCommitVersionGallery}
                onCompositionTyped={() => setRevealPhase('ready')}
                onMacrosRevealChange={setRefineMacros}
                onTitleTyped={() => setRevealPhase('composition')}
                reveal={
                  revealPhase === 'title' || revealPhase === 'composition' || revealPhase === 'ready'
                    ? revealPhase
                    : 'off'
                }
                subjectUserId={subjectUserId}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
