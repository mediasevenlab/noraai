import * as React from 'react'
import {
  CameraIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  GalleryVerticalEnd,
  Loader2Icon,
  MicIcon,
  XIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

import { splitComposerChatLead, type ComposerChatLeadEmoji } from './composer-chat-lead'
import type { ComposerChatMessage } from './composer-chat'
import { useAuthDemoSeeking } from './auth-demo-playback'
import { ComposerTypedText } from './composer-typed-text'
import {
  MEAL_FORMING_STEP_GAP_MS,
  mealFormingSteps,
} from './meal-forming-steps'
import { MEAL_TAB_ENTER_EASE } from './meal-card-reveal'
import { MEAL_ATTACH_REMOVE_CLASS } from './meal-sheet'

const COMPOSER_CHAT_LEAD_ICONS = {
  '📷': CameraIcon,
  '🎤': MicIcon,
  '📝': FileTextIcon,
  '⏳': ClockIcon,
  '✅': CheckIcon,
  '❌': XIcon,
} as const satisfies Record<
  ComposerChatLeadEmoji,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
>

function ComposerAssistantAvatar() {
  return (
    <div
      aria-label="Ассистент"
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"
    >
      <GalleryVerticalEnd className="size-3.5 text-sidebar-primary-foreground!" />
    </div>
  )
}

export function ComposerChatBubble({
  message,
  live,
  leadBusy = false,
}: {
  message: ComposerChatMessage
  live: boolean
  leadBusy?: boolean
}) {
  const { lead, body } = splitComposerChatLead(message.text)
  const Icon = leadBusy
    ? Loader2Icon
    : !message.imageUrl && lead
      ? COMPOSER_CHAT_LEAD_ICONS[lead]
      : null
  return (
    <div className="flex w-full items-start justify-start gap-2">
      <ComposerAssistantAvatar />
      <div
        className={cn(
          'flex w-fit max-w-[78%] items-start gap-2',
          'rounded-[18px] rounded-bl-[6px]',
          'bg-[color-mix(in_srgb,var(--nora-input-bg)_68%,var(--nora-panel))]',
          'px-3.5 py-2 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]',
        )}
      >
        {message.imageUrl ? (
          <img
            alt=""
            className={cn(
              'size-12 shrink-0 rounded-[10px] object-cover',
              message.imageFilter === 'grayscale' && 'grayscale',
            )}
            src={message.imageUrl}
          />
        ) : Icon ? (
          <Icon
            aria-hidden
            className={cn(
              'mt-0.5 size-[15px] shrink-0 text-[var(--nora-text-secondary)]',
              leadBusy && 'animate-spin',
            )}
            strokeWidth={1.75}
          />
        ) : null}
        {body ? <ComposerTypedText live={live} text={body} /> : null}
      </div>
    </div>
  )
}

export function MealFormingStepList({
  photoCount,
  steps: stepsProp,
}: {
  photoCount?: number
  steps?: string[]
}) {
  const steps = React.useMemo(
    () => stepsProp ?? mealFormingSteps(photoCount ?? 1),
    [photoCount, stepsProp],
  )
  const [visible, setVisible] = React.useState(1)
  const seeking = useAuthDemoSeeking()
  const stepsKey = steps.join('|')
  const [startedFor, setStartedFor] = React.useState(stepsKey)
  if (startedFor !== stepsKey) {
    setStartedFor(stepsKey)
    setVisible(1)
  }

  React.useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || seeking) {
      const id = window.setTimeout(() => setVisible(steps.length), 0)
      return () => window.clearTimeout(id)
    }
    const timers = steps.slice(1).map((_, index) =>
      window.setTimeout(() => setVisible(index + 2), (index + 1) * MEAL_FORMING_STEP_GAP_MS),
    )
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [seeking, steps, stepsKey])

  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
      {steps.slice(0, visible).map((text, index, shown) => (
        <ComposerChatBubble
          key={text}
          leadBusy={index === shown.length - 1}
          live={index === shown.length - 1}
          message={{ role: 'assistant', text }}
        />
      ))}
    </div>
  )
}

const ATTACH_CHIP_LEAVE_MS = 420
const ATTACH_CHIP_LEAVE_EASE = MEAL_TAB_ENTER_EASE

