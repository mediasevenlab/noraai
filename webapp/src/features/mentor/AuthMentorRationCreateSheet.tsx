import * as React from 'react'
import {
  CalendarDaysIcon,
  CameraIcon,
  ChevronLeftIcon,
  CoffeeIcon,
  CookieIcon,
  DropletIcon,
  FlameIcon,
  GripVerticalIcon,
  ImagePlusIcon,
  MoonIcon,
  PlusIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
  ZapIcon,
} from '@/components/icons'

import { NoraInput, NoraSelect, NoraTextarea } from '@/components/nora/primitives'
import {
  ProductSheetTabFade,
  productSheetTabDockClass,
  productSheetTabTriggerDarkClass,
} from '@/components/nora/product-sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authDemoClear, authDemoIsSeeking, authDemoTimeout, PLAN_COVER_PLACEHOLDER_SRC } from '@/features/diary'
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

const FIELD_TYPE_CLASS = cn(
  'font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5',
  'text-[var(--nora-text)] placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)]',
)
const FIELD_CHIP_CLASS = 'rounded-[14px] !bg-[var(--nora-inset)]'
const TITLE_FIELD_CLASS = cn(
  FIELD_TYPE_CLASS,
  '!bg-[var(--nora-inset)] w-full px-3 !py-0 !h-8 !min-h-8 !max-h-8 !rounded-[10px]',
)
const FIELD_LABEL_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const SECTION_HEADING_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const SAVE_BUTTON_CLASS = cn(
  'nora-press-grow inline-flex h-10 min-h-10 max-h-10 w-full items-center justify-center rounded-[14px] border-0 px-4',
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-none',
  'bg-[var(--nora-tint)] text-[var(--nora-on-accent)]',
)
const LINE_INPUT_CLASS = cn(
  FIELD_TYPE_CLASS,
  '!bg-[var(--nora-panel)] !h-8 !min-h-8 !max-h-8 min-w-0 flex-1 !rounded-full !px-2.5',
)
const COVER_CLASS = cn(
  'relative aspect-[16/9] min-h-[7.5rem] w-full overflow-hidden rounded-[14px] bg-[var(--nora-inset)]',
)
const COVER_CHIP_CLASS = cn(
  'pointer-events-none absolute top-2 right-2 z-[1] inline-flex size-8 items-center justify-center rounded-full',
  'bg-[color-mix(in_srgb,var(--nora-text)_55%,transparent)] text-[var(--nora-panel)]',
)
const SLOT_ROW_CLASS = cn(
  'ios-glass-glare-soft flex min-h-12 items-center gap-2 rounded-[14px] px-2 py-2',
  'bg-[var(--nora-inset)]',
)
const MEAL_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel)]',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none text-[var(--nora-text-secondary)]',
)
const DAY_ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 w-full items-center gap-2 rounded-[14px] border-0 px-3.5 py-2.5 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]',
)
const DAY_GRIP_CLASS =
  'inline-flex h-8 w-4 shrink-0 items-center justify-center text-[var(--nora-text-secondary)]'
const DAY_ADD_ICON_CLASS =
  'flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-tint)] text-[var(--nora-on-accent)]'
const DAY_INDEX_EMPTY_CLASS = '!bg-[var(--nora-panel)] !text-[var(--nora-text-secondary)]'
const FOOTER_ROUND_CLASS =
  'nora-press-grow flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]'
