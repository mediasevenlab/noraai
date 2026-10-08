import { useState, type ComponentProps, type FormEvent } from 'react'

import { RefreshCwIcon } from '@/components/icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { readMentorPayoutProfile, writeMentorPayoutProfile, type PayoutProfileKind } from './card-store'
import {
  formatPhone,
  hasFieldErrors,
  nextMentorPayoutLabel,
  normalizeInn,
  validateMentorPayoutRequisites,
  type MentorPayoutRequisites,
} from './model'

const controlClass =
  'h-8 min-h-8 px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-light !leading-5 shadow-none disabled:!opacity-100'

const actionClass =
  'inline-flex w-full cursor-pointer items-center justify-center rounded-[var(--nora-radius-md,8px)] border-0 font-[family-name:var(--nora-font)] text-[13px] font-normal !h-10 !max-h-10 !min-h-10 min-[768px]:!h-[37px] min-[768px]:!max-h-[37px] min-[768px]:!min-h-[37px] shadow-none disabled:cursor-not-allowed'

const saveClass =
  `${actionClass} !bg-[var(--nora-tint)] !text-white hover:!bg-[var(--nora-tint-dark)]`

const editClass =
  `${actionClass} !bg-[#333] !text-white hover:!bg-[#333]`

const idleRequestClass =
  `${actionClass} !bg-[var(--nora-panel)] !text-[var(--nora-text-tertiary)] disabled:!opacity-100`

const emptyRequisites: MentorPayoutRequisites = {
  fullName: '',
  inn: '',
  phone: '',
  accepted: false,
}

function digitsPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length > 0 && !digits.startsWith('7')) digits = `7${digits}`
  return digits.slice(0, 11)
}

function PayoutInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative h-8">
      <Input className={cn(controlClass, className)} data-ios-keep="" data-payout-field="" data-settings-field="" {...props} />
    </div>
  )
}

export function mentorPayoutStatus(input: {
  accrued: number | null
  kind?: 'mentor' | 'referral'
  ready: boolean
  phone: string | null
  now?: Date
}) {
  const accrued = input.accrued ?? 0
  const when = nextMentorPayoutLabel(input.now)
  if (input.kind === 'referral') {
    if (!input.ready) {
      if (accrued <= 0) return null
      return 'Перевод не уйдёт, пока нет телефона и согласия.'
    }
    return 'Бонусы можно копить или запросить выплату в любой момент.'
  }
  if (!input.ready) {
    if (accrued <= 0) return null
    return 'Перевод не уйдёт, пока нет телефона и согласия.'
  }
  if (accrued <= 0) {
    return `Телефон сохранён. Выплата уйдёт ${when}, когда появится сумма.`
  }
  return `Выплата ${when}.`
}

