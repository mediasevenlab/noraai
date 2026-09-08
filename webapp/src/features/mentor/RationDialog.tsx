import * as React from 'react'
import {
  ChefHatIcon,
  PencilIcon,
  ShoppingBasketIcon,
  UtensilsIcon,
  XIcon,
} from 'lucide-react'

import {
  ProductCardOriginBadge,
  ProductSheetTabFade,
  productCardOriginModalAnchorClass,
  productSheetTabDockClass,
} from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { RationCover, RationMacrosPlaque, RationSlotBadge } from './RationCard'
import { rationCardOrigin } from './authored-rations'
import {
  RATION_DIALOG_FRAME_CLASS,
  RATION_OVERLAY_CHIP_CLASS,
  RATION_TAB_CLASS,
} from './ration-chrome'
import {
  rationIngredientItems,
  rationShoppingItems,
  type RationEntry,
  type RationMeal,
} from './rations-catalog'

const RATION_DETAIL_TABS = [
  { value: 'Меню', icon: UtensilsIcon },
  { value: 'Готовка', icon: ChefHatIcon },
  { value: 'Покупки', icon: ShoppingBasketIcon },
] as const

export type RationDetailTab = (typeof RATION_DETAIL_TABS)[number]['value']

function RationDetailHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
      {children}
    </p>
  )
}

