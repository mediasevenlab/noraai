import { NoraInput, NoraTextarea } from '@/components/nora/primitives'
import {
  ChoicePlaquesField,
  MultiChoicePlaquesField,
} from './ChoicePlaquesField'
import {
  measureInputValue,
  measureLabel,
  measureStoredValue,
  type FieldKey,
  type ProfileField,
} from './questionnaire-sections'
import { SexChoiceField } from './SexChoiceField'

const entryControlClass =
  'bg-[var(--settings-field-bg,var(--nora-panel))] text-[16px] leading-5 lg:text-[13px]'
const entryTextareaClass = `min-h-14 resize-y px-3 py-2 font-light placeholder:font-light placeholder:text-[var(--nora-text-tertiary)] ${entryControlClass}`

export function QuestionnaireFieldControl({
  field,
  idPrefix,
  invalid = false,
  onChange,
  value,
  variant = 'card',
}: {
  field: ProfileField
  idPrefix: string
  invalid?: boolean
  onChange: (key: FieldKey, value: string) => void
  value: string
  variant?: 'card' | 'entry'
}) {
  if (field.control === 'sex') {
    return (
      <SexChoiceField
        idPrefix={`${idPrefix}-${field.key}`}
        invalid={invalid}
        onChange={(next) => onChange(field.key, next)}
        value={value}
        variant={variant}
      />
    )
  }

  if (field.control === 'choice' && field.options) {
    return (
      <div aria-invalid={invalid || undefined}>
        <ChoicePlaquesField
          allowCustom={field.allowCustom}
          customPlaceholder={field.customPlaceholder}
          idPrefix={`${idPrefix}-${field.key}`}
          inputLabel={field.label}
          onChange={(next) => onChange(field.key, next)}
          options={field.options}
          value={value}
          variant={variant}
        />
      </div>
    )
  }

  if (field.control === 'multi-choice' && field.options) {
    return (
      <div aria-invalid={invalid || undefined}>
        <MultiChoicePlaquesField
          exclusiveValue={field.exclusiveValue}
          idPrefix={`${idPrefix}-${field.key}`}
          onChange={(next) => onChange(field.key, next)}
          options={field.options}
          value={value}
          variant={variant}
        />
      </div>
    )
  }

  if (field.layout === 'extended') {
    return (
      <NoraTextarea
        aria-invalid={invalid || undefined}
        aria-label={field.label}
        className={
          variant === 'entry'
            ? entryTextareaClass
            : 'min-h-14 resize-y bg-[var(--questionnaire-fill,var(--settings-substrate))] px-3 py-2 text-[16px] font-light leading-5 text-[color-mix(in_srgb,var(--nora-text-secondary)_40%,var(--nora-input-text))] shadow-[inset_0_0_0_1px_var(--questionnaire-fill-stroke,var(--nora-border))] placeholder:font-light placeholder:text-[var(--nora-input-placeholder)] lg:text-[13px]'
        }
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        rows={3}
        value={value}
      />
    )
  }

  return (
    <NoraInput
      aria-invalid={invalid || undefined}
      aria-label={variant === 'entry' && field.unit ? measureLabel(field) : field.label}
      className={
        variant === 'entry'
          ? `h-10 w-full px-3 lg:h-8 ${entryControlClass}`
          : 'h-10 min-h-10 w-full bg-[var(--questionnaire-fill,var(--settings-substrate))] px-3 text-[16px] font-normal leading-5 shadow-[inset_0_0_0_1px_var(--questionnaire-fill-stroke,var(--nora-border))] lg:h-8 lg:min-h-8 lg:text-[13px]'
      }
      onChange={(event) => onChange(
        field.key,
        variant === 'entry' ? measureStoredValue(event.target.value, field.unit) : event.target.value,
      )}
      placeholder={field.placeholder}
      value={variant === 'entry' ? measureInputValue(value, field.unit) : value}
    />
  )
}

