import * as React from 'react'
import { MicIcon } from 'lucide-react'

import { ProductSheetTabFade, productSheetTabDockClass } from '@/components/nora/product-sheet'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLatest } from '@/lib/use-latest'
import { cn } from '@/lib/utils'

import { authDemoClear, authDemoTimeout } from './auth-demo-playback'
import {
  AUTH_MEAL_COVER_FADE_MS,
  AUTH_MEAL_DRAFT_DEMO,
  AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT,
  AUTH_MEAL_DRAFT_DEMO_WELCOME,
  AUTH_MEAL_EXPAND_MS,
  authDemoAttachItemsForMeal,
  authDemoCaptionId,
  authDemoNoteForMeal,
  authDraftDemoFieldPressAtMs,
  authDraftDemoFormingAtMs,
  authDraftDemoNoteFieldPressAtMs,
  authDraftDemoPhotoAtMs,
  authDraftDemoSeekProgress,
  authDraftDemoPlusPressAtMs,
  authDraftDemoNutrientsPressFromOpenAtMs,
  authDraftDemoNutrientsShowFromOpenAtMs,
  authDraftDemoReadyAtFromOpenMs,
  authDraftDemoRevealAtMs,
  authDraftDemoSendPressAtMs,
  authDraftDemoSheetCloseFromOpenAtMs,
  authDraftDemoTypeStartAtMs,
  type AuthDemoCaptionId,
} from './auth-meal-carousel'
import {
  appendAssistantMessage,
  COMPOSER_APP_NOTE_ANALYZING_TEXT,
  type ComposerChatMessage,
} from './composer-chat'
import { ComposerPressSurface } from './ComposerPressSurface'
import { ComposerAttachChips, ComposerChatBubble, MealFormingStepList } from './composer-ui'
import { formatMealStamp } from './diary-feed'
import { MealAttachMenu } from './meal-attach-menu'
import { MealAddHeroPreview } from './meal-add-hero-preview'
import {
  MEAL_REVEAL_BODY_FADE_MS,
  MEAL_REVEAL_MACRO_GAP_MS,
  mealCardRevealShowsChat,
  mealCardRevealShowsDetail,
  mealFormingChatVisible,
  mealRevealMacroRolling,
  type MealCardRevealPhase,
  type MealMacrosRevealState,
} from './meal-card-reveal'
import { isComposerAnalyzingPlaceholder } from './meal-forming-steps'
import {
  MEAL_COMPOSER_FIELD_CLASS,
  MEAL_DIALOG_COVER_CLASS,
  MealComposerSendButton,
  MealDialogHero,
  mealComposerSendTone,
  type MealDetailTab,
} from './meal-sheet'
import { prefetchMealPhoto } from './media-display'
import { MealFeedPhoto } from './meal-feed-photo'
import { imagesForDiaryMeal, MealMacrosPlaque } from './MealCard'
import { MealOpenDetail } from './MealOpenDetail'
import type { MealEntry } from './meals-catalog'

const EMPTY_MEAL_MACROS = { kcal: 0, protein: 0, fat: 0, carbs: 0 } as const

/** Login demo only: the meal dialog preview is 30% shorter than the product hero. */
const AUTH_DEMO_MEAL_HERO_FRAME_CLASS =
  'h-[min(36.96vw,202px)] max-h-[min(36.96vw,202px)] transition-[height,max-height] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[225px] sm:max-h-none group-data-[hero-expanded]/preview:h-[min(61.6vw,336px)] group-data-[hero-expanded]/preview:max-h-[min(61.6vw,336px)] sm:group-data-[hero-expanded]/preview:h-[225px] sm:group-data-[hero-expanded]/preview:max-h-none'

const WELCOME_MESSAGE: ComposerChatMessage = {
  role: 'assistant',
  text: AUTH_MEAL_DRAFT_DEMO_WELCOME,
}

