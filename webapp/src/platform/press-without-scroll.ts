import * as React from 'react'

const MOVE_PX = 12

/** Ignore click/activate after a finger/mouse drag (scroll or swipe). */
export function usePressWithoutScroll(onActivate?: () => void) {
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const movedRef = React.useRef(false)

  return {
    onPointerDown(event: React.PointerEvent) {
      if (event.button !== 0) return
      movedRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
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
    },
    onClick(event: React.MouseEvent) {
      if (movedRef.current) {
        event.preventDefault()
        event.stopPropagation()
        movedRef.current = false
        return
      }
      onActivate?.()
    },
  }
}