const DEMO_PLAN_DAYS = [0, 1] as const
const HEADER_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-text)] text-[var(--nora-panel)]',
)
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
      if (index === 0) {
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
        typed.push(
          ...typeBeats(meal.title, authMentorCreateMealTitleStartAtMs(index)),
          ...meal.ingredients.flatMap((line, lineIndex) =>
            typeBeats(line, authMentorCreateIngredientStartAtMs(index, lineIndex)),
          ),
          ...meal.steps.flatMap((line, lineIndex) =>
            typeBeats(line, authMentorCreateStepStartAtMs(index, lineIndex)),
          ),
        )
      }
      if (index < AUTH_MENTOR_CREATE_MEALS.length - 1) {
        beats.push(authMentorCreateAddMealPressAtMs(index), authMentorCreateAddMealAtMs(index))
      }
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
  }, [onCompleteRef, play])

  const tabValue = state.tab === 'description' ? 'description' : `meal-${state.tab}`
  const insideDay = typeof state.tab === 'number'
  const dayMealIndex = typeof state.tab === 'number' ? state.tab : 0
  const dayMeal = state.meals[dayMealIndex]
  const titledMealCount = state.meals.filter((meal) => meal.title.trim()).length

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
          'shrink-0 px-2 pt-2 transition-opacity ease-out',
          collapsing && 'pointer-events-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--nora-inset)] p-2.5">
          {insideDay && dayMeal ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className={cn(HEADER_INDEX_CLASS, '!size-7 text-[12px] font-normal leading-none')}>1</span>
                <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 text-[var(--nora-text)]">
                  Приём {dayMealIndex + 1}
                </p>
              </div>
              <NoraSelect
                aria-label="Приём пищи"
                className="!h-8 !min-h-8 !max-h-8 w-[8.5rem] shrink-0 !rounded-full bg-[var(--nora-panel)] !px-2.5 text-[13px]"
                items={SLOT_ITEMS}
                onValueChange={() => undefined}
                value={dayMeal.slot}
              />
              <button
                aria-label="Удалить приём"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]"
                type="button"
              >
                <Trash2Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className={HEADER_INDEX_CLASS}>
                  <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
                </span>
                <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 text-[var(--nora-text)]">
                  Новый рацион
                </p>
              </div>
              <button
                aria-label="Закрыть"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]"
                type="button"
              >
                <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
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
                <div className={COVER_CLASS}>
                  <img
                    alt=""
                    className="absolute inset-0 size-full object-contain scale-[1.11]"
                    src={PLAN_COVER_PLACEHOLDER_SRC}
                  />
                  <span className={COVER_CHIP_CLASS}>
                    <ImagePlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
                  </span>
                </div>
                <label className="grid min-w-0 gap-1" data-mentor-create-focus={state.focus === 'title' ? '' : undefined}>
                  <span className={FIELD_LABEL_CLASS}>Название</span>
                  <NoraInput
                    className={TITLE_FIELD_CLASS}
                    onChange={() => undefined}
                    placeholder="Например, Офис без срывов"
                    readOnly
                    value={state.title}
                  />
                </label>
                <label className="grid gap-1" data-mentor-create-focus={state.focus === 'description' ? '' : undefined}>
                  <span className={FIELD_LABEL_CLASS}>Описание</span>
                  <NoraTextarea
                    className={cn(FIELD_TYPE_CLASS, FIELD_CHIP_CLASS, 'min-h-24 w-full px-3 py-2.5')}
                    onChange={() => undefined}
                    placeholder="Коротко, что в плане"
                    readOnly
                    value={state.description}
                  />
                </label>
                <div className="grid gap-2">
                  <p className={SECTION_HEADING_CLASS}>Добавленные дни</p>
                  {DEMO_PLAN_DAYS.map((day) => {
                    const count = day === 0 ? titledMealCount : 0
                    return (
                      <div
                        className={DAY_ROW_CLASS}
                        data-demo-pressed={
                          day === 0 && state.tabPressed && state.tab === 'description' ? '' : undefined
                        }
                        key={day}
                      >
                        <span className={DAY_GRIP_CLASS}>
                          <GripVerticalIcon aria-hidden className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className={cn(HEADER_INDEX_CLASS, count === 0 && DAY_INDEX_EMPTY_CLASS)}>
                          {day + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                          День {day + 1}
                        </span>
                        <span className={MEAL_INDEX_CLASS}>{count}</span>
                        <Trash2Icon aria-hidden className="size-4 shrink-0 text-[var(--nora-text-secondary)]" strokeWidth={1.75} />
                      </div>
                    )
                  })}
                  <div className={DAY_ROW_CLASS}>
                    <span className={cn(DAY_GRIP_CLASS, 'opacity-35')}>
                      <GripVerticalIcon aria-hidden className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className={DAY_ADD_ICON_CLASS}>
                      <PlusIcon aria-hidden className="size-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                      Добавить день
                    </span>
                  </div>
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
                  focus={typeof state.tab === 'number' && state.tab === index ? state.focus : null}
                  meal={meal}
                />
              </TabsContent>
            ))}
          </div>
        </div>
        <div className={cn(productSheetTabDockClass, 'pb-3')}>
          <ProductSheetTabFade />
          {insideDay ? (
            <>
              <div className="min-w-0 overflow-x-auto overscroll-x-contain no-scrollbar">
                <TabsList className="h-8 gap-1.5 bg-transparent p-0">
                  {state.meals.map((meal, index) => {
                    const Icon = SLOT_ICONS[meal.slot]
                    return (
                      <TabsTrigger
                        className={cn(
                          productSheetTabTriggerDarkClass,
                          index > 0 && 'auth-mentor-meal-tab-in',
                        )}
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
              <div aria-hidden className="mt-3 border-t border-[var(--nora-divider)]" />
              <div className="mt-3 flex items-center gap-1.5">
                <button aria-label="Назад" className={FOOTER_ROUND_CLASS} type="button">
                  <ChevronLeftIcon aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
                <button
                  className={cn(SAVE_BUTTON_CLASS, 'min-w-0 flex-1')}
                  data-demo-pressed={state.savePressed ? '' : undefined}
                  data-mentor-create-focus={state.focus === 'save' ? '' : undefined}
                  type="button"
                >
                  Создать рацион
                </button>
                <button
                  aria-label="Добавить приём"
                  className={FOOTER_ROUND_CLASS}
                  data-demo-pressed={state.addMealPressed ? '' : undefined}
                  type="button"
                >
                  <PlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </>
          ) : (
            <button
              className={SAVE_BUTTON_CLASS}
              data-demo-pressed={state.savePressed ? '' : undefined}
              data-mentor-create-focus={state.focus === 'save' ? '' : undefined}
              type="button"
            >
              Создать рацион
            </button>
          )}
        </div>
      </Tabs>
    </div>
  )
}

function DraftLine({
  focused,
  index,
  placeholder,
  value,
}: {
  focused: boolean
  index: number
  placeholder: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(SLOT_ROW_CLASS, 'min-w-0 flex-1')}
        data-mentor-create-focus={focused ? '' : undefined}
      >
        <span className={MEAL_INDEX_CLASS}>{index + 1}</span>
        <NoraInput
          className={LINE_INPUT_CLASS}
          onChange={() => undefined}
          placeholder={placeholder}
          readOnly
          value={value}
        />
        <span className="ml-auto inline-flex size-8 items-center justify-center text-[var(--nora-text-secondary)]">
          <Trash2Icon className="size-4" />
        </span>
      </div>
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]">
        <PlusIcon className="size-4" strokeWidth={1.75} />
      </span>
    </div>
  )
}

