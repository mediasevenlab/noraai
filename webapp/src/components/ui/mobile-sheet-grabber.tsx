import * as React from 'react'

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

function popupOf(node: HTMLElement) {
  return node.closest(
    '[data-slot="dialog-content"], [data-slot="sheet-content"]',
  ) as HTMLElement | null
}

function setShift(popup: HTMLElement, y: number, animate: boolean) {
  popup.style.setProperty('animation', 'none', 'important')
  popup.style.setProperty('translate', 'none', 'important')
  popup.style.setProperty('transition', animate ? `transform 320ms ${EASE}` : 'none', 'important')
  popup.style.setProperty('transform', `translate3d(0, ${Math.max(0, y)}px, 0)`, 'important')
}

function restOpen(popup: HTMLElement) {
  popup.style.setProperty('animation', 'none', 'important')
  popup.style.removeProperty('transition')
  popup.style.removeProperty('transform')
  popup.style.removeProperty('translate')
}

/** Phone grabber. The sheet follows the finger, then settles closed or back. */
export function MobileSheetGrabber({ dismiss }: { dismiss: React.ReactNode }) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ y: number } | null>(null)

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    const popup = popupOf(event.currentTarget)
    if (!popup) return
    drag.current = { y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setShift(popup, 0, false)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    const popup = popupOf(event.currentTarget)
    if (!popup) return
    setShift(popup, event.clientY - start.y, false)
  }

  function finish(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current
    drag.current = null
    if (!start) return
    const popup = popupOf(event.currentTarget)
    if (!popup) return
    const delta = Math.max(0, event.clientY - start.y)
    const limit = Math.max(160, popup.getBoundingClientRect().height * 0.28)
    if (delta >= limit) {
      setShift(popup, popup.offsetHeight, true)
      window.setTimeout(() => {
        const button = rootRef.current?.querySelector('[data-sheet-dismiss]')
        if (button instanceof HTMLElement) button.click()
      }, 280)
      return
    }
    setShift(popup, 0, true)
    const done = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform') return
      popup.removeEventListener('transitionend', done)
      if (!drag.current) restOpen(popup)
    }
    popup.addEventListener('transitionend', done)
  }

  return (
    <div ref={rootRef} className="contents">
      <div
        aria-hidden
        data-slot="sheet-grabber"
        className="nora-sheet-handle absolute top-0 left-1/2 z-[5] flex h-8 w-44 -translate-x-1/2 -translate-y-[calc(100%+10px)] touch-none items-end justify-center md:hidden"
        onPointerCancel={finish}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
      >
        <span className="h-[3px] w-8 rounded-full bg-[color-mix(in_srgb,var(--nora-text-tertiary)_40%,transparent)]" />
      </div>
      {dismiss}
    </div>
  )
}