function RationMealRow({
  meal,
  active,
  pressed,
  onSelect,
}: {
  meal: RationMeal
  active: boolean
  pressed?: boolean
  onSelect: () => void
}) {
  const items = rationIngredientItems(meal.ingredients)
  return (
    <div className="flex flex-col items-start gap-2">
      <RationSlotBadge active={active} onSelect={onSelect} pressed={pressed} slot={meal.slot} />
      <p className="min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
        {meal.title}
      </p>
      <ul className="list-disc space-y-2.5 pl-5 font-[family-name:var(--nora-font)]">
        {items.map((item) => (
          <li key={item}>
            <span className="text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
              {item}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
        {meal.kcal} ккал · Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}
      </p>
    </div>
  )
}

function RationRecipeBlock({
  meal,
  index,
  active,
  pressed,
  onSelect,
}: {
  meal: RationMeal
  index: number
  active: boolean
  pressed?: boolean
  onSelect: () => void
}) {
  return (
    <li className="flex flex-col items-start gap-2" data-ration-meal-index={index}>
      <RationSlotBadge active={active} onSelect={onSelect} pressed={pressed} slot={meal.slot} />
      <p className="min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
        {meal.title}
      </p>
      <ol className="list-decimal space-y-2.5 pl-5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
        {meal.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </li>
  )
}

export function RationOpenDetail({
  collapsing = false,
  ration,
  tab,
  previewIndex,
  hideClose = false,
  onEdit,
  demoPressedTab = null,
  demoPressedMealIndex = null,
  onTabChange,
  onPreviewIndexChange,
}: {
  collapsing?: boolean
  ration: RationEntry
  tab: RationDetailTab
  previewIndex: number
  hideClose?: boolean
  onEdit?: () => void
  demoPressedTab?: RationDetailTab | null
  demoPressedMealIndex?: number | null
  onTabChange: (tab: RationDetailTab) => void
  onPreviewIndexChange: (index: number) => void
}) {
  const shopping = rationShoppingItems(ration.meals)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="group/preview relative shrink-0 px-2.5 pt-2.5 sm:px-2 sm:pt-2">
        <div className="relative">
          <RationCover
            className={cn(
              'w-full rounded-[12px] shadow-[inset_0_0_0_1px_var(--nora-border)] sm:rounded-[14px]',
              'transition-[height,max-height] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0',
              collapsing
                ? 'h-[168px] max-h-[168px] sm:!h-[168px] sm:!max-h-[168px] duration-[620ms]'
                : 'duration-700',
            )}
            onSelectedIndexChange={onPreviewIndexChange}
            ration={ration}
            selectedIndex={previewIndex}
            sizes="lg"
          />
          {collapsing ? null : (
            <div className={productCardOriginModalAnchorClass}>
              <ProductCardOriginBadge origin={rationCardOrigin(ration)} />
            </div>
          )}
          {onEdit ? (
            <button
              aria-label="Изменить"
              className={cn(
                RATION_OVERLAY_CHIP_CLASS,
                'nora-press-grow absolute top-3.5 right-12 z-[2] size-8 sm:right-10 sm:size-6',
                'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
              )}
              onClick={onEdit}
              type="button"
            >
              <PencilIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
          {hideClose ? null : (
            <DialogClose
              aria-label="Закрыть"
              className={cn(
                RATION_OVERLAY_CHIP_CLASS,
                'nora-press-grow absolute top-3.5 right-3.5 z-[2] size-8 sm:size-6',
                'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
              )}
            >
              <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            </DialogClose>
          )}
        </div>
        {collapsing ? null : (
          <div className="pointer-events-none absolute inset-x-3 bottom-3.5 z-[1] flex justify-center px-1.5 sm:inset-x-2 sm:bottom-2.5">
            <RationMacrosPlaque ration={ration} />
          </div>
        )}
      </div>
      <DialogHeader
        className={cn(
          'min-w-0 shrink-0 gap-1 px-3 pt-3 text-left transition-[opacity,padding] ease-out sm:px-4 sm:pt-3.5',
          collapsing
            ? 'pointer-events-none bg-transparent py-0 opacity-0'
            : 'bg-[var(--nora-modal)]',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
          {ration.title}
        </DialogTitle>
        <DialogDescription className="whitespace-pre-line font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          {ration.description}
        </DialogDescription>
        <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
      </DialogHeader>
      <Tabs
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden transition-opacity ease-out',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        onValueChange={(value) => onTabChange(value as RationDetailTab)}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
        value={tab}
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 pt-3 pb-8 sm:px-4">
            <TabsContent className="mt-0 text-[13px] font-normal" data-ration-tab="Меню" value="Меню">
              <div className="space-y-5">
                {ration.meals.map((meal, index) => (
                  <div data-ration-meal-index={index} key={`${meal.slot}-${meal.title}`}>
                    <RationMealRow
                      active={previewIndex === index}
                      meal={meal}
                      onSelect={() => onPreviewIndexChange(index)}
                      pressed={demoPressedMealIndex === index}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent
              className="mt-0 text-[13px] font-normal"
              data-ration-tab="Готовка"
              value="Готовка"
            >
              <ul className="space-y-5">
                {ration.meals.map((meal, index) => (
                  <RationRecipeBlock
                    active={previewIndex === index}
                    index={index}
                    key={`${meal.slot}-${meal.title}`}
                    meal={meal}
                    onSelect={() => onPreviewIndexChange(index)}
                    pressed={demoPressedMealIndex === index}
                  />
                ))}
              </ul>
            </TabsContent>
            <TabsContent
              className="mt-0 text-[13px] font-normal"
              data-ration-tab="Покупки"
              value="Покупки"
            >
              <RationDetailHeading>Список</RationDetailHeading>
              <ul className="mt-2 list-disc space-y-2.5 pl-5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]">
                {shopping.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </TabsContent>
          </div>
        </ScrollArea>
        <div className={productSheetTabDockClass}>
          <ProductSheetTabFade />
          <TabsList className="h-8 gap-1.5 bg-transparent p-0">
            {RATION_DETAIL_TABS.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger
                  className={RATION_TAB_CLASS}
                  data-demo-pressed={demoPressedTab === item.value ? '' : undefined}
                  key={item.value}
                  value={item.value}
                >
                  <Icon className="size-[15px]" strokeWidth={1.75} />
                  {item.value}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}

export function RationDialog({
  open,
  ration,
  onEdit,
  onOpenChange,
}: {
  open: boolean
  ration: RationEntry | null
  onEdit?: () => void
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<RationDetailTab>('Меню')
  const [previewIndex, setPreviewIndex] = React.useState(0)
  const [loadedRationId, setLoadedRationId] = React.useState(ration?.id)
  if (ration?.id !== loadedRationId) {
    setLoadedRationId(ration?.id)
    setTab('Меню')
    setPreviewIndex(0)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={RATION_DIALOG_FRAME_CLASS}
        data-modal-frame="meal"
        showCloseButton={false}
      >
        {ration ? (
          <RationOpenDetail
            onEdit={onEdit}
            onPreviewIndexChange={setPreviewIndex}
            onTabChange={setTab}
            previewIndex={previewIndex}
            ration={ration}
            tab={tab}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
