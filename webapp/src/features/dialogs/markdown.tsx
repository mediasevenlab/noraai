import {
  MarkdownTextPrimitive,
  type CodeHeaderProps,
} from '@assistant-ui/react-markdown'
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type JSX,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { Options } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

import { CheckIcon, CopyIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

import { prepareDialogMarkdown } from './markdown-prepare'
import { bannerSpans, fitColumnWidths, modalTableWidth } from './table-layout'

const remarkPlugins: Options['remarkPlugins'] = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: true }],
]
const rehypePlugins: Options['rehypePlugins'] = [
  [rehypeKatex, { throwOnError: false, strict: 'ignore' }],
]

type MarkdownTag<Tag extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<Tag> & {
  node?: unknown
}

function withoutNode<Tag extends keyof JSX.IntrinsicElements>({
  node: _node,
  ...props
}: MarkdownTag<Tag>) {
  return props
}

const cellClass =
  'relative border-r border-[var(--nora-border)] px-3 py-2 align-top last:border-r-0'

const ModalCellClip = createContext(false)

function DialogCell({
  tag: Tag,
  className,
  children,
  ...props
}: {
  tag: 'th' | 'td'
  className: string
  children?: ReactNode
} & Omit<MarkdownTag<'td'>, 'children' | 'className'>) {
  const clip = useContext(ModalCellClip)
  if (!clip) return <Tag className={className} {...props}>{children}</Tag>
  const parts = Children.toArray(children)
  const handle = parts.filter(
    (part) => isValidElement(part) && (part.props as { 'data-col-resize'?: boolean })['data-col-resize'],
  )
  const body = parts.filter((part) => !handle.includes(part))
  return (
    <Tag className={`${className} min-w-0 overflow-hidden`} {...props}>
      <div className="max-w-full overflow-hidden" style={{ overflowWrap: 'anywhere' }}>
        {body}
      </div>
      {handle}
    </Tag>
  )
}

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ''
}

function rowCells(row: ReactElement) {
  return Children.toArray((row.props as { children?: ReactNode }).children).filter(isValidElement)
}

function tableRows(children: ReactNode) {
  const rows: ReactElement[] = []
  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return
      if (child.type === 'tr') rows.push(child)
      else visit((child.props as { children?: ReactNode }).children)
    })
  }
  visit(children)
  return rows
}

function columnSamples(rows: readonly ReactElement[], columns: number) {
  const samples = Array.from({ length: columns }, () => '')
  for (const row of rows) {
    const cells = rowCells(row)
    const texts = cells.map((cell) => nodeText((cell.props as { children?: ReactNode }).children))
    if (bannerSpans(texts, columns)) continue
    texts.forEach((text, index) => {
      if (text.trim().length > (samples[index]?.length ?? 0)) samples[index] = text.trim()
    })
  }
  if (samples.every((sample) => !sample) && rows[0]) {
    rowCells(rows[0]).forEach((cell, index) => {
      samples[index] = nodeText((cell.props as { children?: ReactNode }).children).trim()
    })
  }
  return samples
}

function withSpans(children: ReactNode, columns: number): ReactNode {
  const visit = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (!isValidElement(child)) return child
      if (child.type !== 'tr') {
        const nested = (child.props as { children?: ReactNode }).children
        return nested ? cloneElement(child, {}, visit(nested)) : child
      }
      const cells = rowCells(child)
      const texts = cells.map((cell) => nodeText((cell.props as { children?: ReactNode }).children))
      const spans = bannerSpans(texts, columns)
      if (!spans) return child
      const kept = cells.slice(0, spans.length).map((cell, index) => {
        const span = spans[index] ?? 1
        return span > 1 ? cloneElement(cell, { colSpan: span }) : cell
      })
      return cloneElement(child, {}, kept)
    })
  return visit(children)
}

function withResizeHandles(
  children: ReactNode,
  beginResize: (column: number, clientX: number) => void,
): ReactNode {
  const visit = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (!isValidElement(child)) return child
      if (child.type !== 'tr') {
        const nested = (child.props as { children?: ReactNode }).children
        return nested ? cloneElement(child, {}, visit(nested)) : child
      }
      let column = 0
      const cells = rowCells(child).map((cell) => {
        const span = Number((cell.props as { colSpan?: number }).colSpan ?? 1)
        const index = column
        column += span
        if (span !== 1) return cell
        const props = cell.props as { children?: ReactNode }
        return cloneElement(
          cell,
          {},
          props.children,
          <span
            aria-hidden
            data-col-resize
            className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize"
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              beginResize(index, event.clientX)
            }}
          />,
        )
      })
      return cloneElement(child, {}, cells)
    })
  return visit(children)
}

