import * as React from 'react'
import {
  BookmarkIcon,
  CookieIcon,
  EllipsisIcon,
  PencilIcon,
  ShoppingBagIcon,
  Trash2Icon,
  ZapIcon,
} from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { NoraButton, NoraHoverTip, NoraIconButton } from '@/components/nora/primitives'
import {
  productCardGoalAnchorClass,
  productCardFooterCtaClass,
  productSheetFrostFillClass,
  productSheetOverlayChipClass,
} from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'
import { usePressWithoutScroll } from '@/platform/press-without-scroll'
import { MealFeedPhoto, prefetchMealPhoto } from '@/features/diary'
import type { SavedAccountScope } from '@/platform/saved-ids'
import { rationCardOrigin } from './authored-rations'
import { RationShoppingDialog } from './RationShoppingDialog'

import {
  GOAL_BADGE_CLASS,
  RATION_CARD_PREVIEW_MIN_CLASS,
  RATION_FROST_BADGE_CLASS,
  RATION_GOAL_CARD_BADGE_CLASS,
  RATION_PHOTO_FADE_MS,
  RATION_PHOTO_SWIPE_PX,
  SLOT_BADGE_CLASS,
} from './ration-chrome'
import { rationCardThumbSrcs, rationMealImages, type RationEntry, type RationMealSlot } from './rations-catalog'

function mealsCountLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} приём`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} приёма`
  return `${count} приёмов`
}

export function RationMacrosPlaque({
  ration,
}: {
  ration: Pick<RationEntry, 'kcal' | 'protein' | 'fat' | 'carbs'>
}) {
  const shell = cn(
    'ios-glass-glare flex h-8 min-h-8 max-h-8 items-center rounded-full py-0 text-[var(--nora-text-secondary)]',
    productSheetFrostFillClass,
  )
  return (
    <div className="pointer-events-none flex items-center gap-1.5">
      <div className={cn(shell, 'gap-1 pl-2.5 pr-3')}>
        <ZapIcon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap text-[11px] font-medium leading-none">
          {ration.kcal}
          <span className="font-medium"> ккал</span>
        </span>
      </div>
      <div className={cn(shell, 'gap-1 pl-2 pr-2.5 text-[11px] leading-none')}>
        <CookieIcon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
        <span className="tabular-nums">
          б {ration.protein} · ж {ration.fat} · у {ration.carbs}
        </span>
      </div>
    </div>
  )
}

const RATION_CARD_PREVIEW_CAPSULE_CLASS = cn(
  'pointer-events-auto absolute bottom-2 z-[2] flex items-center rounded-full! py-[5px] pr-[7px] pl-[7px]',
  'bg-[color-mix(in_srgb,var(--nora-panel)_92%,transparent)] backdrop-blur-[16px]',
  'shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent),0_1px_6px_rgba(0,0,0,0.12)]',
)

const RATION_CARD_THUMB_CAPSULE_CLASS = cn(
  RATION_CARD_PREVIEW_CAPSULE_CLASS,
  'right-2',
  '[&>*:not(:first-child)]:-ml-3',
)

