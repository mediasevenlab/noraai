import { useAuiState } from '@assistant-ui/react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { FileTypeIcon } from '@/components/file-type-icon'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

import {
  COMPOSER_FRAGMENT_EVENT,
  REVEAL_FRAGMENT_EVENT,
  compareQuoteMessageId,
  quoteOrigin,
  readFragmentQuote,
} from '../fragment'
import { DocumentPane, pageKind } from './DocumentPane'
import { compareDocumentTexts } from './diff'
import { DocumentFind } from './find-bar'
import { readCompareFile } from './files'
import { type CompareMessageHead } from './message'
import type { ShownMarks } from './paint'
import { clearFragmentMark, placeFragment } from './place'
import { CompareSelectionBar } from './selection-bar'
import { nudgeSplit, splitAt } from './split'
import { readDocumentCompare } from './store'

function fileExtension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
}

const MARKS = [
  { id: 'removed', label: 'Удалено', on: 'bg-[#fde8e6] text-[#b42318]', dot: 'bg-[#b42318]' },
  { id: 'changed', label: 'Изменено', on: 'bg-[#e7f0fb] text-[#1d4f91]', dot: 'bg-[#1d4f91]' },
  { id: 'added', label: 'Добавлено', on: 'bg-[#e5f6ea] text-[#0f7a3a]', dot: 'bg-[#0f7a3a]' },
] as const

function SplitSwitch({
  rowRef,
  split,
  onCollapse,
  onFold,
  onMove,
}: {
  rowRef: RefObject<HTMLDivElement | null>
  split: number
  onCollapse: (side: 'left' | 'right') => void
  onFold: (side: 'left' | 'right') => void
  onMove: (clientX: number) => boolean
}) {
  const finishDrag = useRef<(() => void) | null>(null)
  useEffect(() => () => finishDrag.current?.(), [])
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const finish = () => {
      finishDrag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    finishDrag.current = finish
    const move = (pointer: PointerEvent) => {
      if (onMove(pointer.clientX)) finish()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  const nudge = (delta: number) => {
    const bounds = rowRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0) return
    const next = nudgeSplit(split, delta)
    if ('collapse' in next) onFold(next.collapse)
    else onMove(bounds.left + next.split * bounds.width)
  }
  return (
    <div
      className="pointer-events-none absolute top-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${split * 100}%` }}
    >
      <div className="pointer-events-auto flex items-center overflow-hidden rounded-full border border-[var(--nora-border)] bg-white shadow-sm">
        <button
          aria-label="Свернуть оригинал"
          className="inline-flex size-8 cursor-pointer items-center justify-center text-[var(--nora-text-secondary)] hover:bg-[var(--nora-surface)] hover:text-[var(--nora-text)]"
          onClick={() => onCollapse('left')}
          title="Свернуть оригинал"
          type="button"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="h-4 w-px bg-[var(--nora-border)]" />
        <div
          aria-label="Ширина документов"
          aria-orientation="vertical"
          aria-valuemax={90}
          aria-valuemin={10}
          aria-valuenow={Math.round(split * 100)}
          className="flex h-8 w-4 cursor-col-resize items-center justify-center gap-0.5 text-[var(--nora-text-secondary)] hover:bg-[var(--nora-surface)] hover:text-[var(--nora-text)]"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              nudge(-0.05)
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(0.05)
            }
          }}
          onPointerDown={drag}
          role="separator"
          tabIndex={0}
          title="Потяните, чтобы изменить ширину"
        >
          <span className="h-3 w-px rounded-full bg-current" />
          <span className="h-3 w-px rounded-full bg-current" />
        </div>
        <span className="h-4 w-px bg-[var(--nora-border)]" />
        <button
          aria-label="Свернуть исправленный"
          className="inline-flex size-8 cursor-pointer items-center justify-center text-[var(--nora-text-secondary)] hover:bg-[var(--nora-surface)] hover:text-[var(--nora-text)]"
          onClick={() => onCollapse('right')}
          title="Свернуть исправленный"
          type="button"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

