import * as React from 'react'
import { PauseIcon, PlayIcon } from '@/components/icons'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Job = {
  id: number
  remaining: number
  fn: () => void
}

export type AuthDemoStepMark = {
  id: string
  title: string
  chip: string
  atMs: number
}

let nextId = 1
const jobs = new Map<number, Job>()
let raf = 0
let lastStamp = 0
let paused = false
/** One hidden-tab frame can be many seconds. Applying it would skip the demo
 *  or land it mid-transition with an empty white card. */
const MAX_FRAME_MS = 100
let visibilityBound = false
let elapsedMs = 0
let generation = 0
let seekTarget: number | null = null
let remountHold = false
let emptySeekFrames = 0
let catchupRaf = 0
let resumeAfterSeek = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function applyDt(dt: number, onlyIds?: Set<number>) {
  if (dt <= 0) return
  for (const job of [...jobs.values()]) {
    if (onlyIds && !onlyIds.has(job.id)) continue
    job.remaining -= dt
    if (job.remaining > 0) continue
    jobs.delete(job.id)
    job.fn()
  }
}

function pump(now: number) {
  if (seekTarget != null) {
    raf = 0
    lastStamp = 0
    return
  }
  if (lastStamp === 0) lastStamp = now
  const gap = now - lastStamp
  const dt = paused ? 0 : Math.min(Math.max(0, gap), MAX_FRAME_MS)
  lastStamp = now
  if (dt > 0) {
    elapsedMs += dt
    applyDt(dt)
    notify()
  }
  if (jobs.size > 0) {
    if (typeof window !== 'undefined') raf = window.requestAnimationFrame(pump)
  } else {
    raf = 0
    lastStamp = 0
  }
}

function wakeClock() {
  lastStamp = 0
  if (typeof window !== 'undefined' && raf) {
    window.cancelAnimationFrame(raf)
  }
  raf = 0
  if (typeof document !== 'undefined' && document.hidden) return
  ensurePump()
}

function bindVisibility() {
  if (visibilityBound || typeof document === 'undefined') return
  visibilityBound = true
  document.addEventListener('visibilitychange', wakeClock)
  window.addEventListener('focus', wakeClock)
  window.addEventListener('pageshow', wakeClock)
}

function ensurePump() {
  bindVisibility()
  if (raf || seekTarget != null || typeof window === 'undefined') return
  lastStamp = 0
  raf = window.requestAnimationFrame(pump)
}

/** Test seam: advance the demo clock to `now` without waiting for a frame. */
export function authDemoStep(now: number) {
  if (typeof window !== 'undefined' && raf) {
    window.cancelAnimationFrame(raf)
    raf = 0
  }
  pump(now)
}

function stopCatchupTimer() {
  if (catchupRaf && typeof window !== 'undefined') {
    window.cancelAnimationFrame(catchupRaf)
  }
  catchupRaf = 0
}

function finishSeek() {
  elapsedMs = seekTarget ?? elapsedMs
  remountHold = false
  emptySeekFrames = 0
  stopCatchupTimer()
  paused = true
}

export function authDemoReleaseSeek() {
  if (seekTarget == null) return
  seekTarget = null
  remountHold = false
  if (resumeAfterSeek) {
    resumeAfterSeek = false
    paused = false
    lastStamp = 0
    ensurePump()
  }
  notify()
}

function ensureCatchup() {
  if (seekTarget == null || typeof window === 'undefined') return
  if (catchupRaf) return
  const loop = () => {
    catchupRaf = 0
    if (authDemoCatchup()) {
      // Wait for the next paint so React can mount the next sheet and
      // schedule its timeouts before we decide the step has landed.
      catchupRaf = window.requestAnimationFrame(loop)
    }
    notify()
  }
  catchupRaf = window.requestAnimationFrame(loop)
}

export function authDemoSubscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function authDemoTimeout(fn: () => void, ms: number) {
  const id = nextId
  nextId += 1
  jobs.set(id, { id, remaining: Math.max(0, ms), fn })
  ensurePump()
  return id
}

export function authDemoClear(id: number) {
  jobs.delete(id)
}

export function authDemoSetPaused(next: boolean) {
  paused = next
  lastStamp = 0
  notify()
  if (!next) ensurePump()
}

export function authDemoResume() {
  authDemoSetPaused(false)
}

export function authDemoIsPaused() {
  return paused
}

export function authDemoElapsedMs() {
  return elapsedMs
}

export function authDemoIsSeeking() {
  return seekTarget != null
}

export function authDemoIsRemountHold() {
  return remountHold
}

export function useAuthDemoRemountHold() {
  const [held, setHeld] = React.useState(() => remountHold)
  React.useEffect(() => authDemoSubscribe(() => setHeld(remountHold)), [])
  return held
}

export function useAuthDemoSeeking() {
  const [seeking, setSeeking] = React.useState(() => seekTarget != null)
  React.useEffect(() => authDemoSubscribe(() => setSeeking(seekTarget != null)), [])
  return seeking
}

export function authDemoGeneration() {
  return generation
}

export function authDemoResetClock() {
  jobs.clear()
  nextId = 1
  if (typeof window !== 'undefined') {
    if (raf) window.cancelAnimationFrame(raf)
  }
  raf = 0
  stopCatchupTimer()
  lastStamp = 0
  paused = false
  elapsedMs = 0
  generation = 0
  seekTarget = null
  remountHold = false
  emptySeekFrames = 0
  resumeAfterSeek = false
}

export function authDemoKickCatchup() {
  ensureCatchup()
}

