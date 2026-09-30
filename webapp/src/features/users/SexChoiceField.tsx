import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

export const SEX_OPTIONS = [
  { value: 'Женский', label: 'Женский', description: 'Для женщин' },
  { value: 'Мужской', label: 'Мужской', description: 'Для мужчин' },
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
              'flex cursor-pointer items-start gap-2 rounded-[var(--nora-radius-md)] px-3 py-2',
              entry
                ? 'bg-[var(--settings-field-bg,var(--nora-panel))]'
                : 'bg-[var(--questionnaire-fill,var(--settings-substrate))] shadow-[inset_0_0_0_1px_var(--questionnaire-fill-stroke,var(--nora-border))]',
              'font-[family-name:var(--nora-font)] font-medium text-[var(--nora-text)]',
              'outline-none transition-[box-shadow,background-color] duration-[var(--nora-duration,0.15s)]',
              'has-focus-visible:shadow-[inset_0_0_0_1px_var(--nora-tint)]',
              'has-data-checked:bg-[var(--nora-tint-dimmed)] has-data-checked:text-[var(--nora-tint)] has-data-checked:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-tint)_35%,transparent)] has-data-checked:[&_[data-option-note]]:text-[var(--nora-tint)]',
            )}
            htmlFor={id}
            key={option.value}
          >
            <span className="flex h-5 shrink-0 items-center">
              <RadioGroupItem
                aria-label={option.label}
                className={entry ? undefined : 'bg-[var(--questionnaire-mark,var(--nora-panel))]'}
                id={id}
                value={option.value}
              />
            </span>
            <span className="min-w-0 grid gap-px text-left">
              <span className="text-[13px] leading-5">{option.label}</span>
              <span className="min-w-0 truncate text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]" data-option-note="">
                {option.description}
              </span>
            </span>
          </label>
        )
      })}
    </RadioGroup>
  )
}
