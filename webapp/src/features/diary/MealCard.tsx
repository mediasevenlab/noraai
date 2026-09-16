import * as React from 'react'
import {
  BookmarkIcon,
  CircleCheckIcon,
  CircleIcon,
  CookieIcon,
  DropletIcon,
  FlameIcon,
  HeartIcon,
  PlusIcon,
  Share2Icon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from 'lucide-react'

import {
  productCardAuthorAnchorClass,
  productCardOriginAnchorClass,
  productSheetFrostFillClass,
} from '@/components/nora/product-sheet'
import {
  NoraAvatar,
  NoraIconButton,
} from '@/components/nora/primitives'
import { cn } from '@/lib/utils'
import { usePressWithoutScroll } from '@/platform/press-without-scroll'

import { formatMealStamp } from './diary-feed'
import { MealFeedPhoto } from './meal-feed-photo'
import { prefetchMealPhoto } from './media-display'
import {
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  mealCanShareToFeed,
  mealCardOrigin,
} from './ration-import'
import { mealCarouselImages } from './merge-meals'
import { mealCompositionLines, type MealEntry } from './meals-catalog'
import {
  MEAL_DIALOG_HERO_FRAME_CLASS,
  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
  RATION_DONE_CARD_BADGE_CLASS,
  RATION_PENDING_COVER_CLASS,
  RATION_PICKED_CARD_BADGE_CLASS,
} from './meal-sheet'
import type { MealRevealMacroKey } from './meal-card-reveal'

const MEAL_CARD_FOOTER_DIVIDER_CLASS =
  'border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)]'
const MEAL_CARD_FOOTER_CLASS = 'flex items-center justify-between gap-2 py-3'
const MEAL_CARD_FOOTER_PLUS_CLASS =
  'nora-press-grow size-6! shrink-0 rounded-full! bg-[var(--nora-input-bg)] text-[var(--nora-text-secondary)] shadow-none hover:bg-[color-mix(in_srgb,var(--nora-input-bg)_82%,var(--nora-text)_10%)] hover:text-[var(--nora-text)] active:bg-[color-mix(in_srgb,var(--nora-input-bg)_75%,var(--nora-text)_12%)] [&_svg]:size-4'
const FEED_AUTHOR_CHIP_CLASS = cn(
  'ios-glass-glare-soft inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border-0 py-1 pr-2.5 pl-1',
  productSheetFrostFillClass,
)

function MacrosLine({ meal, className }: { meal: MealEntry; className?: string }) {
  return (
    <p
      className={cn(
        'min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)] tabular-nums',
        className,
      )}
    >
      <span className="font-medium text-[var(--nora-text)]">
        {meal.kcal} ккал
      </span>
      {' · Б: '}
      {meal.protein}
      {' · Ж: '}
      {meal.fat}
      {' · У: '}
      {meal.carbs}
    </p>
  )
}

function RollingMacroValue({
  rolling,
  value,
  min,
  max,
  intervalMs,
  widthClass,
}: {
  rolling: boolean
  value: number
  min: number
  max: number
  intervalMs: number
  widthClass: string
}) {
  const [rollingShown, setRollingShown] = React.useState(value)
  const shown = rolling ? rollingShown : value

  React.useEffect(() => {
    if (!rolling) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const id = window.setTimeout(() => setRollingShown(value), 0)
      return () => window.clearTimeout(id)
    }
    const span = Math.max(0, max - min)
    const tick = () => setRollingShown(min + Math.floor(Math.random() * (span + 1)))
    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, max, min, rolling, value])

  return (
    <span className={cn('inline-block text-end font-semibold tabular-nums', widthClass)}>
      {shown}
    </span>
  )
}

