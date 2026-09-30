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
    <div
      className="relative h-10 min-[768px]:h-[37px]"
      data-auth-field=""
      data-has-adornment={endAdornment ? '' : undefined}
      data-tone={tone}
    >
      <div className="relative h-full w-full" data-auth-field-face="">
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
            'pointer-events-none absolute left-3 z-[1] max-w-[calc(100%-1.5rem)] truncate',
            endAdornment && 'max-w-[calc(100%-2.5rem)]',
            'origin-left font-light text-[var(--nora-text-secondary)] transition-[top,transform,font-size,color,background-color,padding,margin] duration-150 dark:font-normal',
            'top-1/2 -translate-y-1/2 text-[13px]',
            'peer-focus:top-0 peer-focus:-ml-1 peer-focus:-translate-y-1/2 peer-focus:bg-[var(--background)] peer-focus:px-1 peer-focus:text-[12px] peer-focus:font-light peer-focus:text-[var(--nora-tint)] dark:peer-focus:font-normal',
            'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-ml-1 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:bg-[var(--background)] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:font-light peer-[:not(:placeholder-shown)]:text-[var(--nora-text-secondary)] dark:peer-[:not(:placeholder-shown)]:font-normal',
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
    </div>
  )
}
