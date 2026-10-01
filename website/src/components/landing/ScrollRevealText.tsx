import { useEffect, useMemo, useRef, useState, type ElementType, type RefObject } from 'react'
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type MotionValue,
} from 'motion/react'

import { cn } from '@/lib/utils'

type RevealVariant = 'primary' | 'secondary'

type RevealOffset = NonNullable<NonNullable<Parameters<typeof useScroll>[0]>['offset']>

type ScrollRevealTextProps = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'blockquote'
  className?: string
  id?: string
  /**
   * primary — крупные заголовки (Nexen H2): быстрее, при обратном скролле не откатывается.
   * secondary — вспомогательные (описания, h3): появление/исчезновение вверх-вниз.
   * @see https://nexenai.framer.website/
   */
  variant?: RevealVariant
  offset?: RevealOffset
  /** Scroll progress follows this element instead of the text itself. */
  scrollTarget?: RefObject<HTMLElement | null>
}

const VARIANT_OFFSETS = {
  // Faster finish (upper-mid viewport) — Nexen main titles complete ~top 0.52–0.58
  primary: ['start 0.92', 'start 0.52'],
  // Longer scrub window so reverse scroll clearly hides/shows again
  secondary: ['start 0.96', 'start 0.42'],
} as const satisfies Record<RevealVariant, RevealOffset>

function RevealChar({
  char,
  index,
  total,
  progress,
  variant,
}: {
  char: string
  index: number
  total: number
  progress: MotionValue<number>
  variant: RevealVariant
}) {
  const spanRef = useRef<HTMLSpanElement>(null)
  // Primary: tighter cascade → feels faster; secondary: wider wave
  const windowSize =
    variant === 'primary'
      ? Math.max(0.12, Math.min(0.26, 6 / Math.max(total, 1)))
      : Math.max(0.2, Math.min(0.38, 9 / Math.max(total, 1)))
  const start = (index / Math.max(total - 1, 1)) * (1 - windowSize)
  const end = start + windowSize

  const apply = (p: number) => {
    const el = spanRef.current
    if (!el) return
    const t = Math.min(1, Math.max(0, (p - start) / (end - start || 1)))
    const e = t * t * (3 - 2 * t)
    el.style.opacity = String(0.001 + e * 0.999)
    el.style.filter = `blur(${(1 - e) * 10}px)`
    el.style.transform = `translateY(${(1 - e) * 10}px)`
  }

  useMotionValueEvent(progress, 'change', apply)
  useEffect(() => {
    apply(progress.get())
  }, [progress, start, end])

  return (
    <span
      ref={spanRef}
      aria-hidden="true"
      className="inline-block will-change-[transform,filter,opacity]"
      style={{ opacity: 0.001, filter: 'blur(10px)', transform: 'translateY(10px)' }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  )
}

/**
 * Nexen-style scroll text: per-character blur(10) → 0, opacity ~0 → 1, translateY(10) → 0.
 * Primary latches once revealed; secondary scrubs both directions.
 * @see https://nexenai.framer.website/
 */
export default function ScrollRevealText({
  text,
  as: Tag = 'span',
  className,
  id,
  variant = Tag === 'h1' || Tag === 'h2' ? 'primary' : 'secondary',
  offset,
  scrollTarget,
}: ScrollRevealTextProps) {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLElement | null>(null)
  const [scrollReady, setScrollReady] = useState(false)
  const resolvedOffset = offset ?? VARIANT_OFFSETS[variant]
  const latchedProgress = useMotionValue(0)
  const peakRef = useRef(0)

  useEffect(() => {
    setScrollReady(true)
  }, [])

  const { scrollYProgress } = useScroll({
    target: scrollReady ? (scrollTarget ?? containerRef) : undefined,
    offset: resolvedOffset,
  })

  // Primary: once letters reveal, reverse scroll does not undo them (Nexen main titles).
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (variant !== 'primary') {
      latchedProgress.set(value)
      return
    }
    const next = Math.max(peakRef.current, value)
    peakRef.current = next
    latchedProgress.set(next)
  })

  useEffect(() => {
    const value = scrollYProgress.get()
    if (variant === 'primary') {
      peakRef.current = Math.max(peakRef.current, value)
      latchedProgress.set(peakRef.current)
    } else {
      latchedProgress.set(value)
    }
  }, [scrollYProgress, latchedProgress, variant, scrollReady])

  const tokens = useMemo(() => tokenize(text), [text])
  const charCount = useMemo(
    () => tokens.reduce((sum, token) => sum + (token.type === 'word' ? token.value.length : 0), 0),
    [tokens],
  )

  const Comp = Tag as ElementType
  const progress = variant === 'primary' ? latchedProgress : scrollYProgress

  if (reduceMotion) {
    return (
      <Comp className={className} id={id}>
        {text}
      </Comp>
    )
  }

  let charIndex = 0

  return (
    <Comp className={cn(className)} id={id} ref={containerRef}>
      <span className="sr-only">{text}</span>
      {!scrollReady ? (
        <span aria-hidden="true">{text}</span>
      ) : (
        tokens.map((token, tokenIndex) => {
          if (token.type === 'space') {
            return <span key={`s-${tokenIndex}`}>{token.value}</span>
          }

          return (
            <span key={`w-${tokenIndex}`} className="whitespace-nowrap">
              {[...token.value].map((char) => {
                const index = charIndex++
                return (
                  <RevealChar
                    key={`${tokenIndex}-${index}`}
                    char={char}
                    index={index}
                    progress={progress}
                    total={charCount}
                    variant={variant}
                  />
                )
              })}
            </span>
          )
        })
      )}
    </Comp>
  )
}

function tokenize(text: string): Array<{ type: 'word' | 'space'; value: string }> {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((value) => ({
      type: /^\s+$/.test(value) ? 'space' : 'word',
      value,
    }))
}