function DialogTable({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(640)
  const [widths, setWidths] = useState<number[]>([])
  const [resized, setResized] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const chatTableRef = useRef<HTMLTableElement>(null)
  const drag = useRef<{ column: number; x: number; width: number } | null>(null)

  const rows = tableRows(children)
  const columns = Math.max(1, ...rows.map((row) => rowCells(row).length))
  const chatBody = withSpans(children, columns)

  const openViewer = () => {
    const chatWidth = chatTableRef.current?.getBoundingClientRect().width ?? 640
    const width = modalTableWidth({ columns, chatWidth, viewport: window.innerWidth })
    setPanelWidth(width)
    setWidths(fitColumnWidths(columnSamples(rows, columns), width))
    setResized(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onMove = (event: MouseEvent) => {
      const active = drag.current
      if (!active) return
      const next = Math.max(36, active.width + event.clientX - active.x)
      setWidths((current) => current.map((value, index) => (index === active.column ? next : value)))
    }
    const onUp = () => {
      drag.current = null
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [open])

  const beginResize = (column: number, clientX: number) => {
    setResized(true)
    drag.current = { column, x: clientX, width: widths[column] ?? 80 }
  }
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)

  return (
    <div className="my-3 max-w-full">
      <div className="mb-1 flex justify-end">
        <button
          className="rounded-md px-2 py-1 text-[12px] leading-4 text-[var(--nora-text-secondary)] hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]"
          type="button"
          onClick={openViewer}
        >
          Открыть
        </button>
      </div>
      <div className="max-w-full overflow-x-auto rounded-xl border border-[var(--nora-border)]">
        <table ref={chatTableRef} className="w-full border-collapse text-left text-[13px] leading-5">
          {chatBody}
        </table>
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3"
              onMouseDown={() => setOpen(false)}
            >
              <div
                aria-label="Таблица"
                aria-modal="true"
                className="flex max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl bg-[var(--nora-modal)] text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)]"
                role="dialog"
                style={{ width: panelWidth }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--nora-border)] px-4 py-2.5">
                  <span className="text-[13px] leading-5">Таблица</span>
                  <button
                    ref={closeRef}
                    className="rounded-md px-2 py-1 text-[13px] leading-5 hover:bg-[var(--nora-input-bg)]"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Закрыть
                  </button>
                </div>
                <div className={resized ? 'min-h-0 overflow-auto' : 'min-h-0 overflow-x-hidden overflow-y-auto'}>
                  <table
                    className="border-collapse text-left text-[13px] leading-5 [&_td]:max-w-0 [&_th]:max-w-0"
                    style={{ width: resized ? tableWidth || panelWidth : '100%', tableLayout: 'fixed' }}
                  >
                    <ModalCellClip.Provider value={true}>
                      <colgroup>
                        {widths.map((width, index) => (
                          <col
                            key={index}
                            style={{
                              width: resized ? width : `${(width / (tableWidth || panelWidth)) * 100}%`,
                            }}
                          />
                        ))}
                      </colgroup>
                      {withResizeHandles(withSpans(children, columns), beginResize)}
                    </ModalCellClip.Provider>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function DialogCodeHeader({ language, code }: CodeHeaderProps) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--nora-border)] px-3 py-1.5 text-[12px] leading-4 text-[var(--nora-text-secondary)]">
      <span>{language || 'код'}</span>
      <button
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  )
}

export function DialogMarkdown() {
  return (
    <MarkdownTextPrimitive
      className={cn(
        'dialog-markdown min-w-0 max-w-full',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-[16px] [&_h1]:leading-6 [&_h1]:font-medium',
        '[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:leading-6 [&_h2]:font-medium',
        '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-[14px] [&_h3]:leading-5 [&_h3]:font-medium',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_a]:underline [&_a]:underline-offset-2',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--nora-border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--nora-text-secondary)]',
        '[&_hr]:my-3 [&_hr]:border-[var(--nora-border)]',
        '[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-[var(--nora-input-bg)] [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5',
        '[&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden',
      )}
      components={{
        a: ({ node: _node, ...props }: MarkdownTag<'a'>) => (
          <a {...props} rel="noreferrer" target="_blank" />
        ),
        table: ({ node: _node, children }: MarkdownTag<'table'>) => (
          <DialogTable>{children}</DialogTable>
        ),
        thead: (props: MarkdownTag<'thead'>) => (
          <thead className="bg-[var(--nora-input-bg)]" {...withoutNode(props)} />
        ),
        th: (props: MarkdownTag<'th'>) => (
          <DialogCell tag="th" className={`${cellClass} border-b font-medium`} {...withoutNode(props)} />
        ),
        td: (props: MarkdownTag<'td'>) => (
          <DialogCell tag="td" className={`${cellClass} border-t`} {...withoutNode(props)} />
        ),
        pre: ({ node: _node, ...props }: MarkdownTag<'pre'>) => (
          <pre
            {...props}
            className="my-3 overflow-x-auto rounded-b-xl bg-[var(--nora-input-bg)] px-3 py-2.5 text-[13px] leading-5"
          />
        ),
        CodeHeader: DialogCodeHeader,
      }}
      preprocess={prepareDialogMarkdown}
      rehypePlugins={rehypePlugins}
      remarkPlugins={remarkPlugins}
      smooth={{ drainMs: 700, maxCharIntervalMs: 18, maxCharsPerFrame: 4 }}
    />
  )
}
