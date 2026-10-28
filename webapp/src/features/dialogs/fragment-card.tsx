import { TextQuoteIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { REVEAL_FRAGMENT_EVENT, type FragmentQuote } from './fragment'

export function revealFragment(quote: FragmentQuote) {
  window.dispatchEvent(new CustomEvent(REVEAL_FRAGMENT_EVENT, { detail: quote }))
}

export function FragmentCard({
  quote,
  onClear,
  tone,
}: {
  quote: FragmentQuote
  onClear?: () => void
  tone: 'field' | 'bubble'
}) {
  const onDark = tone === 'bubble'
  return (
    <div className={cn('border-b', onDark ? 'border-white/25' : 'border-[var(--nora-border)]')} data-composer-quote="">
      <div
        className={cn(
          'flex items-start gap-1 rounded-md px-0.5 py-1',
          onDark ? 'hover:bg-white/10' : 'hover:bg-[var(--nora-input-bg)]',
        )}
      >
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-left"
        onClick={() => revealFragment(quote)}
        type="button"
      >
        <TextQuoteIcon
          aria-hidden
          className={cn('mt-0.5 size-4 shrink-0', onDark ? 'text-white/70' : 'text-[var(--nora-text-secondary)]')}
        />
        <span
          className={cn(
            'line-clamp-2 font-[family-name:var(--nora-font)] text-[13px] leading-5',
            onDark ? 'text-white/85' : 'text-[var(--nora-text-secondary)]',
          )}
        >
          {quote.text}
        </span>
      </button>
      {onClear ? (
        <button
          aria-label="Убрать фрагмент"
          className={cn(
            'mt-0.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md',
            onDark
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-[var(--nora-text-secondary)] hover:bg-[var(--nora-input-bg)] hover:text-[var(--nora-text)]',
          )}
          onClick={onClear}
          type="button"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
      </div>
    </div>
  )
}