export function ComposerAttachChips({
  items,
  disabled,
  onRemove,
}: {
  items: Array<{ id: string; name: string; src: string }>
  disabled?: boolean
  onRemove: (id: string) => void
}) {
  const idsKey = items.map((item) => item.id).join('|')
  // Empty until first effect so the initial batch takes the enter path
  // (reverse of leave) instead of mounting already settled.
  const prevIdsRef = React.useRef('')
  const [display, setDisplay] = React.useState<
    Array<{ id: string; name: string; src: string; leaving: boolean; entering: boolean }>
  >(() => items.map((item) => ({ ...item, leaving: false, entering: true })))

  React.useEffect(() => {
    const next = items
    const prevIds = prevIdsRef.current ? prevIdsRef.current.split('|').filter(Boolean) : []
    prevIdsRef.current = idsKey
    const nextIds = new Set(next.map((item) => item.id))
    const removedIds = prevIds.filter((id) => !nextIds.has(id))
    const addedIds = next.map((item) => item.id).filter((id) => !prevIds.includes(id))
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (removedIds.length === 0) {
      if (addedIds.length === 0 || reduced) {
        setDisplay(next.map((item) => ({ ...item, leaving: false, entering: false })))
        return
      }
      setDisplay((current) => {
        const seen = new Set(current.map((chip) => chip.id))
        const kept = current
          .filter((chip) => nextIds.has(chip.id))
          .map((chip) => {
            const item = next.find((entry) => entry.id === chip.id) ?? chip
            return { ...item, leaving: false, entering: false }
          })
        return [
          ...kept,
          ...next
            .filter((item) => !seen.has(item.id))
            .map((item) => ({ ...item, leaving: false, entering: true })),
        ]
      })
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => {
          setDisplay((current) => current.map((chip) => ({ ...chip, entering: false })))
        })
      })
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
      }
    }

    if (reduced) {
      setDisplay(next.map((item) => ({ ...item, leaving: false, entering: false })))
      return
    }

    setDisplay((current) => {
      const fresh = new Map(next.map((item) => [item.id, item]))
      const kept = current.map((chip) => {
        if (removedIds.includes(chip.id)) return { ...chip, leaving: true, entering: false }
        const item = fresh.get(chip.id)
        return item ? { ...item, leaving: false, entering: false } : chip
      })
      const seen = new Set(kept.map((chip) => chip.id))
      return [
        ...kept,
        ...next
          .filter((item) => !seen.has(item.id))
          .map((item) => ({ ...item, leaving: false, entering: false })),
      ]
    })

    const hideId = window.setTimeout(() => {
      setDisplay((current) => current.filter((chip) => !removedIds.includes(chip.id)))
    }, ATTACH_CHIP_LEAVE_MS)
    return () => window.clearTimeout(hideId)
  }, [idsKey, items])

  if (display.length === 0) return null

  const anyStay = display.some((chip) => !chip.leaving)

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,margin] motion-reduce:transition-none',
        anyStay ? 'mb-3 grid-rows-[1fr]' : 'mb-0 grid-rows-[0fr]',
      )}
      style={{
        transitionDuration: `${ATTACH_CHIP_LEAVE_MS}ms`,
        transitionTimingFunction: ATTACH_CHIP_LEAVE_EASE,
      }}
    >
      <div className="overflow-hidden">
        <div className="flex flex-wrap py-1">
          {display.map((chip) => (
            <div
              className={cn(
                'shrink-0 motion-reduce:transition-none',
                chip.leaving || chip.entering ? 'overflow-hidden mr-0 max-w-0' : 'overflow-visible mr-2 max-w-12',
              )}
              key={chip.id}
              style={{
                transitionDuration: `${ATTACH_CHIP_LEAVE_MS}ms`,
                transitionProperty: 'max-width, margin',
                transitionTimingFunction: ATTACH_CHIP_LEAVE_EASE,
              }}
            >
              <div
                className={cn(
                  'relative size-12 origin-center motion-reduce:transition-none',
                  // Enter = reverse of leave: scale/opacity only (no bounce keyframe).
                  chip.leaving || chip.entering
                    ? 'scale-50 opacity-0'
                    : 'scale-100 opacity-100',
                )}
                style={{
                  transitionDuration: `${Math.round(ATTACH_CHIP_LEAVE_MS * 0.85)}ms`,
                  transitionProperty: 'transform, opacity',
                  transitionTimingFunction: ATTACH_CHIP_LEAVE_EASE,
                }}
              >
                <img
                  alt={chip.name}
                  className="size-12 rounded-[10px] object-cover"
                  src={chip.src}
                />
                <button
                  aria-label="Удалить фото"
                  className={MEAL_ATTACH_REMOVE_CLASS}
                  disabled={disabled || chip.leaving || chip.entering}
                  onClick={() => onRemove(chip.id)}
                  type="button"
                >
                  <XIcon className="size-3" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
