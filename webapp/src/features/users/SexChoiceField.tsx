import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { choicePlaqueClass } from './ChoicePlaquesField'

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
            className={cn(choicePlaqueClass(value === option.value, entry), 'font-medium')}
            data-choice-plaque=""
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
              <span className="min-w-0 truncate text-[12px] font-light leading-5 text-[var(--nora-text-secondary)]" data-option-note="">
                {option.description}
              </span>
            </span>
          </label>
        )
      })}
    </RadioGroup>
  )
}
