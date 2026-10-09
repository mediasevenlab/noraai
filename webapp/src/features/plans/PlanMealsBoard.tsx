import * as React from 'react'
import { createPortal } from 'react-dom'
import { GripVerticalIcon } from '@/components/icons'

import { productFeedGridClass } from '@/components/nora/product-sheet'
import { NoraIconButton } from '@/components/nora/primitives'
import type { MealEntry } from '@/features/diary'
import { cn } from '@/lib/utils'

import { movePlanMeal } from './plan-meal-layout'
import type { WeekPlanDay } from './week-plan'

export type PlanMealDrag = {
  mealId: string
  fromDayKey: string
  width: number
  height: number
  offsetX: number
  offsetY: number
  x: number
  y: number
}

function dropFromPoint(x: number, y: number): { dayKey: string; index: number } | null {
  const node = document.elementFromPoint(x, y)
  if (!(node instanceof Element)) return null
  const tab = node.closest('[data-plan-day-tab]')
  if (tab instanceof HTMLElement && tab.dataset.planDayTab) {
    return { dayKey: tab.dataset.planDayTab, index: Number(tab.dataset.planDayIndex ?? 999) }
  }
  const slot = node.closest('[data-plan-meal-slot]')
  if (slot instanceof HTMLElement && slot.dataset.planDayKey) {
    return {
      dayKey: slot.dataset.planDayKey,
      index: Number(slot.dataset.planMealSlot ?? 0),
    }
  }
  const board = node.closest('[data-plan-day-board]')
  if (board instanceof HTMLElement && board.dataset.planDayBoard) {
    return { dayKey: board.dataset.planDayBoard, index: 999 }
  }
  return null
}

function scrollParentOf(node: Element | null): HTMLElement | null {
  let current = node instanceof HTMLElement ? node.parentElement : null
  while (current) {
    const style = window.getComputedStyle(current)
    const canScroll =
      /(auto|scroll|overlay)/.test(style.overflowY) ||
      /(auto|scroll|overlay)/.test(style.overflow)
    if (canScroll && current.scrollHeight > current.clientHeight + 1) return current
    current = current.parentElement
  }
  return null
}

type ScrollLock = {
  scroller: HTMLElement | null
  previousTouchAction: string
  previousOverscroll: string
  previousHtmlTouchAction: string
  previousHtmlUserSelect: string
  previousBodyTouchAction: string
  previousBodyOverscroll: string
}

/** Active lock — never leave overflow:hidden; that freezes the shell until reload. */
let activeScrollLock: ScrollLock | null = null

function unlockPageScroll(lock: ScrollLock | null) {
  if (!lock) return
  if (lock.scroller) {
    lock.scroller.style.touchAction = lock.previousTouchAction
    lock.scroller.style.overscrollBehavior = lock.previousOverscroll
  }
  document.documentElement.style.touchAction = lock.previousHtmlTouchAction
  document.documentElement.style.userSelect = lock.previousHtmlUserSelect
  document.body.style.touchAction = lock.previousBodyTouchAction
  document.body.style.overscrollBehavior = lock.previousBodyOverscroll
  if (activeScrollLock === lock) activeScrollLock = null
}

function forceUnlockPageScroll() {
  unlockPageScroll(activeScrollLock)
}

function lockPageScroll(from: Element | null): ScrollLock {
  forceUnlockPageScroll()
  const scroller = scrollParentOf(from)
  const html = document.documentElement
  const body = document.body
  const lock: ScrollLock = {
    scroller,
    previousTouchAction: scroller?.style.touchAction ?? '',
    previousOverscroll: scroller?.style.overscrollBehavior ?? '',
    previousHtmlTouchAction: html.style.touchAction,
    previousHtmlUserSelect: html.style.userSelect,
    previousBodyTouchAction: body.style.touchAction,
    previousBodyOverscroll: body.style.overscrollBehavior,
  }
  // Only soft-lock via touch-action + preventDefault on move.
  // Do not set overflow:hidden — a missed unlock freezes the whole page.
  if (scroller) {
    scroller.style.touchAction = 'none'
    scroller.style.overscrollBehavior = 'none'
  }
  html.style.touchAction = 'none'
  html.style.userSelect = 'none'
  body.style.touchAction = 'none'
  body.style.overscrollBehavior = 'none'
  activeScrollLock = lock
  return lock
}

