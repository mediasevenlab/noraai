import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

export const SEX_OPTIONS = [
  { value: 'Женский', label: 'Женский' },
  { value: 'Мужской', label: 'Мужской' },
] as const

export function SexChoiceField({
  idPrefix = 'sex',
  invalid = false,
  onChange,
  value,
  variant = 'card',
}: {
  idPrefix?: string
  invalid?: boolean
  onChange: (value: string) => void
  value: string
  variant?: 'card' | 'entry'
}) {
  const entry = variant === 'entry'
  return (
    <RadioGroup
      aria-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-2"
      onValueChange={onChange}
      value={value}
    >
      {SEX_OPTIONS.map((option) => {
        const id = `${idPrefix}-${option.value}`
        return (
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-[var(--nora-radius-md)] px-2.5 py-2',
              entry ? 'bg-[var(--nora-panel)] px-3 text-[13px] leading-5' : 'bg-[var(--nora-input-bg)] text-[12px]',
              'font-[family-name:var(--nora-font)] font-medium text-[var(--nora-text)]',
              'outline-none transition-[box-shadow,background-color] duration-[var(--nora-duration,0.15s)]',
              'has-focus-visible:shadow-[inset_0_0_0_1px_var(--nora-tint)]',
              'has-data-checked:bg-[var(--nora-tint-dimmed)] has-data-checked:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-tint)_35%,transparent)]',
            )}
            htmlFor={id}
            key={option.value}
          >
            <RadioGroupItem aria-label={option.label} id={id} value={option.value} />
            <span>{option.label}</span>
          </label>
        )
      })}
    </RadioGroup>
  )
}
