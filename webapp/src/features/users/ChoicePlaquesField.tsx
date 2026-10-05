import { useId } from 'react'

import { NoraInput } from '@/components/nora/primitives'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { ChoiceOption } from './questionnaire-sections'

const DETAIL_SEP = ' — '
const MULTI_SEPARATOR = ', '

export function choicePlaqueClass(checked: boolean, entry: boolean) {
  return cn(
    'flex cursor-pointer items-start gap-2 rounded-[var(--nora-radius-md)] border px-3 py-2',
    'font-[family-name:var(--nora-font)] text-[var(--nora-text)]',
    'outline-none transition-[box-shadow,background-color,border-color] duration-[var(--nora-duration,0.15s)]',
    entry
      ? 'border-[var(--settings-well-stroke,var(--nora-border))] bg-[var(--settings-field-bg,var(--nora-panel))]'
      : 'border-[var(--questionnaire-fill-stroke,var(--nora-border))] bg-[var(--questionnaire-fill,var(--settings-substrate))]',
    'has-focus-visible:border-[var(--nora-tint)]',
    checked
      && 'border-[color-mix(in_srgb,var(--nora-tint)_32%,transparent)] bg-[var(--nora-tint-dimmed)] text-[var(--nora-text)]',
  )
}

/** Same look as RadioGroupItem — used for multi-select so steps stay visually consistent. */
function RoundChoiceMark({ checked, light }: { checked: boolean; light?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--nora-border-strong)]',
        light ? 'bg-[var(--questionnaire-mark,var(--nora-panel))]' : 'bg-transparent dark:bg-input/30',
        checked && 'border-primary bg-primary text-primary-foreground dark:bg-primary',
      )}
    >
      {checked ? (
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      ) : null}
    </span>
  )
}

function OptionCopy({
  label,
  description,
}: {
  label: string
  description?: string
}) {
  return (
    <span className="min-w-0 grid gap-px text-left">
      <span className="text-[13px] font-medium leading-5">{label}</span>
      {description ? (
        <span
          className="min-w-0 truncate text-[12px] font-light leading-5 text-[var(--nora-text-secondary)]"
          data-option-note=""
        >
          {description}
        </span>
      ) : null}
    </span>
  )
}

function parseChoiceValue(
  value: string,
  options: ReadonlyArray<ChoiceOption>,
) {
  const exact = options.find((option) => option.value === value)
  if (exact) return { option: exact.value, text: '' }

  const withDetail = [...options]
    .filter((option) => value.startsWith(`${option.value}${DETAIL_SEP}`))
    .sort((left, right) => right.value.length - left.value.length)[0]
  if (withDetail) {
    return {
      option: withDetail.value,
      text: value.slice(withDetail.value.length + DETAIL_SEP.length),
    }
  }

  return { option: undefined, text: value }
}

function composeChoiceValue(option: string | undefined, text: string) {
  const trimmed = text.trim()
  if (option && trimmed) return `${option}${DETAIL_SEP}${trimmed}`
  if (option) return option
  return trimmed
}

/**
 * Single-select plaques with an always-visible text field when allowCustom.
 * Value may be: option only, text only, or option + text.
 */
export function ChoicePlaquesField({
  allowCustom = false,
  customPlaceholder = 'Можно уточнить или указать свой вариант',
  idPrefix,
  inputLabel,
  onChange,
  options,
  value,
  variant = 'card',
}: {
  allowCustom?: boolean
  customPlaceholder?: string
  idPrefix?: string
  inputLabel?: string
  onChange: (value: string) => void
  options: ReadonlyArray<ChoiceOption>
  value: string
  variant?: 'card' | 'entry'
}) {
  const entry = variant === 'entry'
  const reactId = useId()
  const prefix = idPrefix ?? reactId
  const { option: selectedOption, text: detailText } = parseChoiceValue(
    value,
    options,
  )

  const emit = (option: string | undefined, text: string) => {
    onChange(composeChoiceValue(option, text))
  }

  return (
    <div className="grid gap-2">
      <RadioGroup
        className="grid grid-cols-2 gap-2"
        onValueChange={(next) => {
          emit(next, allowCustom ? detailText : '')
        }}
        value={selectedOption ?? ''}
      >
        {options.map((option) => {
          const id = `${prefix}-${option.value}`
          const checked = selectedOption === option.value
          return (
            <label
              className={choicePlaqueClass(checked, entry)}
              data-choice-plaque=""
              htmlFor={id}
              key={option.value}
              onClick={(event) => {
                if (!checked) return
                event.preventDefault()
                emit(undefined, allowCustom ? detailText : '')
              }}
            >
              <span className="flex h-5 shrink-0 items-center">
                <RadioGroupItem
                  aria-label={option.label}
                  className={entry ? undefined : 'bg-[var(--questionnaire-mark,var(--nora-panel))]'}
                  id={id}
                  value={option.value}
                />
              </span>
              <OptionCopy description={option.description} label={option.label} />
            </label>
          )
        })}
      </RadioGroup>
      {allowCustom ? (
        <NoraInput
          aria-label={inputLabel ?? 'Уточнение'}
          className={
            entry
              ? 'h-10 bg-[var(--settings-field-bg,var(--nora-panel))] px-3 text-[16px] leading-5 lg:h-8 lg:text-[13px]'
              : 'h-10 min-h-10 w-full bg-[var(--questionnaire-fill,var(--settings-substrate))] px-3 text-[16px] font-normal leading-5 shadow-[inset_0_0_0_1px_var(--questionnaire-fill-stroke,var(--nora-border))] lg:h-8 lg:min-h-8 lg:text-[13px]'
          }
          onChange={(event) => emit(selectedOption, event.target.value)}
          placeholder={customPlaceholder}
          value={detailText}
        />
      ) : null}
    </div>
  )
}

function splitMulti(value: string) {
  return value
    .split(MULTI_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
}

function joinMulti(values: ReadonlyArray<string>) {
  return values.join(MULTI_SEPARATOR)
}

/** Multi-select plaques for restrictions-like fields. */
export function MultiChoicePlaquesField({
  exclusiveValue,
  onChange,
  options,
  value,
  variant = 'card',
}: {
  exclusiveValue?: string
  idPrefix?: string
  onChange: (value: string) => void
  options: ReadonlyArray<ChoiceOption>
  value: string
  variant?: 'card' | 'entry'
}) {
  const entry = variant === 'entry'
  const selected = new Set(splitMulti(value))

  const toggle = (optionValue: string) => {
    if (exclusiveValue && optionValue === exclusiveValue) {
      onChange(selected.has(exclusiveValue) ? '' : exclusiveValue)
      return
    }

    const next = new Set(selected)
    next.delete(exclusiveValue ?? '')
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange(joinMulti([...next]))
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const checked = selected.has(option.value)
        return (
          <button
            aria-checked={checked}
            className={cn(choicePlaqueClass(checked, entry), 'h-auto min-h-0 text-left')}
            data-choice-plaque=""
            key={option.value}
            onClick={() => toggle(option.value)}
            role="checkbox"
            type="button"
          >
            <span className="flex h-5 shrink-0 items-center">
              <RoundChoiceMark checked={checked} light={!entry} />
            </span>
            <OptionCopy description={option.description} label={option.label} />
          </button>
        )
      })}
    </div>
  )
}
