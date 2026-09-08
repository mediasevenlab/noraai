import * as React from 'react'
import {
  CameraIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CoffeeIcon,
  CookieIcon,
  DropletIcon,
  FileTextIcon,
  FlameIcon,
  MoonIcon,
  PlusIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { NoraInput, NoraSelect, NoraTextarea } from '@/components/nora/primitives'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fileToMealImage } from '@/features/diary'
import {
  ProductSheetTabFade,
  productSheetEditorFrameClass,
  productSheetTabDockClass,
  productSheetTabTriggerClass,
} from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

import {
  addDraftLine,
  draftLineItems,
  draftRationTotals,
  emptyMealDraft,
  emptyRationDraft,
  finalizeRationDraft,
  joinDraftLines,
  nextUnusedMealSlot,
  previewRationFromDraft,
  removeDraftLine,
  setDraftLine,
  reorderMealDrafts,
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
    titlePlaceholder: 'Например, Лёгкий старт 1600',
    descriptionPlaceholder: 'Коротко, что в дне',
    emptyTitleError: 'Назовите рацион',
  },
  plan: {
    untitled: 'Новый план',
    editing: 'Редактор плана',
    saveNew: 'Создать план',
    titlePlaceholder: 'Например, Офис без срывов',
    descriptionPlaceholder: 'Коротко, что в плане',
    emptyTitleError: 'Назовите план',
  },
} as const

const FIELD_TYPE_CLASS = cn(
  'font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5',
  'text-[var(--nora-text)] placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)]',
)
const FIELD_CHIP_CLASS = 'rounded-[14px] !bg-[var(--nora-inset)]'
const FIELD_FACE_CLASS = '!bg-[var(--nora-panel)]'
const FIELD_CLASS = cn(FIELD_TYPE_CLASS, FIELD_CHIP_CLASS, 'w-full px-3')
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
const SLOT_ROW_CLASS = cn(
  'ios-glass-glare-soft flex min-h-12 items-center gap-2 rounded-[14px] px-2 py-2',
  'bg-[var(--nora-inset)]',
)
const MEAL_INDEX_CLASS = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
  FIELD_FACE_CLASS,
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none',
  'text-[var(--nora-text-secondary)]',
)
const FIELD_LABEL_CLASS =
  'font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'
const SECTION_HEADING_CLASS =
  'font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
const ADD_MEAL_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center rounded-full border-0 px-3 py-0',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none tracking-normal',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const COMPOSER_ACTION_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center rounded-full border-0 px-3 py-0',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none backdrop-blur-[16px]',
  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
  'outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
)
const COMPOSER_FOOTER_ACTION_CLASS = cn(
  COMPOSER_ACTION_CLASS,
  'h-11 min-h-11 max-h-11 w-full justify-center rounded-full px-4',
)
const MEAL_TAB_CLASS = productSheetTabTriggerClass
const SECTION_DIVIDER_CLASS = 'border-t border-[var(--nora-divider)]'
const TITLE_GOAL_ROW_CLASS = 'grid grid-cols-[minmax(0,1fr)_10.5rem] items-start gap-3'
const EDITOR_TABS_DOCK_CLASS = productSheetTabDockClass
const MACRO_ICON_CLASS = 'size-[13px] shrink-0'
const DESCRIPTION_TAB = 'description'

const SLOT_ITEMS = RATION_MEAL_SLOTS.map((slot) => ({ value: slot, label: slot }))
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

