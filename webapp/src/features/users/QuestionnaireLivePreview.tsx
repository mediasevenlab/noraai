import { useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  ONBOARDING_STEPS,
  measureInputValue,
  measureLabel,
  type FieldKey,
  type OnboardingStep,
  type ProfileField,
} from './questionnaire-sections'

const CARD_MOTION_MS = 420
const CARD_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const PREVIEW_ICON_TONES = [
  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
  'bg-[var(--nora-badge-purple-bg)] text-[var(--nora-badge-purple-text)]',
  'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
  'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
  'bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]',
  'bg-[var(--nora-badge-neutral-bg)] text-[var(--nora-badge-neutral-text)]',
] as const

function isFilled(value: string) {
  return value.trim().length > 0
}

const previewValueClass =
  'min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 break-words text-[var(--questionnaire-preview-value,var(--nora-text-tertiary))]'

function PreviewFieldRow({
  field,
  value,
  isFirst,
  isLast,
}: {
  field: ProfileField
  value: string
  isFirst: boolean
  isLast: boolean
}) {
  const filled = isFilled(value)
  const extended = field.layout === 'extended'

  return (
    <div
      className={cn(
        'min-w-0 border-t border-[var(--nora-divider)] py-3.5',
        isFirst && 'border-t-0 pt-0',
        isLast && 'pb-0',
        extended
          ? 'grid gap-2'
          : 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4',
      )}
    >
      <span className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--questionnaire-preview-label,var(--nora-text-secondary))]">
        {field.unit ? measureLabel(field) : field.label}
      </span>
      <div className={cn('flex min-w-0 items-center', !extended && 'justify-end')}>
        {filled ? (
          <span className={cn(previewValueClass, extended ? 'whitespace-pre-wrap' : 'truncate text-right')}>
            {measureInputValue(value, field.unit) || '—'}
          </span>
        ) : (
          <Skeleton className="h-3.5 w-24 shrink-0" />
        )}
      </div>
    </div>
  )
}

function PreviewStepCard({
  step,
  stepIndex,
  values,
}: {
  step: OnboardingStep
  stepIndex: number
  values: Record<FieldKey, string>
}) {
  const rows = step.fields.filter(
    (field) => !field.optional || isFilled(values[field.key]),
  )
  const Icon = step.icon
  const iconTone = PREVIEW_ICON_TONES[stepIndex % PREVIEW_ICON_TONES.length]!

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--questionnaire-card,var(--dash-card-bg,var(--nora-panel)))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--nora-divider)] p-3.5">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-[16px] leading-tight font-bold tracking-[-0.02em] text-[var(--nora-text)]">
            {step.heading}
          </h2>
          <p className="mt-1 text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
            {step.summary}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            iconTone,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="grid content-start p-3.5 pb-5">
        {rows.map((field, index) => (
          <PreviewFieldRow
            field={field}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
            key={field.key}
            value={values[field.key]}
          />
        ))}
      </div>
    </article>
  )
}

type MotionCard = {
  index: number
  values: Record<FieldKey, string>
}

/**
 * Live preview cards — one card per onboarding step.
 * Forward: current card slides up and collapses.
 * Back: previous card expands down into the top slot.
 */
export function QuestionnaireLivePreview({
  stepIndex,
  values,
}: {
  stepIndex: number
  values: Record<FieldKey, string>
}) {
  const [stackStep, setStackStep] = useState(stepIndex)
  const [outgoing, setOutgoing] = useState<MotionCard | null>(null)
  const [outgoingLeaving, setOutgoingLeaving] = useState(false)
  const [incoming, setIncoming] = useState<MotionCard | null>(null)
  const [incomingEntering, setIncomingEntering] = useState(false)
  const latestValues = useRef(values)
  const prevStepRef = useRef(stepIndex)
  latestValues.current = values

  useEffect(() => {
    const previous = prevStepRef.current
    if (stepIndex === previous) return

    prevStepRef.current = stepIndex

    if (stepIndex > previous) {
      setIncoming(null)
      setIncomingEntering(false)
      setOutgoing({
        index: previous,
        values: { ...latestValues.current },
      })
      setOutgoingLeaving(false)

      let leaveRaf = 0
      const startRaf = window.requestAnimationFrame(() => {
        leaveRaf = window.requestAnimationFrame(() => {
          setOutgoingLeaving(true)
        })
      })

      const timer = window.setTimeout(() => {
        setStackStep(stepIndex)
        setOutgoing(null)
        setOutgoingLeaving(false)
      }, CARD_MOTION_MS)

      return () => {
        window.cancelAnimationFrame(startRaf)
        window.cancelAnimationFrame(leaveRaf)
        window.clearTimeout(timer)
        setStackStep(stepIndex)
        setOutgoing(null)
        setOutgoingLeaving(false)
      }
    }

    setOutgoing(null)
    setOutgoingLeaving(false)
    setIncoming({
      index: stepIndex,
      values: { ...latestValues.current },
    })
    setIncomingEntering(false)

    let enterRaf = 0
    const startRaf = window.requestAnimationFrame(() => {
      enterRaf = window.requestAnimationFrame(() => {
        setIncomingEntering(true)
      })
    })

    const timer = window.setTimeout(() => {
      setStackStep(stepIndex)
      setIncoming(null)
      setIncomingEntering(false)
    }, CARD_MOTION_MS)

    return () => {
      window.cancelAnimationFrame(startRaf)
      window.cancelAnimationFrame(enterRaf)
      window.clearTimeout(timer)
      setStackStep(stepIndex)
      setIncoming(null)
      setIncomingEntering(false)
    }
  }, [stepIndex])

  const remaining = ONBOARDING_STEPS.slice(
    outgoing ? outgoing.index + 1 : stackStep,
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <p className="mb-4 shrink-0 text-[13px] font-medium text-[var(--nora-tint)]">
        Карточка профиля
      </p>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_62%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_62%,transparent_100%)]">
        {incoming ? (
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-[420ms]',
              incomingEntering ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
            style={{ transitionTimingFunction: CARD_EASE }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  'transition-[transform,opacity,margin] duration-[420ms]',
                  incomingEntering
                    ? 'mb-4 translate-y-0 opacity-100'
                    : 'mb-0 -translate-y-8 opacity-0',
                )}
                style={{ transitionTimingFunction: CARD_EASE }}
              >
                <PreviewStepCard
                  step={ONBOARDING_STEPS[incoming.index]!}
                  stepIndex={incoming.index}
                  values={incoming.values}
                />
              </div>
            </div>
          </div>
        ) : null}

        {outgoing ? (
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-[420ms]',
              outgoingLeaving ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
            )}
            style={{ transitionTimingFunction: CARD_EASE }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  'transition-[transform,opacity,margin] duration-[420ms]',
                  outgoingLeaving
                    ? 'mb-0 -translate-y-8 opacity-0'
                    : 'mb-4 translate-y-0 opacity-100',
                )}
                style={{ transitionTimingFunction: CARD_EASE }}
              >
                <PreviewStepCard
                  step={ONBOARDING_STEPS[outgoing.index]!}
                  stepIndex={outgoing.index}
                  values={outgoing.values}
                />
              </div>
            </div>
          </div>
        ) : null}

        {remaining.map((step, offset) => {
          const stepIndex = (outgoing ? outgoing.index + 1 : stackStep) + offset
          return (
            <div className="mb-4 last:mb-0" key={step.heading}>
              <PreviewStepCard
                step={step}
                stepIndex={stepIndex}
                values={values}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
