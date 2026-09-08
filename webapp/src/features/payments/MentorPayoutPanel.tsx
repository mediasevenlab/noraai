import { CircleCheckIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  DEMO_MENTOR_PAYOUT_REQUISITES,
  formatPhone,
  hasFieldErrors,
  normalizeAccountNumber,
  normalizeBik,
  normalizePhone,
  validateMentorPayoutRequisites,
  type FieldErrors,
  type MentorPayoutRequisites,
} from './model'

export function MentorPayoutPanel() {
  const errorIds = {
    recipientName: useId(),
    bankName: useId(),
    bik: useId(),
    accountNumber: useId(),
    sbpPhone: useId(),
  }
  const [values, setValues] = useState<MentorPayoutRequisites>(DEMO_MENTOR_PAYOUT_REQUISITES)
  const [errors, setErrors] = useState<FieldErrors<keyof MentorPayoutRequisites>>({})
  const [mode, setMode] = useState<'saved' | 'editing'>('saved')
  const isSaved = mode === 'saved'
  const isEditing = mode === 'editing'

  const update = <K extends keyof MentorPayoutRequisites>(
    key: K,
    value: MentorPayoutRequisites[K],
  ) => {
    if (!isEditing) return
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
    if (!isEditing) return
    const nextErrors = validateMentorPayoutRequisites(values)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    setMode('saved')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      {isSaved ? (
        <CircleCheckIcon
          aria-label="Реквизиты сохранены"
          className="absolute top-3.5 right-3.5 z-[1] size-5 text-green-600"
        />
      ) : null}

      <div className="border-b border-[var(--nora-divider)] p-3.5 pr-11">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Реквизиты для выплат
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Демонстрационные реквизиты — можно изменить и сохранить.
        </p>
      </div>

      <form className="grid flex-1 content-start gap-3.5 p-3.5" noValidate onSubmit={submit}>
        <Field data-invalid={Boolean(errors.recipientName)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="mentor-payout-name"
          >
            ФИО получателя
          </FieldLabel>
          <Input
            aria-describedby={errors.recipientName ? errorIds.recipientName : undefined}
            aria-invalid={Boolean(errors.recipientName)}
            autoComplete="name"
            className="font-normal"
            disabled={isSaved}
            id="mentor-payout-name"
            onChange={(event) => update('recipientName', event.target.value)}
            placeholder="Иван Иванов"
            value={values.recipientName}
          />
          {errors.recipientName ? (
            <FieldError id={errorIds.recipientName}>{errors.recipientName}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.bankName)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="mentor-payout-bank"
          >
            Банк
          </FieldLabel>
          <Input
            aria-describedby={errors.bankName ? errorIds.bankName : undefined}
            aria-invalid={Boolean(errors.bankName)}
            className="font-normal"
            disabled={isSaved}
            id="mentor-payout-bank"
            onChange={(event) => update('bankName', event.target.value)}
            placeholder="Т-Банк"
            value={values.bankName}
          />
          {errors.bankName ? (
            <FieldError id={errorIds.bankName}>{errors.bankName}</FieldError>
          ) : null}
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.bik)}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="mentor-payout-bik"
            >
              БИК
            </FieldLabel>
            <Input
              aria-describedby={errors.bik ? errorIds.bik : undefined}
              aria-invalid={Boolean(errors.bik)}
              className="font-normal"
              disabled={isSaved}
              id="mentor-payout-bik"
              inputMode="numeric"
              onChange={(event) => update('bik', normalizeBik(event.target.value))}
              placeholder="044525974"
              value={values.bik}
            />
            <FieldDescription className="font-normal">9 цифр</FieldDescription>
            {errors.bik ? <FieldError id={errorIds.bik}>{errors.bik}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.sbpPhone)}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="mentor-payout-sbp"
            >
              Телефон СБП
            </FieldLabel>
            <Input
              aria-describedby={errors.sbpPhone ? errorIds.sbpPhone : undefined}
              aria-invalid={Boolean(errors.sbpPhone)}
              className="font-normal"
              disabled={isSaved}
              id="mentor-payout-sbp"
              inputMode="tel"
              onChange={(event) => update('sbpPhone', normalizePhone(event.target.value))}
              placeholder="+7 (900) 123-45-67"
              value={formatPhone(values.sbpPhone)}
            />
            <FieldDescription className="font-normal">Необязательно</FieldDescription>
            {errors.sbpPhone ? (
              <FieldError id={errorIds.sbpPhone}>{errors.sbpPhone}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.accountNumber)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="mentor-payout-account"
          >
            Расчётный счёт
          </FieldLabel>
          <Input
            aria-describedby={errors.accountNumber ? errorIds.accountNumber : undefined}
            aria-invalid={Boolean(errors.accountNumber)}
            className="font-normal"
            disabled={isSaved}
            id="mentor-payout-account"
            inputMode="numeric"
            onChange={(event) => update(
              'accountNumber',
              normalizeAccountNumber(event.target.value),
            )}
            placeholder="40817810099910004312"
            value={values.accountNumber}
          />
          <FieldDescription className="font-normal">20 цифр</FieldDescription>
          {errors.accountNumber ? (
            <FieldError id={errorIds.accountNumber}>{errors.accountNumber}</FieldError>
          ) : null}
        </Field>

        <div
          aria-hidden
          className="mt-auto h-px bg-[var(--nora-divider)]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button className="font-normal" disabled={isSaved} type="submit">
            Сохранить
          </Button>
          <Button
            className="font-normal"
            disabled={isEditing}
            onClick={() => {
              setErrors({})
              setMode('editing')
            }}
            type="button"
            variant="outline"
          >
            Изменить
          </Button>
        </div>
      </form>
    </div>
  )
}