export function MealMacrosPlaque({
  meal,
  rolling = false,
  rollingKeys,
}: {
  meal: Pick<MealEntry, 'kcal' | 'protein' | 'fat' | 'carbs'>
  rolling?: boolean
  rollingKeys?: Record<MealRevealMacroKey, boolean>
}) {
  const macros = [
    { key: 'protein', icon: FlameIcon, value: meal.protein, min: 8, max: 78, intervalMs: 58 },
    { key: 'fat', icon: DropletIcon, value: meal.fat, min: 4, max: 42, intervalMs: 64 },
    { key: 'carbs', icon: CookieIcon, value: meal.carbs, min: 10, max: 88, intervalMs: 72 },
  ] as const
  const shell = cn(
    'ios-glass-glare flex h-8 min-h-8 max-h-8 items-center rounded-full py-0 text-[var(--nora-text-secondary)]',
    productSheetFrostFillClass,
  )

  return (
    <div className="pointer-events-none flex items-center gap-1.5">
      <div className={cn(shell, 'gap-1 pl-2.5 pr-3')}>
        <ZapIcon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap text-[11px] font-medium leading-none">
          <RollingMacroValue
            intervalMs={48}
            max={740}
            min={160}
            rolling={rollingKeys?.kcal ?? rolling}
            value={meal.kcal}
            widthClass="min-w-[3ch]"
          />
          <span className="font-medium"> ккал</span>
        </span>
      </div>
      <div className={cn(shell, 'pl-1 pr-2')}>
        {macros.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1 px-1.5 text-[11px] leading-none text-[var(--nora-text-secondary)]"
          >
            <item.icon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
            <RollingMacroValue
              intervalMs={item.intervalMs}
              max={item.max}
              min={item.min}
              rolling={rollingKeys?.[item.key] ?? rolling}
              value={item.value}
              widthClass="min-w-[2ch]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function extrasForMealVersion(
  galleries: Record<string, Record<string, string[]>>,
  mealId: string,
  versionId: string | undefined,
  versions?: Array<{ id: string }>,
) {
  const byVersion = galleries[mealId] ?? {}
  if (versionId && byVersion[versionId]?.length) return byVersion[versionId]
  const index = versions?.findIndex((version) => version.id === versionId) ?? -1
  if (index >= 0) return byVersion[`index:${index}`] ?? []
  return []
}

export function imagesForDiaryMeal(
  meal: MealEntry,
  galleries: Record<string, Record<string, string[]>>,
) {
  return mealCarouselImages({
    cover: meal.image,
    extraImages: meal.extraImages,
    galleryExtras: extrasForMealVersion(
      galleries,
      meal.id,
      meal.activeVersionId,
      meal.versions,
    ),
  })
}

export function commitMealVersionExtras(
  galleries: Record<string, Record<string, string[]>>,
  mealId: string,
  fromVersionId: string,
  toVersionId: string,
  extraSrc: string | null,
  toIndex?: number,
) {
  const byVersion = galleries[mealId] ?? {}
  const inherited = byVersion[fromVersionId] ?? []
  const extras =
    extraSrc && !inherited.includes(extraSrc) ? [...inherited, extraSrc] : inherited
  const next = { ...byVersion, [toVersionId]: extras }
  if (toIndex != null && toIndex >= 0) next[`index:${toIndex}`] = extras
  return {
    ...galleries,
    [mealId]: next,
  }
}

const MEAL_PHOTO_FADE_MS = 280
const MEAL_PHOTO_SWIPE_PX = 36

export function MealPhotoSlides({
  slides,
  sizes = 'md',
  onActivate,
  dotsOffset = 'default',
  selectedIndex,
  onSelectedIndexChange,
}: {
  slides: string[]
  sizes?: 'sm' | 'md' | 'lg'
  onActivate?: () => void
  dotsOffset?: 'default' | 'raised'
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

  function goTo(index: number) {
    const next = Math.max(0, Math.min(maxIndex, index))
    if (selectedIndex == null) setUncontrolled(next)
    onSelectedIndexChange?.(next)
  }

  if (slides.length === 0) return null

  return (
    <>
      <div
        className="absolute inset-0 size-full touch-pan-y overflow-hidden overscroll-x-none"
        onClick={(event) => {
          if (!multiple) return
          if (draggedRef.current) {
            event.stopPropagation()
            return
          }
          onActivate?.()
        }}
        onPointerCancel={() => {
          pointerRef.current = null
        }}
        onPointerDown={(event) => {
          if (!multiple || event.button !== 0) return
          draggedRef.current = false
          pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
        }}
        onPointerMove={(event) => {
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
          if (Math.abs(dx) >= MEAL_PHOTO_SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
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
            key={`${index}:${src.slice(0, 64)}`}
            style={{ transitionDuration: `${MEAL_PHOTO_FADE_MS}ms` }}
          >
            {shouldLoad ? (
              <MealFeedPhoto priority={index === active} sizes={sizes} src={src} />
            ) : null}
          </div>
          )
        })}
      </div>
      {multiple ? (
        <div
          className={cn(
            'pointer-events-auto absolute inset-x-0 z-[2] flex justify-center gap-1.5',
            dotsOffset === 'raised' ? 'bottom-[3.4rem]' : 'bottom-2',
          )}
        >
          {slides.map((_, index) => (
            <button
              aria-label={`Фото ${index + 1} из ${slides.length}`}
              className={cn(
                'rounded-full transition-colors',
                sizes === 'lg' ? 'size-2' : 'size-1.5',
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

export function Cover({
  meal,
  className,
  sizes = 'md',
  images,
  onActivate,
}: {
  meal: MealEntry
  className?: string
  sizes?: 'sm' | 'md' | 'lg'
  images?: string[]
  onActivate?: () => void
}) {
  const slides = images && images.length > 0 ? images : [meal.image]
  const multiple = slides.length > 1
  const press = usePressWithoutScroll(onActivate)

  return (
    <div
      aria-label={onActivate && !multiple ? `Открыть приём: ${meal.title}` : undefined}
      className={cn(
        'relative w-full shrink-0 overflow-hidden bg-[var(--nora-inset)]',
        onActivate && 'cursor-pointer',
        sizes === 'sm' && 'h-full w-[140px]',
        // Feed cards: shorter, less elongated previews on mobile.
        sizes === 'md' && 'aspect-[4/3] max-h-[132px] sm:max-h-[148px] md:max-h-none md:aspect-auto md:h-[168px]',
        // Open dialog hero: a bit taller on phone, same desktop height.
        sizes === 'lg' && MEAL_DIALOG_HERO_FRAME_CLASS,
        className,
      )}
      data-haptic={onActivate && sizes === 'md' ? 'card' : undefined}
      data-slot="meal-cover"
      onClick={multiple ? undefined : onActivate ? press.onClick : undefined}
      onPointerCancel={onActivate && !multiple ? press.onPointerCancel : undefined}
      onPointerDown={
        onActivate && sizes !== 'lg'
          ? (event) => {
              prefetchMealPhoto(slides[0] ?? meal.image)
              if (!multiple) press.onPointerDown(event)
            }
          : undefined
      }
      onPointerMove={onActivate && !multiple ? press.onPointerMove : undefined}
      onPointerUp={onActivate && !multiple ? press.onPointerUp : undefined}
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
      style={sizes === 'sm' ? { height: '100%', minHeight: 112 } : undefined}
      tabIndex={onActivate && !multiple ? 0 : undefined}
    >
      <MealPhotoSlides
        dotsOffset={sizes === 'lg' ? 'raised' : 'default'}
        onActivate={onActivate}
        sizes={sizes}
        slides={slides}
      />
    </div>
  )
}

function CardActions({
  saved,
  shared,
  canShare = true,
  hideFooterShare = false,
  savePressed = false,
  onToggleSave,
  onShare,
}: {
  saved: boolean
  shared: boolean
  canShare?: boolean
  hideFooterShare?: boolean
  savePressed?: boolean
  onToggleSave: () => void
  onShare: () => void
}) {
  const shareLabel = shared ? 'Скрыть из ленты' : 'Поделиться'
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {hideFooterShare ? null : (
        <NoraIconButton
          aria-label={shareLabel}
          active={shared}
          className="nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent hover:text-[var(--nora-text)] active:!bg-transparent [&_svg]:size-4"
          disabled={!canShare}
          onClick={onShare}
        >
          <Share2Icon className="size-4" />
        </NoraIconButton>
      )}
      <NoraIconButton
        aria-label={saved ? 'Убрать' : 'Сохранить'}
        active={saved}
        className={cn(
          'nora-press-grow size-6! shrink-0 !bg-transparent shadow-none hover:!bg-transparent active:!bg-transparent [&_svg]:size-4',
          saved
            ? 'text-[var(--nora-tint)] hover:!text-[var(--nora-tint)]'
            : 'hover:text-[var(--nora-text)]',
        )}
        data-demo-pressed={savePressed ? '' : undefined}
        onClick={onToggleSave}
      >
        <BookmarkIcon className={cn('size-4', saved && 'fill-current')} />
      </NoraIconButton>
    </div>
  )
}

export function authorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0] ?? ''
  const second = parts[1]
  if (!second) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
}

export function MealLikeButton({
  liked,
  likeCount,
  pressed = false,
  onToggle,
}: {
  liked: boolean
  likeCount: number
  pressed?: boolean
  onToggle: () => void
}) {
  return (
    <button
      aria-label={liked ? 'Убрать лайк' : 'Нравится'}
      aria-pressed={liked}
      data-demo-pressed={pressed ? '' : undefined}
      className={cn(
        'nora-press-grow inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-1',
        'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tabular-nums',
        liked
          ? 'text-[var(--nora-badge-red-text)]'
          : 'text-[var(--nora-text-tertiary)] hover:text-[var(--nora-text)]',
      )}
      data-slot="meal-like"
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      type="button"
    >
      <HeartIcon aria-hidden className={cn('size-4', liked && 'fill-current')} strokeWidth={1.75} />
      {likeCount}
    </button>
  )
}

export function MealAuthorByline({
  name,
  at,
  revealAuthor = false,
  likeCount,
  liked,
  likePressed = false,
  onToggleLike,
}: {
  name: string
  at: string
  /** Fade the author row in (login demo share handoff). */
  revealAuthor?: boolean
  likeCount?: number
  liked?: boolean
  likePressed?: boolean
  onToggleLike?: () => void
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div
        className="flex min-w-0 items-center gap-2"
        style={
          revealAuthor
            ? { animation: 'auth-demo-author-in 480ms ease-out both' }
            : undefined
        }
      >
        <NoraAvatar size="sm">{authorInitials(name)}</NoraAvatar>
        <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-none text-[var(--nora-text-tertiary)]">
          <span className="font-medium text-[var(--nora-text-secondary)]">{name}</span>
          <span>{` · ${formatMealStamp(at)}`}</span>
        </p>
      </div>
      {onToggleLike ? (
        <MealLikeButton
          liked={Boolean(liked)}
          likeCount={likeCount ?? 0}
          pressed={likePressed}
          onToggle={onToggleLike}
        />
      ) : null}
    </div>
  )
}

export function RationPlanDoneButton({
  done,
  onToggle,
  pressed = false,
}: {
  done: boolean
  onToggle: () => void
  pressed?: boolean
}) {
  const Icon = done ? CircleCheckIcon : CircleIcon
  return (
    <button
      aria-label={done ? 'Выполнено' : 'Выполнить'}
      aria-pressed={done}
      className={cn(
        'nora-press-grow ios-glass-glare inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center gap-1 rounded-full border-0 py-0 pl-2.5 pr-3',
        'font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none tracking-normal',
        'backdrop-blur-[16px] outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
        done
          ? 'bg-[var(--nora-success)] text-white'
          : 'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)]',
      )}
      data-demo-pressed={pressed ? '' : undefined}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      type="button"
    >
      <Icon aria-hidden className="size-[15px] shrink-0" strokeWidth={1.75} />
      {done ? 'Выполнено' : 'Выполнить'}
    </button>
  )
}

export function MealCard({
  meal,
  images,
  saved,
  completedIds,
  readOnly = false,
  showPlanState = true,
  variant = 'diary',
  unread = false,
  className,
  onOpen,
  hideFooterShare = false,
  savePressed = false,
  likePressed = false,
  grayscale = false,
  revealAuthor = false,
  onToggleSave,
  onShare,
  onToggleLike,
  onAddToDiary,
  addingToDiary = false,
  onAddToPlan,
  addingToPlan = false,
  onDelete,
  footerStart,
  selected = false,
  picking = false,
  orderBadge,
}: {
  meal: MealEntry
  images?: string[]
  saved: boolean
  completedIds: ReadonlySet<string>
  readOnly?: boolean
  showPlanState?: boolean
  variant?: 'diary' | 'feed'
  unread?: boolean
  className?: string
  hideFooterShare?: boolean
  menuSide?: 'top' | 'bottom'
  menuOpen?: boolean
  menuPressed?: boolean
  savePressed?: boolean
  sharePressed?: boolean
  likePressed?: boolean
  /** Force a muted cover (e.g. login demo before the meal is formed). */
  grayscale?: boolean
  /** Fade the author byline in (login demo share handoff). */
  revealAuthor?: boolean
  onOpen: () => void
  onToggleSave: () => void
  onShare: () => void
  onToggleLike?: () => void
  onAddToDiary?: () => void
  addingToDiary?: boolean
  onAddToPlan?: () => void
  addingToPlan?: boolean
  onDelete?: () => void
  footerStart?: React.ReactNode
  selected?: boolean
  /** Hide status badges while picking meals into a plan. */
  picking?: boolean
  /** 1-based order within a plan day, shown on the cover. */
  orderBadge?: number
}) {
  const pending = showPlanState && isRationPlanPending(meal, completedIds)
  const fromRation = isRationImportedMeal(meal)
  const done = showPlanState && isRationPlanDone(meal, completedIds)
  const logged = showPlanState && mealCanShareToFeed(meal)
  const origin = mealCardOrigin(meal)
  const canShare = (mealCanShareToFeed(meal) || Boolean(meal.shared)) && !readOnly
  const titlePress = usePressWithoutScroll(onOpen)
  const [unreadMarkMounted, setUnreadMarkMounted] = React.useState(unread)
  React.useEffect(() => {
    if (unread) {
      setUnreadMarkMounted(true)
      return
    }
    if (!unreadMarkMounted) return
    const timer = window.setTimeout(() => setUnreadMarkMounted(false), 700)
    return () => window.clearTimeout(timer)
  }, [unread, unreadMarkMounted])

  return (
    <article
      className={cn(
        'group flex h-full min-w-0 cursor-pointer flex-col transition-[filter] duration-700 ease-out motion-reduce:duration-0',
        grayscale && 'grayscale',
        className,
      )}
      data-card-origin={origin}
      data-from-ration={fromRation ? '' : undefined}
      data-ration-done={done ? '' : undefined}
      data-logged-meal={logged ? '' : undefined}
      data-meal-id={meal.id}
      data-selected={selected ? '' : undefined}
      data-slot="meal-card"
      onPointerDown={() => prefetchMealPhoto((images && images[0]) || meal.image)}
    >
      <div className="relative shrink-0 px-2 pt-2">
        <div
          className="relative block w-full outline-none focus-visible:shadow-[var(--nora-shadow-focus)]"
          data-slot="meal-card-preview"
        >
          <Cover
            meal={meal}
            sizes="md"
            images={images}
            onActivate={onOpen}
            className={cn(
              'shadow-[inset_0_0_0_1px_var(--nora-border)]',
              pending && RATION_PENDING_COVER_CLASS,
            )}
          />
          {unreadMarkMounted || unread ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-2 right-2 z-[2] inline-flex size-7 items-center justify-center rounded-full',
                'bg-[var(--nora-tint)] text-white shadow-[0_1px_6px_rgba(0,153,255,0.45)]',
                'transition-opacity duration-700 ease-out motion-reduce:duration-0',
                unread ? 'opacity-100' : 'opacity-0',
              )}
              data-slot="meal-card-unread"
            >
              <SparklesIcon className="size-3.5" strokeWidth={2} />
            </span>
          ) : null}
          {!selected && orderBadge != null && orderBadge > 0 ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-2 left-2 z-[2] inline-flex size-7 items-center justify-center !rounded-full',
                'bg-[var(--nora-panel)]/88 font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none text-[var(--nora-text)]',
                'shadow-[0_1px_4px_rgba(0,0,0,0.18)] backdrop-blur-[10px]',
              )}
              data-slot="meal-card-order"
            >
              {orderBadge}
            </span>
          ) : null}
          {selected ? (
            <div className={productCardOriginAnchorClass}>
              <span aria-label="Выбран" className={RATION_PICKED_CARD_BADGE_CLASS}>
                <CircleCheckIcon aria-hidden className="size-3" strokeWidth={2} />
                Выбран
              </span>
            </div>
          ) : picking ? null : showPlanState && (done || logged) ? (
            <div className={productCardOriginAnchorClass}>
              <span aria-label="Выполнено" className={RATION_DONE_CARD_BADGE_CLASS}>
                <CircleCheckIcon aria-hidden className="size-3" strokeWidth={2} />
                Выполнено
              </span>
            </div>
          ) : null}
          {variant === 'feed' ? (
            <div className={productCardAuthorAnchorClass}>
              <div
                className={FEED_AUTHOR_CHIP_CLASS}
                style={
                  revealAuthor
                    ? { animation: 'auth-demo-author-in 480ms ease-out both' }
                    : undefined
                }
              >
                <NoraAvatar size="sm">{authorInitials(meal.authorName ?? 'Пользователь')}</NoraAvatar>
                <span className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[11.5px] font-medium leading-none text-[var(--nora-text)]">
                  {meal.authorName ?? 'Пользователь'}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        {readOnly || !onDelete ? null : (
          <button
            type="button"
            aria-label="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={cn(
              MEAL_DIALOG_OVERLAY_CHIP_CLASS,
              'nora-press-grow absolute top-4 right-4 z-[2] hidden size-7 sm:inline-flex',
              'sm:opacity-0 sm:pointer-events-none',
              'sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto',
              'hover:bg-[var(--nora-error)] hover:text-white',
              'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:shadow-[var(--nora-shadow-focus)]',
            )}
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-3.5">
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
          <div className="min-w-0">
            <h3
              className="truncate shrink-0 font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 tracking-normal text-[var(--nora-text)]"
            >
              {meal.title}
            </h3>
          </div>
          <ul className="mt-2 mb-2 h-[3.75rem] shrink-0 overflow-clip font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
            {mealCompositionLines(meal)
              .slice(0, 3)
              .map((line, index) => (
              <li className="flex min-w-0 items-baseline gap-1.5" key={`${index}:${line}`}>
                <span aria-hidden className="shrink-0">
                  •
                </span>
                <span className="min-w-0 truncate">{line}</span>
              </li>
            ))}
          </ul>
          <MacrosLine className="shrink-0" meal={meal} />
        </button>
        <div className="mt-auto pt-3">
        <div aria-hidden className={MEAL_CARD_FOOTER_DIVIDER_CLASS} />
        <div
          className={MEAL_CARD_FOOTER_CLASS}
          data-slot="meal-card-footer"
        >
          {variant === 'feed' ? (
            <>
              <NoraIconButton
                aria-label={onAddToPlan ? 'В план' : onAddToDiary ? 'В дневник' : 'В план'}
                className={MEAL_CARD_FOOTER_PLUS_CLASS}
                disabled={
                  onAddToPlan ? addingToPlan : onAddToDiary ? addingToDiary : true
                }
                onClick={(event) => {
                  event.stopPropagation()
                  if (onAddToPlan) onAddToPlan()
                  else onAddToDiary?.()
                }}
              >
                <PlusIcon className="size-4" />
              </NoraIconButton>
              <div className="ml-auto flex items-center gap-1">
                {onToggleLike ? (
                  <MealLikeButton
                    liked={Boolean(meal.liked)}
                    likeCount={meal.likeCount ?? 0}
                    pressed={likePressed}
                    onToggle={onToggleLike}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <>
              {footerStart}
              <NoraIconButton
                aria-label="В план"
                className={MEAL_CARD_FOOTER_PLUS_CLASS}
                disabled={readOnly || !onAddToPlan || addingToPlan}
                onClick={(event) => {
                  event.stopPropagation()
                  onAddToPlan?.()
                }}
              >
                <PlusIcon className="size-4" />
              </NoraIconButton>
              <div className="ml-auto flex items-center gap-1">
                <CardActions
                  canShare={canShare}
                  hideFooterShare={hideFooterShare}
                  savePressed={savePressed}
                  saved={saved}
                  shared={Boolean(meal.shared)}
                  onToggleSave={onToggleSave}
                  onShare={onShare}
                />
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </article>
  )
}

export function SkeletonMealCard() {
  return (
    <article
      aria-label="Черновик записи"
      className="flex h-full min-w-0 flex-col"
      data-slot="meal-card-skeleton"
    >
      <div className="shrink-0 px-2 pt-2">
        <div
          className="aspect-[4/3] w-full max-h-[132px] animate-pulse bg-[var(--nora-inset)] sm:max-h-[148px] md:aspect-auto md:h-[168px] md:max-h-none"
          data-slot="meal-card-preview"
        />
      </div>
      <div className="flex flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-3.5">
        <div>
          <div className="h-6 w-[80%] animate-pulse rounded bg-[var(--nora-inset)]" />
          <div className="mt-0.5 h-4 w-24 animate-pulse rounded bg-[var(--nora-inset)]" />
        </div>
        <div className="mt-2 mb-2 grid h-10 grid-rows-2">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--nora-inset)]" />
          <div className="h-4 w-[90%] animate-pulse rounded bg-[var(--nora-inset)]" />
        </div>
        <div className="h-4 w-[60%] animate-pulse rounded bg-[var(--nora-inset)]" />
        <div className="mt-auto pt-3">
        <div aria-hidden className={MEAL_CARD_FOOTER_DIVIDER_CLASS} />
        <div
          className={MEAL_CARD_FOOTER_CLASS}
          data-slot="meal-card-footer"
        >
          <div className="h-3.5 w-24 animate-pulse rounded bg-[var(--nora-inset)]" />
          <div className="flex gap-1">
            <div className="size-4 animate-pulse rounded bg-[var(--nora-inset)]" />
            <div className="size-4 animate-pulse rounded bg-[var(--nora-inset)]" />
          </div>
        </div>
        </div>
      </div>
    </article>
  )
}
