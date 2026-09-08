import type { ComponentProps, ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { authControlClassName } from './auth-control-styles'

type AuthFloatingInputProps = Omit<ComponentProps<typeof Input>, 'placeholder'> & {
  label: string
  /** Example text shown only while focused and empty. */
  hint?: string
  endAdornment?: ReactNode
  /** Success/error accent for validated fields. */
  tone?: 'default' | 'success' | 'error'
}

/**
 * Auth field with a label that starts inside the control and, on focus/value,
 * sits on the top border edge (outlined floating label).
 */
export function AuthFloatingInput({
  label,
  hint,
  endAdornment,
  tone = 'default',
  className,
  id,
  ...props
}: AuthFloatingInputProps) {
  const success = tone === 'success'
  const error = tone === 'error'

  return (
    <div className="relative" data-tone={tone}>
      <Input
        id={id}
        placeholder={hint?.trim() ? hint : ' '}
        className={cn(
          'peer',
          authControlClassName,
          hint?.trim() &&
            'placeholder:text-transparent focus:placeholder:text-[var(--nora-input-placeholder)]',
          endAdornment ? 'pr-10' : null,
          // Important: beat Input's focus-visible:shadow-[var(--nora-shadow-focus)] (blue).
          success &&
            cn(
              '!bg-[color-mix(in_srgb,var(--nora-success)_6%,var(--nora-input-bg))]',
              '!shadow-[inset_0_0_0_1.5px_var(--nora-success)]',
              'focus-visible:!shadow-[inset_0_0_0_1.5px_var(--nora-success)]',
            ),
          error &&
            cn(
              '!bg-[color-mix(in_srgb,var(--nora-error)_6%,var(--nora-input-bg))]',
              '!shadow-[inset_0_0_0_1.5px_var(--nora-error)]',
              'focus-visible:!shadow-[inset_0_0_0_1.5px_var(--nora-error)]',
            ),
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-2.5 z-[1] max-w-[calc(100%-2.5rem)] truncate',
          endAdornment && 'peer-focus:max-w-[calc(100%-2.75rem)]',
          'origin-left text-[var(--nora-text-tertiary)] transition-[top,transform,font-size,color,background-color,padding] duration-150',
          // Resting: centered inside the field
          'top-1/2 -translate-y-1/2 px-0.5 text-xs font-medium',
          // Floated: on the top border intersection
          'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-[var(--background)] peer-focus:px-1 peer-focus:text-[11px] peer-focus:font-normal peer-focus:text-[var(--nora-tint)]',
          'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:bg-[var(--background)] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-normal peer-[:not(:placeholder-shown)]:text-[var(--nora-text-secondary)]',
          'peer-[:not(:placeholder-shown)]:peer-focus:text-[var(--nora-tint)]',
          success &&
            cn(
              '!text-[var(--nora-success)]',
              'peer-focus:!text-[var(--nora-success)]',
              'peer-[:not(:placeholder-shown)]:!text-[var(--nora-success)]',
              'peer-[:not(:placeholder-shown)]:peer-focus:!text-[var(--nora-success)]',
            ),
          error &&
            cn(
              '!text-[var(--nora-error)]',
              'peer-focus:!text-[var(--nora-error)]',
              'peer-[:not(:placeholder-shown)]:!text-[var(--nora-error)]',
              'peer-[:not(:placeholder-shown)]:peer-focus:!text-[var(--nora-error)]',
            ),
        )}
      >
        {label}
      </label>
      {endAdornment}
    </div>
  )
}
