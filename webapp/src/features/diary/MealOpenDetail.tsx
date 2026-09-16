import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  HistoryIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { NoraSelect } from '@/components/nora/primitives'
import { ProductSheetTabFade, productSheetTabDockClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'
import { useLatest } from '@/lib/use-latest'

import {
  createMentorUserMeal,
  createMyMeal,
  refineMentorUserMeal,
  refineMyMeal,
  selectMentorUserMealVersion,
  selectMyMealVersion,
} from './api'
import { ComposerPressSurface } from './ComposerPressSurface'
import { useAuthDemoSeeking } from './auth-demo-playback'
import { ComposerTypedText } from './composer-typed-text'
import { formatMealStamp, isApiMealId } from './diary-feed'
import { MealFormingStepList } from './composer-ui'
import { RationPlanDoneButton, MealAuthorByline } from './MealCard'
import {
  advanceMealRevealCursor,
  MEAL_REVEAL_HEADING_MS,
  MEAL_REVEAL_MACRO_GAP_MS,
  mealCardRevealHidesComposition,
  mealCardRevealLocksTabs,
  mealRevealAssumptionVisibility,
  mealRevealMacroRolling,
  mealRevealPortionVisibility,
  mealRevealShowsAssumptionHeading,
  startMealRevealCursor,
  type MealMacrosRevealState,
  type MealRevealCursor,
} from './meal-card-reveal'
import { mealRefiningSteps } from './meal-forming-steps'
import { MealAttachMenu } from './meal-attach-menu'
import { isPlannedDiaryMeal, isRationPlanDone } from './ration-import'
import { mealImageFromUrl, type MealImageMime } from './meal-image-pick'
import { MealVoiceControls } from './MealVoiceControls'
import { appendVoiceTranscript } from './voice-input'
import {
  assumptionsForMeal,
  clientCommentForMeal,
  displayMealComment,
  formatMicronutrientLine,
  formatPortionItemMacros,
  micronutrientsForMeal,
  partitionMealMicronutrients,
  portionItemHasMacros,
  portionItemsForMeal,
  type MealEntry,
  type MealMicronutrient,
} from './meals-catalog'
import { mealsQueryKeys } from './queries'
import {
  MEAL_ATTACH_REMOVE_CLASS,
  MEAL_COMPOSER_FIELD_CLASS,
  MEAL_MODAL_CHIP_CLASS,
  MEAL_TAB_EASE,
  MealComposerSendButton,
  MealDetailHeading,
  MealDetailTabRow,
  MealTabViewport,
  mealComposerSendTone,
  type MealDetailTab,
} from './meal-sheet'

const COMPACT_SELECT_CONTENT_CLASS = productToolbarSelectContentClass
const COMPACT_SELECT_ITEM_CLASS = productToolbarSelectItemClass

function MealRevealAdvance({ onDone }: { onDone: () => void }) {
  React.useEffect(() => {
    const id = window.setTimeout(onDone, 0)
    return () => window.clearTimeout(id)
  }, [onDone])
  return null
}

function MealRevealComposition({
  portions,
  assumptions,
  live,
  onComplete,
}: {
  portions: Array<{ label: string; macros?: string }>
  assumptions: string[]
  live: boolean
  onComplete?: () => void
}) {
  const spec = React.useMemo(
    () => ({
      portions: portions.map((item) => ({ hasMacros: Boolean(item.macros) })),
      assumptionCount: assumptions.length,
    }),
    [assumptions.length, portions],
  )
  const [cursor, setCursor] = React.useState<MealRevealCursor>(() =>
    live ? startMealRevealCursor() : { kind: 'done' },
  )
  const onCompleteRef = useLatest(onComplete)
  const seeking = useAuthDemoSeeking()
  const [liveFlag, setLiveFlag] = React.useState(live)
  if (live !== liveFlag) {
    setLiveFlag(live)
    setCursor(live ? startMealRevealCursor() : { kind: 'done' })
  }

  const advance = React.useCallback(() => {
    setCursor((current) => {
      const next = advanceMealRevealCursor(current, spec)
      if (next.kind === 'done' && current.kind !== 'done') {
        queueMicrotask(() => onCompleteRef.current?.())
      }
      return next
    })
  }, [onCompleteRef, spec])

  React.useEffect(() => {
    if (!live || cursor.kind !== 'heading') return
    const id = window.setTimeout(advance, seeking ? 0 : MEAL_REVEAL_HEADING_MS)
    return () => window.clearTimeout(id)
  }, [advance, cursor, live, seeking])

  return (
    <>
      <MealDetailHeading>Состав</MealDetailHeading>
      <ul className="mt-2 list-disc space-y-2.5 pl-5 font-[family-name:var(--nora-font)]">
        {portions.map((item, index) => {
          const visible = mealRevealPortionVisibility(cursor, index, Boolean(item.macros))
          if (!visible.show) return null
          return (
            <li key={item.label}>
              <span className="text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
                <ComposerTypedText
                  live={visible.labelLive}
                  onComplete={visible.labelLive ? advance : undefined}
                  pace="fast"
                  text={item.label}
                />
              </span>
              {visible.showMacros && item.macros ? (
                <span className="mt-0.5 block text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
                  {item.macros}
                  {visible.macrosLive ? <MealRevealAdvance onDone={advance} /> : null}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
      {assumptions.length > 0 && mealRevealShowsAssumptionHeading(cursor) ? (
        <div className="pt-4">
          <MealDetailHeading>Допущения</MealDetailHeading>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
            {assumptions.map((item, index) => {
              const visible = mealRevealAssumptionVisibility(cursor, index)
              if (!visible.show) return null
              return (
                <li key={item}>
                  <ComposerTypedText
                    live={visible.live}
                    onComplete={visible.live ? advance : undefined}
                    pace="fast"
                    text={item}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </>
  )
}

function MicronutrientGrid({ items }: { items: MealMicronutrient[] }) {
  if (items.length === 0) return null
  return (
    <ul className="grid list-disc grid-cols-2 gap-x-8 gap-y-2 pl-5 font-[family-name:var(--nora-font)]">
      {items.map((item) => (
        <li key={item.key} className="pr-2">
          <span className="text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
            {item.label}:
          </span>
          <span className="ml-1.5 text-[12px] font-light leading-5 tabular-nums text-[var(--nora-text-tertiary)]">
            {item.amount > 0 ? formatMicronutrientLine(item) : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function MicronutrientFold({
  title,
  items,
  defaultOpen = true,
}: {
  title: string
  items: MealMicronutrient[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 py-3 text-left outline-none"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
          {title}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            'size-3.5 shrink-0 text-[var(--nora-text-tertiary)] transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={1.75}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        style={{ transitionTimingFunction: MEAL_TAB_EASE }}
      >
        <div className="overflow-hidden">
          <div className="pb-3">
            <MicronutrientGrid items={items} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MealOpenDetail({
  meal,
  subjectUserId,
  completedIds,
  readOnly = false,
  feedView = false,
  hideClose = false,
  reveal: revealProp = 'off',
  tab: tabProp,
  demoPressedTab = null,
  demoPressedComplete = false,
  allowCompletePlan = false,
  previewOnly = false,
  onTitleTyped,
  onCompositionTyped,
  onMacrosRevealChange,
  onCompletePlan,
  onAddToDiary,
  addingToDiary = false,
  onDemoPromoted,
  onCommitVersionGallery,
  onToggleLike,
}: {
  meal: MealEntry
  subjectUserId?: string
  completedIds?: ReadonlySet<string>
  readOnly?: boolean
  feedView?: boolean
  hideClose?: boolean
  reveal?: 'off' | 'title' | 'composition' | 'ready'
  tab?: MealDetailTab
  demoPressedTab?: MealDetailTab | null
  demoPressedComplete?: boolean
  allowCompletePlan?: boolean
  previewOnly?: boolean
  onTitleTyped?: () => void
  onCompositionTyped?: () => void
  onMacrosRevealChange?: (state: MealMacrosRevealState) => void
  onCompletePlan?: () => void
  onAddToDiary?: () => void
  addingToDiary?: boolean
  onDemoPromoted?: (demoId: string, apiMealId: string) => void
  onCommitVersionGallery?: (input: {
    mealId: string
    fromVersionId: string
    toVersionId: string
    toIndex?: number
    extraSrc: string | null
  }) => void
  onToggleLike?: () => void
}) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const portionItems = portionItemsForMeal(meal)
  const comment = displayMealComment(clientCommentForMeal(meal))
  const micronutrients = micronutrientsForMeal(meal)
  const micronutrientGroups = partitionMealMicronutrients(micronutrients)
  const assumptions = assumptionsForMeal(meal)
  const [note, setNote] = React.useState('')
  const [attach, setAttach] = React.useState<{ base64: string; mime: MealImageMime; name: string } | null>(
    null,
  )
  const [busy, setBusy] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [refineReveal, setRefineReveal] = React.useState<'off' | 'waiting' | 'settle' | 'title' | 'composition'>('off')
  const [macroSettled, setMacroSettled] = React.useState(0)
  const [refineSteps, setRefineSteps] = React.useState<string[] | null>(null)
  const [frozenTitle, setFrozenTitle] = React.useState(meal.title)
  const onMacrosRevealChangeRef = useLatest(onMacrosRevealChange)
  const reveal = refineReveal !== 'off' ? refineReveal : revealProp
  if (reveal !== 'waiting' && reveal !== 'settle' && frozenTitle !== meal.title) {
    setFrozenTitle(meal.title)
  }
  const shownTitle = reveal === 'waiting' || reveal === 'settle' ? frozenTitle : meal.title
  const [detailTabUncontrolled, setDetailTabUncontrolled] = React.useState<MealDetailTab>('Состав')
  const detailTab = tabProp ?? detailTabUncontrolled
  const canRefine = !readOnly && !previewOnly && !mealCardRevealLocksTabs(reveal)
  const isPersisted = Boolean(meal.fromApi || isApiMealId(meal.id))
  const versionItems =
    meal.versions && meal.versions.length > 0
      ? meal.versions.map((version) => ({ value: version.id, label: version.label }))
      : [{ value: 'original', label: 'vers. 1.0' }]
  const activeVersion =
    meal.activeVersionId && versionItems.some((item) => item.value === meal.activeVersionId)
      ? meal.activeVersionId
      : versionItems[0]!.value
  const refineLimitReached = Boolean(meal.versions && meal.versions.length >= 6)
  const sendTone = mealComposerSendTone({
    sending: sending || busy,
    hasDraft:
      canRefine
      && !refineLimitReached
      && (note.trim().length > 0 || Boolean(attach)),
  })

  const [resetMealId, setResetMealId] = React.useState(meal.id)
  if (meal.id !== resetMealId && refineReveal === 'off' && !sending) {
    setResetMealId(meal.id)
    setNote('')
    setAttach(null)
    setBusy(false)
    setDetailTabUncontrolled('Состав')
    setFrozenTitle(meal.title)
  }

  React.useEffect(() => {
    if (reveal === 'waiting') {
      onMacrosRevealChangeRef.current?.({ rolling: true })
      return
    }
    if (reveal === 'settle') {
      onMacrosRevealChangeRef.current?.({
        rolling: false,
        rollingKeys: mealRevealMacroRolling(macroSettled),
      })
      return
    }
    onMacrosRevealChangeRef.current?.({ rolling: false })
  }, [macroSettled, onMacrosRevealChangeRef, reveal])

  React.useEffect(() => {
    if (refineReveal !== 'settle') return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const id = window.setTimeout(() => {
        setRefineReveal('off')
        setRefineSteps(null)
      }, 0)
      return () => window.clearTimeout(id)
    }
    const resetId = window.setTimeout(() => setMacroSettled(0), 0)
    const timers = [1, 2, 3, 4].map((count) =>
      window.setTimeout(() => {
        setMacroSettled(count)
        if (count === 4) setRefineReveal('title')
      }, count * MEAL_REVEAL_MACRO_GAP_MS),
    )
    return () => {
      window.clearTimeout(resetId)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [refineReveal])

  async function ensurePersistedMealId(): Promise<string> {
    if (!subjectUserId || !auth.user) {
      throw new Error('Нет пользователя для сохранения приёма')
    }
    if (isPersisted) return meal.id
    const image = await mealImageFromUrl(meal.image)
    const body = {
      title: meal.title,
      ingredients: meal.ingredients,
      category: meal.category,
      meal: meal.meal,
      recordedAt: meal.at,
      kcal: meal.kcal,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      portionItems: portionItemsForMeal(meal),
      clientComment: clientCommentForMeal(meal),
      assumptions: assumptionsForMeal(meal),
      micronutrients: micronutrientsForMeal(meal),
      source: 'manual' as const,
      clientKey: `demo-${meal.id}`.slice(0, 64),
      imageBase64: image?.base64,
      imageMime: image?.mime,
    }
    const isOwn = auth.user.id === subjectUserId
    const result = isOwn
      ? await createMyMeal(auth.transport, body)
      : await createMentorUserMeal(auth.transport, subjectUserId, body)
    onDemoPromoted?.(meal.id, result.meal.id)
    return result.meal.id
  }

  async function sendClarification() {
    const text = note.trim()
    if (!text && !attach) {
      toast.message('Добавьте уточнение или фото состава')
      return
    }
    if (!canRefine) return
    if (refineLimitReached) {
      toast.message('Достигнут лимит уточнений (5)')
      return
    }
    if (!subjectUserId || !auth.user) return

    setBusy(true)
    setSending(true)
    setFrozenTitle(meal.title)
    setRefineSteps(mealRefiningSteps(Boolean(attach)))
    setDetailTabUncontrolled('Состав')
    setRefineReveal('waiting')
    setMacroSettled(0)
    try {
      const mealId = await ensurePersistedMealId()
      const body = {
        message: text,
        imageBase64: attach?.base64,
        imageMime: attach?.mime,
      }
      const isOwn = auth.user.id === subjectUserId
      const result = isOwn
        ? await refineMyMeal(auth.transport, mealId, body)
        : await refineMentorUserMeal(auth.transport, subjectUserId, mealId, body)
      queryClient.setQueryData<{ items: Array<(typeof result)['meal']> }>(
        mealsQueryKeys.forSubject(subjectUserId),
        (previous) => {
          const items = previous?.items ?? []
          const nextItems = items.some((item) => item.id === result.meal.id)
            ? items.map((item) => (item.id === result.meal.id ? result.meal : item))
            : [result.meal, ...items]
          return { items: nextItems }
        },
      )
      onCommitVersionGallery?.({
        mealId: result.meal.id,
        fromVersionId: activeVersion,
        toVersionId: result.meal.activeVersionId || result.meal.versions.at(-1)?.id || '',
        toIndex: Math.max(0, result.meal.versions.length - 1),
        extraSrc: attach ? `data:${attach.mime};base64,${attach.base64}` : null,
      })
      setNote('')
      setAttach(null)
      toast.success('Карточка обновлена')
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        setRefineReveal('off')
        setRefineSteps(null)
      } else {
        setRefineReveal('settle')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось уточнить приём')
      setRefineReveal('off')
      setRefineSteps(null)
    } finally {
      setSending(false)
      setBusy(false)
    }
  }

  async function onSelectVersion(versionId: string) {
    if (!canRefine || !isPersisted || !subjectUserId || !auth.user || versionId === activeVersion) {
      return
    }
    setBusy(true)
    try {
      const isOwn = auth.user.id === subjectUserId
      const result = isOwn
        ? await selectMyMealVersion(auth.transport, meal.id, { versionId })
        : await selectMentorUserMealVersion(auth.transport, subjectUserId, meal.id, { versionId })
      queryClient.setQueryData<{ items: Array<(typeof result)['meal']> }>(
        mealsQueryKeys.forSubject(subjectUserId),
        (previous) => {
          const items = previous?.items ?? []
          const nextItems = items.some((item) => item.id === result.meal.id)
            ? items.map((item) =>
                item.id === result.meal.id
                  ? { ...result.meal, imageUrl: item.imageUrl || result.meal.imageUrl }
                  : item,
              )
            : [result.meal, ...items]
          return { items: nextItems }
        },
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось переключить версию')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      aria-busy={sending || mealCardRevealLocksTabs(reveal)}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <DialogHeader className="min-w-0 shrink-0 gap-2 bg-[var(--nora-modal)] px-3 pt-3 text-left sm:px-4 sm:pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
        <DialogTitle className="truncate font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
          {reveal === 'title' ? (
            <ComposerTypedText
              live
              onComplete={() => {
                if (refineReveal === 'title') setRefineReveal('composition')
                else onTitleTyped?.()
              }}
              text={meal.title}
            />
          ) : (
            shownTitle
          )}
        </DialogTitle>
        {feedView ? (
          <>
            <DialogDescription className="sr-only">
              {`${meal.authorName ?? 'Пользователь'} · ${formatMealStamp(meal.at)}`}
            </DialogDescription>
            <div className="mt-1">
              <MealAuthorByline
                at={meal.at}
                likeCount={meal.likeCount}
                liked={meal.liked}
                name={meal.authorName ?? 'Пользователь'}
                onToggleLike={onToggleLike}
              />
            </div>
          </>
        ) : (
          <DialogDescription className="mt-0.5 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
            {meal.authorName
              ? `${meal.authorName} · ${formatMealStamp(meal.at)}`
              : formatMealStamp(meal.at)}
          </DialogDescription>
        )}
          </div>
          {feedView && onAddToDiary ? (
            <button
              aria-label="В дневник"
              className={cn(
                'nora-press-grow ios-glass-glare inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center gap-1 rounded-full border-0 py-0 pl-2.5 pr-3',
                'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tracking-normal',
                'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)] backdrop-blur-[16px] outline-none',
                'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:opacity-50',
              )}
              disabled={addingToDiary}
              onClick={(event) => {
                event.stopPropagation()
                onAddToDiary()
              }}
              type="button"
            >
              {addingToDiary ? (
                <Loader2Icon aria-hidden className="size-[15px] shrink-0 animate-spin" strokeWidth={1.75} />
              ) : (
                <PlusIcon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
              )}
              В дневник
            </button>
          ) : !previewOnly && isPlannedDiaryMeal(meal) && onCompletePlan && (!readOnly || allowCompletePlan) ? (
            <RationPlanDoneButton
              done={isRationPlanDone(meal, completedIds)}
              onToggle={onCompletePlan}
              pressed={demoPressedComplete}
            />
          ) : null}
        </div>
        <div
          aria-hidden
          className="mt-2.5 border-t border-[var(--nora-divider)]"
        />
      </DialogHeader>

      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
        onValueChange={(value) => {
          if (mealCardRevealLocksTabs(reveal) || tabProp != null) return
          setDetailTabUncontrolled(value as MealDetailTab)
        }}
        value={detailTab}
      >
        <MealTabViewport>
          <>
              <TabsContent className="pt-1 pb-3 text-[13px] font-normal" value="Состав">
                {reveal === 'waiting' || reveal === 'settle' ? (
                  <MealFormingStepList steps={refineSteps ?? mealRefiningSteps(false)} />
                ) : mealCardRevealHidesComposition(reveal) ? null : reveal === 'off' ? (
                  <>
                    <MealDetailHeading>Состав</MealDetailHeading>
                    <ul className="mt-2 list-disc space-y-2.5 pl-5 font-[family-name:var(--nora-font)]">
                      {portionItems.map((item) => (
                        <li key={item.label}>
                          <span className="text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
                            {item.label}
                          </span>
                          {portionItemHasMacros(item) ? (
                            <span className="mt-0.5 block text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
                              {formatPortionItemMacros(item)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {assumptions.length > 0 && !feedView ? (
                      <div className="pt-4">
                        <MealDetailHeading>Допущения</MealDetailHeading>
                        <ul className="mt-2 list-disc space-y-1 pl-5 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
                          {assumptions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <MealRevealComposition
                    assumptions={assumptions}
                    live={reveal === 'composition'}
                    onComplete={() => {
                      if (refineReveal === 'composition') {
                        setRefineReveal('off')
                        setRefineSteps(null)
                      } else {
                        onCompositionTyped?.()
                      }
                    }}
                    portions={portionItems.map((item) => ({
                      label: item.label,
                      macros: portionItemHasMacros(item) ? formatPortionItemMacros(item) : undefined,
                    }))}
                  />
                )}
              </TabsContent>
              <TabsContent className="text-[13px] font-normal" value="Нутриенты">
                {micronutrients.length > 0 ? (
                  <div className="-mt-3">
                    <MicronutrientFold
                      items={micronutrientGroups.primary}
                      title="Основные"
                    />
                    <div className="border-t border-[var(--nora-divider)]" />
                    <MicronutrientFold
                      items={micronutrientGroups.additional}
                      title="Дополнительные"
                    />
                  </div>
                ) : (
                  <p className="mt-2 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
                    Нет оценки по этому приёму.
                  </p>
                )}
              </TabsContent>
              <TabsContent className="pb-3 text-[13px] font-normal" value="Комментарий">
                <MealDetailHeading>Комментарий</MealDetailHeading>
                <p className="mt-2 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
                  {comment}
                </p>
              </TabsContent>
            </>
        </MealTabViewport>

        <div className={productSheetTabDockClass}>
          <ProductSheetTabFade />
          <MealDetailTabRow
            enter={reveal !== 'off'}
            hideClose={hideClose}
            locked={mealCardRevealLocksTabs(reveal)}
            pressedTab={demoPressedTab}
          />
          {feedView || previewOnly ? null : (
          <ComposerPressSurface className={MEAL_COMPOSER_FIELD_CLASS}>
          {attach ? (
            <div className="relative mb-3 size-12">
              <img
                alt={attach.name}
                className="size-12 rounded-[10px] object-cover"
                src={`data:${attach.mime};base64,${attach.base64}`}
              />
              <button
                aria-label="Удалить фото"
                className={MEAL_ATTACH_REMOVE_CLASS}
                disabled={busy}
                onClick={() => setAttach(null)}
                type="button"
              >
                <XIcon className="size-3" strokeWidth={1.75} />
              </button>
            </div>
          ) : null}
          <textarea
            aria-label="Уточнение состава"
            className="field-sizing-content max-h-40 min-h-[20px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)] outline-none placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)] no-scrollbar"
            data-meal-composer=""
            disabled={busy || !canRefine || refineLimitReached}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              refineLimitReached
                ? 'Лимит уточнений исчерпан'
                : 'Уточнение или фото состава…'
            }
            rows={1}
            value={note}
          />
          <div className="flex items-center gap-2 pt-4">
            <MealAttachMenu
              disabled={!canRefine || busy || refineLimitReached}
              onAttached={(parsed) =>
                setAttach({
                  base64: parsed.base64,
                  mime: parsed.mime,
                  name: parsed.name,
                })
              }
            />
            <NoraSelect
              className={cn(
                MEAL_MODAL_CHIP_CLASS,
                'h-8 min-h-8 max-h-8 w-fit max-w-none shrink-0 justify-start gap-1.5 rounded-full py-0 pr-3 pl-2.5 text-[13px] font-normal leading-none text-[var(--nora-text)] hover:bg-[var(--nora-input-bg)] data-[size=default]:h-8 data-[size=default]:min-h-8 data-[size=default]:max-h-8 data-[popup-open]:border-0 data-[popup-open]:shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)] focus-visible:border-0 focus-visible:shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)] *:data-[slot=select-value]:flex-none',
              )}
              contentClassName={COMPACT_SELECT_CONTENT_CLASS}
              itemClassName={COMPACT_SELECT_ITEM_CLASS}
              itemIndicator="end"
              disabled={!canRefine || busy || versionItems.length < 2}
              hideChevron
              items={versionItems}
              leadingIcon={<HistoryIcon strokeWidth={1.75} />}
              onValueChange={(value) => {
                if (value) void onSelectVersion(value)
              }}
              value={activeVersion}
            />
            <div className="flex-1" />
            <MealVoiceControls
              disabled={!canRefine || busy || refineLimitReached}
              onTranscript={(text) => setNote((current) => appendVoiceTranscript(current, text))}
              sendButton={
                <MealComposerSendButton
                  idleLabel="Отправить уточнение"
                  onClick={() => void sendClarification()}
                  sendingLabel="Уточнение обрабатывается"
                  tone={sendTone}
                />
              }
              transport={auth.transport}
            />
          </div>
          </ComposerPressSurface>
          )}
      </div>
      </Tabs>
    </div>
  )
}

