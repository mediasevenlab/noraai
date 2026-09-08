import { useId } from 'react'

import { NoraInput } from '@/components/nora/primitives'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { ChoiceOption } from './questionnaire-sections'

const DETAIL_SEP = ' — '
const MULTI_SEPARATOR = ', '

function plaqueClassName(checked: boolean) {
  return cn(
    'flex cursor-pointer items-start gap-2 rounded-[var(--nora-radius-md)] bg-[var(--nora-input-bg)] px-2.5 py-2',
    'font-[family-name:var(--nora-font)] text-[var(--nora-text)]',
    'outline-none transition-[box-shadow,background-color] duration-[var(--nora-duration,0.15s)]',
    'has-focus-visible:shadow-[inset_0_0_0_1px_var(--nora-tint)]',
    checked
      && 'bg-[var(--nora-tint-dimmed)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-tint)_35%,transparent)]',
  )
}

/** Same look as RadioGroupItem — used for multi-select so steps stay visually consistent. */
function RoundChoiceMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-input',
        'dark:bg-input/30',
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
      <span className="text-[12px] font-medium leading-snug">{label}</span>
      {description ? (
        <span className="text-[10px] leading-snug text-[var(--nora-text-tertiary)]">
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
}: {
  allowCustom?: boolean
  customPlaceholder?: string
  idPrefix?: string
  inputLabel?: string
  onChange: (value: string) => void
  options: ReadonlyArray<ChoiceOption>
  value: string
}) {
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
              className={plaqueClassName(checked)}
              htmlFor={id}
              key={option.value}
              onClick={(event) => {
                if (!checked) return
                event.preventDefault()
                emit(undefined, allowCustom ? detailText : '')
              }}
            >
              <RadioGroupItem
                aria-label={option.label}
                className="mt-px"
                id={id}
                value={option.value}
              />
              <OptionCopy description={option.description} label={option.label} />
            </label>
          )
        })}
      </RadioGroup>
      {allowCustom ? (
        <NoraInput
          aria-label={inputLabel ?? 'Уточнение'}
          className="h-10 text-[13px]"
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
}: {
  exclusiveValue?: string
  idPrefix?: string
  onChange: (value: string) => void
  options: ReadonlyArray<ChoiceOption>
  value: string
}) {
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
            className={cn(plaqueClassName(checked), 'text-left')}
            key={option.value}
            onClick={() => toggle(option.value)}
            type="button"
            role="checkbox"
          >
            <RoundChoiceMark checked={checked} />
            <OptionCopy description={option.description} label={option.label} />
          </button>
        )
      })}
    </div>
  )
}
