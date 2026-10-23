import { useEffect, useState } from 'react'

import { MercuryOrb } from '../mercury/mercury-orb'
import { OrbPill } from '../mercury/orb-pill'
import type { OrbState } from '../mercury/orb-state'

/** Gallery order, with a longer hold so each state can be read before the next. */
const CYCLE: ReadonlyArray<{ state: OrbState; duration: number }> = [
  { state: 'connecting', duration: 4000 },
  { state: 'listening', duration: 6000 },
  { state: 'thinking', duration: 7000 },
  { state: 'speaking', duration: 6500 },
  { state: 'idle', duration: 5000 },
]

export function AuthMercuryOrb() {
  const [state, setState] = useState<OrbState>(CYCLE[0]!.state)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let index = 1
    let timer = 0
    const advance = () => {
      const step = CYCLE[index % CYCLE.length]!
      index += 1
      setState(step.state)
      timer = window.setTimeout(advance, step.duration)
    }
    timer = window.setTimeout(advance, CYCLE[0]!.duration)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <OrbPill
      className="[--orb-pill-bg:color-mix(in_oklab,white_8%,transparent)] [--orb-pill-border:color-mix(in_oklab,white_22%,transparent)] [--orb-pill-fg:#f7f9ff] [--orb-pill-label:#f7f9ff]"
      colorFrom="#cbd5e1"
      colorTo="#a5b4fc"
      orb={MercuryOrb}
      size="lg"
      state={state}
    />
  )
}
