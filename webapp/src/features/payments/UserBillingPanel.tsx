import { CircleCheckIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  DEMO_USER_SERVICE_PAYMENT,
  formatCardNumber,
  hasFieldErrors,
  normalizeCardNumber,
  normalizeCvc,
  normalizeExpiry,
  validateUserServicePayment,
  type FieldErrors,
  type UserServicePaymentDetails,
} from './model'

export function UserBillingPanel() {
  const errorIds = {
    payerName: useId(),
    cardNumber: useId(),
    expiry: useId(),
    cvc: useId(),
  }
  const [values, setValues] = useState<UserServicePaymentDetails>(DEMO_USER_SERVICE_PAYMENT)
  const [errors, setErrors] = useState<FieldErrors<keyof UserServicePaymentDetails>>({})
  const [mode, setMode] = useState<'saved' | 'editing'>('saved')
  const isSaved = mode === 'saved'
  const isEditing = mode === 'editing'

  const update = <K extends keyof UserServicePaymentDetails>(
    key: K,
    value: UserServicePaymentDetails[K],
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
    const nextErrors = validateUserServicePayment(values)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    setMode('saved')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      {isSaved ? (
        <CircleCheckIcon
          aria-label="Способ оплаты сохранён"
          className="absolute top-3.5 right-3.5 z-[1] size-5 text-green-600"
        />
      ) : null}

      <div className="border-b border-[var(--nora-divider)] p-3.5 pr-11">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Оплата сервиса
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Демонстрационные данные карты — можно изменить и сохранить.
        </p>
      </div>

      <form className="grid flex-1 content-start gap-3.5 p-3.5" noValidate onSubmit={submit}>
        <Field data-invalid={Boolean(errors.payerName)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="user-billing-name"
          >
            Имя на карте
          </FieldLabel>
          <Input
            aria-describedby={errors.payerName ? errorIds.payerName : undefined}
            aria-invalid={Boolean(errors.payerName)}
            autoComplete="cc-name"
            className="font-normal"
            disabled={isSaved}
            id="user-billing-name"
            onChange={(event) => update('payerName', event.target.value)}
            placeholder="IVAN IVANOV"
            value={values.payerName}
          />
          {errors.payerName ? (
            <FieldError id={errorIds.payerName}>{errors.payerName}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.cardNumber)}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="user-billing-card"
          >
            Номер карты
          </FieldLabel>
          <Input
            aria-describedby={errors.cardNumber ? errorIds.cardNumber : undefined}
            aria-invalid={Boolean(errors.cardNumber)}
            autoComplete="cc-number"
            className="font-normal"
            disabled={isSaved}
            id="user-billing-card"
            inputMode="numeric"
            onChange={(event) => update(
              'cardNumber',
              normalizeCardNumber(event.target.value),
            )}
            placeholder="4242 4242 4242 4242"
            value={formatCardNumber(values.cardNumber)}
          />
          {errors.cardNumber ? (
            <FieldError id={errorIds.cardNumber}>{errors.cardNumber}</FieldError>
          ) : null}
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.expiry)}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="user-billing-expiry"
            >
              Срок действия
            </FieldLabel>
            <Input
              aria-describedby={errors.expiry ? errorIds.expiry : undefined}
              aria-invalid={Boolean(errors.expiry)}
              autoComplete="cc-exp"
              className="font-normal"
              disabled={isSaved}
              id="user-billing-expiry"
              inputMode="numeric"
              onChange={(event) => update('expiry', normalizeExpiry(event.target.value))}
              placeholder="ММ/ГГ"
              value={values.expiry}
            />
            {errors.expiry ? (
              <FieldError id={errorIds.expiry}>{errors.expiry}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(errors.cvc)}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="user-billing-cvc"
            >
              CVC
            </FieldLabel>
            <Input
              aria-describedby={errors.cvc ? errorIds.cvc : undefined}
              aria-invalid={Boolean(errors.cvc)}
              autoComplete="cc-csc"
              className="font-normal"
              disabled={isSaved}
              id="user-billing-cvc"
              inputMode="numeric"
              onChange={(event) => update('cvc', normalizeCvc(event.target.value))}
              placeholder="123"
              type="password"
              value={values.cvc}
            />
            <FieldDescription className="font-normal">
              3 или 4 цифры
            </FieldDescription>
            {errors.cvc ? <FieldError id={errorIds.cvc}>{errors.cvc}</FieldError> : null}
          </Field>
        </div>

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