function RationPhotoSlides({
  slides,
  thumbs,
  sizes = 'md',
  onActivate,
  selectedIndex,
  onSelectedIndexChange,
}: {
  slides: string[]
  thumbs: string[]
  sizes?: 'md' | 'lg'
  onActivate?: () => void
  selectedIndex?: number
  onSelectedIndexChange?: (index: number) => void
}) {
  const multiple = slides.length > 1
  const maxIndex = Math.max(0, slides.length - 1)
  const draggedRef = React.useRef(false)
  const pointerRef = React.useRef<{ id: number; x: number; y: number } | null>(null)
  const [uncontrolled, setUncontrolled] = React.useState(selectedIndex ?? 0)
  if (selectedIndex == null && uncontrolled > maxIndex) {
    setUncontrolled(maxIndex)
  }
  const active = Math.max(0, Math.min(selectedIndex ?? uncontrolled, maxIndex))
  const aligned = thumbs.length === slides.length
  const press = usePressWithoutScroll(onActivate)

  function goTo(index: number) {
    const next = Math.max(0, Math.min(maxIndex, index))
    if (selectedIndex == null) setUncontrolled(next)
    onSelectedIndexChange?.(next)
  }

  if (slides.length === 0 && thumbs.length === 0) return null

  return (
    <>
      <div
        className="absolute inset-0 size-full touch-pan-y overflow-hidden overscroll-x-none"
        onClick={(event) => {
          if (draggedRef.current) {
            event.stopPropagation()
            return
          }
          press.onClick(event)
        }}
        onPointerCancel={() => {
          pointerRef.current = null
          press.onPointerCancel()
        }}
        onPointerDown={(event) => {
          press.onPointerDown(event)
          if (!multiple || event.button !== 0) return
          draggedRef.current = false
          pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
        }}
        onPointerMove={(event) => {
          press.onPointerMove(event)
          const start = pointerRef.current
          if (!start || start.id !== event.pointerId) return
          const dx = event.clientX - start.x
          const dy = event.clientY - start.y
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
            draggedRef.current = true
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.setPointerCapture(event.pointerId)
            }
          }
        }}
        onPointerUp={(event) => {
          const start = pointerRef.current
          if (!start || start.id !== event.pointerId) return
          pointerRef.current = null
          const dx = event.clientX - start.x
          const dy = event.clientY - start.y
          if (Math.abs(dx) >= RATION_PHOTO_SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
            goTo(active + (dx < 0 ? 1 : -1))
          }
        }}
      >
        {slides.map((src, index) => {
          const shouldLoad = Math.abs(index - active) <= 1
          return (
          <div
            className={cn(
              'absolute inset-0 overflow-hidden transition-opacity ease-out motion-reduce:duration-0',
              index === active ? 'z-[1] opacity-100' : 'z-0 opacity-0',
            )}
            data-slot="meal-photo-slide"
            key={`${index}:${src}`}
            style={{ transitionDuration: `${RATION_PHOTO_FADE_MS}ms` }}
          >
            {src && shouldLoad ? (
              <MealFeedPhoto priority={index === active} sizes={sizes} src={src} />
            ) : null}
          </div>
          )
        })}
      </div>
      {thumbs.length > 0 && sizes !== 'lg' ? (
        <div
          className={RATION_CARD_THUMB_CAPSULE_CLASS}
          data-slot="ration-photo-thumbs"
        >
          {thumbs.map((src, index) => {
            const pressed = aligned ? index === active : slides[active] === src
            return (
            <button
              aria-label={`Приём ${index + 1} из ${thumbs.length}`}
              aria-pressed={pressed}
              className={cn(
                'nora-press-grow relative size-[30px] shrink-0 rounded-full',
                'shadow-[0_0_0_2px_color-mix(in_srgb,var(--nora-panel)_92%,transparent)]',
                'focus-visible:shadow-[var(--nora-shadow-focus)]',
                pressed
                  ? 'shadow-[0_0_0_2px_white]'
                  : 'opacity-90 hover:opacity-100',
              )}
              data-slot="ration-photo-thumb"
              key={`${index}:${src}`}
              onClick={(event) => {
                event.stopPropagation()
                if (!src) return
                goTo(aligned ? index : Math.max(0, slides.indexOf(src)))
              }}
              onPointerDown={() => {
                if (src) prefetchMealPhoto(src)
              }}
              style={{ zIndex: thumbs.length - index }}
              type="button"
            >
              <span className="absolute inset-0 overflow-hidden rounded-full bg-[var(--nora-inset)]">
                {src ? <MealFeedPhoto sizes="sm" src={src} /> : null}
              </span>
            </button>
            )
          })}
        </div>
      ) : null}
      {multiple && sizes === 'lg' ? (
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-14 z-[2] flex justify-center gap-1.5"
          data-slot="ration-photo-dots"
        >
          {slides.map((_, index) => (
            <button
              aria-label={`Фото ${index + 1} из ${slides.length}`}
              className={cn(
                'size-2 rounded-full transition-colors',
                index === active ? 'bg-white' : 'bg-white/45',
              )}
              key={index}
              onClick={(event) => {
                event.stopPropagation()
                goTo(index)
              }}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

export function RationCover({
  ration,
  sizes = 'md',
  onActivate,
  className,
  selectedIndex,
  onSelectedIndexChange,
}: {
  ration: RationEntry
  sizes?: 'md' | 'lg'
  onActivate?: () => void
  className?: string
  selectedIndex?: number
  onSelectedIndexChange?: (index: number) => void
}) {
  const slides = rationMealImages(ration)
  const thumbs = rationCardThumbSrcs(ration)
  const multiple = slides.length > 1
  const press = usePressWithoutScroll(onActivate)

  return (
    <div
      aria-label={onActivate && !multiple ? `Открыть рацион: ${ration.title}` : undefined}
      className={cn(
        'relative w-full overflow-hidden bg-[var(--nora-inset)]',
        onActivate && 'cursor-pointer',
        sizes === 'md' && cn('h-full min-h-0 flex-1'),
        sizes === 'lg' &&
          'h-[min(47.6vw,259px)] max-h-[min(47.6vw,259px)] sm:h-[290px] sm:max-h-none',
        className,
      )}
      data-haptic={onActivate && sizes === 'md' ? 'card' : undefined}
      onClick={multiple ? undefined : press.onClick}
      onPointerCancel={onActivate ? press.onPointerCancel : undefined}
      onPointerDown={
        onActivate
          ? (event) => {
              press.onPointerDown(event)
              if (sizes !== 'lg') prefetchMealPhoto(slides[0] ?? '')
            }
          : undefined
      }
      onPointerMove={onActivate ? press.onPointerMove : undefined}
      onPointerUp={onActivate ? press.onPointerUp : undefined}
      onKeyDown={
        onActivate && !multiple
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onActivate()
              }
            }
          : undefined
      }
      role={onActivate && !multiple ? 'button' : undefined}
      tabIndex={onActivate && !multiple ? 0 : undefined}
    >
      <RationPhotoSlides
        onActivate={onActivate}
        onSelectedIndexChange={onSelectedIndexChange}
        selectedIndex={selectedIndex}
        sizes={sizes}
        slides={slides}
        thumbs={thumbs}
      />
    </div>
  )
}

export function RationCard({
  ration,
  saved,
  adding,
  hideAdd = false,
  addPressed = false,
  addLabel = 'Добавить в план',
  used = false,
  onOpen,
  onToggleSave,
  onAdd,
  onEdit,
  onDelete,
  shoppingScope,
}: {
  ration: RationEntry
  saved: boolean
  adding: boolean
  hideAdd?: boolean
  addPressed?: boolean
  addLabel?: string
  used?: boolean
  onOpen: () => void
  onToggleSave: () => void
  onAdd: () => void
  onEdit?: () => void
  onDelete?: () => void
  shoppingScope?: SavedAccountScope
}) {
  const origin = rationCardOrigin(ration)
  const titlePress = usePressWithoutScroll(onOpen)
  const [shoppingOpen, setShoppingOpen] = React.useState(false)
  const resolvedShoppingScope = shoppingScope ?? { userId: 'guest' }
  return (
    <>
      <article
      className="group flex h-full min-w-0 cursor-pointer flex-col"
      data-card-origin={origin}
      data-slot="meal-card"
      data-used={used ? '' : undefined}
    >
      <div className="relative flex min-h-0 flex-1 flex-col px-2 pt-2">
        <div
          className={cn(
            'relative flex min-h-0 w-full flex-1 flex-col outline-none transition-[filter] duration-700 ease-out motion-reduce:duration-0',
            RATION_CARD_PREVIEW_MIN_CLASS,
            used && 'grayscale',
          )}
          data-slot="meal-card-preview"
        >
          <RationCover onActivate={onOpen} ration={ration} />
          <div className={productCardGoalAnchorClass}>
            <span className={cn(RATION_GOAL_CARD_BADGE_CLASS, GOAL_BADGE_CLASS[ration.goal])}>
              {ration.goal}
            </span>
          </div>
        </div>
        {onEdit || onDelete ? (
          <div className="absolute top-4 right-4 z-[2] hidden items-center gap-1 sm:flex">
            {onEdit ? (
              <button
                type="button"
                aria-label="Изменить"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit()
                }}
                className={cn(
                  productSheetOverlayChipClass,
                  'nora-press-grow size-7',
                  'sm:opacity-0 sm:pointer-events-none',
                  'sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto',
                  'hover:text-[var(--nora-text)]',
                  'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:shadow-[var(--nora-shadow-focus)]',
                )}
              >
                <PencilIcon className="size-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                aria-label="Удалить"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete()
                }}
                className={cn(
                  productSheetOverlayChipClass,
                  'nora-press-grow size-7',
                  'sm:opacity-0 sm:pointer-events-none',
                  'sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto',
                  'hover:bg-[var(--nora-error)] hover:text-white',
                  'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:shadow-[var(--nora-shadow-focus)]',
                )}
              >
                <Trash2Icon className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col px-3 pt-3 sm:px-4 sm:pt-3.5">
        <button
          className="min-w-0 cursor-pointer text-left outline-none focus-visible:rounded focus-visible:shadow-[var(--nora-shadow-focus)]"
          data-haptic="card"
          onClick={titlePress.onClick}
          onPointerCancel={titlePress.onPointerCancel}
          onPointerDown={titlePress.onPointerDown}
          onPointerMove={titlePress.onPointerMove}
          onPointerUp={titlePress.onPointerUp}
          type="button"
        >
          <h3 className="truncate shrink-0 font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 tracking-normal text-[var(--nora-text)]">
            {ration.title}
          </h3>
          {ration.description.trim() ? (
            <p className="mt-1 line-clamp-3 whitespace-pre-line font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-secondary)]">
              {ration.description}
            </p>
          ) : null}
          <p className="mt-1 min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)] tabular-nums">
            {mealsCountLabel(ration.meals.length)} ·{' '}
            <span className="font-medium text-[var(--nora-text)]">{ration.kcal} ккал</span>
          </p>
        </button>
        <div className="pt-3">
          <div
            aria-hidden
            className="border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)] dark:border-[var(--nora-border-strong)]"
          />
          <div
            className="flex items-center gap-2 py-3"
            data-slot="meal-card-footer"
          >
            <NoraButton
              aria-pressed={!hideAdd && used ? true : undefined}
              className={cn(
                'nora-press-grow min-w-0 flex-1',
                !hideAdd && used && productCardFooterCtaClass,
              )}
              data-demo-pressed={!hideAdd && addPressed ? '' : undefined}
              disabled={!hideAdd && adding}
              onClick={(event) => {
                event.stopPropagation()
                if (hideAdd) onOpen()
                else onAdd()
              }}
              variant={!hideAdd && used ? 'default' : 'primary'}
            >
              {hideAdd ? 'Открыть' : used ? 'Добавлен в план' : addLabel}
            </NoraButton>
            <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
              <NoraHoverTip label={saved ? 'Убрать' : 'Сохранить'}>
                <NoraIconButton
                  aria-label={saved ? 'Убрать' : 'Сохранить'}
                  active={saved}
                  className={cn(
                    'nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent active:!bg-transparent [&_svg]:size-4',
                    saved
                      ? 'text-[var(--nora-tint)] hover:!text-[var(--nora-tint)]'
                      : 'hover:text-[var(--nora-text)]',
                  )}
                  onClick={onToggleSave}
                >
                  <BookmarkIcon className={cn('size-4', saved && 'fill-current')} />
                </NoraIconButton>
              </NoraHoverTip>
              <NoraHoverTip label="Корзина">
                <NoraIconButton
                  aria-label="Корзина"
                  className="nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent hover:text-[var(--nora-text)] active:!bg-transparent [&_svg]:size-4"
                  onClick={() => setShoppingOpen(true)}
                >
                  <ShoppingBagIcon className="size-4" />
                </NoraIconButton>
              </NoraHoverTip>
              {onEdit || onDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Ещё"
                    className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--nora-radius-md)] border-0 text-[var(--nora-text-secondary)] md:hidden"
                    data-ration-card-more=""
                    nativeButton
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <EllipsisIcon aria-hidden className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="account-workspace-menu w-max min-w-0 rounded-[16px]!"
                    side="bottom"
                    sideOffset={6}
                  >
                    {onEdit ? (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit()
                        }}
                      >
                        <PencilIcon className="size-4" />
                        Изменить
                      </DropdownMenuItem>
                    ) : null}
                    {onDelete ? (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete()
                        }}
                        variant="destructive"
                      >
                        <Trash2Icon className="size-4" />
                        Удалить
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
      <RationShoppingDialog
        onOpenChange={setShoppingOpen}
        open={shoppingOpen}
        ration={ration}
        savedScope={resolvedShoppingScope}
      />
    </>
  )
}

export function RationSlotBadge({
  slot,
  active = false,
  pressed = false,
  onSelect,
}: {
  slot: RationMealSlot
  active?: boolean
  pressed?: boolean
  onSelect?: () => void
}) {
  const className = cn(
    RATION_FROST_BADGE_CLASS,
    SLOT_BADGE_CLASS[slot],
    onSelect && 'nora-press-grow cursor-pointer',
    active && 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-text)_18%,transparent)]',
  )
  if (onSelect) {
    return (
      <button
        aria-label={`Показать: ${slot}`}
        aria-pressed={active}
        className={className}
        data-demo-pressed={pressed ? '' : undefined}
        onClick={onSelect}
        type="button"
      >
        {slot}
      </button>
    )
  }
  return <span className={className}>{slot}</span>
}
