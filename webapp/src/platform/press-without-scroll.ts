import * as React from 'react'

const MOVE_PX = 8

type ScrollMark = { node: Element | Window; top: number; left: number }

function scrollMarks(from: EventTarget | null): ScrollMark[] {
  const marks: ScrollMark[] = [{ node: window, top: window.scrollY, left: window.scrollX }]
  let current = from instanceof Element ? from.parentElement : null
  while (current) {
    if (current.scrollHeight > current.clientHeight + 1 || current.scrollWidth > current.clientWidth + 1) {
      marks.push({ node: current, top: current.scrollTop, left: current.scrollLeft })
    }
    current = current.parentElement
  }
  return marks
}

function scrolledSince(marks: ScrollMark[]) {
  return marks.some((mark) => {
    if (mark.node === window) {
      return Math.abs(window.scrollY - mark.top) > 2 || Math.abs(window.scrollX - mark.left) > 2
    }
    const element = mark.node as Element
    return Math.abs(element.scrollTop - mark.top) > 2 || Math.abs(element.scrollLeft - mark.left) > 2
  })
}

/** Ignore click/activate after a finger/mouse drag (scroll or swipe). */
export function usePressWithoutScroll(onActivate?: () => void) {
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const marksRef = React.useRef<ScrollMark[]>([])
  const movedRef = React.useRef(false)
  const cleanupRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => () => cleanupRef.current?.(), [])

  function release() {
    cleanupRef.current?.()
    cleanupRef.current = null
  }

  return {
    onPointerDown(event: React.PointerEvent) {
      if (event.button !== 0) return
      release()
      movedRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
      marksRef.current = scrollMarks(event.currentTarget)
      const markMoved = (next: Event) => {
        if (next instanceof PointerEvent) {
          const start = startRef.current
          if (!start) return
          if (Math.hypot(next.clientX - start.x, next.clientY - start.y) <= MOVE_PX) return
        }
        movedRef.current = true
      }
      window.addEventListener('pointermove', markMoved, { passive: true })
      window.addEventListener('scroll', markMoved, { capture: true, passive: true })
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', markMoved)
        window.removeEventListener('scroll', markMoved, true)
      }
    },
    onPointerMove(event: React.PointerEvent) {
      const start = startRef.current
      if (!start) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_PX) {
        movedRef.current = true
      }
    },
    onPointerUp() {
      startRef.current = null
    },
    onPointerCancel() {
      startRef.current = null
      movedRef.current = true
      release()
    },
    onClick(event: React.MouseEvent) {
      const moved = movedRef.current || scrolledSince(marksRef.current)
      release()
      startRef.current = null
      marksRef.current = []
      if (moved) {
        event.preventDefault()
        event.stopPropagation()
        movedRef.current = false
        return
      }
      movedRef.current = false
      onActivate?.()
    },
  }
}