export function MentorPayoutPanel({
  kind = 'mentor',
  onRequest,
  onReset,
  onSaved,
  unpaidRub = null,
  userId,
}: {
  kind?: PayoutProfileKind
  onRequest?: () => void
  onReset?: () => void
  onSaved?: () => void
  unpaidRub?: number | null
  userId: string
}) {
  const saved = readMentorPayoutProfile(userId, undefined, kind)
  const [editing, setEditing] = useState(saved == null)
  const [values, setValues] = useState<MentorPayoutRequisites>(saved ?? emptyRequisites)
  const [errors, setErrors] = useState<Partial<Record<keyof MentorPayoutRequisites, string>>>({})
  const locked = !editing && saved != null

  const update = <K extends keyof MentorPayoutRequisites>(key: K, value: MentorPayoutRequisites[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateMentorPayoutRequisites(values)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    const fullName = values.fullName.trim().replace(/\s+/g, ' ')
    writeMentorPayoutProfile(userId, {
      fullName,
      inn: values.inn,
      phone: values.phone,
      accepted: true,
    }, undefined, kind)
    setValues((current) => ({ ...current, fullName }))
    setEditing(false)
    onSaved?.()
  }

  return (
    <form className="relative grid gap-3" noValidate onSubmit={submit}>
      {onReset ? (
        <button
          aria-label="Сбросить выплаты"
          className="absolute -top-1.5 -right-1.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)] [&_svg]:size-3.5 [&_svg]:shrink-0"
          data-generation-control=""
          onClick={onReset}
          type="button"
        >
          <RefreshCwIcon strokeWidth={1.75} />
        </button>
      ) : null}
      <div className="grid gap-3">
        <Field data-invalid={errors.fullName ? true : undefined}>
          <FieldLabel data-table-head="">ФИО</FieldLabel>
          <PayoutInput
            autoComplete="name"
            onChange={(event) => update('fullName', event.target.value)}
            placeholder="Иванова Мария Петровна"
            disabled={locked}
            value={values.fullName}
          />
          <FieldError>{errors.fullName}</FieldError>
        </Field>
        <div className="grid gap-3 min-[360px]:grid-cols-2">
          <Field data-invalid={errors.inn ? true : undefined}>
            <FieldLabel data-table-head="">ИНН</FieldLabel>
            <PayoutInput
              className="tabular-nums"
              inputMode="numeric"
              onChange={(event) => update('inn', normalizeInn(event.target.value))}
              placeholder="12 цифр"
              disabled={locked}
              value={values.inn}
            />
            <FieldError>{errors.inn}</FieldError>
          </Field>
          <Field data-invalid={errors.phone ? true : undefined}>
            <FieldLabel data-table-head="">Телефон для СБП</FieldLabel>
            <PayoutInput
              autoComplete="tel"
              className="tabular-nums"
              inputMode="tel"
              onChange={(event) => update('phone', digitsPhone(event.target.value))}
              placeholder="+7"
              disabled={locked}
              value={formatPhone(values.phone)}
            />
            <FieldError>{errors.phone}</FieldError>
          </Field>
        </div>
        <Field className="my-1.5" data-invalid={errors.accepted ? true : undefined}>
          <label className="flex items-start gap-2.5">
            <Checkbox
              checked={values.accepted}
              className={cn(
                'mt-0.5 size-4 border-[color-mix(in_srgb,var(--nora-text)_22%,var(--settings-substrate,var(--nora-border)))] bg-[var(--nora-panel)] [&_svg]:!size-3',
                locked && 'group-has-disabled/field:!opacity-100 data-checked:!border-[color-mix(in_srgb,var(--nora-text)_14%,var(--settings-field-bg,var(--nora-panel)))] data-checked:!bg-[color-mix(in_srgb,var(--nora-text)_14%,var(--settings-field-bg,var(--nora-panel)))] data-checked:!text-[var(--nora-text)]',
              )}
              disabled={locked}
              onCheckedChange={(value) => update('accepted', value === true)}
            />
            <span className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]" data-settings-caption="">
              Согласен на договор и удержание налога с выплаты.
            </span>
          </label>
          <FieldError>{errors.accepted}</FieldError>
        </Field>
      </div>
      <Separator />
      <div className={cn('grid gap-2', locked && kind === 'referral' && 'grid-cols-2')}>
        {locked ? (
          <button className={editClass} data-field-height="" key="edit" onClick={() => setEditing(true)} type="button">
            Изменить
          </button>
        ) : (
          <button className={saveClass} data-field-height="" key="save" type="submit">
            Сохранить
          </button>
        )}
        {locked && kind === 'referral' ? (
          unpaidRub === 0 ? (
            <button className={idleRequestClass} data-field-height="" disabled key="idle" type="button">
              Нет бонусов
            </button>
          ) : (
            <button className={saveClass} data-field-height="" disabled={unpaidRub == null} key="request" onClick={onRequest} type="button">
              Запросить выплату
            </button>
          )
        ) : null}
      </div>
    </form>
  )
}

