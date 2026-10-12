import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDaysIcon,
  CameraIcon,
  ChevronDownIcon,
  ImagePlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CoffeeIcon,
  CookieIcon,
  DropletIcon,
  FileTextIcon,
  FlameIcon,
  GripVerticalIcon,
  MoonIcon,
  PlusIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
  ZapIcon,
} from '@/components/icons'
import { toast } from '@/components/ui/toast'

import { NoraHoverTip, NoraInput, NoraSelect, NoraTextarea } from '@/components/nora/primitives'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteCardDialog } from '@/features/diary/DeleteCardDialog'
import {
  applyMealPhotoFallback,
  displayMealCover,
  displayMediaSrc,
  durablePlanCoverSrc,
  fileToMealImage,
  isCoverPlaceholder,
  mealPhotoOriginalSrc,
  MEAL_COVER_STUB_SRC,
  PLAN_COVER_PLACEHOLDER_SRC,
  usableMealCover,
} from '@/features/diary'
import {
  ProductSheetTabFade,
  productSheetEditorFrameClass,
  productSheetOverlayChipClass,
  productSheetTabDockClass,
  productSheetTabTriggerDarkClass,
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

import {
  addDraftLine,
  addPlanDraftDay,
  draftLineItems,
  draftRationTotals,
  emptyMealDraft,
  emptyPlanDayMeals,
  emptyRationDraft,
  titledDraftMeals,
  finalizePlanDaysDraft,
  finalizeRationDraft,
  joinDraftLines,
  macroDraftInput,
  nextUnusedMealSlot,
  PLAN_DRAFT_MAX_DAYS,
  previewRationFromDraft,
  seedPlanEditorDays,
  removeDraftLine,
  removePlanDraftDay,
  setDraftLine,
  reorderMealDrafts,
  reorderPlanDraftDays,
  type RationDraft,
  type RationMealDraft,
  RATION_GOALS,
  RATION_MEAL_SLOTS,
} from './authored-rations'
import type { RationEntry, RationGoal, RationMealSlot } from './rations-catalog'

const EDITOR_FRAME_CLASS = productSheetEditorFrameClass

const EDITOR_COPY = {
  ration: {
    untitled: 'Новый рацион',
    editing: 'Редактор рациона',
    saveNew: 'Добавить рацион',
    addMeal: 'Добавить приём',
    overviewTab: 'Описание',
    descriptionLabel: 'Описание',
    titlePlaceholder: 'Например, Лёгкий старт 1600',
    descriptionPlaceholder: 'Коротко, что в дне',
    emptyTitleError: 'Назовите рацион',
  },
  plan: {
    untitled: 'Новый рацион',
    editing: 'Редактировать',
    saveNew: 'Создать рацион',
    addMeal: 'Добавить день',
    overviewTab: 'Рацион',
    descriptionLabel: 'Описание',
    titlePlaceholder: 'Например, Офис без срывов',
    descriptionPlaceholder: 'Коротко, что в плане',
    emptyTitleError: 'Назовите план',
    headerHint: 'Можно задать название, добавить дни и разложить приёмы.',
  },
} as const

const FIELD_TYPE_CLASS = cn(
  'font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5',
  'text-[var(--nora-text)] [.scheme-editor-light_&]:!text-[color-mix(in_srgb,var(--nora-text)_70%,black)]',
  'placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)]',
)
const FIELD_CHIP_CLASS = 'rounded-[14px] !bg-[var(--nora-inset)]'
/** Две трети прежних 10px, одинаково со всех сторон подложки. */
const FIELD_INSET_CLASS = '!p-[calc(0.625rem*2/3)]'
/** Между острым вложенным углом и капсулой подложки. */
const FIELD_FACE_RADIUS_CLASS = '!rounded-[10px]'
const FIELD_FACE_CLASS = '!bg-[var(--nora-panel)]'
const SINGLE_LINE_FIELD_CLASS =
  '!bg-[var(--nora-inset)] w-full px-4 !py-0 !h-[2.42rem] !min-h-[2.42rem] !max-h-[2.42rem]'
const PLAQUE_INPUT_CLASS = cn(FIELD_TYPE_CLASS, SINGLE_LINE_FIELD_CLASS)
const TITLE_FIELD_CLASS = PLAQUE_INPUT_CLASS
const LINE_INPUT_CLASS = cn(
  FIELD_TYPE_CLASS,
  '!font-[300]',
  FIELD_FACE_CLASS,
  '!h-auto !min-h-[2.42rem] !max-h-none min-w-0 flex-1 resize-none overflow-hidden !px-3 !py-2 [field-sizing:content]',
  FIELD_FACE_RADIUS_CLASS,
)
const GOAL_FIELD_CLASS = cn(
  FIELD_TYPE_CLASS,
  FIELD_CHIP_CLASS,
  'w-full px-3 !py-0 !h-[2.42rem] !min-h-[2.42rem] !max-h-[2.42rem]',
  'data-[size=default]:!h-[2.42rem] data-[size=default]:!min-h-[2.42rem] data-[size=default]:!max-h-[2.42rem]',
)
const EDITOR_COVER_CLASS = cn(
  FIELD_CHIP_CLASS,
  'relative aspect-[16/9] min-h-[7.5rem] w-full overflow-hidden !rounded-[16px] p-0',
)
const MEAL_COVER_BUTTON_CLASS = EDITOR_COVER_CLASS
const PLAN_EDITOR_COVER_CLASS = EDITOR_COVER_CLASS
const COVER_PLACEHOLDER_IMAGE_CLASS = 'object-contain scale-[1.11]'
const COVER_CHANGE_CHIP_CLASS = cn(
  'ios-glass-glare pointer-events-none absolute right-2 top-2 z-[1] inline-flex size-8',
  'items-center justify-center rounded-full border-0 outline-none backdrop-blur-[12px]',
  'bg-[color-mix(in_srgb,var(--nora-text)_55%,transparent)] text-[var(--nora-panel)]',
  'shadow-[inset_0_1px_0_color-mix(in_srgb,white_42%,transparent),0_1px_2px_color-mix(in_srgb,var(--nora-text)_18%,transparent)]',
  'transition-[background-color]',
  'group-hover:bg-[var(--nora-text)]',
  'group-active:bg-[var(--nora-text)]',
)

function CoverChangeChip({ className }: { className?: string }) {
  return (
    <span className={cn(COVER_CHANGE_CHIP_CLASS, className)}>
      <ImagePlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
    </span>
  )
}
const SLOT_ROW_CLASS = cn(
  'ios-glass-glare-soft flex min-h-12 items-center gap-2.5 rounded-[14px] pl-2.5 pr-2.5',
  'bg-[var(--nora-inset)]',
)
const PLAN_DAY_ROW_SURFACE_CLASS = cn(
  'ios-glass-glare-soft flex min-h-12 items-center gap-2 rounded-[14px] border-0 px-3.5 py-2.5 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]',
)
const PLAN_DAY_ROW_CLASS = cn(
  'nora-press-grow',
  PLAN_DAY_ROW_SURFACE_CLASS,
  'outline-none',
  'hover:bg-[color-mix(in_srgb,var(--nora-inset)_88%,var(--nora-text)_6%)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const PLAN_DAY_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-text)] font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none',
  'text-[var(--nora-panel)]',
)
const PLAN_DAY_INDEX_EMPTY_CLASS = cn(
  '!bg-[var(--nora-panel)] !text-[var(--nora-text-secondary)]',
)
const PLAN_DAY_GRIP_CLASS =
  'inline-flex h-8 w-4 shrink-0 items-center justify-center text-[var(--nora-text-secondary)]'
const PLAN_DAY_ADD_ICON_CLASS = cn(
  'flex size-8 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-tint)] text-[var(--nora-on-accent)]',
)
const PLAN_DAY_BACK_CLASS = cn(
  'nora-press-grow flex size-8 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]',
)
const MEAL_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
  FIELD_FACE_CLASS,
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none',
  'text-[var(--nora-text-secondary)]',
)
const LINE_INDEX_CLASS = cn(MEAL_INDEX_CLASS, 'font-medium')
const DAY_MEAL_COUNT_CLASS = cn(
  'inline-flex h-8 shrink-0 items-center rounded-full bg-[var(--nora-panel)] px-2.5',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none whitespace-nowrap text-[var(--nora-text-secondary)]',
)
const FIELD_LABEL_CLASS =
  'mb-1.5 pl-4 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const SECTION_HEADING_CLASS =
  'mb-1.5 pl-4 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const ADD_MEAL_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center gap-1.5 rounded-full border-0 py-0 pr-3 pl-1.5',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none tracking-normal',
  'bg-[var(--nora-tint)] text-[var(--nora-on-accent)] hover:bg-[var(--nora-tint-dark)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const ADD_MEAL_PLUS_CLASS = cn(
  'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
  'bg-[var(--nora-on-accent)] text-[var(--nora-tint)]',
)
const MEAL_TRASH_CLASS = cn(
  'nora-press-grow inline-flex size-8 items-center justify-center rounded-full',
  'text-[var(--nora-text-secondary)]',
  'hover:bg-[var(--nora-error-soft-bg)] hover:text-[var(--nora-error)]',
  'active:bg-[var(--nora-error)] active:text-[var(--nora-on-accent)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
  'disabled:pointer-events-none disabled:opacity-30',
)
const LINE_ADD_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]',
  'hover:bg-[var(--nora-tint-dimmed)] hover:text-[var(--nora-tint)]',
  'active:bg-[var(--nora-tint)] active:text-[var(--nora-on-accent)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const COMPOSER_ACTION_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center rounded-full border-0 px-3 py-0',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none backdrop-blur-[16px]',
  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const COMPOSER_FOOTER_ACTION_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex h-10 min-h-10 max-h-10 shrink-0 items-center justify-center border-0 px-4 py-0',
  'rounded-[14px]',
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-none',
  'bg-[var(--nora-tint)] text-[var(--nora-on-accent)] hover:bg-[var(--nora-tint-dark)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const MEAL_TAB_CLASS = productSheetTabTriggerDarkClass
