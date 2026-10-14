import * as React from 'react'

import { cn } from '@/lib/utils'
import { useLatest } from '@/lib/use-latest'

import { MealPhotoSlides } from './MealCard'
import { MEAL_COVER_STUB_SRC } from './meal-cover'
import { nextComposerHeroIndex } from './meal-hero-preview'

export const MEAL_ADD_PREVIEW_FADE_MS = 500

export function MealAddHeroPreview({ slides }: { slides: string[] }) {
  const slideKey = slides.join('|')
  const slidesRef = useLatest(slides)
  const previousSlidesRef = React.useRef<string[]>([])
  const indexRef = React.useRef(0)
  const [settledSlides, setSettledSlides] = React.useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [overlaySrc, setOverlaySrc] = React.useState<string | null>(null)
  const [overlayOn, setOverlayOn] = React.useState(false)

  const commitIndex = React.useCallback((index: number) => {
    indexRef.current = index
    setSelectedIndex(index)
  }, [])

  React.useEffect(() => {
    const next = slidesRef.current
    const previous = previousSlidesRef.current
    previousSlidesRef.current = next
    const nextIndex = nextComposerHeroIndex({
      previous,
      next,
      activeIndex: indexRef.current,
    })
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fromSrc = previous[Math.min(indexRef.current, Math.max(0, previous.length - 1))] ?? null
    const toSrc = next[nextIndex] ?? null

    if (reduced || fromSrc === toSrc || next.length === previous.length) {
      setOverlaySrc(null)
      setOverlayOn(false)
      setSettledSlides(next)
      commitIndex(next.length === 0 ? 0 : nextIndex)
      return
    }

    if (next.length > previous.length && toSrc) {
      setSettledSlides(next)
      commitIndex(nextIndex)
      setOverlaySrc(toSrc)
      setOverlayOn(false)
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setOverlayOn(true))
      })
      const clearId = window.setTimeout(() => {
        setOverlaySrc(null)
        setOverlayOn(false)
      }, MEAL_ADD_PREVIEW_FADE_MS + 80)
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
        window.clearTimeout(clearId)
      }
    }

    if (fromSrc) {
      setOverlaySrc(fromSrc)
      setOverlayOn(true)
      setSettledSlides(next)
      commitIndex(next.length === 0 ? 0 : nextIndex)
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setOverlayOn(false))
      })
      const doneId = window.setTimeout(() => setOverlaySrc(null), MEAL_ADD_PREVIEW_FADE_MS)
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
        window.clearTimeout(doneId)
      }
    }

    setSettledSlides(next)
    commitIndex(next.length === 0 ? 0 : nextIndex)
  }, [commitIndex, slideKey, slidesRef])

  return (
    <>
      <img
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
        src={MEAL_COVER_STUB_SRC}
      />
      {settledSlides.length > 0 ? (
        <MealPhotoSlides
          dotsOffset="raised"
          onSelectedIndexChange={commitIndex}
          selectedIndex={selectedIndex}
          sizes="lg"
          slides={settledSlides}
        />
      ) : null}
      {overlaySrc ? (
        <img
          alt=""
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] size-full object-cover transition-opacity ease-out motion-reduce:duration-0',
            overlayOn ? 'opacity-100' : 'opacity-0',
          )}
          src={overlaySrc}
          style={{ transitionDuration: `${MEAL_ADD_PREVIEW_FADE_MS}ms` }}
        />
      ) : null}
    </>
  )
}