export function MealAddDraftIdleSheet({
  meal,
  openedAt,
  play,
  startMs = 0,
  collapsing = false,
  onComplete,
  onCaptionId,
}: {
  meal: MealEntry
  openedAt: string
  play: boolean
  startMs?: number
  /** Frame is shrinking back to the card — morph the hero into the cover. */
  collapsing?: boolean
  onComplete?: () => void
  onCaptionId?: (id: AuthDemoCaptionId) => void
}) {
  const photos = React.useMemo(() => authDemoAttachItemsForMeal(meal), [meal])
  const noteText = React.useMemo(() => authDemoNoteForMeal(meal), [meal])
  const noteChars = React.useMemo(() => Array.from(noteText), [noteText])
  const lastPhotoIndex = photos.length - 1
  const [fieldPressed, setFieldPressed] = React.useState(false)
  const [fieldFocused, setFieldFocused] = React.useState(false)
  const [plusPressed, setPlusPressed] = React.useState(false)
  const [sendPressed, setSendPressed] = React.useState(false)
  const [attaches, setAttaches] = React.useState<typeof photos>([])
  const [note, setNote] = React.useState('')
  const [messages, setMessages] = React.useState<ComposerChatMessage[]>([WELCOME_MESSAGE])
  const [forming, setForming] = React.useState(false)
  const [displayMeal, setDisplayMeal] = React.useState<MealEntry | null>(null)
  const [revealPhase, setRevealPhase] = React.useState<MealCardRevealPhase>('steps')
  const [macroSettled, setMacroSettled] = React.useState(0)
  const [keepChat, setKeepChat] = React.useState(true)
  const [refineMacros, setRefineMacros] = React.useState<MealMacrosRevealState>({ rolling: false })
  const [detailTab, setDetailTab] = React.useState<MealDetailTab>('Состав')
  const [nutrientsPressed, setNutrientsPressed] = React.useState(false)
  const [coverReveal, setCoverReveal] = React.useState(false)
  const chatRef = React.useRef<HTMLDivElement>(null)

  const hasMeal = Boolean(displayMeal)
  const showDetail = mealCardRevealShowsDetail(revealPhase)
  const showChat = mealCardRevealShowsChat(revealPhase) || keepChat
  const showFormingSteps = mealFormingChatVisible({
    forming,
    hasMeal,
    phase: revealPhase,
  })
  const hasDraft = note.trim().length > 0 || attaches.length > 0
  const sendTone = mealComposerSendTone({
    sending: forming,
    hasDraft: hasDraft && !hasMeal,
  })
  const captionId = authDemoCaptionId({
    open: true,
    photos: attaches.length,
    analyzing: forming || revealPhase === 'settle',
    formed:
      revealPhase === 'title' ||
      revealPhase === 'composition' ||
      revealPhase === 'ready',
    nutrients: detailTab === 'Нутриенты',
  })
  const onCaptionIdRef = useLatest(onCaptionId)

  React.useEffect(() => {
    onCaptionIdRef.current?.(captionId)
  }, [captionId, onCaptionIdRef])

  React.useEffect(() => {
    for (const item of photos) prefetchMealPhoto(item.src, 'full')
    prefetchMealPhoto(meal.image, 'full')
  }, [meal.image, photos])

  React.useEffect(() => {
    if (!play) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFieldFocused(true)
      setAttaches(photos)
      setNote(noteText)
      setMessages([
        WELCOME_MESSAGE,
        {
          role: 'assistant',
          text: AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT,
          imageUrl: photos.at(-1)?.src,
        },
      ])
      setDisplayMeal(meal)
      setRevealPhase('ready')
      setMacroSettled(4)
      setDetailTab('Нутриенты')
      setKeepChat(false)
      return
    }

    const origin = Math.max(0, startMs)
    const progress = authDraftDemoSeekProgress(origin, noteText)
    const shownPhotos = photos.slice(0, progress.photoCount)
    setFieldFocused(progress.fieldFocused)
    setAttaches(shownPhotos)
    setNote(progress.note)
    setForming(progress.forming)
    if (progress.photoCount > 0) {
      const last = shownPhotos.at(-1)
      setMessages([
        WELCOME_MESSAGE,
        {
          role: 'assistant',
          text: AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT,
          imageUrl: last?.src,
        },
      ])
    }
    if (progress.revealed) {
      setDisplayMeal(meal)
      setRevealPhase('ready')
      setMacroSettled(4)
      setKeepChat(false)
    } else if (progress.forming) {
      setMessages((current) =>
        appendAssistantMessage(current, {
          role: 'assistant',
          text: COMPOSER_APP_NOTE_ANALYZING_TEXT,
        }),
      )
    }
    if (progress.nutrients) setDetailTab('Нутриенты')
    const closeAt = authDraftDemoSheetCloseFromOpenAtMs(noteText, meal)
    if (origin >= closeAt) {
      onComplete?.()
      return
    }

    const at = (ms: number, fn: () => void) => {
      if (ms <= origin) return null
      return authDemoTimeout(fn, ms - origin)
    }
    const timers = [
      at(authDraftDemoFieldPressAtMs(), () => setFieldPressed(true)),
      at(authDraftDemoFieldPressAtMs() + AUTH_MEAL_DRAFT_DEMO.fieldPressMs, () => {
        setFieldPressed(false)
        setFieldFocused(true)
      }),
    ]

    photos.forEach((item, index) => {
      timers.push(
        at(authDraftDemoPlusPressAtMs(index), () => setPlusPressed(true)),
        at(
          authDraftDemoPlusPressAtMs(index) + AUTH_MEAL_DRAFT_DEMO.plusPressMs,
          () => setPlusPressed(false),
        ),
        at(authDraftDemoPhotoAtMs(index), () => {
          setAttaches((current) =>
            current.some((attach) => attach.id === item.id) ? current : [...current, item],
          )
          if (index !== lastPhotoIndex) return
          setMessages((current) =>
            appendAssistantMessage(current, {
              role: 'assistant',
              text: AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT,
              imageUrl: item.src,
            }),
          )
        }),
      )
    })

    timers.push(
      at(authDraftDemoNoteFieldPressAtMs() - 360, () => setFieldFocused(false)),
      at(authDraftDemoNoteFieldPressAtMs(), () => setFieldPressed(true)),
      at(authDraftDemoNoteFieldPressAtMs() + AUTH_MEAL_DRAFT_DEMO.noteFieldPressMs, () => {
        setFieldPressed(false)
        setFieldFocused(true)
      }),
    )

    const typeStart = authDraftDemoTypeStartAtMs()
    noteChars.forEach((_, index) => {
      timers.push(
        at(typeStart + (index + 1) * AUTH_MEAL_DRAFT_DEMO.typeStepMs, () => {
          setNote(noteChars.slice(0, index + 1).join(''))
        }),
      )
    })

    timers.push(
      at(authDraftDemoSendPressAtMs(noteText), () => setSendPressed(true)),
      at(authDraftDemoFormingAtMs(noteText), () => {
        setSendPressed(false)
        setFieldFocused(false)
        setNote('')
        setForming(true)
        setMessages((current) =>
          appendAssistantMessage(current, {
            role: 'assistant',
            text: COMPOSER_APP_NOTE_ANALYZING_TEXT,
          }),
        )
      }),
      at(authDraftDemoRevealAtMs(noteText), () => {
        setForming(false)
        setDisplayMeal(meal)
        setRevealPhase('settle')
        setMacroSettled(0)
      }),
      at(authDraftDemoReadyAtFromOpenMs(noteText, meal), () => {
        setRevealPhase('ready')
        setMacroSettled(4)
      }),
      at(authDraftDemoNutrientsPressFromOpenAtMs(noteText, meal), () => {
        setNutrientsPressed(true)
      }),
      at(authDraftDemoNutrientsShowFromOpenAtMs(noteText, meal), () => {
        setNutrientsPressed(false)
        setDetailTab('Нутриенты')
      }),
      at(authDraftDemoSheetCloseFromOpenAtMs(noteText, meal), () => onComplete?.()),
    )

    return () => {
      for (const id of timers) {
        if (id != null) authDemoClear(id)
      }
    }
    // startMs is the plaque landing offset on mount; do not restart when it ticks.
  }, [lastPhotoIndex, meal, noteChars, noteText, photos, play])

  React.useEffect(() => {
    if (!displayMeal || revealPhase !== 'settle') return
    const timers = [1, 2, 3, 4].map((count) =>
      authDemoTimeout(() => {
        setMacroSettled(count)
        if (count === 4) setRevealPhase('title')
      }, count * MEAL_REVEAL_MACRO_GAP_MS),
    )
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [displayMeal, revealPhase])

  React.useEffect(() => {
    if (mealCardRevealShowsChat(revealPhase)) return
    const id = authDemoTimeout(() => setKeepChat(false), MEAL_REVEAL_BODY_FADE_MS)
    return () => authDemoClear(id)
  }, [revealPhase])

  React.useEffect(() => {
    const viewport = chatRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    )
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages, showFormingSteps])

  const assistantMessages = messages
    .filter((message) => message.role === 'assistant')
    .filter((message) =>
      showFormingSteps ? !isComposerAnalyzingPlaceholder(message.text) : true,
    )
  const previewSlides = attaches.map((item) => item.src)
  const formedImages = displayMeal ? imagesForDiaryMeal(displayMeal, {}) : []
  const heroSlides = previewSlides.length > 0 ? previewSlides : formedImages
  const coverSrc = meal.image
  const heroDiffersFromCover =
    heroSlides.length > 1 || (heroSlides[0] != null && heroSlides[0] !== coverSrc)

  React.useEffect(() => {
    // Dissolve to the dish overview when the formed title starts typing.
    if (
      revealPhase === 'title' ||
      revealPhase === 'composition' ||
      revealPhase === 'ready'
    ) {
      setCoverReveal(true)
      return
    }
    if (!collapsing) {
      setCoverReveal(false)
      return
    }
    if (!heroDiffersFromCover) return
    const id = window.setTimeout(() => setCoverReveal(true), AUTH_MEAL_EXPAND_MS)
    return () => window.clearTimeout(id)
  }, [collapsing, heroDiffersFromCover, revealPhase])

  const fieldPressPoint =
    attaches.length > 0 ? { x: '1.15rem', y: '5.15rem' } : { x: '1.15rem', y: '1.4rem' }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-collapsing={collapsing ? '' : undefined}
      data-slot="meal-add-draft-idle"
    >
      <MealDialogHero
        macros={
          collapsing ? null : (
            <MealMacrosPlaque
              meal={displayMeal ?? EMPTY_MEAL_MACROS}
              rolling={(showFormingSteps && !hasMeal) || refineMacros.rolling}
              rollingKeys={
                revealPhase === 'settle'
                  ? mealRevealMacroRolling(macroSettled)
                  : refineMacros.rollingKeys
              }
            />
          )
        }
        origin={collapsing ? undefined : 'diary'}
        showClose={false}
        preview={
          <div
            className={cn(
              'relative w-full overflow-hidden bg-[var(--nora-inset)]',
              MEAL_DIALOG_COVER_CLASS,
              collapsing
                ? 'h-[168px] max-h-[168px] sm:!h-[168px] sm:!max-h-[168px] transition-[height,max-height] ease-[cubic-bezier(0.22,1,0.36,1)]'
                : AUTH_DEMO_MEAL_HERO_FRAME_CLASS,
            )}
            style={
              collapsing
                ? { transitionDuration: `${AUTH_MEAL_EXPAND_MS}ms` }
                : undefined
            }
          >
            <div
              className={cn(
                'absolute inset-0 transition-opacity ease-out',
                coverReveal ? 'opacity-0' : 'opacity-100',
              )}
              style={{ transitionDuration: `${AUTH_MEAL_COVER_FADE_MS}ms` }}
            >
              <MealAddHeroPreview slides={heroSlides} />
            </div>
            <div
              className={cn(
                'absolute inset-0 transition-opacity ease-out',
                coverReveal || (collapsing && !heroDiffersFromCover)
                  ? 'opacity-100'
                  : 'opacity-0',
              )}
              style={{ transitionDuration: `${AUTH_MEAL_COVER_FADE_MS}ms` }}
            >
              <MealFeedPhoto priority sizes="lg" src={coverSrc} />
            </div>
          </div>
        }
      />

      <div
        className={cn(
          'relative grid min-h-0 flex-1 transition-[opacity,flex-grow] ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{
          transitionDuration: collapsing ? '220ms' : '300ms',
        }}
      >
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
                  {formatMealStamp(openedAt)}
                </DialogDescription>
                <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
              </DialogHeader>

              <div className="min-h-0 flex-1" ref={chatRef}>
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2 px-3 pt-3 pb-3 sm:px-4">
                    {assistantMessages.map((message, index) => (
                      <ComposerChatBubble
                        key={`${index}-${message.text.slice(0, 24)}`}
                        live={!showFormingSteps && index === assistantMessages.length - 1}
                        message={message}
                      />
                    ))}
                    {showFormingSteps ? (
                      <MealFormingStepList photoCount={Math.max(attaches.length, 1)} />
                    ) : null}
                  </div>
                </ScrollArea>
              </div>

              <div className={productSheetTabDockClass}>
                <ProductSheetTabFade />
                <ComposerPressSurface
                  className={MEAL_COMPOSER_FIELD_CLASS}
                  focused={fieldFocused}
                  pressPoint={fieldPressPoint}
                  pressed={fieldPressed}
                >
                  <ComposerAttachChips
                    items={attaches}
                    onRemove={() => undefined}
                  />
                  <div className="relative min-h-[20px] w-full">
                    <div
                      aria-hidden
                      className="field-sizing-content max-h-40 min-h-[20px] w-full overflow-y-auto font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)] no-scrollbar"
                      data-meal-composer=""
                    >
                      {note ? (
                        <span className="whitespace-pre-wrap">
                          {note}
                          {fieldFocused ? (
                            <span className="auth-demo-composer-caret" data-auth-demo-caret="" />
                          ) : null}
                        </span>
                      ) : (
                        <span className="font-light font-[300] text-[var(--nora-input-placeholder)]">
                          Описание или фото приёма…
                        </span>
                      )}
                    </div>
                    <textarea
                      aria-label="Описание приёма"
                      className="sr-only"
                      readOnly
                      rows={1}
                      value={note}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <MealAttachMenu
                      disabled
                      onAttached={() => undefined}
                      pressed={plusPressed}
                    />
                    <div className="flex-1" />
                    <button
                      aria-label="Голосовой ввод"
                      className="ios-glass-glare inline-flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full border-0 bg-[var(--nora-input-bg)]/72 text-[var(--nora-text)] opacity-60 outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)]"
                      disabled
                      type="button"
                    >
                      <MicIcon className="size-[18px]" strokeWidth={1.75} />
                    </button>
                    <MealComposerSendButton
                      disabled
                      onClick={() => undefined}
                      pressed={sendPressed}
                      tone={sendTone}
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
              demoPressedTab={nutrientsPressed ? 'Нутриенты' : null}
              hideClose
              meal={displayMeal}
              onCompositionTyped={() => setRevealPhase('ready')}
              onMacrosRevealChange={setRefineMacros}
              onTitleTyped={() => setRevealPhase('composition')}
              readOnly
              reveal={
                revealPhase === 'title' || revealPhase === 'composition' || revealPhase === 'ready'
                  ? revealPhase
                  : 'off'
              }
              tab={detailTab}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