const DESCRIPTION_TAB_CLASS = productSheetTabTriggerDarkClass
const SECTION_DIVIDER_CLASS = 'border-t border-[var(--nora-divider)]'
const TITLE_GOAL_ROW_CLASS = 'grid grid-cols-[minmax(0,1fr)_10.5rem] items-start gap-3'
const HEADER_TITLE_FIELD_CLASS = cn(FIELD_TYPE_CLASS, SINGLE_LINE_FIELD_CLASS, '!font-[300]')
const HEADER_DESC_FIELD_CLASS = cn(
  FIELD_TYPE_CLASS,
  '!font-[300]',
  FIELD_FACE_CLASS,
  'w-full resize-none overflow-hidden px-4 py-3 !pb-5 !h-auto !max-h-none !min-h-[4.25rem] [field-sizing:content]',
  FIELD_FACE_RADIUS_CLASS,
)
/** Как подпись раздела в настройках над полем. */
const EDITOR_CAPTION_CLASS =
  'pl-4 font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]'

function DescriptionResizeGrip() {
  return (
    <button
      aria-label="Изменить высоту описания"
      className="absolute right-[calc(0.625rem*2/3+4px)] bottom-[calc(0.625rem*2/3+2px)] z-[2] inline-flex size-4 cursor-ns-resize touch-none items-end justify-end text-[var(--nora-text-tertiary)]"
      onPointerDown={(event) => {
        const area = event.currentTarget.parentElement?.querySelector('textarea')
        if (!area) return
        event.preventDefault()
        const handle = event.currentTarget
        try {
          handle.setPointerCapture(event.pointerId)
        } catch {
          /* The grip still follows pointermove on the button. */
        }
        const startY = event.clientY
        const start = area.getBoundingClientRect().height
        const scaled =
          window.matchMedia('(max-width: 767px)').matches && area.closest('[data-ios-13-slot]')
        const scale = scaled ? 13 / 16 : 1
        const floor = 4.25 * 16
        const move = (ev: PointerEvent) => {
          const next = Math.max(floor, start + ev.clientY - startY)
          const height = `${next / scale}px`
          area.style.setProperty('field-sizing', 'fixed', 'important')
          area.style.setProperty('height', height, 'important')
        }
        const end = () => {
          handle.removeEventListener('pointermove', move)
          handle.removeEventListener('pointerup', end)
          handle.removeEventListener('pointercancel', end)
        }
        handle.addEventListener('pointermove', move)
        handle.addEventListener('pointerup', end)
        handle.addEventListener('pointercancel', end)
      }}
      type="button"
    >
      <svg aria-hidden className="size-3" viewBox="0 0 12 12">
        <path
          d="M10 4 L4 10 M10 7.5 L7.5 10"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.25"
        />
      </svg>
    </button>
  )
}

function FieldPlaque({
  multiline = false,
  className,
  children,
}: {
  multiline?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(FIELD_CHIP_CLASS, 'relative', FIELD_INSET_CLASS, className)} data-ration-field-plaque="">
      <div
        className={
          multiline
            ? '[--ios-min:4.25rem] [--ios-px:1rem] [--ios-py:0.75rem] max-md:block max-md:w-full md:contents'
            : '[--ios-px:1rem] max-md:relative max-md:h-[2.42rem] max-md:w-full md:contents'
        }
        data-ios-13-slot={multiline ? 'area' : ''}
      >
        {children}
      </div>
      {multiline ? <DescriptionResizeGrip /> : null}
    </div>
  )
}

const TAB_NUDGE_CLASS = cn(
  'absolute top-1/2 z-[2] hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border-0',
  'bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]',
  'shadow-[0_1px_2px_color-mix(in_srgb,var(--nora-text)_18%,transparent)]',
  'md:inline-flex',
)