function MealDraftFields({
  focus,
  meal,
}: {
  focus: AuthMentorCreateProgress['focus']
  meal: AuthMentorCreateMealProgress
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className={COVER_CLASS}>
        {meal.image ? (
          <img alt="" className="absolute inset-0 size-full object-cover" src={meal.image} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
            <CameraIcon className="size-4" />
            Фото
          </span>
        )}
        <span className={COVER_CHIP_CLASS}>
          <ImagePlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="grid gap-1.5" data-mentor-create-focus={focus === 'meal-title' ? '' : undefined}>
        <p className={FIELD_LABEL_CLASS}>Название</p>
        <div className={SLOT_ROW_CLASS}>
          <NoraInput
            className={LINE_INPUT_CLASS}
            onChange={() => undefined}
            placeholder="Название блюда"
            readOnly
            value={meal.title}
          />
        </div>
      </div>
      <div className="grid gap-1.5" data-mentor-create-focus={focus === 'macros' ? '' : undefined}>
        <p className={FIELD_LABEL_CLASS}>Ценность</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MACRO_FIELDS.map((field) => (
            <label className={cn('grid gap-1', FIELD_CHIP_CLASS, 'px-2 py-2')} key={field.key}>
              <span className="inline-flex items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                <field.icon className="size-[13px] shrink-0" strokeWidth={1.75} />
                {field.label}
              </span>
              <NoraInput
                className={cn(FIELD_TYPE_CLASS, '!h-8 !rounded-[10px] bg-[var(--nora-panel)] px-1 text-center tabular-nums')}
                onChange={() => undefined}
                readOnly
                value={meal.macros[field.key]}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2" data-draft-line-list="Ингредиенты">
          <p className={SECTION_HEADING_CLASS}>Ингредиенты</p>
          {(meal.ingredients.length > 0 ? meal.ingredients : ['']).map((item, lineIndex) => (
            <DraftLine
              focused={focus === 'ingredient' && lineIndex === Math.max(0, meal.ingredients.length - 1)}
              index={lineIndex}
              key={`ingredient-${lineIndex}`}
              placeholder="2 яйца"
              value={item}
            />
          ))}
        </div>
        <div className="grid gap-2" data-draft-line-list="Шаги">
          <p className={SECTION_HEADING_CLASS}>Шаги</p>
          {(meal.steps.length > 0 ? meal.steps : ['']).map((item, lineIndex) => (
            <DraftLine
              focused={focus === 'step' && lineIndex === Math.max(0, meal.steps.length - 1)}
              index={lineIndex}
              key={`step-${lineIndex}`}
              placeholder="Взбейте яйца"
              value={item}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