export function authDemoCatchup() {
  if (seekTarget == null) return false
  const target = seekTarget
  if (elapsedMs >= target) {
    finishSeek()
    return false
  }

  if (jobs.size === 0) {
    emptySeekFrames += 1
    // Empty waves are the gap while React mounts the next sheet. Do not
    // reveal the intro just because the next timeouts are not queued yet.
    if (emptySeekFrames > 360) {
      finishSeek()
      return false
    }
    return true
  }
  emptySeekFrames = 0

  let steps = 0
  while (elapsedMs < target && steps < 200) {
    const queued = [...jobs.values()]
    if (queued.length === 0) break
    const nextDue = Math.min(...queued.map((job) => job.remaining))
    const remaining = target - elapsedMs
    if (nextDue > remaining) {
      applyDt(remaining)
      finishSeek()
      return false
    }
    elapsedMs += nextDue
    applyDt(nextDue)
    steps += 1
  }

  if (elapsedMs >= target) {
    finishSeek()
    return false
  }
  return true
}

export function authDemoPlayFrom(targetMs: number, options?: { autoplay?: boolean }) {
  const target = Math.max(0, targetMs)
  paused = true
  lastStamp = 0
  jobs.clear()
  if (typeof window !== 'undefined' && raf) window.cancelAnimationFrame(raf)
  raf = 0
  elapsedMs = 0
  generation += 1
  seekTarget = target
  remountHold = true
  emptySeekFrames = 0
  resumeAfterSeek = Boolean(options?.autoplay)
  notify()
}

const PlaybackContext = React.createContext<{
  paused: boolean
  generation: number
  pause: () => void
  play: () => void
  playFrom: (ms: number) => void
} | null>(null)

export function AuthDemoPlaybackProvider({
  children,
  startMs = 0,
  endMs = Number.POSITIVE_INFINITY,
  autoplay = true,
}: {
  children: React.ReactNode
  startMs?: number
  endMs?: number
  /** Landing embeds stay parked until the visible block asks them to play. */
  autoplay?: boolean
}) {
  const [pausedState, setPausedState] = React.useState(!autoplay)
  const [generationState, setGenerationState] = React.useState(0)
  React.useLayoutEffect(() => {
    authDemoPlayFrom(startMs, { autoplay })
  }, [autoplay, startMs])
  React.useEffect(() => {
    return () => {
      authDemoResetClock()
    }
  }, [])
  React.useEffect(
    () =>
      authDemoSubscribe(() => {
        setPausedState(authDemoIsPaused())
        setGenerationState(authDemoGeneration())
        if (authDemoIsSeeking()) return
        if (authDemoElapsedMs() >= endMs && !authDemoIsPaused()) {
          authDemoSetPaused(true)
        }
      }),
    [endMs],
  )
  const value = React.useMemo(
    () => ({
      paused: pausedState,
      generation: generationState,
      pause: () => {
        authDemoSetPaused(true)
        setPausedState(true)
      },
      play: () => {
        if (authDemoElapsedMs() >= endMs) {
          authDemoPlayFrom(startMs, { autoplay: true })
          return
        }
        authDemoResume()
        setPausedState(false)
      },
      playFrom: (ms: number) => {
        authDemoPlayFrom(ms)
      },
    }),
    [endMs, generationState, pausedState, startMs],
  )
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function useAuthDemoPlayback() {
  return React.useContext(PlaybackContext)
}

const PLAYBACK_ICON_BUTTON_CLASS = cn(
  'size-7 border-transparent bg-transparent text-white/70 shadow-none',
  'hover:bg-transparent hover:text-white',
  'aria-pressed:bg-transparent aria-pressed:text-white',
  'aria-expanded:bg-transparent',
)

export function AuthDemoPlaybackTransport({ className }: { className?: string }) {
  const playback = useAuthDemoPlayback()
  if (!playback) return null
  const chip = cn(PLAYBACK_ICON_BUTTON_CLASS, className)
  return (
    <div className="flex items-center gap-1.5" data-auth-demo-transport="">
      <Button
        aria-label="Стоп"
        aria-pressed={playback.paused}
        className={chip}
        onClick={playback.pause}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PauseIcon aria-hidden className="size-3.5" />
      </Button>
      <Button
        aria-label="Плей"
        aria-pressed={!playback.paused}
        className={chip}
        onClick={playback.play}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PlayIcon aria-hidden className="size-3.5" />
      </Button>
    </div>
  )
}

export function AuthDemoPlaybackButtons({
  marks = [],
}: {
  marks?: readonly AuthDemoStepMark[]
}) {
  const playback = useAuthDemoPlayback()
  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => authDemoSubscribe(() => setElapsed(authDemoElapsedMs())), [])
  if (!playback) return null
  let activeId = marks[0]?.id
  for (const item of marks) {
    if (elapsed < item.atMs) break
    activeId = item.id
  }
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-auth-demo-steps=""
    >
      {marks.map((item) => {
        const current = item.id === activeId
        return (
          <button
            aria-current={current ? 'step' : undefined}
            aria-label={item.title}
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 font-[family-name:var(--nora-font)] text-[10px] leading-4',
              'transition-colors',
              current
                ? 'bg-white/20 text-white'
                : 'bg-transparent text-white/55 hover:bg-white/10 hover:text-white',
            )}
            key={item.id}
            onClick={() => playback.playFrom(item.atMs)}
            title={item.title}
            type="button"
          >
            {item.chip}
          </button>
        )
      })}
    </div>
  )
}