function EditorTabScroller({ children }: { children: React.ReactNode }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = React.useState(false)
  const [canRight, setCanRight] = React.useState(false)

  const measure = React.useCallback(() => {
    const node = scrollerRef.current
    if (!node || !window.matchMedia('(min-width: 768px)').matches) {
      setCanLeft(false)
      setCanRight(false)
      return
    }
    setCanLeft(node.scrollLeft > 1)
    setCanRight(node.scrollWidth - node.clientWidth - node.scrollLeft > 1)
  }, [])

  React.useLayoutEffect(() => {
    measure()
    const node = scrollerRef.current
    if (!node) return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.firstElementChild instanceof Element) observer.observe(node.firstElementChild)
    node.addEventListener('scroll', measure, { passive: true })
    const media = window.matchMedia('(min-width: 768px)')
    media.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      node.removeEventListener('scroll', measure)
      media.removeEventListener('change', measure)
    }
  }, [measure, children])

  function nudge(direction: -1 | 1) {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction * Math.max(160, node.clientWidth * 0.72), behavior: 'smooth' })
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="min-w-0 overflow-x-auto overscroll-x-contain no-scrollbar" ref={scrollerRef}>
        {children}
      </div>
      {canLeft ? (
        <button
          aria-label="Листать вкладки назад"
          className={cn(TAB_NUDGE_CLASS, 'left-0')}
          onClick={() => nudge(-1)}
          type="button"
        >
          <ChevronLeftIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : null}
      {canRight ? (
        <button
          aria-label="Листать вкладки вперёд"
          className={cn(TAB_NUDGE_CLASS, 'right-0')}
          onClick={() => nudge(1)}
          type="button"
        >
          <ChevronRightIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  )
}
const EDITOR_TABS_DOCK_CLASS = productSheetTabDockClass
const MACRO_ICON_CLASS = 'size-[13px] shrink-0'
const DESCRIPTION_TAB = 'description'

const SLOT_ITEMS = RATION_MEAL_SLOTS.map((slot) => ({ value: slot, label: slot }))
const SLOT_SELECT_CLASS = cn(
  FIELD_TYPE_CLASS,
  FIELD_FACE_CLASS,
  '!h-8 !min-h-8 !max-h-8 w-fit shrink-0 !rounded-full !px-3',
)
const HEADER_SLOT_SELECT_CLASS = cn(
  FIELD_TYPE_CLASS,
  FIELD_FACE_CLASS,
  FIELD_FACE_RADIUS_CLASS,
  '!font-[300] !w-full min-w-0 !px-0 !pl-3 !pr-2 !gap-1 !py-0',
  '!h-[2.42rem] !min-h-[2.42rem] !max-h-[2.42rem]',
)
const GOAL_ITEMS = RATION_GOALS.map((goal) => ({ value: goal, label: goal }))
const SLOT_TAB_ICONS = {
  Завтрак: CoffeeIcon,
  Обед: UtensilsIcon,
  Перекус: CookieIcon,
  Ужин: MoonIcon,
} as const
const MACRO_FIELDS = [
  { key: 'kcal', label: 'ккал', ariaLabel: 'ккал', icon: ZapIcon },
  { key: 'protein', label: 'Б', ariaLabel: 'Белки', icon: FlameIcon },
  { key: 'fat', label: 'Ж', ariaLabel: 'Жиры', icon: DropletIcon },
  { key: 'carbs', label: 'У', ariaLabel: 'Углеводы', icon: CookieIcon },
] as const

function isGoal(value: string): value is RationGoal {
  return (RATION_GOALS as readonly string[]).includes(value)
}

function isSlot(value: string): value is RationMealSlot {
  return (RATION_MEAL_SLOTS as readonly string[]).includes(value)
}

function planEditorHeaderDescription(mealTitles: readonly string[], hint: string) {
  const names = mealTitles.map((title) => title.trim()).filter(Boolean).join(', ')
  return names ? `${names}. ${hint}` : hint
}

export function RationEditorDialog({
  open,
  draft,
  ownerId,
  mode = 'ration',
  initialDays,
  outline = false,
  finalizeOptions,
  onOpenChange,
  onSave,
  onSaveDays,
  onSaveDayDrafts,
  onDelete,
}: {
  open: boolean
  draft: RationDraft | null
  ownerId: string
  mode?: 'ration' | 'plan'
  initialDays?: readonly RationMealDraft[][]
  outline?: boolean
  finalizeOptions?: { idPrefix?: string; source?: string; emptyTitleError?: string }
  onOpenChange: (open: boolean) => void
  onSave: (ration: RationEntry) => void | Promise<void>
  onSaveDays?: (days: readonly RationEntry[], dayCount?: number) => void | Promise<void>
  onSaveDayDrafts?: (
    form: RationDraft,
    days: readonly RationMealDraft[][],
  ) => void | Promise<void>
  onDelete?: (rationId: string) => void | Promise<void>
}) {
  const copy = EDITOR_COPY[mode]
  const saveInFooter = mode === 'plan'
  const showGoal = mode === 'ration'
  const planDaysEnabled = mode === 'plan' && Boolean(onSaveDays || onSaveDayDrafts)
  const seededDays = seedPlanEditorDays(draft ?? emptyRationDraft(), initialDays)
  const [form, setForm] = React.useState<RationDraft>({
    ...(draft ?? emptyRationDraft()),
    meals: seededDays.meals,
  })
  const [dayDrafts, setDayDrafts] = React.useState<RationMealDraft[][]>(seededDays.days)
  const [activeDay, setActiveDay] = React.useState(0)
  const [viewingDay, setViewingDay] = React.useState<number | null>(null)
  const [activeTab, setActiveTab] = React.useState(DESCRIPTION_TAB)
  const coverFileRef = React.useRef<HTMLInputElement>(null)
  const [busyCover, setBusyCover] = React.useState(false)
  const [coverFailed, setCoverFailed] = React.useState(false)
  const inPlanDay = planDaysEnabled && viewingDay !== null
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const draftKey = `${open ? 'open' : 'closed'}:${draft?.id ?? 'new'}:${initialDays?.length ?? 0}`
  const [loadedDraftKey, setLoadedDraftKey] = React.useState(draftKey)
  if (open && draft && loadedDraftKey !== draftKey) {
    const nextSeed = seedPlanEditorDays(draft, initialDays)
    setLoadedDraftKey(draftKey)
    setForm({ ...draft, meals: nextSeed.meals })
    setDayDrafts(nextSeed.days)
    setActiveDay(0)
    setViewingDay(null)
    setActiveTab(DESCRIPTION_TAB)
  }
  if (activeTab !== DESCRIPTION_TAB && !form.meals.some((meal) => meal.key === activeTab)) {
    setActiveTab(inPlanDay ? (form.meals[0]?.key ?? DESCRIPTION_TAB) : DESCRIPTION_TAB)
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  const planDays = planDaysEnabled
    ? dayDrafts.map((day, index) => (index === activeDay ? form.meals : day))
    : [form.meals]
  const planMeals = planDays.flat()
  const previewSource = { ...form, meals: planMeals }
  const preview = previewRationFromDraft(previewSource)
  const heading = form.title.trim() || copy.untitled
  const totals = draftRationTotals(previewSource)
  const coverSrc =
    durablePlanCoverSrc(form.coverImage) ||
    planMeals.map((meal) => usableMealCover(meal.image)).find(Boolean) ||
    (mode === 'plan' ? PLAN_COVER_PLACEHOLDER_SRC : '')
  const shownCover = coverFailed ? PLAN_COVER_PLACEHOLDER_SRC : coverSrc
  const coverDisplaySrc = shownCover
    ? isCoverPlaceholder(shownCover)
      ? shownCover
      : displayMediaSrc(shownCover, 'card')
    : ''
  const coverOriginalSrc = shownCover && !isCoverPlaceholder(shownCover)
    ? mealPhotoOriginalSrc(shownCover, 'card')
    : shownCover
  const editing = Boolean(form.id)
  const saveLabel = editing ? 'Сохранить' : copy.saveNew
  const activeMealIndex = form.meals.findIndex((meal) => meal.key === activeTab)
  const headerTitle =
    viewingDay === null
      ? editing
        ? copy.editing
        : copy.untitled
      : `Приём ${Math.max(activeMealIndex, 0) + 1}`
  const headerDescription =
    mode === 'plan'
      ? planEditorHeaderDescription(
          preview.meals.map((meal) => meal.title),
          EDITOR_COPY.plan.headerHint,
        )
      : preview.description || 'Названия приёмов появятся здесь'
  const mealsHeading = 'Приёмы дня'

  React.useEffect(() => {
    setCoverFailed(false)
  }, [coverSrc])

  function currentDays() {
    return planDaysEnabled
      ? dayDrafts.map((day, index) => (index === activeDay ? form.meals : day))
      : [form.meals]
  }

  function commitMeals(meals: RationMealDraft[]) {
    setForm((current) => ({ ...current, meals }))
    if (planDaysEnabled) {
      setDayDrafts((days) =>
        days.map((day, index) => (index === activeDay ? meals : day)),
      )
    }
  }

  function patch(next: Partial<RationDraft>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function patchMeal(key: string, next: Partial<RationMealDraft>) {
    commitMeals(
      form.meals.map((meal) => (meal.key === key ? { ...meal, ...next } : meal)),
    )
  }

  async function onPickCover(file: File | undefined) {
    if (!file) return
    setBusyCover(true)
    try {
      const image = await fileToMealImage(file)
      patch({ coverImage: `data:${image.mime};base64,${image.base64}` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить превью')
    } finally {
      setBusyCover(false)
    }
  }

  function moveMeal(key: string, direction: -1 | 1) {
    const index = form.meals.findIndex((meal) => meal.key === key)
    const target = form.meals[index + direction]
    if (!target) return
    commitMeals(reorderMealDrafts(form.meals, key, target.key))
  }

  function reorderMeal(fromKey: string, toKey: string) {
    commitMeals(reorderMealDrafts(form.meals, fromKey, toKey))
  }

  async function handleSave() {
    const options = {
      ...finalizeOptions,
      emptyTitleError: finalizeOptions?.emptyTitleError ?? copy.emptyTitleError,
    }
    if (planDaysEnabled && onSaveDayDrafts) {
      const title = form.title.trim()
      if (!title) {
        toast.error(options.emptyTitleError)
        return
      }
      await onSaveDayDrafts(form, currentDays())
      return
    }
    if (planDaysEnabled && onSaveDays) {
      const result = finalizePlanDaysDraft(form, currentDays(), ownerId, options)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const cover =
        durablePlanCoverSrc(form.coverImage) ||
        result.days.flatMap((day) => day.meals).map((meal) => usableMealCover(meal.image)).find(Boolean) ||
        PLAN_COVER_PLACEHOLDER_SRC
      const days = result.days.map((day, index) =>
        index === 0 ? { ...day, image: cover || day.image } : day,
      )
      await onSaveDays(days, currentDays().length)
      return
    }
    const result = finalizeRationDraft(form, ownerId, options)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    await onSave(result.ration)
  }

  function addMeal() {
    const meal = emptyMealDraft(nextUnusedMealSlot(form.meals))
    commitMeals([...form.meals, meal])
    if (inPlanDay || activeTab !== DESCRIPTION_TAB) setActiveTab(meal.key)
  }

  function openDay(index: number) {
    const synced = currentDays()
    const meals = synced[index] ?? emptyPlanDayMeals()
    setDayDrafts(synced)
    setActiveDay(index)
    setViewingDay(index)
    setForm((current) => ({ ...current, meals }))
    setActiveTab(meals[0]?.key ?? DESCRIPTION_TAB)
  }

  function leaveDay() {
    setDayDrafts(currentDays())
    setViewingDay(null)
    setActiveTab(DESCRIPTION_TAB)
  }

  function addDay() {
    const synced = addPlanDraftDay(currentDays())
    if (synced.length === dayDrafts.length) return
    setDayDrafts(synced)
  }

  function removeDay(index: number) {
    const synced = currentDays()
    const next = removePlanDraftDay(synced, index)
    if (next.length === synced.length) return
    setDayDrafts(next)
    if (viewingDay === index || next.length === 0) {
      setViewingDay(null)
      setActiveTab(DESCRIPTION_TAB)
    } else if (viewingDay !== null && viewingDay > index) {
      setViewingDay(viewingDay - 1)
    }
    const nextActive = Math.min(activeDay > index ? activeDay - 1 : activeDay, Math.max(next.length - 1, 0))
    setActiveDay(Math.max(0, nextActive))
    setForm((current) => ({
      ...current,
      meals: next[Math.max(0, nextActive)] ?? emptyPlanDayMeals(),
    }))
  }

  function removeMeal(key: string) {
    if (planDaysEnabled && form.meals.length <= 1) {
      removeDay(activeDay)
      return
    }
    if (form.meals.length <= 1) return
    const next = form.meals.filter((meal) => meal.key !== key)
    commitMeals(next)
    if (activeTab === key) {
      setActiveTab(inPlanDay ? (next[0]?.key ?? DESCRIPTION_TAB) : DESCRIPTION_TAB)
    }
  }

  function moveDay(fromIndex: number, toIndex: number) {
    const synced = currentDays()
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= synced.length ||
      toIndex >= synced.length
    ) {
      return
    }
    const next = reorderPlanDraftDays(synced, fromIndex, toIndex)
    setDayDrafts(next)
    const nextActive =
      activeDay === fromIndex
        ? toIndex
        : fromIndex < toIndex && activeDay > fromIndex && activeDay <= toIndex
          ? activeDay - 1
          : fromIndex > toIndex && activeDay >= toIndex && activeDay < fromIndex
            ? activeDay + 1
            : activeDay
    setActiveDay(nextActive)
    setForm((current) => ({ ...current, meals: next[nextActive] ?? current.meals }))
    if (viewingDay !== null) {
      setViewingDay(
        viewingDay === fromIndex
          ? toIndex
          : fromIndex < toIndex && viewingDay > fromIndex && viewingDay <= toIndex
            ? viewingDay - 1
            : fromIndex > toIndex && viewingDay >= toIndex && viewingDay < fromIndex
              ? viewingDay + 1
              : viewingDay,
      )
    }
  }

  function changeTab(value: string) {
    setActiveTab(value)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const showMealTabs = !planDaysEnabled || inPlanDay
  const mealTabsBar = showMealTabs ? (
    <EditorTabScroller>
      <TabsList className="h-8 gap-1.5 bg-transparent p-0">
        {!planDaysEnabled ? (
          <TabsTrigger className={DESCRIPTION_TAB_CLASS} value={DESCRIPTION_TAB}>
            <FileTextIcon className="size-[15px]" strokeWidth={1.75} />
            {copy.overviewTab}
          </TabsTrigger>
        ) : null}
        {form.meals.map((meal) => {
          const Icon = SLOT_TAB_ICONS[meal.slot]
          return (
            <TabsTrigger className={MEAL_TAB_CLASS} key={meal.key} value={meal.key}>
              <Icon className="size-[15px]" strokeWidth={1.75} />
              {meal.slot}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </EditorTabScroller>
  ) : null
  const dayFooterActions = inPlanDay ? (
    <>
      <button
        aria-label="Назад"
        className={cn(PLAN_DAY_BACK_CLASS, 'size-10')}
        data-plan-editor-back=""
        onClick={leaveDay}
        type="button"
      >
        <ChevronLeftIcon aria-hidden className="size-4" strokeWidth={1.7} />
      </button>
      <button
        className={cn(COMPOSER_FOOTER_ACTION_CLASS, 'min-w-0 flex-1')}
        onClick={() => void handleSave()}
        type="button"
      >
        {saveLabel}
      </button>
      <NoraHoverTip label="Добавить приём">
        <button
          aria-label={copy.addMeal}
          className={cn(PLAN_DAY_BACK_CLASS, 'size-10')}
          data-plan-editor-add-meal=""
          onClick={addMeal}
          type="button"
        >
          <PlusIcon aria-hidden className="size-4" strokeWidth={1.7} />
        </button>
      </NoraHoverTip>
    </>
  ) : null

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={EDITOR_FRAME_CLASS}
        data-modal-frame="meal"
        data-phone-full=""
        data-plan-outline={outline ? '' : undefined}
        showCloseButton={false}
      >
        {mode === 'plan' ? (
          <div className="shrink-0 px-2 pt-2">
            <DialogHeader
              className="min-w-0 gap-2 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left"
              data-plan-editor-header=""
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className={PLAN_DAY_INDEX_CLASS}>
                    {viewingDay !== null ? viewingDay + 1 : (
                      <CalendarDaysIcon aria-hidden className="size-4" strokeWidth={1.7} />
                    )}
                  </span>
                  <DialogTitle className="min-w-0 truncate font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                    {headerTitle}
                  </DialogTitle>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!inPlanDay && onDelete && form.id ? (
                    <button
                      className="nora-press-grow inline-flex h-8 items-center rounded-full px-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                      onClick={() => {
                        void onDelete(form.id!)
                      }}
                      type="button"
                    >
                      Удалить
                    </button>
                  ) : null}
                  <DialogClose
                    aria-label="Закрыть"
                    className={cn(
                      productSheetOverlayChipClass,
                      'nora-press-grow size-8 shrink-0 bg-[var(--nora-panel)] sm:size-8',
                      'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                    )}
                  >
                    <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                  </DialogClose>
                </div>
              </div>
              <DialogDescription className="sr-only">{headerDescription}</DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <DialogHeader className="sr-only">
            <DialogTitle>{headerTitle}</DialogTitle>
            <DialogDescription>{headerDescription}</DialogDescription>
          </DialogHeader>
        )}
        <Tabs
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          onValueChange={changeTab}
          value={activeTab}
        >
          {mode === 'ration' ? (
            <div className="flex shrink-0 items-start gap-2 px-3 pt-3 sm:px-4 sm:pt-3.5">
              <p className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 text-[var(--nora-text)]">
                {heading}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                {onDelete && form.id ? (
                  <button
                    className="nora-press-grow inline-flex h-8 items-center rounded-full px-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                    onClick={() => {
                      void onDelete(form.id!)
                    }}
                    type="button"
                  >
                    Удалить
                  </button>
                ) : null}
                <DialogClose
                  aria-label="Закрыть"
                  className="nora-press-grow inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                >
                  <XIcon aria-hidden className="size-4" strokeWidth={1.75} />
                </DialogClose>
              </div>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="flex flex-col gap-3 px-3 pt-3 pb-8 sm:px-4">
              <TabsContent className="mt-0" data-ration-tab="description" value={DESCRIPTION_TAB}>
                <div className="flex flex-col gap-3">
                  {mode === 'plan' ? (
                    <div className="flex flex-col gap-4" data-plan-editor-identity="">
                      <label className="grid min-w-0">
                        <NoraHoverTip align="end" className="block w-full" label="Сменить обложку">
                        <button
                          aria-label="Сменить обложку"
                          className={cn(
                            PLAN_EDITOR_COVER_CLASS,
                            'group nora-press-grow !bg-[var(--nora-panel)]',
                          )}
                          data-plan-editor-cover=""
                          onClick={() => coverFileRef.current?.click()}
                          type="button"
                        >
                          {coverSrc ? (
                            <>
                              <img
                                alt=""
                                className={cn(
                                  'absolute inset-0 size-full',
                                  isCoverPlaceholder(shownCover)
                                    ? COVER_PLACEHOLDER_IMAGE_CLASS
                                    : 'object-cover',
                                )}
                                data-display={coverDisplaySrc}
                                data-original={coverOriginalSrc}
                                onError={(event) => {
                                  applyMealPhotoFallback(
                                    event.currentTarget,
                                    PLAN_COVER_PLACEHOLDER_SRC,
                                  )
                                  if (event.currentTarget.dataset.fallback === '2') {
                                    setCoverFailed(true)
                                  }
                                }}
                                src={coverDisplaySrc}
                              />
                              <CoverChangeChip />
                            </>
                          ) : (
                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
                              <CameraIcon className="size-4" />
                              {busyCover ? 'Обложка…' : 'Обложка'}
                            </span>
                          )}
                        </button>
                        </NoraHoverTip>
                        <input
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.target.value = ''
                            void onPickCover(file)
                          }}
                          ref={coverFileRef}
                          type="file"
                        />
                      </label>
                      <FieldPlaque>
                        <NoraInput
                          aria-label="Название"
                          className={cn(HEADER_TITLE_FIELD_CLASS, FIELD_FACE_CLASS, FIELD_FACE_RADIUS_CLASS)}
                          onChange={(event) => patch({ title: event.target.value })}
                          placeholder={copy.titlePlaceholder}
                          value={form.title}
                        />
                      </FieldPlaque>
                      <FieldPlaque multiline>
                        <NoraTextarea
                          aria-label={copy.descriptionLabel}
                          className={HEADER_DESC_FIELD_CLASS}
                          onChange={(event) => patch({ description: event.target.value })}
                          placeholder={copy.descriptionPlaceholder}
                          value={form.description}
                        />
                      </FieldPlaque>
                    </div>
                  ) : null}
                  {mode === 'ration' ? (
                    <section>
                      <p className="whitespace-pre-line font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)] dark:text-[color-mix(in_srgb,var(--nora-text)_42%,var(--nora-text-secondary))]">
                        {preview.description || 'Названия приёмов появятся здесь'}
                      </p>
                      <p className="mt-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
                        {totals.kcal} ккал · Б {totals.protein} · Ж {totals.fat} · У {totals.carbs}
                        {` · ${preview.mealsPerDay} ${preview.mealsPerDay === 1 ? 'приём' : 'приёма'}`}
                      </p>
                    </section>
                  ) : null}
                  {showGoal ? (
                    <div className={TITLE_GOAL_ROW_CLASS}>
                      <FieldPlaque>
                        <NoraInput
                          aria-label="Название"
                          className={cn(HEADER_TITLE_FIELD_CLASS, FIELD_FACE_CLASS, FIELD_FACE_RADIUS_CLASS)}
                          onChange={(event) => patch({ title: event.target.value })}
                          placeholder={copy.titlePlaceholder}
                          value={form.title}
                        />
                      </FieldPlaque>
                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Цель</span>
                        <NoraSelect
                          className={GOAL_FIELD_CLASS}
                          contentClassName={productToolbarSelectContentClass}
                          itemClassName={productToolbarSelectItemClass}
                          items={[...GOAL_ITEMS]}
                          modal
                          onValueChange={(value) => {
                            if (value && isGoal(value)) patch({ goal: value })
                          }}
                          value={form.goal}
                        />
                      </label>
                    </div>
                  ) : null}
                  {mode === 'ration' ? (
                    <FieldPlaque multiline>
                      <NoraTextarea
                        aria-label={copy.descriptionLabel}
                        className={HEADER_DESC_FIELD_CLASS}
                        onChange={(event) => patch({ description: event.target.value })}
                        placeholder={copy.descriptionPlaceholder}
                        value={form.description}
                      />
                    </FieldPlaque>
                  ) : null}
                  {mode === 'ration' ? <div aria-hidden className={SECTION_DIVIDER_CLASS} /> : null}
                  {planDaysEnabled ? (
                    <PlanDayPlaqueList
                      days={planDays}
                      onAdd={addDay}
                      onMove={moveDay}
                      onOpen={openDay}
                      onRemove={removeDay}
                    />
                  ) : (
                    <>
                      <MealsSectionHeading
                        addLabel={copy.addMeal}
                        heading={mealsHeading}
                        onAdd={addMeal}
                        onSave={handleSave}
                        saveLabel={saveLabel}
                        showSave={!saveInFooter}
                      />
                      <MealOrderList
                        meals={form.meals}
                        onMoveDown={(key) => moveMeal(key, 1)}
                        onMoveUp={(key) => moveMeal(key, -1)}
                        onPatch={patchMeal}
                        onRemove={removeMeal}
                        onReorder={reorderMeal}
                      />
                    </>
                  )}
                </div>
              </TabsContent>
              {(!planDaysEnabled || inPlanDay) ? form.meals.map((meal, index) => (
                <TabsContent
                  className="mt-0"
                  data-ration-tab="meal"
                  key={meal.key}
                  value={meal.key}
                >
                  <div className="flex flex-col gap-3">
                    {!inPlanDay ? (
                      <MealsSectionHeading
                        addLabel={copy.addMeal}
                        heading={mealsHeading}
                        onAdd={addMeal}
                        onSave={handleSave}
                        saveLabel={saveLabel}
                        showSave={!saveInFooter}
                      />
                    ) : null}
                    <MealDraftCard
                      index={index}
                      meal={meal}
                      onPatch={(next) => patchMeal(meal.key, next)}
                      onRemove={
                        inPlanDay || form.meals.length > 1
                          ? () => removeMeal(meal.key)
                          : undefined
                      }
                      removesDay={inPlanDay && form.meals.length <= 1}
                      slotChrome={!inPlanDay}
                    />
                  </div>
                </TabsContent>
              )) : null}
            </div>
          </div>
          {showMealTabs && !saveInFooter ? (
            <div className={EDITOR_TABS_DOCK_CLASS}>
              <ProductSheetTabFade />
              <div className="flex min-w-0 items-center gap-1.5">{mealTabsBar}</div>
            </div>
          ) : null}
          {saveInFooter ? (
            <div
              className={cn(
                'relative z-10 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5',
                showMealTabs && 'pt-3.5',
              )}
              data-plan-editor-save=""
              data-plan-outline-save={outline ? '' : undefined}
            >
              {showMealTabs ? (
                <>
                  <ProductSheetTabFade />
                  {mealTabsBar}
                </>
              ) : null}
              <div
                aria-hidden
                className={cn(SECTION_DIVIDER_CLASS, showMealTabs && 'mt-3')}
              />
              {inPlanDay ? (
                <div
                  className="mt-3 flex min-w-0 items-center gap-1.5"
                  data-plan-editor-save-row=""
                >
                  {dayFooterActions}
                </div>
              ) : (
                <button
                  className={cn(COMPOSER_FOOTER_ACTION_CLASS, 'mt-3 w-full')}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {saveLabel}
                </button>
              )}
            </div>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function planDayMealsLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} приём`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} приёма`
  return `${count} приёмов`
}

function planDayIdentity(day: readonly RationMealDraft[], index: number) {
  return day[0]?.key || `plan-day-${index}`
}

type PlanDayDrag = {
  labelIndex: number
  width: number
  height: number
  offsetY: number
  originLeft: number
  axisX: number
}

function planDayGhostTransform(originLeft: number, clientY: number, offsetY: number) {
  return `translate3d(${originLeft}px, ${clientY - offsetY}px, 0) scale(1.03)`
}

function PlanDayPlaqueFace({
  empty,
  index,
  mealCount,
  onOpen,
  onRemove,
}: {
  empty: boolean
  index: number
  mealCount: number
  onOpen?: (index: number) => void
  onRemove?: (index: number) => void
}) {
  return (
    <>
      <span
        aria-label={`Переставить день ${index + 1}`}
        className={cn(PLAN_DAY_GRIP_CLASS, 'cursor-grab touch-none active:cursor-grabbing')}
        data-plan-editor-day-drag=""
        role="img"
      >
        <GripVerticalIcon aria-hidden className="size-4" strokeWidth={1.75} />
      </span>
      <button
        aria-label={`Открыть день ${index + 1}, ${planDayMealsLabel(mealCount)}`}
        className="nora-press-grow flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
        data-plan-editor-open-day={String(index)}
        onClick={onOpen ? () => onOpen(index) : undefined}
        tabIndex={onOpen ? undefined : -1}
        type="button"
      >
        <span className={cn(PLAN_DAY_INDEX_CLASS, empty && PLAN_DAY_INDEX_EMPTY_CLASS)}>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
          День {index + 1}
        </span>
        <span
          aria-hidden
          className={DAY_MEAL_COUNT_CLASS}
          data-plan-editor-day-meals={String(mealCount)}
        >
          {planDayMealsLabel(mealCount)}
        </span>
      </button>
      <NoraHoverTip label={`Удалить день ${index + 1}`}>
        <button
          aria-label={`Удалить день ${index + 1}`}
          className={MEAL_TRASH_CLASS}
          data-plan-editor-day-remove={String(index)}
          onClick={onRemove ? () => onRemove(index) : undefined}
          tabIndex={onRemove ? undefined : -1}
          type="button"
        >
          <Trash2Icon aria-hidden className="size-4" />
        </button>
      </NoraHoverTip>
    </>
  )
}

function PlanDayPlaqueList({
  days,
  onAdd,
  onMove,
  onOpen,
  onRemove,
}: {
  days: readonly RationMealDraft[][]
  onAdd: () => void
  onMove: (fromIndex: number, toIndex: number) => void
  onOpen: (index: number) => void
  onRemove: (index: number) => void
}) {
  const dragIndexRef = React.useRef<number | null>(null)
  const ghostRef = React.useRef<HTMLDivElement>(null)
  const pointerRef = React.useRef({ y: 0 })
  const dragMetricsRef = React.useRef<PlanDayDrag | null>(null)
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null)
  const [drag, setDrag] = React.useState<PlanDayDrag | null>(null)

  function finishDrag() {
    dragIndexRef.current = null
    dragMetricsRef.current = null
    setDraggingIndex(null)
    setDrag(null)
  }

  function pinGhost(clientY: number) {
    pointerRef.current = { y: clientY }
    const ghost = ghostRef.current
    const current = dragMetricsRef.current
    if (!ghost || !current) return
    ghost.style.transform = planDayGhostTransform(current.originLeft, clientY, current.offsetY)
  }

  React.useLayoutEffect(() => {
    if (!drag) return
    pinGhost(pointerRef.current.y)
  })

  React.useEffect(() => {
    if (!drag) return
    const onMove = (event: PointerEvent) => {
      if (event.cancelable) event.preventDefault()
      pinGhost(event.clientY)
      hoverReorder(event.clientY)
    }
    const onUp = () => finishDrag()
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag])

  function hoverReorder(clientY: number) {
    const fromIndex = dragIndexRef.current
    const axisX = dragMetricsRef.current?.axisX
    if (fromIndex == null || axisX == null) return
    const node = document.elementFromPoint(axisX, clientY)?.closest('[data-plan-editor-day]')
    if (!(node instanceof HTMLElement)) return
    const toValue = node.getAttribute('data-plan-editor-day')
    if (toValue == null) return
    const toIndex = Number(toValue)
    if (!Number.isFinite(toIndex) || toIndex === fromIndex) return
    const rect = node.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    if (fromIndex < toIndex && clientY < mid) return
    if (fromIndex > toIndex && clientY > mid) return
    onMove(fromIndex, toIndex)
    dragIndexRef.current = toIndex
    setDraggingIndex(toIndex)
  }

  const draggingDay = draggingIndex != null ? days[draggingIndex] : undefined
  const draggingMeals = draggingDay ? titledDraftMeals(draggingDay).length : 0

  return (
    <div className="flex flex-col gap-4" data-plan-editor-days="">
      <p className={EDITOR_CAPTION_CLASS} data-settings-subtitle="">Добавленные дни</p>
      <div className="flex flex-col gap-1.5">
      {days.map((day, index) => {
        const mealCount = titledDraftMeals(day).length
        const empty = mealCount === 0
        const identity = planDayIdentity(day, index)
        const dragging = draggingIndex === index
        return (
          <div
            className={cn(PLAN_DAY_ROW_CLASS, dragging && 'opacity-0 !transform-none')}
            data-plan-editor-day={String(index)}
            data-plan-editor-day-empty={empty ? '' : undefined}
            data-plan-editor-day-id={identity}
            data-plan-editor-day-meals={String(mealCount)}
            key={identity}
            onLostPointerCapture={finishDrag}
            onPointerCancel={finishDrag}
            onPointerDown={(event) => {
              if (event.button !== 0) return
              const target = event.target as HTMLElement
              if (!target.closest('[data-plan-editor-day-drag]')) return
              const rect = event.currentTarget.getBoundingClientRect()
              pointerRef.current = { y: event.clientY }
              dragIndexRef.current = index
              setDraggingIndex(index)
              const nextDrag = {
                labelIndex: index,
                width: rect.width,
                height: rect.height,
                offsetY: event.clientY - rect.top,
                originLeft: rect.left,
                axisX: rect.left + rect.width / 2,
              }
              dragMetricsRef.current = nextDrag
              setDrag(nextDrag)
              if (event.cancelable) event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (dragIndexRef.current == null) return
              pinGhost(event.clientY)
              hoverReorder(event.clientY)
            }}
            onPointerUp={finishDrag}
          >
            <PlanDayPlaqueFace
              empty={empty}
              index={index}
              mealCount={mealCount}
              onOpen={onOpen}
              onRemove={onRemove}
            />
          </div>
        )
      })}
      {drag && draggingIndex != null && draggingDay && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-hidden
              className={cn(
                PLAN_DAY_ROW_SURFACE_CLASS,
                'pointer-events-none fixed left-0 top-0 z-[80] origin-top-left cursor-grabbing will-change-transform',
                'shadow-[0_12px_28px_rgba(0,0,0,0.18)]',
              )}
              data-plan-editor-day-ghost=""
              ref={ghostRef}
              style={{
                width: drag.width,
                height: drag.height,
                transform: planDayGhostTransform(
                  drag.originLeft,
                  pointerRef.current.y,
                  drag.offsetY,
                ),
              }}
            >
              <PlanDayPlaqueFace
                empty={draggingMeals === 0}
                index={drag.labelIndex}
                mealCount={draggingMeals}
              />
            </div>,
            document.body,
          )
        : null}
      {days.length < PLAN_DRAFT_MAX_DAYS ? (
        <button
          className={PLAN_DAY_ROW_CLASS}
          data-plan-editor-add-day=""
          onClick={onAdd}
          type="button"
        >
          <span aria-hidden className={cn(PLAN_DAY_GRIP_CLASS, 'pointer-events-none opacity-35')}>
            <GripVerticalIcon aria-hidden className="size-4" strokeWidth={1.75} />
          </span>
          <span className={PLAN_DAY_ADD_ICON_CLASS}>
            <PlusIcon aria-hidden className="size-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 truncate text-left font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
            Добавить день
          </span>
        </button>
      ) : null}
      </div>
    </div>
  )
}

function MealsSectionHeading({
  addLabel,
  heading = 'Приёмы дня',
  onAdd,
  onSave,
  saveLabel,
  showSave = true,
}: {
  addLabel: string
  heading?: string
  onAdd: () => void
  onSave: () => void
  saveLabel: string
  showSave?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={cn(SECTION_HEADING_CLASS, 'mb-0 min-w-0 truncate')}>{heading}</p>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <button className={ADD_MEAL_CLASS} onClick={onAdd} type="button">
          <span className={ADD_MEAL_PLUS_CLASS}>
            <PlusIcon aria-hidden className="size-3" strokeWidth={2.25} />
          </span>
          {addLabel}
        </button>
        {showSave ? (
          <button className={COMPOSER_ACTION_CLASS} onClick={onSave} type="button">
            {saveLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function MealSlotToolbar({
  meal,
  index,
  dragHandle = false,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  meal: RationMealDraft
  index: number
  dragHandle?: boolean
  onPatch: (next: Partial<RationMealDraft>) => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className={SLOT_ROW_CLASS}>
      <span
        className={cn(MEAL_INDEX_CLASS, dragHandle && 'cursor-grab touch-none active:cursor-grabbing')}
        data-meal-drag-handle={dragHandle ? '' : undefined}
      >
        {index + 1}
      </span>
      <NoraSelect
        className={SLOT_SELECT_CLASS}
        contentClassName={productToolbarSelectContentClass}
        itemClassName={productToolbarSelectItemClass}
        items={[...SLOT_ITEMS]}
        modal
        onValueChange={(value) => {
          if (value && isSlot(value)) onPatch({ slot: value })
        }}
        value={meal.slot}
      />
      <div className="ml-auto flex items-center">
        {onMoveUp && onMoveDown ? (
          <>
            <button
              aria-label="Выше"
              className="nora-press-grow inline-flex size-8 items-center justify-center text-[var(--nora-text-secondary)]"
              onClick={onMoveUp}
              type="button"
            >
              <ChevronUpIcon className="size-4" />
            </button>
            <button
              aria-label="Ниже"
              className="nora-press-grow inline-flex size-8 items-center justify-center text-[var(--nora-text-secondary)]"
              onClick={onMoveDown}
              type="button"
            >
              <ChevronDownIcon className="size-4" />
            </button>
          </>
        ) : null}
        <NoraHoverTip label="Удалить приём" side="bottom">
          <button
            aria-label="Удалить приём"
            className={MEAL_TRASH_CLASS}
            disabled={!onRemove}
            onClick={onRemove}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        </NoraHoverTip>
      </div>
    </div>
  )
}

function MealOrderList({
  meals,
  onMoveDown,
  onMoveUp,
  onPatch,
  onRemove,
  onReorder,
}: {
  meals: RationMealDraft[]
  onMoveDown: (key: string) => void
  onMoveUp: (key: string) => void
  onPatch: (key: string, next: Partial<RationMealDraft>) => void
  onRemove: (key: string) => void
  onReorder: (fromKey: string, toKey: string) => void
}) {
  const dragKeyRef = React.useRef<string | null>(null)
  const [draggingKey, setDraggingKey] = React.useState<string | null>(null)

  function finishDrag() {
    dragKeyRef.current = null
    setDraggingKey(null)
  }

  function hoverReorder(clientX: number, clientY: number) {
    const fromKey = dragKeyRef.current
    if (!fromKey) return
    const node = document.elementFromPoint(clientX, clientY)?.closest('[data-meal-order]')
    const toKey = node?.getAttribute('data-meal-order')
    if (toKey && toKey !== fromKey) onReorder(fromKey, toKey)
  }

  return (
    <div className="grid gap-1.5" data-meal-order-list="">
      {meals.map((meal, index) => (
        <div
          className={cn(draggingKey === meal.key && 'opacity-70')}
          data-meal-order={meal.key}
          key={meal.key}
          onPointerCancel={finishDrag}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            const target = event.target as HTMLElement
            if (target.closest('button, [role="combobox"], input, textarea, select')) return
            dragKeyRef.current = meal.key
            setDraggingKey(meal.key)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (dragKeyRef.current) hoverReorder(event.clientX, event.clientY)
          }}
          onPointerUp={finishDrag}
        >
          <MealSlotToolbar
            dragHandle
            index={index}
            meal={meal}
            onMoveDown={() => onMoveDown(meal.key)}
            onMoveUp={() => onMoveUp(meal.key)}
            onPatch={(next) => onPatch(meal.key, next)}
            onRemove={meals.length > 1 ? () => onRemove(meal.key) : undefined}
          />
        </div>
      ))}
    </div>
  )
}

function mealRemovePrompt(title: string, removesDay: boolean) {
  const name = title.trim()
  const named = name.length > 0 ? `«${name}»` : 'Этот приём'
  if (removesDay) {
    return {
      title: 'Удалить приём?',
      description: `${named} — последний приём дня. День тоже будет убран.`,
      confirmLabel: 'Удалить',
    }
  }
  return {
    title: 'Удалить приём?',
    description: `${named} исчезнет из этого дня.`,
    confirmLabel: 'Удалить',
  }
}

function MealDraftCard({
  meal,
  index,
  onPatch,
  onRemove,
  removesDay = false,
  slotChrome = true,
}: {
  meal: RationMealDraft
  index: number
  onPatch: (next: Partial<RationMealDraft>) => void
  onRemove?: () => void
  removesDay?: boolean
  slotChrome?: boolean
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [busyPhoto, setBusyPhoto] = React.useState(false)
  const [photoFailed, setPhotoFailed] = React.useState(false)
  const [confirmRemove, setConfirmRemove] = React.useState(false)
  const showCoverRemove = !slotChrome && Boolean(onRemove)
  const removePrompt = mealRemovePrompt(meal.title, removesDay)
  const mealCoverSrc = displayMealCover(meal.image)
  React.useEffect(() => {
    setPhotoFailed(false)
  }, [meal.image])
  const shownMealCover = photoFailed ? MEAL_COVER_STUB_SRC : mealCoverSrc
  const mealCoverDisplaySrc = isCoverPlaceholder(shownMealCover)
    ? shownMealCover
    : displayMediaSrc(shownMealCover, 'card')
  const mealCoverOriginalSrc =
    shownMealCover && !isCoverPlaceholder(shownMealCover)
      ? mealPhotoOriginalSrc(shownMealCover, 'card')
      : shownMealCover

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setBusyPhoto(true)
    try {
      const image = await fileToMealImage(file)
      setPhotoFailed(false)
      onPatch({ image: `data:${image.mime};base64,${image.base64}` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить фото')
    } finally {
      setBusyPhoto(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      {slotChrome ? (
        <MealSlotToolbar
          index={index}
          meal={meal}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ) : null}
      <div className="flex flex-col gap-4">
      <div className="relative w-full">
      <button
        aria-label="Сменить фото"
        className={cn(MEAL_COVER_BUTTON_CLASS, 'group nora-press-grow !bg-[var(--nora-panel)]')}
        data-plan-editor-meal-cover=""
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        <img
          alt=""
          className={cn(
            'absolute inset-0 size-full',
            isCoverPlaceholder(shownMealCover) ? COVER_PLACEHOLDER_IMAGE_CLASS : 'object-cover',
          )}
          data-display={mealCoverDisplaySrc}
          data-original={mealCoverOriginalSrc}
          key={meal.image || shownMealCover}
          onError={(event) => {
            applyMealPhotoFallback(event.currentTarget, MEAL_COVER_STUB_SRC)
            if (event.currentTarget.dataset.fallback === '2') {
              setPhotoFailed(true)
            }
          }}
          src={mealCoverDisplaySrc}
        />
        <CoverChangeChip className={showCoverRemove ? 'right-12' : undefined} />
        {busyPhoto ? (
          <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
            Фото…
          </span>
        ) : null}
      </button>
      {showCoverRemove ? (
        <NoraHoverTip className="absolute top-2 right-2 z-[2]" label="Удалить приём" side="bottom">
          <button
            aria-label="Удалить приём"
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0',
              'bg-[var(--nora-panel)] text-[var(--nora-text-secondary)]',
              'shadow-[0_1px_2px_color-mix(in_srgb,var(--nora-text)_18%,transparent)]',
              'hover:bg-[var(--nora-error-soft-bg)] hover:text-[var(--nora-error)]',
              'active:bg-[var(--nora-error)] active:text-[var(--nora-on-accent)]',
              'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
            )}
            data-plan-editor-cover-remove=""
            onClick={() => setConfirmRemove(true)}
            type="button"
          >
            <Trash2Icon aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        </NoraHoverTip>
      ) : null}
      </div>
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void onPickPhoto(file)
        }}
        ref={fileRef}
        type="file"
      />
        <div className={cn('flex min-w-0 items-stretch', !slotChrome && 'gap-1.5')}>
          <FieldPlaque className="min-w-0 flex-1">
            <NoraInput
              aria-label="Название"
              className={cn(TITLE_FIELD_CLASS, '!font-[300]', FIELD_FACE_CLASS, FIELD_FACE_RADIUS_CLASS)}
              onChange={(event) => onPatch({ title: event.target.value })}
              placeholder="Название блюда"
              value={meal.title}
            />
          </FieldPlaque>
          {!slotChrome ? (
            <div className="w-[calc((100%-3*0.375rem)/4)] shrink-0" data-plan-editor-meal-slot="">
              <FieldPlaque>
                <NoraSelect
                  className={HEADER_SLOT_SELECT_CLASS}
                  contentClassName={productToolbarSelectContentClass}
                  itemClassName={productToolbarSelectItemClass}
                  items={[...SLOT_ITEMS]}
                  modal
                  onValueChange={(value) => {
                    if (value && isSlot(value)) onPatch({ slot: value })
                  }}
                  value={meal.slot}
                />
              </FieldPlaque>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {MACRO_FIELDS.map((field) => (
            <MacroField
              ariaLabel={field.ariaLabel}
              icon={field.icon}
              key={field.key}
              label={field.label}
              onChange={(value) => onPatch({ [field.key]: value })}
              value={meal[field.key]}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <DraftLineList
          addAriaLabel="Добавить ингредиент"
          items={draftLineItems(meal.ingredients)}
          label="Ингредиенты"
          onChange={(items) => onPatch({ ingredients: joinDraftLines(items) })}
          placeholder="2 яйца"
          removeAriaLabel="Удалить ингредиент"
        />
        <DraftLineList
          addAriaLabel="Добавить шаг"
          items={draftLineItems(meal.stepsText)}
          label="Шаги"
          onChange={(items) => onPatch({ stepsText: joinDraftLines(items) })}
          placeholder="Взбейте яйца"
          removeAriaLabel="Удалить шаг"
        />
      </div>
      {onRemove ? (
        <DeleteCardDialog
          confirmLabel={removePrompt.confirmLabel}
          description={removePrompt.description}
          onConfirm={() => {
            setConfirmRemove(false)
            onRemove()
          }}
          onOpenChange={setConfirmRemove}
          open={confirmRemove}
          title={removePrompt.title}
        />
      ) : null}
    </section>
  )
}

function DraftLineList({
  label,
  addAriaLabel,
  items,
  placeholder,
  removeAriaLabel,
  onChange,
}: {
  label: string
  addAriaLabel: string
  items: string[]
  placeholder: string
  removeAriaLabel: string
  onChange: (items: string[]) => void
}) {
  return (
    <div className="flex flex-col gap-4" data-draft-line-list={label}>
      <p className={EDITOR_CAPTION_CLASS} data-settings-subtitle="">{label}</p>
      <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={`${label}-${index}`}>
          <div
            className={cn(SLOT_ROW_CLASS, 'min-w-0 flex-1', FIELD_INSET_CLASS, '!gap-[calc(0.625rem*2/3)]')}
            data-ration-field-plaque=""
          >
            <span className={LINE_INDEX_CLASS}>{index + 1}</span>
            <div
              className="[--ios-min:2.42rem] [--ios-px:0.75rem] [--ios-py:0.5rem] max-md:block max-md:min-w-0 max-md:flex-1 md:contents"
              data-ios-13-slot="area"
            >
              <NoraTextarea
                className={LINE_INPUT_CLASS}
                onChange={(event) =>
                  onChange(setDraftLine(items, index, event.target.value.replace(/\r?\n+/g, ' ')))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                placeholder={placeholder}
                rows={1}
                value={item}
              />
            </div>
            <button
              aria-label={removeAriaLabel}
              className={cn(MEAL_TRASH_CLASS, 'ml-auto')}
              disabled={items.length <= 1}
              onClick={() => onChange(removeDraftLine(items, index))}
              type="button"
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
          <button
            aria-label={addAriaLabel}
            className={LINE_ADD_CLASS}
            data-draft-line-add=""
            onClick={() => onChange(addDraftLine(items, index))}
            type="button"
          >
            <PlusIcon className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      ))}
      </div>
    </div>
  )
}

function MacroField({
  label,
  ariaLabel,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  ariaLabel?: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  value: string
  onChange?: (value: string) => void
}) {
  return (
    <label className={cn('grid !gap-[calc(0.625rem*2/3)]', FIELD_CHIP_CLASS, FIELD_INSET_CLASS)} data-ration-field-plaque="">
      <span className="inline-flex items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
        <Icon aria-hidden className={MACRO_ICON_CLASS} strokeWidth={1.75} />
        {label}
      </span>
      <div className="md:contents max-md:relative max-md:h-[2.42rem] max-md:w-full" data-ios-13-slot="">
        <NoraInput
          aria-label={ariaLabel ?? label}
          className={cn(
            FIELD_TYPE_CLASS,
            '!font-[300]',
            FIELD_FACE_CLASS,
            '!h-[2.42rem] px-1 text-center tabular-nums',
            FIELD_FACE_RADIUS_CLASS,
          )}
          inputMode="decimal"
          onChange={(event) => onChange?.(macroDraftInput(event.target.value))}
          value={macroDraftInput(value)}
        />
      </div>
    </label>
  )
}
