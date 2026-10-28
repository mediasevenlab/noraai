import { useEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { CopyIcon, SparklesIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'

type SelectionBox = { text: string; top: number; left: number; above: boolean; side: 'left' | 'right' | null }

export function selectionBarPosition(
  rect: { top: number; bottom: number; left: number; width: number },
  viewportWidth: number,
) {
  const center = rect.left + rect.width / 2
  const left = Math.min(viewportWidth - 16, Math.max(16, center))
  const above = rect.top > 48
  return { left, top: above ? rect.top - 8 : rect.bottom + 8, above }
}

function selectionInside(root: HTMLElement): SelectionBox | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const text = selection.toString().replace(/\s+/g, ' ').trim()
  if (!text) return null
  const node = selection.anchorNode
  const element = node instanceof Element ? node : node?.parentElement
  if (!element || !root.contains(element)) return null
  if (element.closest('[data-compare-selection], textarea, input, [data-composer-quote]')) return null
  const range = selection.getRangeAt(0)
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 || rect.height > 0)
  const rect = rects[0] ?? range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const sideName = element.closest('[data-compare-side]')?.getAttribute('data-compare-side')
  const side = sideName === 'left' || sideName === 'right' ? sideName : null
  return { text, side, ...selectionBarPosition(rect, window.innerWidth) }
}

export function selectedMessageId() {
  const node = window.getSelection()?.anchorNode
  const element = node instanceof Element ? node : node?.parentElement
  return element?.closest('[data-message-id]')?.getAttribute('data-message-id') ?? ''
}

export function CompareSelectionBar({
  rootRef,
  onAsk,
}: {
  rootRef: RefObject<HTMLElement | null>
  onAsk: (fragment: string, side: 'left' | 'right' | null) => void
}) {
  const [box, setBox] = useState<SelectionBox | null>(null)

  useEffect(() => {
    let timer = 0
    const read = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const root = rootRef.current
        setBox(root ? selectionInside(root) : null)
      }, 0)
    }
    const hideUnlessBar = (event: Event) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-compare-selection]')) return
      setBox(null)
    }
    document.addEventListener('pointerup', read)
    document.addEventListener('keyup', read)
    document.addEventListener('pointerdown', hideUnlessBar)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerup', read)
      document.removeEventListener('keyup', read)
      document.removeEventListener('pointerdown', hideUnlessBar)
    }
  }, [rootRef])

  if (!box) return null
  const bar = (
    <div
      className="fixed z-[90] flex items-center overflow-hidden rounded-full border border-[var(--nora-border)] bg-white shadow-sm"
      data-compare-selection=""
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (event.button !== 0) return
        const target = event.target
        if (!(target instanceof Element)) return
        const action = target.closest('[data-selection-action]')?.getAttribute('data-selection-action')
        if (action === 'copy') {
          const text = box.text
          void navigator.clipboard.writeText(text).then(
            () => toast.success('Скопировано'),
            () => toast.error('Не удалось скопировать'),
          )
          return
        }
        if (action === 'ask') {
          onAsk(box.text, box.side)
          window.getSelection()?.removeAllRanges()
        }
      }}
      style={{
        top: box.top,
        left: box.left,
        transform: box.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
    >
      <button
        aria-label="Копировать"
        className="inline-flex size-8 cursor-pointer items-center justify-center text-[var(--nora-text-secondary)] hover:bg-[var(--nora-surface)] hover:text-[var(--nora-text)]"
        data-selection-action="copy"
        title="Копировать"
        type="button"
      >
        <CopyIcon className="size-4" />
      </button>
      <span className="h-4 w-px bg-[var(--nora-border)]" />
      <button
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 px-3 text-[13px] leading-none text-[var(--nora-text)] hover:bg-[var(--nora-surface)]"
        data-selection-action="ask"
        type="button"
      >
        <SparklesIcon className="size-3.5" />
        Спросить Nora
      </button>
    </div>
  )
  return createPortal(bar, document.body)
}
