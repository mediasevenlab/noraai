import { useEffect, useState, type RefObject } from 'react'

import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from '@/components/icons'

import { findHits, findLabel, type TextHit } from './find'
import { clearFindRanges, paintFindRanges, rangeInElement, scrollToRange } from './place'

function blocksOf(root: HTMLElement) {
  const pages = [...root.querySelectorAll('.layout-paragraph')].filter((node): node is HTMLElement => node instanceof HTMLElement)
  if (pages.length > 0) return pages
  return [...root.querySelectorAll('.whitespace-pre-wrap')].filter((node): node is HTMLElement => node instanceof HTMLElement)
}

export function DocumentFind({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState<TextHit[]>([])
  const [tick, setTick] = useState(0)
  const count = hits.length
  const label = query.trim() ? findLabel(index, count) : ''

  useEffect(() => {
    const root = rootRef.current
    if (!root || !query.trim()) return undefined
    const observer = new MutationObserver(() => setTick((value) => value + 1))
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [query, rootRef])

  useEffect(() => {
    const root = rootRef.current
    const needle = query.trim()
    if (!root || !needle) {
      setHits([])
      clearFindRanges()
      return undefined
    }
    const blocks = blocksOf(root)
    const next = findHits(
      blocks.map((block) => block.textContent ?? ''),
      needle,
    )
    setHits(next)
    const safe = next.length > 0 ? ((index % next.length) + next.length) % next.length : 0
    const ranges = next.map((hit) => {
      const block = blocks[hit.index]
      return block ? rangeInElement(block, hit.start, needle.length) : null
    })
    const current = ranges[safe] ?? null
    paintFindRanges(
      ranges.filter((range): range is Range => range !== null),
      current,
    )
    if (current) scrollToRange(current)
    return () => clearFindRanges()
  }, [index, query, rootRef, tick])

  function step(delta: number) {
    if (count === 0) return
    setIndex((value) => (value + delta + count) % count)
  }

  return (
    <div className="flex h-8 w-fit max-w-full shrink-0 items-center gap-1.5 rounded-lg bg-[var(--nora-surface)] py-0 pl-2.5 pr-2.5">
      <SearchIcon aria-hidden className="size-3 shrink-0 text-[var(--nora-text-secondary)]" />
      <input
        aria-label="Поиск по документам"
        className="w-56 border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-4 text-[var(--nora-text)] outline-none placeholder:font-normal placeholder:text-[var(--nora-text-secondary)]"
        onChange={(event) => {
          setQuery(event.target.value)
          setIndex(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && query) {
            event.stopPropagation()
            setQuery('')
            setIndex(0)
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            step(event.shiftKey ? -1 : 1)
          }
        }}
        placeholder="Поиск"
        value={query}
      />
      {query.trim() ? (
        <>
          <span className="shrink-0 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-4 tabular-nums text-[var(--nora-text-secondary)]">
            {label}
          </span>
          <button
            aria-label="Предыдущее совпадение"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:bg-[var(--nora-modal)] hover:text-[var(--nora-text)]"
            onClick={() => step(-1)}
            type="button"
          >
            <ChevronUpIcon className="size-3" />
          </button>
          <button
            aria-label="Следующее совпадение"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:bg-[var(--nora-modal)] hover:text-[var(--nora-text)]"
            onClick={() => step(1)}
            type="button"
          >
            <ChevronDownIcon className="size-3" />
          </button>
          <button
            aria-label="Очистить поиск"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:bg-[var(--nora-modal)] hover:text-[var(--nora-text)]"
            onClick={() => {
              setQuery('')
              setIndex(0)
            }}
            type="button"
          >
            <XIcon className="size-3" />
          </button>
        </>
      ) : null}
    </div>
  )
}
