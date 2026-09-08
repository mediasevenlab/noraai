import * as React from 'react'
import {
  CameraIcon,
  CoffeeIcon,
  CookieIcon,
  DropletIcon,
  FileTextIcon,
  FlameIcon,
  MoonIcon,
  UtensilsIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'

import { NoraInput, NoraSelect, NoraTextarea } from '@/components/nora/primitives'
import { ProductSheetTabFade, productSheetTabDockClass, productSheetTabTriggerClass } from '@/components/nora/product-sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authDemoClear, authDemoIsSeeking, authDemoTimeout } from '@/features/diary'
import { cn } from '@/lib/utils'
import { useLatest } from '@/lib/use-latest'

import {
  AUTH_MENTOR_CREATE_DEMO,
  AUTH_MENTOR_CREATE_MEALS,
  AUTH_MENTOR_CREATE_SCRIPT,
  authMentorCreateAddMealAtMs,
  authMentorCreateAddMealPressAtMs,
  authMentorCreateCloseAtMs,
  authMentorCreateDescDoneAtMs,
  authMentorCreateDescStartAtMs,
  authMentorCreateIngredientDoneAtMs,
  authMentorCreateIngredientStartAtMs,
  authMentorCreateMacrosAtMs,
  authMentorCreateMealTabAtMs,
  authMentorCreateMealTabPressAtMs,
  authMentorCreateMealTitleDoneAtMs,
  authMentorCreateMealTitleStartAtMs,
  authMentorCreateOpenAtMs,
  authMentorCreatePressAtMs,
  authMentorCreateProgress,
  authMentorCreateSavePressAtMs,
  authMentorCreateSavedAtMs,
  authMentorCreateStepDoneAtMs,
  authMentorCreateStepStartAtMs,
  authMentorCreateTitleDoneAtMs,
  authMentorCreateTitleStartAtMs,
  type AuthMentorCreateCaptionId,
  type AuthMentorCreateMealProgress,
  type AuthMentorCreateProgress,
} from './auth-mentor-ration-demo'
import { draftRationTotals } from './authored-rations'
import type { RationGoal, RationMealSlot } from './rations-catalog'

const FIELD_TYPE_CLASS = cn(
  'font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5',
  'text-[var(--nora-text)] placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)]',
)
const FIELD_CHIP_CLASS = 'rounded-[14px] !bg-[var(--nora-inset)]'
const TITLE_FIELD_CLASS = cn(
  FIELD_TYPE_CLASS,
  '!bg-[var(--nora-inset)] w-full px-3 !py-0 !h-8 !min-h-8 !max-h-8 !rounded-[10px]',
)
const GOAL_FIELD_CLASS = cn(
  FIELD_TYPE_CLASS,
  FIELD_CHIP_CLASS,
  'w-full px-3 !py-0 !h-8 !min-h-8 !max-h-8',
  'data-[size=default]:!h-8 data-[size=default]:!min-h-8 data-[size=default]:!max-h-8',
)
const FIELD_LABEL_CLASS =
  'font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'
const SECTION_HEADING_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const ADD_MEAL_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center rounded-full border-0 px-3 py-0',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none tracking-normal',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
)
const COMPOSER_ACTION_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center rounded-full border-0 px-3 py-0',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none backdrop-blur-[16px]',
  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
)
const SLOT_ROW_CLASS = cn(
  'ios-glass-glare-soft flex min-h-12 items-center gap-2 rounded-[14px] px-2 py-2',
  'bg-[var(--nora-inset)]',
)
const MEAL_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel)]',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none text-[var(--nora-text-secondary)]',
)
const GOAL_ITEMS = [{ value: 'Похудение', label: 'Похудение' }]
const SLOT_ITEMS = [
  { value: 'Завтрак', label: 'Завтрак' },
  { value: 'Обед', label: 'Обед' },
  { value: 'Ужин', label: 'Ужин' },
]
const SLOT_ICONS = {
  Завтрак: CoffeeIcon,
  Обед: UtensilsIcon,
  Перекус: CookieIcon,
  Ужин: MoonIcon,
} as const
const MACRO_FIELDS = [
  { key: 'kcal', label: 'ккал', icon: ZapIcon },
  { key: 'protein', label: 'Б', icon: FlameIcon },
  { key: 'fat', label: 'Ж', icon: DropletIcon },
  { key: 'carbs', label: 'У', icon: CookieIcon },
] as const

