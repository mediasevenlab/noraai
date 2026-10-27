import { cn } from '@/lib/utils'

/** Knowledge and meeting pickers share one width. Long names truncate inside it. */
export const composerPickerMenuClass = 'w-56 max-w-56'

/** Round tool in the composer. A pressed button stays dark on hover, so a light icon does not disappear. */
export function dialogComposerToolClass(active: boolean, disabled = false) {
  return cn(
    'nora-press-grow ios-glass-glare inline-flex shrink-0 items-center justify-center rounded-full border-0 outline-none backdrop-blur-[16px]',
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    active
      ? 'bg-[var(--nora-text)] text-[var(--nora-panel)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--nora-panel)_16%,var(--nora-text))]'
      : 'bg-[var(--nora-input-bg)] text-[var(--nora-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--nora-text)_14%,var(--nora-input-bg))]',
  )
}
