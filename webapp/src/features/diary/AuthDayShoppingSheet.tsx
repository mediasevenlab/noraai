import * as React from 'react'

import { useLatest } from '@/lib/use-latest'

import { authDemoClear, authDemoTimeout } from './auth-demo-playback'
import {
  AUTH_SHOP_DEMO,
  authShopDemoCloseAtMs,
  authShopDemoItemCheckAtMs,
  authShopDemoItemPressAtMs,
  type AuthDemoCaptionId,
} from './auth-meal-carousel'
import { DayShoppingBody } from './DayShoppingDialog'
import { dayShoppingItems, type DayShoppingMeal } from './day-shopping'

export function AuthDayShoppingSheet({
  bought,
  collapsing = false,
  heading,
  meals,
  onBoughtChange,
  onCaptionId,
  onComplete,
  play,
}: {
  bought: ReadonlySet<string>
  collapsing?: boolean
  heading: string
  meals: readonly DayShoppingMeal[]
  onBoughtChange: (keys: Set<string>) => void
  onCaptionId?: (id: AuthDemoCaptionId) => void
  onComplete?: () => void
  play: boolean
}) {
  const items = React.useMemo(
    () => dayShoppingItems(meals, AUTH_SHOP_DEMO.maxItems),
    [meals],
  )
  const [pressedKey, setPressedKey] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)
  const onBoughtChangeRef = useLatest(onBoughtChange)
  const boughtRef = useLatest(bought)

  React.useEffect(() => {
    onCaptionIdRef.current?.('shopping')
  }, [onCaptionIdRef])

  React.useEffect(() => {
    if (!pressedKey) return
    const root = rootRef.current
    const node = root?.querySelector<HTMLElement>(
      `[data-shopping-item="${CSS.escape(pressedKey)}"]`,
    )
    const scroller = root?.querySelector<HTMLElement>('[data-day-shopping-list]')
    if (!node || !scroller) return
    const scrollerRect = scroller.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    const delta =
      nodeRect.top < scrollerRect.top
        ? nodeRect.top - scrollerRect.top
        : nodeRect.bottom > scrollerRect.bottom
          ? nodeRect.bottom - scrollerRect.bottom
          : 0
    if (Math.abs(delta) < 1) return
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' })
  }, [pressedKey])

  React.useEffect(() => {
    if (!play) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onBoughtChangeRef.current(new Set(items.map((item) => item.key)))
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const timers = items.flatMap((item, index) => [
      authDemoTimeout(() => setPressedKey(item.key), authShopDemoItemPressAtMs(index)),
      authDemoTimeout(() => {
        setPressedKey(null)
        const next = new Set(boughtRef.current)
        next.add(item.key)
        onBoughtChangeRef.current(next)
      }, authShopDemoItemCheckAtMs(index)),
    ])
    timers.push(
      authDemoTimeout(() => onCompleteRef.current?.(), authShopDemoCloseAtMs(items.length)),
    )
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [boughtRef, items, onBoughtChangeRef, onCompleteRef, play])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-collapsing={collapsing ? '' : undefined}
      data-day-shopping="demo"
      ref={rootRef}
    >
      <DayShoppingBody
        bought={bought}
        collapsing={collapsing}
        demoPressedKey={pressedKey}
        heading={heading}
        hideClose
        itemLimit={AUTH_SHOP_DEMO.maxItems}
        meals={meals}
        onToggle={() => undefined}
      />
    </div>
  )
}
