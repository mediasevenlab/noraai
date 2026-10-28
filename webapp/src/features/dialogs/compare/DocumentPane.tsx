import { ListTreeIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { cn } from '@/lib/utils'

import { sheetColumnWidths } from '../table-layout'

import { compareDocumentTexts, type DiffPiece } from './diff'
import { applyMarkVisibility, closeHeadingGaps, paintPage, pieceAppearance, type ShownMarks } from './paint'
import { lineParts, pdfPages, sheetRowCells, sheetTabs, tableCells, takePieces, workbookPages, type ChangeKind, type LinePart, type SheetPage, type SheetTab } from './sheets'

export function pageKind(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.pdf')) return 'pdf'
  if (/\.(xlsx|xlsm|xls)$/.test(lower)) return 'sheet'
  return 'text'
}

const CHANGE_DOT: Record<ChangeKind, string> = {
  removed: 'bg-[#b42318]',
  changed: 'bg-[#1d4f91]',
  added: 'bg-[#0f7a3a]',
}

const CHANGE_LABEL: Record<ChangeKind, string> = {
  removed: 'удалено',
  changed: 'изменено',
  added: 'добавлено',
}

function markClass(kind: DiffPiece['kind']) {
  if (kind === 'removed') return 'rounded-sm bg-[#fde8e6] text-[#b42318] line-through decoration-[#b42318]'
  if (kind === 'changed') return 'rounded-sm bg-[#e7f0fb] text-[#1d4f91]'
  if (kind === 'added') return 'rounded-sm bg-[#e5f6ea] text-[#0f7a3a]'
  return ''
}

function MarkText({ parts, shown }: { parts: readonly LinePart[]; shown: ShownMarks }) {
  return parts.map((part, index) => {
    const appearance = pieceAppearance(part.kind, shown)
    if (appearance === 'omit' || !part.text) return null
    return (
      <span
        className={appearance === 'mark' ? markClass(part.kind) : undefined}
        data-diff={appearance === 'mark' ? part.kind : undefined}
        key={index}
      >
        {part.text}
      </span>
    )
  })
}

function cellsOf(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isRule(line: string) {
  const cells = cellsOf(line).filter(Boolean)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function SheetPages({
  name,
  pages,
  pieces,
  shown,
  sheet,
  onSheet,
  pairText,
}: {
  name: string
  pages: SheetPage[]
  pieces?: DiffPiece[]
  shown?: ShownMarks
  sheet?: string | null
  onSheet?: (name: string) => void
  pairText?: string
}) {
  const pairPages = useMemo(() => {
    if (pairText == null) return null
    return pages.some((page) => page.title) ? workbookPages(pairText) : pdfPages(pairText)
  }, [pages, pairText])
  const marks = useMemo(() => (pairPages ? sheetTabs(pairPages, pages) : null), [pairPages, pages])
  const ownTitles = pages.map((page, index) => page.title || (pages.length > 1 ? `Страница ${index + 1}` : name))
  const bar: SheetTab[] = marks ?? ownTitles.map((title) => ({ title, kinds: [], leftIndex: null, rightIndex: null }))
  const missing = marks == null && sheet != null && sheet !== '' && !ownTitles.includes(sheet)
  const selected = sheet && bar.some((tab) => tab.title === sheet) ? sheet : (bar[0]?.title ?? '')
  const active = marks?.find((tab) => tab.title === selected) ?? null
  let activePieces: DiffPiece[] | undefined
  if (marks && active && pairPages) {
    activePieces = compareDocumentTexts(
      active.leftIndex == null ? '' : (pairPages[active.leftIndex]?.text ?? ''),
      active.rightIndex == null ? '' : (pages[active.rightIndex]?.text ?? ''),
    )
  } else if (!missing) {
    const index = Math.max(0, ownTitles.indexOf(selected))
    let rest = pieces
    for (let cursor = 0; cursor < pages.length; cursor += 1) {
      const page = pages[cursor]
      if (!page) continue
      const taken = rest ? takePieces(rest, page.text.length) : null
      if (taken) rest = taken.rest
      if (cursor === index) activePieces = taken?.page
    }
  }
  const page = pages[Math.max(0, ownTitles.indexOf(selected))]
  const shownMarks = shown ?? { removed: true, changed: true, added: true }
  const partLines = lineParts(activePieces ?? [{ kind: 'same', text: missing ? '' : (page?.text ?? '') }])
  const blocks: Array<{ kind: 'text' | 'table'; lines: LinePart[][] }> = []
  for (const parts of partLines) {
    const text = parts.map((part) => part.text).join('').trim()
    if (!text || /^Лист «/.test(text)) continue
    if (text.startsWith('|') && isRule(text)) continue
    const table = text.startsWith('|')
    const last = blocks.at(-1)
    if (table && last?.kind === 'table') last.lines.push(parts)
    else blocks.push({ kind: table ? 'table' : 'text', lines: [parts] })
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto bg-[#ececec]" data-folio-scroll>
        <article className="mx-auto my-4 w-max min-w-[calc(100%-32px)] bg-white px-8 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <p
              className="mb-4 font-[family-name:var(--nora-font)] text-[14px] leading-5 font-normal"
              style={{ color: 'rgba(109,109,109,0.5)' }}
            >
              {name}
            </p>
            {missing ? (
              <p className="text-[14px] leading-6 text-[var(--nora-text-secondary)]">Этого листа нет в первом файле.</p>
            ) : null}
            {missing
              ? null
              : blocks.map((block, blockIndex) => {
              if (block.kind === 'text') {
                return (
                  <p className="mb-2 text-[14px] leading-6 whitespace-pre-wrap" key={blockIndex}>
                    {block.lines.map((parts, lineIndex) => (
                      <span key={lineIndex}>
                        <MarkText parts={parts} shown={shownMarks} />
                        {lineIndex < block.lines.length - 1 ? '\n' : ''}
                      </span>
                    ))}
                  </p>
                )
              }
              const rowCells = block.lines.map((parts) => tableCells(parts))
              const parsed = rowCells.map((cells) => cells.map((cell) => cell.map((part) => part.text).join('')))
              const gridRows = parsed.filter((cells) => cells.filter((cell) => cell.trim()).length !== 1)
              const widths = sheetColumnWidths(gridRows.length > 0 ? gridRows : parsed)
              const tableWidth = widths.reduce((sum, width) => sum + width, 0)
              let gridStarted = false
              return (
                <table
                  className="mb-3 border-collapse text-left text-[13px] leading-5"
                  key={blockIndex}
                  style={{ width: tableWidth || undefined, tableLayout: 'fixed' }}
                >
                  <colgroup>
                    {widths.map((width, index) => (
                      <col key={index} style={{ width }} />
                    ))}
                  </colgroup>
                  <tbody>
                    {parsed.map((cells, rowIndex) => {
                      const laid = sheetRowCells(cells, gridStarted)
                      if (cells.filter((cell) => cell.trim()).length >= 4) gridStarted = true
                      const source = rowCells[rowIndex] ?? []
                      return (
                        <tr key={rowIndex}>
                          {laid.map((cell, cellIndex) => {
                            const parts = cell.span > 1 ? (source.find((item) => item.some((part) => part.text.trim())) ?? []) : (source[cellIndex] ?? [])
                            return (
                              <td
                                className={cn('px-2 py-1 align-top', cell.span === 1 && 'border border-[#e6e6e6]')}
                                colSpan={cell.span > 1 ? widths.length : undefined}
                                key={cellIndex}
                                style={{
                                  overflowWrap: 'break-word',
                                  textAlign: cell.span > 1 ? cell.align : undefined,
                                  whiteSpace: 'normal',
                                }}
                              >
                                <MarkText parts={parts} shown={shownMarks} />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })}
          </article>
      </div>
      {bar.length > 1 ? (
        <div
          aria-label="Листы"
          className="flex h-9 shrink-0 items-end overflow-x-auto border-t border-[#d0d0d0] bg-[#e6e6e6] px-1"
          role="tablist"
        >
          {bar.map((tab, tabIndex) => (
            <button
              aria-selected={!missing && tab.title === selected}
              className={cn(
                'inline-flex h-7 max-w-44 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 border-[#c8c8c8] px-3 font-[family-name:var(--nora-font)] text-[12px] leading-4 font-normal',
                tabIndex === 0 ? '' : '-ml-px',
                !missing && tab.title === selected
                  ? 'z-10 bg-white text-[var(--nora-text)]'
                  : 'bg-[#f3f3f3] text-[var(--nora-text-secondary)] hover:bg-white',
              )}
              key={`${tab.title}-${tabIndex}`}
              onClick={() => onSheet?.(tab.title)}
              role="tab"
              title={tab.kinds.length > 0 ? `${tab.title}: ${tab.kinds.map((kind) => CHANGE_LABEL[kind]).join(', ')}` : tab.title}
              type="button"
            >
              {tab.kinds.map((kind) => (
                <span className={cn('size-1.5 shrink-0 rounded-full', CHANGE_DOT[kind])} key={kind} />
              ))}
              <span className="truncate">{tab.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PlainText({ text, pieces, shown }: { text: string; pieces?: DiffPiece[]; shown?: ShownMarks }) {
  if (!pieces) {
    return <div className="px-4 py-4 text-[14px] leading-6 whitespace-pre-wrap">{text}</div>
  }
  const visible = shown ?? { removed: true, changed: true, added: true }
  return (
    <div className="px-4 py-4 text-[14px] leading-6 whitespace-pre-wrap">
      {pieces.map((piece, index) => {
        const appearance = pieceAppearance(piece.kind, visible)
        if (appearance === 'omit' || !piece.text) return null
        return (
          <span className={appearance === 'mark' ? markClass(piece.kind) : undefined} key={`${piece.kind}-${index}`}>
            {piece.text}
          </span>
        )
      })}
    </div>
  )
}

function PageTitle({ name }: { name: string }) {
  return (
    <p className="sticky top-0 z-20 truncate px-4 pt-4 pb-2 text-left text-[14px] leading-5 text-[#6d6d6d]/55">
      {name}
    </p>
  )
}

/** Records the file name on each page. It does not move layout, so Folio does not rebuild. */
function stampFileName(host: HTMLElement, name: string) {
  host.querySelectorAll('.layout-page').forEach((page) => {
    if (page instanceof HTMLElement && page.dataset.noraName !== name) page.dataset.noraName = name
  })
}

function hideLetterheadPictures(host: HTMLElement) {
  host.querySelectorAll('img').forEach((node) => {
    if (!(node instanceof HTMLImageElement)) return
    const hide = () => {
      if (node.naturalWidth >= 900) node.style.setProperty('display', 'none')
    }
    if (node.complete) hide()
    else node.addEventListener('load', hide, { once: true })
  })
}

function sectionHeadings(host: HTMLElement) {
  const pages = [...host.querySelectorAll('.layout-page')]
  const headings: HTMLElement[] = []
  for (const page of pages) {
    const items = [...page.querySelectorAll('.layout-paragraph')].filter((node): node is HTMLElement => {
      return node instanceof HTMLElement && node.dataset.styleId === '2' && Boolean(node.textContent?.trim())
    })
    items.sort((left, right) => (Number.parseFloat(left.style.top) || 0) - (Number.parseFloat(right.style.top) || 0))
    headings.push(...items)
  }
  return headings
}

function scrollToHeading(host: HTMLElement, heading: HTMLElement) {
  const scroller = host.querySelector('[data-folio-scroll]')
  if (!(scroller instanceof HTMLElement)) {
    heading.scrollIntoView({ block: 'start' })
    return
  }
  const top = heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 24
  scroller.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
}

function SectionMenu({ hostRef }: { hostRef: RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false)
  const [headings, setHeadings] = useState<HTMLElement[]>([])
  return (
    <div className="absolute top-3 left-3 z-30">
      <button
        aria-expanded={open}
        aria-label={open ? 'Скрыть разделы' : 'Разделы документа'}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-[var(--nora-border)] bg-white text-[var(--nora-text-secondary)] shadow-sm hover:text-[var(--nora-text)]"
        onClick={() => {
          const host = hostRef.current
          setHeadings(host ? sectionHeadings(host) : [])
          setOpen((value) => !value)
        }}
        type="button"
      >
        <ListTreeIcon className="size-4" />
      </button>
      {open && headings.length > 0 ? (
        <div className="mt-2 max-h-[min(24rem,calc(100vh-8rem))] w-64 overflow-auto rounded-xl border border-[var(--nora-border)] bg-white p-1 shadow-sm">
          {headings.map((heading) => (
            <button
              className="block w-full cursor-pointer truncate rounded-lg px-2 py-1.5 text-left text-[13px] leading-5 hover:bg-[var(--nora-surface)]"
              key={heading.dataset.paraId ?? heading.textContent}
              onClick={() => {
                const host = hostRef.current
                if (host) scrollToHeading(host, heading)
                setOpen(false)
              }}
              type="button"
            >
              {heading.textContent?.trim()}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Grown pages stay inside Folio's own scroller. The section menu beside it does not scroll away. */
function releaseInnerScroll(host: HTMLElement) {
  const pages = [...host.querySelectorAll('.layout-page')].filter((node): node is HTMLElement => node instanceof HTMLElement)
  let bottom = 48
  for (const page of pages) bottom = Math.max(bottom, page.offsetTop + page.offsetHeight + 24)
  host.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.classList.contains('layout-page') || node.closest('.layout-page')) return
    if (node.closest('.folio-outline') || node.hasAttribute('data-folio-scroll')) return
    const inlineHeight = Number.parseFloat(node.style.height)
    if (Number.isFinite(inlineHeight) && inlineHeight > 200 && inlineHeight < bottom) {
      node.style.setProperty('height', `${Math.ceil(bottom)}px`, 'important')
    }
  })
}

function fitFolio(frame: HTMLElement, host: HTMLElement, setZoom: (zoom: number) => void, naturalWidth: { current: number }) {
  const page = host.querySelector('.layout-page')
  if (!(page instanceof HTMLElement)) return
  if (naturalWidth.current <= 0) naturalWidth.current = page.offsetWidth
  const available = frame.clientWidth - 16
  if (naturalWidth.current <= 0 || available <= 0) return
  setZoom(Math.min(1, available / naturalWidth.current))
}

export function DocumentPane({
  name,
  text,
  file,
  pieces,
  shown,
  centered = false,
  sheet = null,
  onSheet,
  pairText,
}: {
  name: string
  text: string
  file: Blob | null | undefined
  pieces?: DiffPiece[]
  shown?: ShownMarks
  centered?: boolean
  sheet?: string | null
  onSheet?: (name: string) => void
  pairText?: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const shownRef = useRef(shown)
  shownRef.current = shown
  const named = pageKind(name)
  const kind = file ? named : named === 'pdf' || named === 'sheet' ? named : 'text'
  const pages = useMemo(
    () => (kind === 'sheet' ? workbookPages(text) : kind === 'pdf' ? pdfPages(text) : []),
    [kind, text],
  )

  useEffect(() => {
    setFailed(false)
    setReady(false)
  }, [file, name])

  useEffect(() => {
    if (!file || kind !== 'docx' || failed) return undefined
    const host = hostRef.current
    const style = styleRef.current
    const frame = frameRef.current
    if (!host || !style || !frame) return undefined
    let cancel = false
    let editor: { destroy: () => void; setZoom: (zoom: number) => void } | null = null
    const naturalWidth = { current: 0 }
    const paper = document.createElement('style')
    paper.textContent = '.nora-folio,.nora-folio .folio-editor{height:100% !important;min-height:0 !important;overflow:hidden !important}.nora-folio .layout-page{position:relative}.nora-folio .layout-page-header,.nora-folio .layout-page > img,.nora-folio .folio-outline{display:none !important}.nora-folio .layout-page-content,.nora-folio .layout-line,.nora-folio .layout-paragraph,.nora-folio [data-diff]{user-select:text !important;-webkit-user-select:text !important}.nora-folio [data-diff]{pointer-events:auto !important;cursor:text}.nora-folio .layout-page[data-nora-name]::before{content:attr(data-nora-name);position:absolute;z-index:5;top:18px;left:28px;max-width:46%;padding:0;background:transparent;border:0;color:rgba(109,109,109,.5);font-size:14px;line-height:18px;font-weight:400;text-align:left;pointer-events:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.nora-folio-solo .layout-page{margin-left:auto !important;margin-right:auto !important}'
    style.replaceChildren(paper)
    host.classList.add('nora-folio')
    const allowSelect = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.layout-page-content, [data-diff]')) return
      event.stopPropagation()
    }
    host.addEventListener('mousedown', allowSelect, true)
    let paintTimer = 0
    const settle = () => {
      if (cancel) return
      if (host.querySelector('.layout-page')) setReady(true)
      hideLetterheadPictures(host)
      if (!pieces) closeHeadingGaps(host)
      stampFileName(host, name)
      releaseInnerScroll(host)
      if (editor) fitFolio(frame, host, (zoom) => editor?.setZoom(zoom), naturalWidth)
      if (!pieces || host.querySelector('[data-diff]')) return
      window.clearTimeout(paintTimer)
      paintTimer = window.setTimeout(() => {
        if (cancel || host.querySelector('[data-diff]') || !host.querySelector('.layout-page-content')) return
        try {
          paintPage(host, pieces)
          if (shownRef.current) applyMarkVisibility(host, shownRef.current)
          stampFileName(host, name)
          releaseInnerScroll(host)
        } catch {
          // The page stays readable when a mark cannot be placed.
        }
      }, 300)
    }
    void Promise.all([import('@stll/folio-react'), import('@stll/folio-react/editor.css')])
      .then(async ([{ renderAsync }]) => {
        if (cancel) return
        const buffer = await file.arrayBuffer()
        if (cancel) return
        editor = await renderAsync(buffer, host, {
          locale: 'ru',
          readOnly: true,
          onFontsLoaded: () => {
            naturalWidth.current = 0
            settle()
          },
        })
        if (cancel) {
          editor.destroy()
          editor = null
          return
        }
        settle()
      })
      .catch(() => {
        if (!cancel) setFailed(true)
      })
    const pages = new MutationObserver(() => {
      if (!host.querySelector('.layout-page')) return
      setReady(true)
      stampFileName(host, name)
      if (pieces && !host.querySelector('[data-diff]')) settle()
    })
    pages.observe(host, { childList: true, subtree: true })
    const observer = new ResizeObserver(() => {
      if (editor) fitFolio(frame, host, (zoom) => editor?.setZoom(zoom), naturalWidth)
    })
    observer.observe(frame)
    return () => {
      cancel = true
      host.removeEventListener('mousedown', allowSelect, true)
      window.clearTimeout(paintTimer)
      pages.disconnect()
      observer.disconnect()
      editor?.destroy()
    }
  }, [failed, file, kind, name, pieces])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !shown) return
    applyMarkVisibility(host, shown)
  }, [shown])

  if (file === undefined) {
    return <p className="px-4 py-6 text-[14px] leading-6 text-[var(--nora-text-secondary)]">Открываем страницы…</p>
  }
  if (kind === 'pdf' || kind === 'sheet') {
    return (
      <SheetPages
        name={name}
        onSheet={onSheet}
        pages={pages}
        pairText={pairText}
        pieces={pieces}
        sheet={sheet}
        shown={shown}
      />
    )
  }
  if (kind === 'docx' && file && !failed) {
    return (
      <div className="relative h-full">
        <div className={cn('h-full overflow-hidden bg-[#ececec]', centered && 'nora-folio-solo')} ref={frameRef}>
          <div ref={styleRef} />
          <div className="h-full" ref={hostRef} />
        </div>
        {ready ? null : (
          <p className="pointer-events-none absolute inset-x-0 top-0 px-4 py-6 text-[14px] leading-6 text-[var(--nora-text-secondary)]">
            Открываем страницы…
          </p>
        )}
        <SectionMenu hostRef={hostRef} />
      </div>
    )
  }
  return (
    <div className="relative h-full overflow-auto">
      <PageTitle name={name} />
      <PlainText pieces={pieces} shown={shown} text={text} />
    </div>
  )
}
