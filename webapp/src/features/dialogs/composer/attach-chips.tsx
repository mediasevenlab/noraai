import * as React from 'react'
import { XIcon } from '@/components/icons'

import { cn } from '@/lib/utils'

import { ChatFileCard } from './chat-file-card'
import { DIALOG_ATTACH_REMOVE_CLASS } from './field'

const ATTACH_CHIP_LEAVE_MS = 420
const ATTACH_CHIP_LEAVE_EASE = 'cubic-bezier(0.22, 0.08, 0.18, 1)'

export function ComposerAttachChips({
  items,
  disabled,
  onRemove,
}: {
  items: Array<{ id: string; name: string; src: string; kind?: 'image' | 'file' }>
  disabled?: boolean
  onRemove: (id: string) => void
}) {
  const idsKey = items.map((item) => item.id).join('|')
  const prevIdsRef = React.useRef('')
  const [display, setDisplay] = React.useState<
    Array<{ id: string; name: string; src: string; kind?: 'image' | 'file'; leaving: boolean; entering: boolean }>
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
          {display.map((chip) => chip.kind === 'file' ? (
            <div className={cn('mr-2', chip.leaving && 'hidden')} key={chip.id}>
              <ChatFileCard
                disabled={disabled || chip.leaving}
                name={chip.name}
                onRemove={() => onRemove(chip.id)}
                placement="composer"
              />
            </div>
          ) : (
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
                  className={DIALOG_ATTACH_REMOVE_CLASS}
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
