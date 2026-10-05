import { NoraInput, NoraTextarea } from '@/components/nora/primitives'
import { Input } from '@/components/ui/input'
import { SettingsFieldMark } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'
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

/**
 * Same box as the login and registration fields: 40px on a phone, 37px from
 * 768px. The phone face is scaled in `[data-auth-field]` so the computed
 * font stays 16px and iOS does not zoom.
 */
const wizardInputClass =
  'h-full min-h-0 !bg-[var(--settings-field-bg,var(--nora-panel))] px-3 pt-2.5 pb-2.5 min-[768px]:pt-[8.5px] min-[768px]:pb-[8.5px] font-[family-name:var(--nora-font)] text-[13px] font-normal !text-[var(--nora-text)] !leading-5 max-[767px]:!text-[16px] shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))]'

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
            : 'min-h-14 resize-y bg-[var(--settings-field-bg,var(--nora-panel))] px-3 py-2 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text)] shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))] placeholder:font-light placeholder:text-[var(--nora-input-placeholder)] max-[767px]:!text-[16px] max-[767px]:!font-light max-[767px]:!leading-5'
        }
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        rows={3}
        value={value}
      />
    )
  }

  if (variant === 'entry') {
    return (
      <NoraInput
        aria-invalid={invalid || undefined}
        aria-label={field.unit ? measureLabel(field) : field.label}
        className={`h-10 w-full px-3 lg:h-8 ${entryControlClass}`}
        onChange={(event) => onChange(field.key, measureStoredValue(event.target.value, field.unit))}
        placeholder={field.placeholder}
        value={measureInputValue(value, field.unit)}
      />
    )
  }

  return (
    <div className="relative h-10 min-[768px]:h-[37px]" data-auth-field="">
      <div className="relative h-full w-full" data-auth-field-face="">
        <Input
          aria-invalid={invalid || undefined}
          aria-label={field.unit ? measureLabel(field) : field.label}
          className={wizardInputClass}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          value={value}
        />
      </div>
    </div>
  )
}

export function QuestionnaireFieldBlock({
  field,
  idPrefix,
  invalid,
  markInvalid = false,
  onChange,
  value,
  variant = 'entry',
}: {
  field: ProfileField
  idPrefix: string
  invalid?: boolean
  markInvalid?: boolean
  onChange: (key: FieldKey, value: string) => void
  value: string
  variant?: 'card' | 'entry'
}) {
  const entry = variant === 'entry'
  const choice = field.control === 'choice' || field.control === 'multi-choice' || field.control === 'sex'
  const inline = entry && field.layout !== 'extended' && field.control == null
  const labelText = (
    <span
      className={
        entry
          ? 'min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
          : 'text-[12px] text-[var(--nora-text-secondary)]'
      }
    >
      {entry && field.unit ? measureLabel(field) : field.label}
      {markInvalid && invalid ? (
        <span className="text-[var(--nora-error)]"> *</span>
      ) : null}
      {field.optional ? (
        <span className="font-normal text-[12px] text-[var(--nora-text-tertiary)]">
          {' '}
          · необязательно
        </span>
      ) : null}
    </span>
  )
  const label = entry ? (
    <span className="flex min-w-0 items-center gap-2.5">
      <SettingsFieldMark icon={field.icon} />
      {labelText}
    </span>
  ) : labelText
  const control = (
    <QuestionnaireFieldControl
      field={field}
      idPrefix={idPrefix}
      invalid={invalid}
      onChange={onChange}
      value={value}
      variant={variant}
    />
  )

  if (inline) {
    return (
      <div className="grid grid-cols-2 items-center gap-2">
        {label}
        {control}
      </div>
    )
  }

  return (
    <div className={cn(entry ? cn('grid', choice || field.layout === 'extended' ? 'gap-3.5' : 'gap-2') : 'grid gap-1.5', !entry && !field.halfWidth && 'col-span-2')}>
      {label}
      {control}
    </div>
  )
}

/** Same edit rows as the profile questionnaire: icon, label, and the settings field. */
export function QuestionnaireEditStack({
  fields,
  idPrefix,
  invalidKeys,
  markInvalid = false,
  onChange,
  values,
}: {
  fields: ReadonlyArray<ProfileField>
  idPrefix: string
  invalidKeys?: ReadonlySet<FieldKey>
  markInvalid?: boolean
  onChange: (key: FieldKey, value: string) => void
  values: Record<FieldKey, string>
}) {
  return (
    <div>
      {fields.map((field, index) => (
        <div
          className={cn(
            'border-t border-[var(--nora-divider)] py-3.5',
            index === 0 && 'border-t-0 pt-0',
            index === fields.length - 1 && 'pb-0',
          )}
          key={field.key}
        >
          <QuestionnaireFieldBlock
            field={field}
            idPrefix={idPrefix}
            invalid={invalidKeys?.has(field.key)}
            markInvalid={markInvalid}
            onChange={onChange}
            value={values[field.key]}
          />
        </div>
      ))}
    </div>
  )
}

