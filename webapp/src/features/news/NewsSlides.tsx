import { useEffect, useRef, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

import type { NewsSlide } from './gallery'

const FADE_MS = 280
const SWIPE_PX = 36

function desktopArrows() {
  return window.matchMedia('(min-width: 768px)').matches
}

export function NewsSlides({
  slides,
  size,
  onActivate,
}: {
  slides: NewsSlide[]
  size: 'card' | 'hero'
  onActivate?: () => void
}) {
  const multiple = slides.length > 1
  const maxIndex = Math.max(0, slides.length - 1)
  const draggedRef = useRef(false)
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const index = Math.max(0, Math.min(active, maxIndex))
  if (active !== index) setActive(index)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    for (const video of root.querySelectorAll('video')) {
      const slide = video.closest('[data-news-slide]')
      if (slide?.getAttribute('data-active') !== 'true') video.pause()
    }
  }, [index])

  function goTo(next: number) {
    setActive(Math.max(0, Math.min(maxIndex, next)))
  }

  if (slides.length === 0) return null

  return (
    <div ref={rootRef} className="group/photos absolute inset-0">
      <div
        className={cn(
          'absolute inset-0 size-full touch-pan-y overflow-hidden overscroll-x-none',
          onActivate && 'cursor-pointer',
        )}
        onClick={(event) => {
          if (!onActivate) return
          if (multiple && draggedRef.current) {
            event.stopPropagation()
            return
          }
          onActivate()
        }}
        onPointerCancel={() => {
          pointerRef.current = null
        }}
        onPointerDown={(event) => {
          if (!multiple || event.button !== 0 || desktopArrows()) return
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
          if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
            goTo(index + (dx < 0 ? 1 : -1))
          }
        }}
      >
        {slides.map((slide, slideIndex) => {
          const current = slideIndex === index
          const nearby = Math.abs(slideIndex - index) <= 1
          return (
            <div
              className={cn(
                'absolute inset-0 overflow-hidden transition-opacity ease-out motion-reduce:duration-0',
                current ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              data-active={current ? 'true' : 'false'}
              data-news-slide=""
              key={`${slide.kind}:${slide.url}`}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            >
              {nearby ? <NewsSlideView current={current} hero={size === 'hero'} slide={slide} /> : null}
            </div>
          )
        })}
      </div>
      {multiple ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-2 z-[2] flex justify-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <button
              aria-label={`${slide.kind === 'video' ? 'Видео' : 'Фото'} ${slideIndex + 1} из ${slides.length}`}
              className={cn(
                'rounded-full transition-colors',
                size === 'hero' ? 'size-2' : 'size-1.5',
                slideIndex === index ? 'bg-white' : 'bg-white/45',
              )}
              key={`${slide.url}-dot`}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                goTo(slideIndex)
              }}
            />
          ))}
        </div>
      ) : null}
      {multiple && index > 0 ? <NewsSlideArrow direction="prev" onStep={() => goTo(index - 1)} /> : null}
      {multiple && index < maxIndex ? <NewsSlideArrow direction="next" onStep={() => goTo(index + 1)} /> : null}
    </div>
  )
}

function NewsSlideView({
  slide,
  current,
  hero,
}: {
  slide: NewsSlide
  current: boolean
  hero: boolean
}) {
  if (slide.kind === 'video' && hero) {
    return (
      <video
        className="size-full object-contain"
        controls={current}
        playsInline
        poster={slide.poster}
        preload={current ? 'metadata' : 'none'}
        src={slide.url}
      />
    )
  }
  return <img alt="" className="size-full object-cover" src={slide.kind === 'image' ? slide.url : slide.poster} />
}

function NewsSlideArrow({
  direction,
  onStep,
}: {
  direction: 'prev' | 'next'
  onStep: () => void
}) {
  const previous = direction === 'prev'
  return (
    <button
      aria-label={previous ? 'Предыдущее фото' : 'Следующее фото'}
      className={cn(
        productSheetOverlayChipClass,
        'absolute top-1/2 z-[3] hidden size-7 -translate-y-1/2 md:inline-flex',
        'pointer-events-none opacity-0 transition-opacity',
        'md:group-hover/photos:pointer-events-auto md:group-hover/photos:opacity-100',
        'hover:text-[var(--nora-text)]',
        'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:shadow-[var(--nora-shadow-focus)]',
        previous ? 'left-2' : 'right-2',
      )}
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onStep()
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {previous ? (
        <ChevronLeftIcon aria-hidden className="size-4" strokeWidth={2.25} />
      ) : (
        <ChevronRightIcon aria-hidden className="size-4" strokeWidth={2.25} />
      )}
    </button>
  )
}
