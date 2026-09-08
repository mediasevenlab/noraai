import { useId, useState, type FormEvent } from 'react'

import { NoraToast } from '@/components/nora'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  formatPhone,
  hasFieldErrors,
  normalizeAccountNumber,
  normalizeBik,
  normalizePhone,
  validateUserReferralPayoutRequisites,
  type FieldErrors,
  type UserReferralPayoutRequisites,
} from './model'

const emptyRequisites: UserReferralPayoutRequisites = {
  recipientName: '',
  bik: '',
  accountNumber: '',
  sbpPhone: '',
}

export function UserReferralPayoutPanel() {
  const errorIds = {
    recipientName: useId(),
    bik: useId(),
    accountNumber: useId(),
    sbpPhone: useId(),
  }
  const [values, setValues] = useState<UserReferralPayoutRequisites>(emptyRequisites)
  const [errors, setErrors] = useState<FieldErrors<keyof UserReferralPayoutRequisites>>({})
  const [status, setStatus] = useState<'idle' | 'saved'>('idle')

  const update = <K extends keyof UserReferralPayoutRequisites>(
    key: K,
    value: UserReferralPayoutRequisites[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setStatus('idle')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateUserReferralPayoutRequisites(values)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    setStatus('saved')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Вывод реферальных начислений
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Укажите реквизиты, куда перечислять выплаты за приглашённых пользователей.
        </p>
      </div>

      <form className="grid flex-1 content-start gap-3.5 p-3.5" noValidate onSubmit={submit}>
        <Field data-invalid={Boolean(errors.recipientName)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="user-referral-payout-name"
          >
            ФИО получателя
          </FieldLabel>
          <Input
            aria-describedby={errors.recipientName ? errorIds.recipientName : undefined}
            aria-invalid={Boolean(errors.recipientName)}
            autoComplete="name"
            className="font-normal"
            id="user-referral-payout-name"
            onChange={(event) => update('recipientName', event.target.value)}
            placeholder="Иван Иванов"
            value={values.recipientName}
          />
          {errors.recipientName ? (
            <FieldError id={errorIds.recipientName}>{errors.recipientName}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.accountNumber)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="user-referral-payout-account"
          >
            Расчётный счёт
          </FieldLabel>
          <Input
            aria-describedby={errors.accountNumber ? errorIds.accountNumber : undefined}
            aria-invalid={Boolean(errors.accountNumber)}
            className="font-normal"
            id="user-referral-payout-account"
            inputMode="numeric"
            onChange={(event) => update(
              'accountNumber',
              normalizeAccountNumber(event.target.value),
            )}
            placeholder="40817810099910004312"
            value={values.accountNumber}
          />
          {errors.accountNumber ? (
            <FieldError id={errorIds.accountNumber}>{errors.accountNumber}</FieldError>
          ) : null}
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.bik)}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="user-referral-payout-bik"
            >
              БИК
            </FieldLabel>
            <Input
              aria-describedby={errors.bik ? errorIds.bik : undefined}
              aria-invalid={Boolean(errors.bik)}
              className="font-normal"
              id="user-referral-payout-bik"
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
              htmlFor="user-referral-payout-sbp"
            >
              Телефон СБП
            </FieldLabel>
            <Input
              aria-describedby={errors.sbpPhone ? errorIds.sbpPhone : undefined}
              aria-invalid={Boolean(errors.sbpPhone)}
              className="font-normal"
              id="user-referral-payout-sbp"
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

        {status === 'saved' ? (
          <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="success">
            Реквизиты для вывода сохранены
          </NoraToast>
        ) : null}

        <div
          aria-hidden
          className="mt-auto h-px bg-[var(--nora-divider)]"
        />

        <div>
          <Button className="font-normal" type="submit">
            Сохранить
          </Button>
        </div>
      </form>
    </div>
  )
}
