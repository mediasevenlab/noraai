import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons'

import { Button } from '@/components/ui/button'
import { DocsLink } from '@/components/docs/docs-chrome'
import { cn } from '@/lib/utils'

/** Nora outline control: fill, no border/shadow, control height 26. */
const pagerButtonClassName = cn(
  'h-[var(--nora-control-h,30px)] rounded-[var(--nora-radius-md,8px)]',
  'border-transparent bg-[var(--nora-button-bg,#f3f3f3)] text-[13px] font-medium',
  'text-[var(--nora-button-text,var(--foreground))] shadow-none',
  'hover:bg-[var(--nora-button-bg-hover,#eeeeee)] hover:text-[var(--nora-button-text,var(--foreground))]',
)

/** Пейджер prev/next: кнопки со стрелками, типографика Nora (13/500) */
export function DocsPager({
  prev,
  next,
}: {
  prev?: { name: string; to: string }
  next?: { name: string; to: string }
}) {
  if (!prev && !next) return null

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-6">
      {prev ? (
        <Button
          variant="outline"
          className={pagerButtonClassName}
          nativeButton={false}
          render={<DocsLink to={prev.to} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          {prev.name}
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button
          variant="outline"
          className={pagerButtonClassName}
          nativeButton={false}
          render={<DocsLink to={next.to} />}
        >
          {next.name}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  )
}