export function PlanMealDragHandle({
  className,
  onPointerDown,
}: {
  className?: string
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void
}) {
  return (
    <NoraIconButton
      aria-label="Переставить"
      className={cn(
        'nora-press-grow size-6! shrink-0 cursor-grab touch-none !bg-transparent shadow-none hover:!bg-transparent hover:text-[var(--nora-text)] active:cursor-grabbing active:!bg-transparent [&_svg]:size-4',
        className,
      )}
      data-slot="plan-meal-drag"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onPointerDown(event)
      }}
    >
      <GripVerticalIcon aria-hidden strokeWidth={1.75} />
    </NoraIconButton>
  )
}

export function usePlanMealDrag({
  days,
  canReorder,
  onDaysChange,
  onHoverDay,
}: {
  days: readonly WeekPlanDay[]
  canReorder: boolean
  onDaysChange: (days: WeekPlanDay[]) => void
  onHoverDay?: (dayKey: string) => void
}) {
  const [drag, setDrag] = React.useState<PlanMealDrag | null>(null)
  const didDragRef = React.useRef(false)
  const dragRef = React.useRef<PlanMealDrag | null>(null)
  const dragOriginRef = React.useRef<Element | null>(null)
  const dragPointerIdRef = React.useRef<number | null>(null)
  const scrollerRef = React.useRef<HTMLElement | null>(null)
  const daysRef = React.useRef(days)
  daysRef.current = days
  dragRef.current = drag

  React.useEffect(() => {
    forceUnlockPageScroll()
    return () => {
      forceUnlockPageScroll()
    }
  }, [])

  const moveDrag = React.useCallback(
    (clientX: number, clientY: number) => {
      const current = dragRef.current
      if (!current) return
      const scroller = scrollerRef.current
      if (scroller) {
        const box = scroller.getBoundingClientRect()
        const edge = 64
        if (clientY < box.top + edge) scroller.scrollTop -= 18
        else if (clientY > box.bottom - edge) scroller.scrollTop += 18
      }
      const next = { ...current, x: clientX, y: clientY }
      dragRef.current = next
      setDrag(next)
      const drop = dropFromPoint(clientX, clientY)
      if (!drop) return
      onHoverDay?.(drop.dayKey)
      const preview = movePlanMeal(daysRef.current, current.mealId, drop.dayKey, drop.index)
      const same = preview.every(
        (day, index) =>
          day.meals.map((meal) => meal.id).join() ===
          daysRef.current[index]?.meals.map((meal) => meal.id).join(),
      )
      if (!same) onDaysChange(preview)
    },
    [onDaysChange, onHoverDay],
  )

  React.useEffect(() => {
    if (!drag) {
      forceUnlockPageScroll()
      return
    }
    const lock = lockPageScroll(dragOriginRef.current)
    scrollerRef.current = lock.scroller
    function onMove(event: PointerEvent) {
      event.preventDefault()
      moveDrag(event.clientX, event.clientY)
    }
    function onTouchMove(event: TouchEvent) {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch) return
      moveDrag(touch.clientX, touch.clientY)
    }
    function endDrag() {
      const pointerId = dragPointerIdRef.current
      const origin = dragOriginRef.current
      if (pointerId != null && origin instanceof HTMLElement) {
        try {
          if (origin.hasPointerCapture?.(pointerId)) origin.releasePointerCapture(pointerId)
        } catch {
          /* already released */
        }
      }
      dragPointerIdRef.current = null
      dragOriginRef.current = null
      scrollerRef.current = null
      dragRef.current = null
      unlockPageScroll(lock)
      setDrag(null)
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') endDrag()
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    window.addEventListener('touchend', endDrag)
    window.addEventListener('touchcancel', endDrag)
    window.addEventListener('blur', endDrag)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unlockPageScroll(lock)
      scrollerRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('touchend', endDrag)
      window.removeEventListener('touchcancel', endDrag)
      window.removeEventListener('blur', endDrag)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [drag, moveDrag])

  function startDrag(event: React.PointerEvent<HTMLElement>, meal: MealEntry, dayKey: string) {
    if (!canReorder || event.button !== 0) return
    const slot = event.currentTarget.closest('[data-plan-meal-slot]')
    const target = slot instanceof HTMLElement ? slot : event.currentTarget
    const rect = target.getBoundingClientRect()
    const next: PlanMealDrag = {
      mealId: meal.id,
      fromDayKey: dayKey,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
    }
    event.preventDefault()
    event.stopPropagation()
    dragOriginRef.current = target
    dragPointerIdRef.current = event.pointerId
    dragRef.current = next
    didDragRef.current = true
    setDrag(next)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      try {
        target.setPointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12)
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>, _mealId: string) {
    const wasDragging = didDragRef.current || Boolean(dragRef.current)
    if (wasDragging) {
      didDragRef.current = false
      event.preventDefault()
    }
  }

  return { drag, startDrag, onPointerUp }
}

export function PlanMealGrid({
  day,
  canReorder,
  drag,
  picking = false,
  pickedIds,
  renderMeal,
  onPointerUp,
  onTogglePick,
}: {
  day: WeekPlanDay
  canReorder: boolean
  drag: PlanMealDrag | null
  picking?: boolean
  pickedIds?: ReadonlySet<string>
  renderMeal: (meal: MealEntry) => React.ReactNode
  onPointerUp: (event: React.PointerEvent<HTMLElement>, mealId: string) => void
  onTogglePick?: (mealId: string) => void
}) {
  return (
    <div className={productFeedGridClass} data-plan-day-board={day.dayKey}>
      {day.meals.map((meal, index) => {
        const draggingThis = drag?.mealId === meal.id
        const picked = Boolean(picking && pickedIds?.has(meal.id))
        return (
          <div
            className={cn(
              'touch-manipulation',
              canReorder && 'select-none',
              draggingThis && 'opacity-0',
            )}
            data-plan-day-key={day.dayKey}
            data-plan-meal-picked={picked ? '' : undefined}
            data-plan-meal-slot={index}
            key={meal.id}
            onClickCapture={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest(
                  '[data-slot="plan-meal-drag"], [data-slot="meal-card-footer"]',
                )
              ) {
                return
              }
              if (picking) {
                event.preventDefault()
                event.stopPropagation()
                onTogglePick?.(meal.id)
                return
              }
              if (drag) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            onContextMenu={(event) => {
              if (canReorder) event.preventDefault()
            }}
            onPointerUp={(event) => {
              if (picking) {
                event.preventDefault()
                return
              }
              onPointerUp(event, meal.id)
            }}
            style={draggingThis && drag ? { minHeight: drag.height } : undefined}
          >
            {renderMeal(meal)}
          </div>
        )
      })}
    </div>
  )
}

export function PlanMealDragGhost({
  days,
  drag,
  renderMeal,
}: {
  days: readonly WeekPlanDay[]
  drag: PlanMealDrag | null
  renderMeal: (meal: MealEntry) => React.ReactNode
}) {
  if (!drag || typeof document === 'undefined') return null
  const meal = days.flatMap((day) => day.meals).find((item) => item.id === drag.mealId)
  if (!meal) return null
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-[80] origin-center scale-[1.04] opacity-95 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
      data-plan-meal-ghost=""
      style={{
        width: drag.width,
        left: drag.x - drag.offsetX,
        top: drag.y - drag.offsetY,
      }}
    >
      {renderMeal(meal)}
    </div>,
    document.body,
  )
}