export function RationEditorDialog({
  open,
  draft,
  ownerId,
  mode = 'ration',
  finalizeOptions,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  draft: RationDraft | null
  ownerId: string
  mode?: 'ration' | 'plan'
  finalizeOptions?: { idPrefix?: string; source?: string; emptyTitleError?: string }
  onOpenChange: (open: boolean) => void
  onSave: (ration: RationEntry) => void | Promise<void>
  onDelete?: (rationId: string) => void | Promise<void>
}) {
  const copy = EDITOR_COPY[mode]
  const saveInFooter = mode === 'plan'
  const [form, setForm] = React.useState<RationDraft>(draft ?? emptyRationDraft())
  const [activeTab, setActiveTab] = React.useState(DESCRIPTION_TAB)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const draftKey = `${open ? 'open' : 'closed'}:${draft?.id ?? 'new'}`
  const [loadedDraftKey, setLoadedDraftKey] = React.useState(draftKey)
  if (open && draft && loadedDraftKey !== draftKey) {
    setLoadedDraftKey(draftKey)
    setForm(draft)
    setActiveTab(DESCRIPTION_TAB)
  }
  if (activeTab !== DESCRIPTION_TAB && !form.meals.some((meal) => meal.key === activeTab)) {
    setActiveTab(DESCRIPTION_TAB)
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  const preview = previewRationFromDraft(form)
  const heading = form.title.trim() || copy.untitled
  const totals = draftRationTotals(form)
  const editing = Boolean(form.id)
  const saveLabel = editing ? 'Сохранить' : copy.saveNew

  function patch(next: Partial<RationDraft>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function patchMeal(key: string, next: Partial<RationMealDraft>) {
    setForm((current) => ({
      ...current,
      meals: current.meals.map((meal) => (meal.key === key ? { ...meal, ...next } : meal)),
    }))
  }

  function moveMeal(key: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.meals.findIndex((meal) => meal.key === key)
      const target = current.meals[index + direction]
      if (!target) return current
      return { ...current, meals: reorderMealDrafts(current.meals, key, target.key) }
    })
  }

  function reorderMeal(fromKey: string, toKey: string) {
    setForm((current) => ({ ...current, meals: reorderMealDrafts(current.meals, fromKey, toKey) }))
  }

  function removeMeal(key: string) {
    setForm((current) => {
      if (current.meals.length <= 1) return current
      return { ...current, meals: current.meals.filter((meal) => meal.key !== key) }
    })
    if (activeTab === key) setActiveTab(DESCRIPTION_TAB)
  }

  async function handleSave() {
    const result = finalizeRationDraft(form, ownerId, {
      ...finalizeOptions,
      emptyTitleError: finalizeOptions?.emptyTitleError ?? copy.emptyTitleError,
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    await onSave(result.ration)
  }

  function addMeal() {
    const meal = emptyMealDraft(nextUnusedMealSlot(form.meals))
    setForm((current) => ({ ...current, meals: [...current.meals, meal] }))
    if (activeTab !== DESCRIPTION_TAB) setActiveTab(meal.key)
  }

  function changeTab(value: string) {
    setActiveTab(value)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={EDITOR_FRAME_CLASS}
        data-modal-frame="meal"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{editing ? copy.editing : copy.untitled}</DialogTitle>
          <DialogDescription>
            {preview.description || 'Названия приёмов появятся здесь'}
          </DialogDescription>
        </DialogHeader>
        <Tabs
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          onValueChange={changeTab}
          value={activeTab}
        >
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
          <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="flex flex-col gap-4 px-3 pt-3 pb-8 sm:px-4">
              <TabsContent className="mt-0" data-ration-tab="description" value={DESCRIPTION_TAB}>
                <div className="flex flex-col gap-4">
                  <section>
                    <p className="whitespace-pre-line font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                      {preview.description || 'Названия приёмов появятся здесь'}
                    </p>
                    <p className="mt-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
                      {totals.kcal} ккал · Б {totals.protein} · Ж {totals.fat} · У {totals.carbs}
                      {` · ${preview.mealsPerDay} ${preview.mealsPerDay === 1 ? 'приём' : 'приёма'}`}
                    </p>
                  </section>
                  <div className={TITLE_GOAL_ROW_CLASS}>
                    <label className="grid min-w-0 gap-1.5">
                      <span className={FIELD_LABEL_CLASS}>Название</span>
                      <NoraInput
                        className={TITLE_FIELD_CLASS}
                        onChange={(event) => patch({ title: event.target.value })}
                        placeholder={copy.titlePlaceholder}
                        value={form.title}
                      />
                    </label>
                    <label className="grid min-w-0 gap-1.5">
                      <span className={FIELD_LABEL_CLASS}>Цель</span>
                      <NoraSelect
                        className={GOAL_FIELD_CLASS}
                        items={[...GOAL_ITEMS]}
                        onValueChange={(value) => {
                          if (value && isGoal(value)) patch({ goal: value })
                        }}
                        value={form.goal}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5">
                    <span className={FIELD_LABEL_CLASS}>Описание</span>
                    <NoraTextarea
                      className={cn(FIELD_CLASS, 'min-h-16 px-3 py-2.5')}
                      onChange={(event) => patch({ description: event.target.value })}
                      placeholder={copy.descriptionPlaceholder}
                      value={form.description}
                    />
                  </label>
                  <div aria-hidden className={SECTION_DIVIDER_CLASS} />
                  <MealsSectionHeading
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
                </div>
              </TabsContent>
              {form.meals.map((meal, index) => (
                <TabsContent
                  className="mt-0"
                  data-ration-tab="meal"
                  key={meal.key}
                  value={meal.key}
                >
                  <div className="flex flex-col gap-4">
                    <MealsSectionHeading
                      onAdd={addMeal}
                      onSave={handleSave}
                      saveLabel={saveLabel}
                      showSave={!saveInFooter}
                    />
                    <MealDraftCard
                      index={index}
                      meal={meal}
                      onPatch={(next) => patchMeal(meal.key, next)}
                      onRemove={form.meals.length > 1 ? () => removeMeal(meal.key) : undefined}
                    />
                  </div>
                </TabsContent>
              ))}
            </div>
          </div>
          <div className={cn(EDITOR_TABS_DOCK_CLASS, saveInFooter && 'pb-2 sm:pb-2')}>
            <ProductSheetTabFade />
            <div className="min-w-0 overflow-x-auto overscroll-x-contain no-scrollbar">
              <TabsList className="h-8 gap-1.5 bg-transparent p-0">
                <TabsTrigger className={MEAL_TAB_CLASS} value={DESCRIPTION_TAB}>
                  <FileTextIcon className="size-[15px]" strokeWidth={1.75} />
                  Описание
                </TabsTrigger>
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
            </div>
          </div>
          {saveInFooter ? (
            <div className="shrink-0 px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              <button className={COMPOSER_FOOTER_ACTION_CLASS} onClick={() => void handleSave()} type="button">
                {saveLabel}
              </button>
            </div>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function MealsSectionHeading({
  onAdd,
  onSave,
  saveLabel,
  showSave = true,
}: {
  onAdd: () => void
  onSave: () => void
  saveLabel: string
  showSave?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={cn(SECTION_HEADING_CLASS, 'min-w-0 truncate')}>Приёмы дня</p>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <button className={ADD_MEAL_CLASS} onClick={onAdd} type="button">
          Приём
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
        className={cn(
          FIELD_TYPE_CLASS,
          FIELD_FACE_CLASS,
          '!h-8 !min-h-8 !max-h-8 w-[8.5rem] !rounded-full !px-2.5',
        )}
        items={[...SLOT_ITEMS]}
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
        <button
          aria-label="Удалить приём"
          className="nora-press-grow inline-flex size-8 items-center justify-center text-[var(--nora-text-secondary)] disabled:opacity-30"
          disabled={!onRemove}
          onClick={onRemove}
          type="button"
        >
          <Trash2Icon className="size-4" />
        </button>
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
    <div className="grid gap-2" data-meal-order-list="">
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

function MealDraftCard({
  meal,
  index,
  onPatch,
  onRemove,
}: {
  meal: RationMealDraft
  index: number
  onPatch: (next: Partial<RationMealDraft>) => void
  onRemove?: () => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [busyPhoto, setBusyPhoto] = React.useState(false)

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setBusyPhoto(true)
    try {
      const image = await fileToMealImage(file)
      onPatch({ image: `data:${image.mime};base64,${image.base64}` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить фото')
    } finally {
      setBusyPhoto(false)
    }
  }

  return (
    <section className="flex flex-col gap-1.5">
      <MealSlotToolbar
        index={index}
        meal={meal}
        onPatch={onPatch}
        onRemove={onRemove}
      />
      <button
        className={cn(FIELD_CHIP_CLASS, 'relative aspect-[4/3] min-h-28 w-full overflow-hidden p-0')}
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        {meal.image ? (
          <img alt="" className="absolute inset-0 size-full object-cover" src={meal.image} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
            <CameraIcon className="size-4" />
            {busyPhoto ? 'Фото…' : 'Фото'}
          </span>
        )}
      </button>
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
      <NoraInput
        className={TITLE_FIELD_CLASS}
        onChange={(event) => onPatch({ title: event.target.value })}
        placeholder="Название блюда"
        value={meal.title}
      />
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
      <div className="grid gap-4">
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
    <div className="grid gap-2" data-draft-line-list={label}>
      <p className={SECTION_HEADING_CLASS}>{label}</p>
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={`${label}-${index}`}>
          <div className={cn(SLOT_ROW_CLASS, 'min-w-0 flex-1')}>
            <span className={MEAL_INDEX_CLASS}>{index + 1}</span>
            <NoraInput
              className={cn(
                FIELD_TYPE_CLASS,
                FIELD_FACE_CLASS,
                '!h-8 !min-h-8 !max-h-8 min-w-0 flex-1 !rounded-full !px-2.5',
              )}
              onChange={(event) => onChange(setDraftLine(items, index, event.target.value))}
              placeholder={placeholder}
              value={item}
            />
            <button
              aria-label={removeAriaLabel}
              className="nora-press-grow ml-auto inline-flex size-8 items-center justify-center text-[var(--nora-text-secondary)] disabled:opacity-30"
              disabled={items.length <= 1}
              onClick={() => onChange(removeDraftLine(items, index))}
              type="button"
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
          <button
            aria-label={addAriaLabel}
            className="nora-press-grow ios-glass-glare-soft inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]"
            data-draft-line-add=""
            onClick={() => onChange(addDraftLine(items, index))}
            type="button"
          >
            <PlusIcon className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      ))}
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
  onChange: (value: string) => void
}) {
  return (
    <label className={cn(FIELD_CHIP_CLASS, 'grid gap-1 px-2 py-2')}>
      <span className="inline-flex items-center justify-center gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
        <Icon aria-hidden className={MACRO_ICON_CLASS} strokeWidth={1.75} />
        {label}
      </span>
      <NoraInput
        aria-label={ariaLabel ?? label}
        className={cn(
          FIELD_TYPE_CLASS,
          FIELD_FACE_CLASS,
          '!h-8 !rounded-[10px] px-1 text-center tabular-nums',
        )}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}
