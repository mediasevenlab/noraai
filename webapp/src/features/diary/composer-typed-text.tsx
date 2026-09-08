import * as React from 'react'

import { playHybridHaptic } from '@/platform/hybrid-haptics'
import { useLatest } from '@/lib/use-latest'
import { useAuthDemoSeeking } from './auth-demo-playback'

export const COMPOSER_TYPEWRITER_BLUR_CHARS = 5

export type ComposerTypewriterPace = 'chat' | 'fast'

export function composerTypewriterStepMs(
  length: number,
  pace: ComposerTypewriterPace = 'chat',
) {
  if (length <= 0) return 0
  if (pace === 'fast') return Math.round(Math.max(2, Math.min(6, 220 / length)))
  return Math.round(Math.max(8, Math.min(22, 1100 / length)))
}

export function composerTypewriterStartMs(pace: ComposerTypewriterPace = 'chat') {
  return pace === 'fast' ? 12 : 180
}

export function composerTypewriterBlurPx(offsetFromEnd: number) {
  if (offsetFromEnd < 0 || offsetFromEnd >= COMPOSER_TYPEWRITER_BLUR_CHARS) return 0
  return Math.round((1 - offsetFromEnd / COMPOSER_TYPEWRITER_BLUR_CHARS) * 32) / 10
}

export function composerTypedTextPaintsBlur(
  root: { hasAttribute?: (name: string) => boolean } | null = globalThis.document?.documentElement,
) {
  return root?.hasAttribute?.('data-hybrid') !== true
}

export function shouldPlayComposerTypingHaptic(input: {
  live: boolean
  reducedMotion: boolean
  length: number
}) {
  return input.live && !input.reducedMotion && input.length > 0
}

export function splitComposerTypedTail(shown: string, typing: boolean) {
  if (!typing || shown.length === 0) {
    return { sharp: shown, tail: [] as string[] }
  }
  const chars = Array.from(shown)
  const tailCount = Math.min(COMPOSER_TYPEWRITER_BLUR_CHARS, chars.length)
  return {
    sharp: chars.slice(0, chars.length - tailCount).join(''),
    tail: chars.slice(chars.length - tailCount),
  }
}

function closestTypedTextScroller(node: HTMLElement | null) {
  const viewport = node?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
  if (viewport) return viewport
  let current = node?.parentElement ?? null
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}

export function ComposerTypedText({
  text,
  live,
  pace = 'chat',
  onComplete,
}: {
  text: string
  live: boolean
  pace?: ComposerTypewriterPace
  onComplete?: () => void
}) {
  const [shown, setShown] = React.useState(live ? '' : text)
  const [typing, setTyping] = React.useState(live)
  const rootRef = React.useRef<HTMLSpanElement>(null)
  const onCompleteRef = useLatest(onComplete)
  const finishedKeyRef = React.useRef<string | null>(null)
  const seeking = useAuthDemoSeeking()
  const displayed = live ? shown : text
  const typingNow = live && typing

  React.useEffect(() => {
    if (!live) return
    const finish = () => {
      if (finishedKeyRef.current === text) return
      finishedKeyRef.current = text
      onCompleteRef.current?.()
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || seeking || text.length === 0) {
      const id = window.setTimeout(() => {
        setShown(text)
        setTyping(false)
        finish()
      }, 0)
      return () => window.clearTimeout(id)
    }

    const step = composerTypewriterStepMs(text.length, pace)
    let index = 0
    let intervalId = 0
    const startId = window.setTimeout(() => {
      setShown('')
      setTyping(true)
      if (
        shouldPlayComposerTypingHaptic({
          live: true,
          reducedMotion: false,
          length: text.length,
        })
      ) {
        void playHybridHaptic('medium')
      }
      intervalId = window.setInterval(() => {
        index += 1
        setShown(text.slice(0, index))
        if (index >= text.length) {
          window.clearInterval(intervalId)
          setTyping(false)
          finish()
        }
      }, step)
    }, composerTypewriterStartMs(pace))

    return () => {
      window.clearTimeout(startId)
      window.clearInterval(intervalId)
    }
  }, [live, onCompleteRef, pace, seeking, text])

  React.useEffect(() => {
    if (!live) return
    const viewport = closestTypedTextScroller(rootRef.current)
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [live, displayed])

  const paintsBlur = composerTypedTextPaintsBlur()
  const { sharp, tail } = splitComposerTypedTail(displayed, typingNow && paintsBlur)
  const sharpCount = Array.from(sharp).length

  return (
    <span className="min-w-0 whitespace-pre-wrap" ref={rootRef}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {sharp}
        {tail.map((char, index) => {
          const offsetFromEnd = tail.length - 1 - index
          const blur = composerTypewriterBlurPx(offsetFromEnd)
          const freshness = 1 - offsetFromEnd / COMPOSER_TYPEWRITER_BLUR_CHARS
          return (
            <span
              key={sharpCount + index}
              style={{
                filter: blur > 0 ? `blur(${blur}px)` : undefined,
                opacity: 0.42 + freshness * 0.58,
                transition: 'filter 140ms ease-out, opacity 140ms ease-out',
              }}
            >
              {char}
            </span>
          )
        })}
      </span>
    </span>
  )
}