function SideRail({
  name,
  side,
  onExpand,
}: {
  name: string
  side: 'left' | 'right'
  onExpand: () => void
}) {
  return (
    <button
      aria-label={`Показать ${name}`}
      className={cn(
        'absolute inset-0 flex cursor-pointer flex-col items-center gap-3 bg-[var(--nora-surface)] px-1 py-3 text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]',
        side === 'left' ? 'border-r border-[var(--nora-border)]' : 'border-l border-[var(--nora-border)]',
      )}
      onClick={onExpand}
      title={name}
      type="button"
    >
      <FileTypeIcon name={name} />
      <span className="max-h-[70%] overflow-hidden text-[12px] leading-4 [writing-mode:vertical-rl]">
        {name}
      </span>
    </button>
  )
}

function CompareReader({
  focusText,
  focusSide,
  head,
  messageId,
  onClose,
}: {
  focusText: string | null
  focusSide: 'left' | 'right' | null
  head: CompareMessageHead
  messageId: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const stored = readDocumentCompare(head.id)
  const pieces = useMemo(() => {
    if (!stored) return []
    const spreadsheet = pageKind(stored.leftName) === 'sheet' || pageKind(stored.rightName) === 'sheet'
    if (spreadsheet) return []
    return compareDocumentTexts(stored.leftText, stored.rightText)
  }, [stored?.leftName, stored?.leftText, stored?.rightName, stored?.rightText])
  const [leftFile, setLeftFile] = useState<Blob | null | undefined>(undefined)
  const [rightFile, setRightFile] = useState<Blob | null | undefined>(undefined)
  const [shown, setShown] = useState<ShownMarks>({ removed: true, changed: true, added: true })
  const [sheet, setSheet] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<'left' | 'right' | null>(null)
  const [split, setSplit] = useState(0.5)
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancel = false
    void Promise.all([readCompareFile(head.id, 'left'), readCompareFile(head.id, 'right')]).then(([left, right]) => {
      if (cancel) return
      setLeftFile(left)
      setRightFile(right)
    })
    return () => {
      cancel = true
    }
  }, [head.id])
  const moveSplit = (clientX: number) => {
    const bounds = rowRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0) return false
    const next = splitAt(clientX, bounds)
    if ('collapse' in next) {
      setSplit(0.5)
      setCollapsed(next.collapse)
      return true
    }
    setSplit(next.split)
    return false
  }
  const foldFromEdge = (side: 'left' | 'right') => {
    setSplit(0.5)
    setCollapsed(side)
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (!focusText) {
      clearFragmentMark()
      return undefined
    }
    if (focusSide) setCollapsed((current) => (current === focusSide ? null : current))
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      const root = dialogRef.current
      if ((root && placeFragment(root, focusText, focusSide)) || tries > 24) window.clearInterval(timer)
    }, 300)
    return () => window.clearInterval(timer)
  }, [focusSide, focusText])
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/40 p-3 md:p-5" role="presentation">
      <div
        aria-label="Сравнение документов"
        aria-modal="true"
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-[var(--nora-modal)] text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)]"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--nora-border)] px-3 py-2.5">
          <FileTypeIcon name={head.leftName} />
          {fileExtension(head.leftName) !== fileExtension(head.rightName) ? (
            <FileTypeIcon name={head.rightName} />
          ) : null}
          <span aria-hidden className="h-5 w-px shrink-0 bg-[var(--nora-border)]" />
          <div className="flex min-w-0 items-center gap-1">
            {MARKS.map((mark) => {
              const pressed = shown[mark.id]
              return (
                <button
                  aria-pressed={pressed}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg py-0 pl-2.5 pr-3 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-4',
                    pressed ? mark.on : 'bg-[var(--nora-surface)] text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]',
                  )}
                  key={mark.id}
                  onClick={() => setShown((value) => ({ ...value, [mark.id]: !value[mark.id] }))}
                  type="button"
                >
                  <span className={cn('size-1.5 shrink-0 rounded-full', pressed ? mark.dot : 'bg-current opacity-35')} />
                  {mark.label}
                </button>
              )
            })}
          </div>
          <span aria-hidden className="h-5 w-px shrink-0 bg-[var(--nora-border)]" />
          <DocumentFind rootRef={dialogRef} />
          <button
            aria-label="Закрыть сравнение"
            className="ml-auto inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[var(--nora-surface)] text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        {stored ? (
          <>
          <div
            className="relative flex min-h-0 flex-1"
            onContextMenu={(event) => event.preventDefault()}
            ref={rowRef}
          >
            <section
              className={cn(
                'relative h-full min-h-0 min-w-0',
                collapsed === 'left' ? 'w-11 shrink-0' : collapsed === 'right' ? 'flex-1' : 'shrink-0',
                collapsed === 'right' ? '' : 'border-r border-[var(--nora-border)]',
              )}
              data-compare-side="left"
              style={collapsed === null ? { width: `${split * 100}%` } : undefined}
            >
              <div className={cn('h-full', collapsed === 'left' && 'hidden')}>
                <DocumentPane
                  centered={collapsed === 'right'}
                  file={leftFile}
                  name={stored.leftName}
                  onSheet={setSheet}
                  sheet={sheet}
                  text={stored.leftText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}
                />
              </div>
              {collapsed === 'left' ? <SideRail name={stored.leftName} onExpand={() => setCollapsed(null)} side="left" /> : null}
            </section>
            <section
              className={cn('relative h-full min-h-0 min-w-0', collapsed === 'right' ? 'w-11 shrink-0' : 'flex-1')}
              data-compare-side="right"
            >
              <div className={cn('h-full', collapsed === 'right' && 'hidden')}>
                <DocumentPane
                  centered={collapsed === 'left'}
                  file={rightFile}
                  name={stored.rightName}
                  onSheet={setSheet}
                  pairText={stored.leftText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}
                  pieces={pieces}
                  sheet={sheet}
                  shown={shown}
                  text={stored.rightText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}
                />
              </div>
              {collapsed === 'right' ? <SideRail name={stored.rightName} onExpand={() => setCollapsed(null)} side="right" /> : null}
            </section>
            {collapsed === null ? (
              <SplitSwitch
                onCollapse={setCollapsed}
                onFold={foldFromEdge}
                onMove={moveSplit}
                rowRef={rowRef}
                split={split}
              />
            ) : null}
          </div>
        <CompareSelectionBar
          onAsk={(fragment, side) => {
            try {
              window.dispatchEvent(
                new CustomEvent(COMPOSER_FRAGMENT_EVENT, {
                  detail: { text: fragment, messageId: compareQuoteMessageId(messageId, side) },
                }),
              )
            } finally {
              onClose()
            }
          }}
          rootRef={dialogRef}
        />
          </>
        ) : (
          <p className="px-4 py-6 text-[14px] leading-6 text-[var(--nora-text-secondary)]">
            Тексты этих файлов в браузере уже не сохранились. Сравните их ещё раз.
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function CompareAnswer({ head }: { head: CompareMessageHead }) {
  const messageId = useAuiState((state) => state.message.id)
  const [open, setOpen] = useState(false)
  const [focusText, setFocusText] = useState<string | null>(null)
  const [focusSide, setFocusSide] = useState<'left' | 'right' | null>(null)
  const closeReader = () => {
    setFocusText(null)
    setFocusSide(null)
    setOpen(false)
  }
  useEffect(() => {
    const onReveal = (event: Event) => {
      const quote = readFragmentQuote(event)
      const origin = quote ? quoteOrigin(quote.messageId) : null
      if (!quote || !origin || origin.source !== 'compare' || origin.messageId !== messageId) return
      setFocusText(quote.text)
      setFocusSide(origin.side)
      setOpen(true)
    }
    window.addEventListener(REVEAL_FRAGMENT_EVENT, onReveal)
    return () => window.removeEventListener(REVEAL_FRAGMENT_EVENT, onReveal)
  }, [messageId])
  return (
    <div>
      <button
        aria-label={`Открыть сравнение ${head.leftName} и ${head.rightName}`}
        className="mb-3 flex w-full max-w-xl cursor-pointer items-stretch overflow-hidden rounded-xl border border-[var(--nora-border)] bg-[var(--nora-surface)] text-left"
        onClick={() => {
          setFocusText(null)
          setFocusSide(null)
          setOpen(true)
        }}
        type="button"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
          <FileTypeIcon name={head.leftName} />
          <span className="truncate text-[13px] leading-5 font-medium">{head.leftName}</span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 border-l border-[var(--nora-border)] px-2.5 py-2">
          <FileTypeIcon name={head.rightName} />
          <span className="truncate text-[13px] leading-5 font-medium">{head.rightName}</span>
        </span>
      </button>
      {head.summary ? <p className="whitespace-pre-wrap">{head.summary}</p> : null}
      {open ? (
        <CompareReader
          focusSide={focusSide}
          focusText={focusText}
          head={head}
          messageId={messageId}
          onClose={closeReader}
        />
      ) : null}
    </div>
  )
}
