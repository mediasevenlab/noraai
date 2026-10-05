import type { GenerationSpend } from '@web-app-demo/contracts'

import { cn } from '@/lib/utils'
import { useGenerationCurrency, useGenerationTokenUsageVisible } from '@/features/users'

import { formatGenerationSpend, generationSpendVisible } from './generation-spend-format'

export function GenerationSpendBadge({
  spend,
  corner = 'inline',
  className,
}: {
  spend?: GenerationSpend | null
  corner?: 'inline' | 'top-left' | 'bottom-left'
  className?: string
}) {
  const enabled = useGenerationTokenUsageVisible()
  const currency = useGenerationCurrency()
  if (!generationSpendVisible(enabled, spend)) return null
  const label = formatGenerationSpend(spend, currency)
  return (
    <span
      className={cn(
        'pointer-events-none z-20 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium leading-none',
        corner === 'inline'
          ? 'border border-[var(--nora-border)] bg-[var(--nora-inset)] text-[var(--nora-text-secondary)]'
          : 'absolute bg-black/75 text-white',
        corner === 'top-left' && 'left-2 top-2',
        corner === 'bottom-left' && 'bottom-2 left-2',
        className,
      )}
      data-slot="generation-spend"
      title={label}
    >
      {label}
    </span>
  )
}
