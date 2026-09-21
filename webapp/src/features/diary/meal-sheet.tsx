import * as React from 'react'
import {
  ArrowUpIcon,
  LeafIcon,
  Loader2Icon,
  Maximize2Icon,
  MessageCircleIcon,
  Minimize2Icon,
  UtensilsIcon,
  XIcon,
} from 'lucide-react'

import {
  productSheetCardFrameClass,
  productSheetOverlayChipClass,
  productSheetTabTriggerClass,
  type ProductCardOrigin,
} from '@/components/nora/product-sheet'
import { DialogClose } from '@/components/ui/dialog'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { MEAL_TAB_ENTER_MS } from './meal-card-reveal'

const MEAL_GLASS_GLARE_SHADOW =
  'shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent),0_1px_2px_color-mix(in_srgb,var(--nora-text)_14%,transparent)]'
export const MEAL_MODAL_CHIP_CLASS = cn(
  'ios-glass-glare-soft rounded-full border-0 bg-[var(--nora-input-bg)]/72 backdrop-blur-[16px]',
)
export const MEAL_DETAIL_TAB_CLASS = cn(
  productSheetTabTriggerClass,
  '[&_svg]:text-current',
  'disabled:opacity-100',
  // Invert active tab vs theme: dark pill in light mode, light pill in dark mode.
  'data-active:!bg-[var(--nora-text)] data-active:!text-[var(--nora-panel)]',
  'data-active:hover:!bg-[var(--nora-text)] data-active:hover:!text-[var(--nora-panel)]',
)
export const MEAL_COMPOSER_FIELD_CLASS =
  'meal-composer-field relative flex flex-col rounded-[20px] bg-[var(--nora-panel)] px-4 pt-4 pb-3'

const MEAL_MODAL_SEND_BASE =
  'ios-glass-glare inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_55%,transparent)] disabled:opacity-100'

export const MEAL_MODAL_SEND_CLASS = cn(
  MEAL_MODAL_SEND_BASE,
  'cursor-pointer bg-[var(--nora-text)] text-[var(--nora-panel)] hover:opacity-90 disabled:cursor-not-allowed',
)

export type MealComposerSendTone = 'idle' | 'ready' | 'sending'

export function mealComposerSendTone(input: {
  sending: boolean
  hasDraft: boolean
}): MealComposerSendTone {
  if (input.sending) return 'sending'
  if (input.hasDraft) return 'ready'
  return 'idle'
}

export function mealComposerSendClass(tone: MealComposerSendTone) {
  if (tone === 'idle') {
    return cn(
      MEAL_MODAL_SEND_BASE,
      'cursor-not-allowed bg-[var(--nora-text)]/58 text-[var(--nora-panel)]',
    )
  }
  if (tone === 'sending') {
    return cn(
      MEAL_MODAL_SEND_BASE,
      'cursor-wait bg-[var(--nora-text)]/80 text-[var(--nora-panel)]',
    )
  }
  return MEAL_MODAL_SEND_CLASS
}

export function MealComposerSendButton({
  tone,
  onClick,
  disabled = false,
  pressed = false,
  idleLabel = 'Отправить',
  sendingLabel = 'Отправка',
}: {
  tone: MealComposerSendTone
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  idleLabel?: string
  sendingLabel?: string
}) {
  const sending = tone === 'sending'
  return (
    <button
      aria-busy={sending}
      aria-label={sending ? sendingLabel : idleLabel}
      className={mealComposerSendClass(tone)}
      data-demo-pressed={pressed ? '' : undefined}
      disabled={disabled || tone !== 'ready'}
      onClick={onClick}
      type="button"
    >
      {sending ? (
        <Loader2Icon aria-hidden className="size-[18px] animate-spin" strokeWidth={1.75} />
      ) : (
        <ArrowUpIcon className="size-[18px]" strokeWidth={1.75} />
      )}
    </button>
  )
}
export const MEAL_ATTACH_REMOVE_CLASS = cn(
  // Opaque white disc + dark X. Keep full opacity when disabled so demo/busy
  // states do not turn the chip into a transparent ghost over the photo.
  'ios-glass-glare absolute top-0.5 right-0.5 z-[1] inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-panel)] text-[var(--nora-text)] outline-none backdrop-blur-[16px] hover:bg-[var(--nora-error)] hover:text-white disabled:cursor-not-allowed disabled:opacity-100',
  MEAL_GLASS_GLARE_SHADOW,
)

export const MEAL_DETAIL_TABS = [
  'Состав',
  'Нутриенты',
  'Комментарий',
] as const

export type MealDetailTab = (typeof MEAL_DETAIL_TABS)[number]

const MEAL_DETAIL_TAB_ICONS = {
  Состав: UtensilsIcon,
  Нутриенты: LeafIcon,
  Комментарий: MessageCircleIcon,
} as const satisfies Record<MealDetailTab, React.ComponentType<{ className?: string; strokeWidth?: number }>>

export const MEAL_TAB_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function MealDialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogClose
      aria-label="Закрыть"
      className={cn(
        MEAL_MODAL_CHIP_CLASS,
        'nora-press-grow inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 leading-none text-[var(--nora-text)] outline-none hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)] [&_svg]:block [&_svg]:shrink-0',
        className,
      )}
    >
      <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
    </DialogClose>
  )
}

