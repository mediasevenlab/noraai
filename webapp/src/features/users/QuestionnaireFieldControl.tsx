import { NoraInput, NoraTextarea } from '@/components/nora/primitives'
import {
  ChoicePlaquesField,
  MultiChoicePlaquesField,
} from './ChoicePlaquesField'
import type { FieldKey, ProfileField } from './questionnaire-sections'
import { SexChoiceField } from './SexChoiceField'

export function QuestionnaireFieldControl({
  field,
  idPrefix,
  invalid = false,
  onChange,
  value,
}: {
  field: ProfileField
  idPrefix: string
  invalid?: boolean
  onChange: (key: FieldKey, value: string) => void
  value: string
}) {
  if (field.control === 'sex') {
    return (
      <SexChoiceField
        idPrefix={`${idPrefix}-${field.key}`}
        invalid={invalid}
        onChange={(next) => onChange(field.key, next)}
        value={value}
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
        />
      </div>
    )
  }

  if (field.layout === 'extended') {
    return (
      <NoraTextarea
        aria-invalid={invalid || undefined}
        aria-label={field.label}
        className="min-h-[3.75rem] resize-y px-3 py-2 text-[12px] leading-relaxed"
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
      aria-label={field.label}
      className="h-8 text-[13px]"
      onChange={(event) => onChange(field.key, event.target.value)}
      placeholder={field.placeholder}
      value={value}
    />
  )
}
