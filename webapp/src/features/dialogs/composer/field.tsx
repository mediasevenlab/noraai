import { cn } from '@/lib/utils'

export const DIALOG_COMPOSER_FIELD_CLASS =
  'meal-composer-field relative flex flex-col rounded-[20px] bg-[var(--nora-panel)] px-4 pt-4 pb-3 dark:bg-[var(--nora-button-bg-hover)]'

const SEND_BASE =
  'ios-glass-glare inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_55%,transparent)] disabled:opacity-100'

const SEND_READY = cn(
  SEND_BASE,
  'cursor-pointer bg-[var(--nora-text)] text-[var(--nora-panel)] hover:opacity-90 disabled:cursor-not-allowed',
)

export type DialogComposerSendTone = 'idle' | 'ready' | 'sending'

export function dialogComposerSendTone(input: {
  sending: boolean
  hasDraft: boolean
}): DialogComposerSendTone {
  if (input.sending) return 'sending'
  if (input.hasDraft) return 'ready'
  return 'idle'
}

export function dialogComposerSendClass(tone: DialogComposerSendTone) {
  if (tone === 'idle') {
    return cn(SEND_BASE, 'cursor-not-allowed bg-[var(--nora-text)]/58 text-[var(--nora-panel)]')
  }
  if (tone === 'sending') {
    return cn(SEND_BASE, 'cursor-wait bg-[var(--nora-text)]/80 text-[var(--nora-panel)]')
  }
  return SEND_READY
}

export const DIALOG_ATTACH_REMOVE_CLASS = cn(
  'ios-glass-glare absolute top-0.5 right-0.5 z-[1] inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-panel)] text-[var(--nora-text)] outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent),0_1px_2px_color-mix(in_srgb,var(--nora-text)_14%,transparent)] hover:bg-[var(--nora-error)] hover:text-white disabled:cursor-not-allowed disabled:opacity-100',
)
