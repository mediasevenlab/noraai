import * as React from 'react'

import { cn } from '@/lib/utils'

import { composerPressPoint, shouldPressComposerSurface } from './composer-press'

export function ComposerPressSurface({
  children,
  className,
  pressed: pressedProp,
  focused = false,
  /** Demo / scripted press origin inside the surface (defaults to center-ish). */
  pressPoint = { x: '50%', y: '36%' },
}: {
  children: React.ReactNode
  className?: string
  pressed?: boolean
  focused?: boolean
  pressPoint?: { x: string; y: string }
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [pressedInner, setPressedInner] = React.useState(false)
  const pressed = pressedProp ?? pressedInner

  React.useEffect(() => {
    if (pressedProp !== undefined || !pressedInner) return
    const end = () => setPressedInner(false)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [pressedInner, pressedProp])

  React.useEffect(() => {
    if (pressedProp !== true) return
    const node = ref.current
    if (!node) return
    node.style.setProperty('--press-x', pressPoint.x)
    node.style.setProperty('--press-y', pressPoint.y)
  }, [pressPoint.x, pressPoint.y, pressedProp])

  function pressAt(event: React.PointerEvent<HTMLDivElement>) {
    if (pressedProp !== undefined) return
    if (event.button !== 0) return
    if (!shouldPressComposerSurface(event.target)) return
    const node = ref.current
    if (!node) return
    const point = composerPressPoint(node.getBoundingClientRect(), event.clientX, event.clientY)
    node.style.setProperty('--press-x', point.x)
    node.style.setProperty('--press-y', point.y)
    setPressedInner(true)
  }

  return (
    <div
      className={cn('composer-press-surface', className)}
      data-focused={focused ? '' : undefined}
      data-pressed={pressed ? '' : undefined}
      onPointerDown={pressAt}
      ref={ref}
    >
      <span aria-hidden className="composer-press-glow" />
      {children}
    </div>
  )
}
