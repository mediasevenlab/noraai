import * as React from 'react'

import { useLatest } from '@/lib/use-latest'
import { authDemoClear, authDemoTimeout } from '@/features/diary'

import {
  AUTH_RATION_DEMO,
  authRationDemoCloseAtMs,
  authRationDemoCookPressAtMs,
  authRationDemoCookShowAtMs,
  authRationDemoMealClickCount,
  authRationDemoMealPressAtMs,
  authRationDemoMealShowAtMs,
  authRationDemoShopPressAtMs,
  authRationDemoShopShowAtMs,
  rationDemoNodeScrollTop,
} from './auth-ration-demo'
import { RationOpenDetail, type RationDetailTab } from './RationDialog'
import type { RationEntry } from './rations-catalog'

function rationDetailViewport(root: HTMLElement) {
  return root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
}

function resetRationDetailScroll(root: HTMLElement) {
  const viewport = rationDetailViewport(root)
  if (viewport) viewport.scrollTop = 0
}

function animateScrollTop(
  viewport: HTMLElement,
  targetTop: number,
  durationMs: number,
): () => void {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const target = Math.max(0, Math.min(max, targetTop))
  if (reduced || durationMs <= 0) {
    viewport.scrollTop = target
    return () => undefined
  }

  const startTop = viewport.scrollTop
  const delta = target - startTop
  if (Math.abs(delta) < 1) return () => undefined

  let frame = 0
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    const eased = 1 - (1 - t) ** 3
    viewport.scrollTop = startTop + delta * eased
    if (t < 1) frame = window.requestAnimationFrame(tick)
  }
  frame = window.requestAnimationFrame(tick)
  return () => window.cancelAnimationFrame(frame)
}

function scrollMealUnderHeader(root: HTMLElement, mealIndex: number, durationMs: number) {
  const viewport = rationDetailViewport(root)
  const node = root.querySelector<HTMLElement>(
    `[data-ration-tab="Меню"] [data-ration-meal-index="${mealIndex}"]`,
  )
  if (!viewport || !node) return () => undefined
  const top = rationDemoNodeScrollTop(viewport, node)
  return animateScrollTop(viewport, top, durationMs)
}

export function AuthRationIdleSheet({
  collapsing = false,
  ration,
  play,
  startMs = 0,
  onComplete,
  onCaptionId,
}: {
  collapsing?: boolean
  ration: RationEntry
  play: boolean
  startMs?: number
  onComplete?: () => void
  onCaptionId?: (id: 'rationMeals' | 'rationCook' | 'rationShop') => void
}) {
  const mealCount = ration.meals.length
  const clickCount = authRationDemoMealClickCount(mealCount)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [tab, setTab] = React.useState<RationDetailTab>('Меню')
  const [previewIndex, setPreviewIndex] = React.useState(0)
  const [pressedMeal, setPressedMeal] = React.useState<number | null>(null)
  const [pressedTab, setPressedTab] = React.useState<RationDetailTab | null>(null)

  const captionId =
    tab === 'Покупки' ? 'rationShop' : tab === 'Готовка' ? 'rationCook' : 'rationMeals'
  const onCaptionIdRef = useLatest(onCaptionId)
  const onCompleteRef = useLatest(onComplete)

  React.useEffect(() => {
    onCaptionIdRef.current?.(captionId)
  }, [captionId, onCaptionIdRef])

  React.useEffect(() => {
    const root = rootRef.current
    if (!root || tab !== 'Меню') return
    let stop: () => void = () => undefined
    const id = window.requestAnimationFrame(() => {
      if (previewIndex <= 0) {
        resetRationDetailScroll(root)
        return
      }
      stop = scrollMealUnderHeader(root, previewIndex, AUTH_RATION_DEMO.mealScrollMs)
    })
    return () => {
      window.cancelAnimationFrame(id)
      stop()
    }
  }, [previewIndex, tab])

  React.useEffect(() => {
    if (tab !== 'Готовка' && tab !== 'Покупки') return
    const root = rootRef.current
    if (!root) return
    resetRationDetailScroll(root)
  }, [tab])

  React.useEffect(() => {
    if (!play) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPreviewIndex(Math.max(0, mealCount - 1))
      setTab('Покупки')
      const id = authDemoTimeout(() => onCompleteRef.current?.(), 80)
      return () => authDemoClear(id)
    }

    const origin = Math.max(0, startMs)
    const cookAt = authRationDemoCookShowAtMs(mealCount)
    const shopAt = authRationDemoShopShowAtMs(mealCount)
    const closeAt = authRationDemoCloseAtMs(mealCount)
    if (origin >= closeAt) {
      onCompleteRef.current?.()
      return
    }
    if (origin >= shopAt) setTab('Покупки')
    else if (origin >= cookAt) {
      setPreviewIndex(0)
      setTab('Готовка')
    } else {
      let idx = 0
      for (let clickIndex = 0; clickIndex < clickCount; clickIndex += 1) {
        if (origin >= authRationDemoMealShowAtMs(clickIndex)) {
          idx = clickIndex + 1
        }
      }
      setPreviewIndex(Math.min(idx, Math.max(0, mealCount - 1)))
    }

    const timers: number[] = []
    const at = (ms: number, fn: () => void) => {
      if (ms <= origin) return
      timers.push(authDemoTimeout(fn, ms - origin))
    }
    for (let clickIndex = 0; clickIndex < clickCount; clickIndex += 1) {
      const mealIndex = clickIndex + 1
      at(authRationDemoMealPressAtMs(clickIndex), () => setPressedMeal(mealIndex))
      at(authRationDemoMealShowAtMs(clickIndex), () => {
        setPressedMeal(null)
        setPreviewIndex(mealIndex)
      })
    }

    at(authRationDemoCookPressAtMs(mealCount), () => setPressedTab('Готовка'))
    at(cookAt, () => {
      setPressedTab(null)
      setPreviewIndex(0)
      setTab('Готовка')
    })
    at(authRationDemoShopPressAtMs(mealCount), () => setPressedTab('Покупки'))
    at(shopAt, () => {
      setPressedTab(null)
      setTab('Покупки')
    })
    at(closeAt, () => onCompleteRef.current?.())

    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [clickCount, mealCount, play, onCompleteRef])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-collapsing={collapsing ? '' : undefined}
      ref={rootRef}
    >
      <RationOpenDetail
        collapsing={collapsing}
        demoPressedMealIndex={pressedMeal}
        demoPressedTab={pressedTab}
        hideClose
        onPreviewIndexChange={setPreviewIndex}
        onTabChange={setTab}
        previewIndex={previewIndex}
        ration={ration}
        tab={tab}
      />
    </div>
  )
}