export function MealDetailTabRow({
  enter = false,
  locked = false,
  hideClose = false,
  pressedTab = null,
}: {
  enter?: boolean
  locked?: boolean
  hideClose?: boolean
  pressedTab?: MealDetailTab | null
}) {
  const [entered, setEntered] = React.useState(!enter)

  React.useEffect(() => {
    if (!enter || entered) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => setEntered(true), reduced ? 0 : 16)
    return () => window.clearTimeout(id)
  }, [enter, entered])

  const fadeStyle = {
    transitionDuration: `${MEAL_TAB_ENTER_MS}ms`,
    transitionProperty: 'opacity',
    transitionTimingFunction: MEAL_TAB_EASE,
  } as const

  return (
    <div className="relative mb-2 flex h-8 items-center gap-1.5">
      <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain no-scrollbar">
        <div className="w-max">
          <TabsList
            className={cn(
              'h-8 gap-1.5 bg-transparent p-0 motion-reduce:transition-none',
              locked && 'pointer-events-none',
              entered ? 'opacity-100' : 'opacity-0',
            )}
            style={fadeStyle}
          >
            {MEAL_DETAIL_TABS.map((tab) => {
              const IconTab = MEAL_DETAIL_TAB_ICONS[tab]
              return (
                <TabsTrigger
                  className={MEAL_DETAIL_TAB_CLASS}
                  data-demo-pressed={pressedTab === tab ? '' : undefined}
                  disabled={locked}
                  key={tab}
                  value={tab}
                >
                  <IconTab className="size-[15px]" strokeWidth={1.75} />
                  {tab}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </div>
      {hideClose ? null : (
        <span
          className={cn('inline-flex motion-reduce:transition-none', entered ? 'opacity-100' : 'opacity-0')}
          style={fadeStyle}
        >
          <MealDialogCloseButton />
        </span>
      )}
    </div>
  )
}

export function MealDetailHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
      {children}
    </p>
  )
}

export function MealTabViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
      <div className="flex min-h-full flex-1 flex-col px-3 pt-3 pb-4 sm:px-4">
        {children}
      </div>
    </div>
  )
}

export const MEAL_DIALOG_HERO_CLASS = 'group/preview relative shrink-0 px-2.5 pt-2.5 sm:px-2 sm:pt-2'
export const MEAL_DIALOG_COVER_CLASS =
  'w-full rounded-[12px] shadow-[inset_0_0_0_1px_var(--nora-border)] sm:rounded-[14px]'
export const MEAL_DIALOG_HERO_FRAME_CLASS =
  'h-[min(44vw,240px)] max-h-[min(44vw,240px)] transition-[height,max-height] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[268px] sm:max-h-none group-data-[hero-expanded]/preview:h-[min(88vw,480px)] group-data-[hero-expanded]/preview:max-h-[min(88vw,480px)] sm:group-data-[hero-expanded]/preview:h-[268px] sm:group-data-[hero-expanded]/preview:max-h-none'
export const MEAL_DIALOG_MACROS_OVERLAY_CLASS =
  'pointer-events-none absolute inset-x-3 bottom-3.5 z-[1] flex justify-center px-1.5 sm:inset-x-2 sm:bottom-2.5'

export const MEAL_DIALOG_FRAME_CLASS = productSheetCardFrameClass
export const MEAL_DIALOG_OVERLAY_CHIP_CLASS = productSheetOverlayChipClass

const RATION_CARD_STATUS_BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-[22px] min-h-[22px] max-h-[22px] shrink-0 items-center gap-0.5 rounded-full border-0 py-0 pr-1.5 pl-1',
  'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none whitespace-nowrap backdrop-blur-[10px] text-white',
)

export const RATION_DONE_CARD_BADGE_CLASS = cn(
  RATION_CARD_STATUS_BADGE_CLASS,
  'bg-[#16A34A] text-white',
)

export const RATION_PICKED_CARD_BADGE_CLASS = cn(
  RATION_CARD_STATUS_BADGE_CLASS,
  'bg-[var(--nora-tint)] text-white',
)

/** Planned covers stay black-and-white with a light blue wash until done. */
export const RATION_PENDING_COVER_CLASS = cn(
  '[&_img]:[filter:grayscale(1)_blur(var(--planned-cover-blur))]',
  'after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:bg-[var(--planned-cover-wash)] after:content-[""]',
)

export const MEAL_DIALOG_HERO_EXPAND_CLASS = cn(
  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
  'nora-press-grow absolute bottom-3.5 right-3.5 z-[2] size-8 sm:hidden',
  'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
)

export const MEAL_DIALOG_HERO_CLOSE_CLASS = cn(
  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
  'nora-press-grow absolute top-3.5 right-3.5 z-[2] hidden size-6 sm:inline-flex',
  'pointer-events-none opacity-0 transition-[opacity,color]',
  'group-hover/preview:pointer-events-auto group-hover/preview:opacity-100',
  'hover:text-[var(--nora-text)] focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:shadow-[var(--nora-shadow-focus)]',
)

export function MealDialogHero({
  preview,
  macros,
  showClose = true,
}: {
  preview: React.ReactNode
  macros: React.ReactNode
  origin?: ProductCardOrigin
  showClose?: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <div
      className={MEAL_DIALOG_HERO_CLASS}
      data-hero-expanded={expanded ? '' : undefined}
    >
      <div className="relative">
        {preview}
        <button
          aria-label={expanded ? 'Уменьшить превью' : 'Увеличить превью'}
          aria-pressed={expanded}
          className={MEAL_DIALOG_HERO_EXPAND_CLASS}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? (
            <Minimize2Icon className="size-3.5" />
          ) : (
            <Maximize2Icon className="size-3.5" />
          )}
        </button>
        {showClose ? <MealDialogCloseButton className={MEAL_DIALOG_HERO_CLOSE_CLASS} /> : null}
      </div>
      <div className={MEAL_DIALOG_MACROS_OVERLAY_CLASS}>{macros}</div>
    </div>
  )
}