function emptyProgress(): AuthMentorCreateProgress {
  return authMentorCreateProgress(authMentorCreateOpenAtMs())
}

function typeBeats(text: string, startAt: number) {
  return Array.from(text).map((_, index) => startAt + (index + 1) * AUTH_MENTOR_CREATE_DEMO.typeStepMs)
}

function mealCountLabel(count: number) {
  if (count === 1) return '1 приём'
  if (count >= 2 && count <= 4) return `${count} приёма`
  return `${count} приёмов`
}

export function AuthMentorRationCreateSheet({
  collapsing = false,
  play,
  startMs = 0,
  onCaptionId,
  onComplete,
  onRevealCreated,
}: {
  collapsing?: boolean
  play: boolean
  startMs?: number
  onCaptionId?: (id: AuthMentorCreateCaptionId) => void
  onComplete?: () => void
  onRevealCreated?: () => void
}) {
  const [state, setState] = React.useState(emptyProgress)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)
  const onRevealCreatedRef = useLatest(onRevealCreated)

  React.useEffect(() => {
    onCaptionIdRef.current?.(state.caption)
  }, [onCaptionIdRef, state.caption])

  React.useEffect(() => {
    if (state.phase !== 'saved') return
    onRevealCreatedRef.current?.()
  }, [onRevealCreatedRef, state.phase])

  const followKey = [
    state.focus,
    state.tab,
    state.meals.length,
    state.title,
    state.description,
    ...state.meals.map(
      (meal) => `${meal.title}|${meal.ingredients.join(';')}|${meal.steps.join(';')}`,
    ),
  ].join(':')

  React.useEffect(() => {
    const root = scrollRef.current
    const node = root?.querySelector<HTMLElement>('[data-mentor-create-focus]')
    node?.scrollIntoView({
      block: state.focus === 'add-meal' || state.focus === 'save' ? 'end' : 'center',
      behavior: 'smooth',
    })
  }, [followKey, state.focus])

  React.useEffect(() => {
    if (!play) return
    const origin = Math.max(0, startMs)
    setState(authMentorCreateProgress(origin))

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setState(authMentorCreateProgress(authMentorCreateCloseAtMs()))
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const savedAt = authMentorCreateSavedAtMs()
    const closeAt = authMentorCreateCloseAtMs()
    if (origin >= savedAt) {
      onRevealCreatedRef.current?.()
      if (authDemoIsSeeking()) return
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 0)
      return () => authDemoClear(id)
    }

    const beats = [
      authMentorCreatePressAtMs(),
      authMentorCreateOpenAtMs(),
      authMentorCreateTitleStartAtMs(),
      authMentorCreateTitleDoneAtMs(),
      authMentorCreateDescStartAtMs(),
      authMentorCreateDescDoneAtMs(),
      authMentorCreateSavePressAtMs(),
      authMentorCreateSavedAtMs(),
      closeAt,
    ]
    const typed = [
      ...typeBeats(AUTH_MENTOR_CREATE_SCRIPT.title, authMentorCreateTitleStartAtMs()),
      ...typeBeats(AUTH_MENTOR_CREATE_SCRIPT.description, authMentorCreateDescStartAtMs()),
    ]
    AUTH_MENTOR_CREATE_MEALS.forEach((meal, index) => {
      beats.push(
        authMentorCreateMealTabPressAtMs(index),
        authMentorCreateMealTabAtMs(index),
        authMentorCreateMealTitleStartAtMs(index),
        authMentorCreateMealTitleDoneAtMs(index),
        authMentorCreateMacrosAtMs(index),
        authMentorCreateIngredientStartAtMs(index),
        authMentorCreateIngredientDoneAtMs(index),
        authMentorCreateStepStartAtMs(index),
        authMentorCreateStepDoneAtMs(index),
      )
      if (index < AUTH_MENTOR_CREATE_MEALS.length - 1) {
        beats.push(authMentorCreateAddMealPressAtMs(index), authMentorCreateAddMealAtMs(index))
      }
      typed.push(
        ...typeBeats(meal.title, authMentorCreateMealTitleStartAtMs(index)),
        ...meal.ingredients.flatMap((line, lineIndex) =>
          typeBeats(line, authMentorCreateIngredientStartAtMs(index, lineIndex)),
        ),
        ...meal.steps.flatMap((line, lineIndex) =>
          typeBeats(line, authMentorCreateStepStartAtMs(index, lineIndex)),
        ),
      )
    })
    const unique = [...new Set([...beats, ...typed, closeAt])].filter((ms) => ms > origin)
    const timers = unique.map((ms) =>
      authDemoTimeout(() => {
        setState(authMentorCreateProgress(ms))
        if (ms >= savedAt) {
          onRevealCreatedRef.current?.()
          onCompleteRef.current?.()
        }
      }, ms - origin),
    )
    return () => {
      for (const id of timers) authDemoClear(id)
    }
    // startMs is the landing offset on mount; do not restart when seek ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startMs
  }, [onCompleteRef, play])

  const previewTitle = state.title.trim() || 'Новый рацион'
  const namedMeals = state.meals.filter((meal) => meal.title.trim())
  const totals = draftRationTotals({
    id: null,
    title: state.title,
    description: state.description,
    goal: AUTH_MENTOR_CREATE_SCRIPT.goal,
    meals: namedMeals.map((meal, index) => ({
      key: `demo-meal-${index}`,
      slot: meal.slot,
      title: meal.title,
      ingredients: meal.ingredients.join(', '),
      stepsText: meal.steps.join('\n'),
      image: meal.image,
      ...meal.macros,
    })),
  })
  const tabValue = state.tab === 'description' ? 'description' : `meal-${state.tab}`

  if (state.phase !== 'editor') return null

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        collapsing ? 'bg-transparent' : 'bg-[var(--nora-modal)]',
      )}
      data-collapsing={collapsing ? '' : undefined}
      data-mentor-create-demo="editor"
    >
      <div
        className={cn(
          'flex shrink-0 items-start gap-2 px-3 pt-3 transition-opacity ease-out sm:px-4 sm:pt-3.5',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <p className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 text-[var(--nora-text)]">
          {previewTitle}
        </p>
        <button
          aria-label="Закрыть"
          className="inline-flex size-8 items-center justify-center rounded-full text-[var(--nora-text-secondary)]"
          type="button"
        >
          <XIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <Tabs
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
        value={tabValue}
      >
        <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="flex flex-col gap-4 px-3 pt-3 pb-8 sm:px-4">
            <TabsContent className="mt-0" data-ration-tab="description" value="description">
              <div className="flex flex-col gap-4">
                <section>
                  <p className="line-clamp-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                    {namedMeals.map((meal) => meal.title).join(', ') ||
                      state.description ||
                      'Названия приёмов появятся здесь'}
                  </p>
                  <p className="mt-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
                    {totals.kcal} ккал · Б {totals.protein} · Ж {totals.fat} · У {totals.carbs}
                    {` · ${mealCountLabel(namedMeals.length)}`}
                  </p>
                </section>
                <div className="grid grid-cols-[minmax(0,1fr)_10.5rem] items-start gap-3">
                  <label className="grid min-w-0 gap-1.5" data-mentor-create-focus={state.focus === 'title' ? '' : undefined}>
                    <span className={FIELD_LABEL_CLASS}>Название</span>
                    <NoraInput
                      className={TITLE_FIELD_CLASS}
                      onChange={() => undefined}
                      placeholder="Например, Лёгкий старт 1600"
                      readOnly
                      value={state.title}
                    />
                  </label>
                  <label className="grid min-w-0 gap-1.5">
                    <span className={FIELD_LABEL_CLASS}>Цель</span>
                    <NoraSelect
                      className={GOAL_FIELD_CLASS}
                      items={GOAL_ITEMS}
                      onValueChange={() => undefined}
                      value={AUTH_MENTOR_CREATE_SCRIPT.goal satisfies RationGoal}
                    />
                  </label>
                </div>
                <label className="grid gap-1.5" data-mentor-create-focus={state.focus === 'description' ? '' : undefined}>
                  <span className={FIELD_LABEL_CLASS}>Описание</span>
                  <NoraTextarea
                    className={cn(FIELD_TYPE_CLASS, FIELD_CHIP_CLASS, 'min-h-16 w-full px-3 py-2.5')}
                    onChange={() => undefined}
                    placeholder="Коротко, что в дне"
                    readOnly
                    value={state.description}
                  />
                </label>
                <div aria-hidden className="border-t border-[var(--nora-divider)]" />
                <MealsHeading
                  addPressed={state.addMealPressed && state.tab === 'description'}
                  savePressed={state.savePressed && state.tab === 'description'}
                />
                <div className="grid gap-2" data-meal-order-list="">
                  {state.meals.map((meal, index) => (
                    <div
                      className={SLOT_ROW_CLASS}
                      data-mentor-create-focus={
                        state.tab === 'description' &&
                        state.focus === 'add-meal' &&
                        index === state.meals.length - 1
                          ? ''
                          : undefined
                      }
                      key={`${meal.slot}-${index}`}
                    >
                      <span className={MEAL_INDEX_CLASS}>{index + 1}</span>
                      <NoraSelect
                        className={cn(TITLE_FIELD_CLASS, 'w-[8.5rem] !rounded-full')}
                        items={SLOT_ITEMS}
                        onValueChange={() => undefined}
                        value={meal.slot}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            {state.meals.map((meal, index) => (
              <TabsContent
                className="mt-0"
                data-ration-tab="meal"
                key={`${meal.slot}-${index}`}
                value={`meal-${index}`}
              >
                <MealDraftFields
                  addPressed={state.addMealPressed && state.tab === index}
                  focus={typeof state.tab === 'number' && state.tab === index ? state.focus : null}
                  index={index}
                  meal={meal}
                  savePressed={state.savePressed && state.tab === index}
                />
              </TabsContent>
            ))}
          </div>
        </div>
        <div className={productSheetTabDockClass}>
          <ProductSheetTabFade />
          <div className="min-w-0 overflow-x-auto overscroll-x-contain no-scrollbar">
            <TabsList className="h-8 gap-1.5 bg-transparent p-0">
              <TabsTrigger className={productSheetTabTriggerClass} value="description">
                <FileTextIcon className="size-[15px]" strokeWidth={1.75} />
                Описание
              </TabsTrigger>
              {state.meals.map((meal, index) => {
                const Icon = SLOT_ICONS[meal.slot]
                return (
                  <TabsTrigger
                    className={productSheetTabTriggerClass}
                    data-demo-pressed={
                      state.tabPressed && state.tab === index ? '' : undefined
                    }
                    key={`${meal.slot}-${index}`}
                    value={`meal-${index}`}
                  >
                    <Icon className="size-[15px]" strokeWidth={1.75} />
                    {meal.slot}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

function MealsHeading({
  addPressed,
  savePressed,
}: {
  addPressed: boolean
  savePressed: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={cn(SECTION_HEADING_CLASS, 'min-w-0 truncate')}>Приёмы дня</p>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <button
          className={ADD_MEAL_CLASS}
          data-demo-pressed={addPressed ? '' : undefined}
          data-mentor-create-focus={addPressed ? '' : undefined}
          type="button"
        >
          Приём
        </button>
        <button
          className={COMPOSER_ACTION_CLASS}
          data-demo-pressed={savePressed ? '' : undefined}
          data-mentor-create-focus={savePressed ? '' : undefined}
          type="button"
        >
          Добавить рацион
        </button>
      </div>
    </div>
  )
}

function MealDraftFields({
  addPressed,
  focus,
  index,
  meal,
  savePressed,
}: {
  addPressed: boolean
  focus: AuthMentorCreateProgress['focus']
  index: number
  meal: AuthMentorCreateMealProgress
  savePressed: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <MealsHeading addPressed={addPressed} savePressed={savePressed} />
      <div className={SLOT_ROW_CLASS}>
        <span className={MEAL_INDEX_CLASS}>{index + 1}</span>
        <NoraSelect
          className={cn(TITLE_FIELD_CLASS, 'w-[8.5rem] !rounded-full')}
          items={SLOT_ITEMS}
          onValueChange={() => undefined}
          value={meal.slot satisfies RationMealSlot}
        />
      </div>
      <div className="relative aspect-[4/3] min-h-28 w-full overflow-hidden rounded-[14px] bg-[var(--nora-inset)]">
        {meal.image ? (
          <img alt="" className="absolute inset-0 size-full object-cover" src={meal.image} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
            <CameraIcon className="size-4" />
            Фото
          </span>
        )}
      </div>
      <div data-mentor-create-focus={focus === 'meal-title' ? '' : undefined}>
        <NoraInput
          className={TITLE_FIELD_CLASS}
          onChange={() => undefined}
          placeholder="Название блюда"
          readOnly
          value={meal.title}
        />
      </div>
      <div
        className="grid grid-cols-4 gap-1.5"
        data-mentor-create-focus={focus === 'macros' ? '' : undefined}
      >
        {MACRO_FIELDS.map((field) => (
          <label className="grid gap-1" key={field.key}>
            <span className={cn(FIELD_LABEL_CLASS, 'inline-flex items-center gap-1')}>
              <field.icon className="size-[13px]" />
              {field.label}
            </span>
            <NoraInput
              className={TITLE_FIELD_CLASS}
              onChange={() => undefined}
              readOnly
              value={meal.macros[field.key]}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-2" data-draft-line-list="Ингредиенты">
        <p className={SECTION_HEADING_CLASS}>Ингредиенты</p>
        {(meal.ingredients.length > 0 ? meal.ingredients : ['']).map((item, lineIndex) => (
          <div
            className={SLOT_ROW_CLASS}
            data-mentor-create-focus={
              focus === 'ingredient' && lineIndex === Math.max(0, meal.ingredients.length - 1)
                ? ''
                : undefined
            }
            key={`ingredient-${lineIndex}`}
          >
            <span className={MEAL_INDEX_CLASS}>{lineIndex + 1}</span>
            <NoraInput
              className={cn(TITLE_FIELD_CLASS, 'min-w-0 flex-1 !rounded-full')}
              onChange={() => undefined}
              placeholder="2 яйца"
              readOnly
              value={item}
            />
          </div>
        ))}
      </div>
      <div className="grid gap-2" data-draft-line-list="Шаги">
        <p className={SECTION_HEADING_CLASS}>Шаги</p>
        {(meal.steps.length > 0 ? meal.steps : ['']).map((item, lineIndex) => (
          <div
            className={SLOT_ROW_CLASS}
            data-mentor-create-focus={
              focus === 'step' && lineIndex === Math.max(0, meal.steps.length - 1)
                ? ''
                : undefined
            }
            key={`step-${lineIndex}`}
          >
            <span className={MEAL_INDEX_CLASS}>{lineIndex + 1}</span>
            <NoraInput
              className={cn(TITLE_FIELD_CLASS, 'min-w-0 flex-1 !rounded-full')}
              onChange={() => undefined}
              placeholder="Взбейте яйца"
              readOnly
              value={item}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
