import { useState, type ComponentProps, type ReactNode } from 'react'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { BankCard, CardBrandStrip } from './BankCard'
import { readBillingCard, writeBillingCard } from './card-store'
import {
  billingCardFromDraft,
  cardBrand,
  cardNumberPreview,
  formatCardNumber,
  hasFieldErrors,
  normalizeCardNumber,
  normalizeCvc,
  normalizeExpiry,
  validateBillingCardDraft,
  type BillingCardDraft,
  type FieldErrors,
  type SavedBillingCard,
} from './model'

/** Well forces a field fill on `data-settings-field`, which hides white label text in light theme. */
const primaryActionClass =
  '!bg-[var(--nora-tint)] !text-white shadow-none hover:!bg-[var(--nora-tint-dark)] disabled:!bg-[var(--nora-tint)] disabled:!text-white disabled:!opacity-45'

const quietActionClass =
  '!bg-[var(--nora-button-bg)] !text-[var(--nora-text)] shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))] hover:!bg-[var(--nora-button-bg-hover)]'

/** Same metrics as the login fields: 37px, hairline, 16px type on a phone so iOS does not zoom. */
const billingControlClassName =
  'h-full min-h-0 !bg-[var(--settings-field-bg,var(--nora-panel))] px-3 pt-2.5 pb-2.5 min-[768px]:pt-[8.5px] min-[768px]:pb-[8.5px] font-[family-name:var(--nora-font)] text-[13px] font-normal !text-[var(--nora-text)] !leading-5 max-[767px]:!text-[16px] shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))]'

function BillingInput({
  brandStrip,
  className,
  ...props
}: ComponentProps<typeof Input> & { brandStrip?: ReactNode }) {
  return (
    <div
      className="relative h-10 min-[768px]:h-[37px]"
      data-auth-field=""
      data-brand-strip={brandStrip ? '' : undefined}
    >
      <div className="relative h-full w-full" data-auth-field-face="">
        <Input
          data-ios-keep=""
          className={cn(billingControlClassName, brandStrip && 'pr-[8.5rem]', className)}
          {...props}
        />
        {brandStrip ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center max-[767px]:right-[calc(0.75rem/0.875)]">
            {brandStrip}
          </span>
        ) : null}
      </div>
    </div>
  )
}

const emptyDraft = (saved: SavedBillingCard | null, accountEmail: string): BillingCardDraft => ({
  holderName: saved?.holderName ?? '',
  cardNumber: '',
  expiry: saved?.expiry ?? '',
  cvc: '',
  receiptEmail: saved?.receiptEmail || accountEmail,
})

export function BillingCardPanel({
  accountEmail,
  action = 'save',
  onSavedChange,
  requireCvc,
  userId,
}: {
  accountEmail: string
  /** User pays and the card is stored with that action. Mentor only saves a payout card. */
  action?: 'pay' | 'save'
  onSavedChange?: (saved: boolean) => void
  requireCvc: boolean
  userId: string
}) {
  const [saved, setSaved] = useState<SavedBillingCard | null>(() => readBillingCard(userId))
  const [draft, setDraft] = useState<BillingCardDraft>(() => emptyDraft(readBillingCard(userId), accountEmail))
  const [editing, setEditing] = useState(() => readBillingCard(userId) == null)
  const [errors, setErrors] = useState<FieldErrors<keyof BillingCardDraft>>({})

  const locked = !editing
  const brand = draft.cardNumber ? cardBrand(draft.cardNumber) : saved?.brand ?? 'unknown'
  const previewNumber = draft.cardNumber
    ? formatCardNumber(draft.cardNumber)
    : saved
      ? cardNumberPreview('', saved.last4)
      : ''
  const update = <K extends keyof BillingCardDraft>(key: K, value: BillingCardDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const save = () => {
    const nextErrors = validateBillingCardDraft(draft, {
      hasSavedCard: saved != null,
      requireCvc,
    })
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    const next = billingCardFromDraft(draft, saved, { requireCvc })
    if (!next) return
    writeBillingCard(userId, next)
    setSaved(next)
    setDraft(emptyDraft(next, accountEmail))
    setEditing(false)
    onSavedChange?.(true)
  }

  return (
    <div className="grid gap-4">
      <BankCard
        brand={brand}
        expiry={draft.expiry}
        holderName={draft.holderName}
        number={previewNumber}
      />
      <Separator />
      <div className="grid gap-2.5">
        <Field data-invalid={errors.cardNumber ? true : undefined}>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel>Номер карты</FieldLabel>
            {saved && editing && draft.cardNumber ? (
              <button
                className="font-[family-name:var(--nora-font)] text-[12px] text-[var(--nora-tint)]"
                data-text-button=""
                onClick={() => update('cardNumber', '')}
                type="button"
              >
                Использовать •••• {saved.last4}
              </button>
            ) : null}
          </div>
          <BillingInput
            aria-invalid={errors.cardNumber ? true : undefined}
            autoComplete="cc-number"
            brandStrip={<CardBrandStrip active={brand} />}
            className="tabular-nums tracking-wide"
            inputMode="numeric"
            onChange={(event) => update('cardNumber', normalizeCardNumber(event.target.value))}
            placeholder={saved ? cardNumberPreview('', saved.last4) : '0000 0000 0000 0000'}
            readOnly={locked}
            value={locked ? cardNumberPreview('', saved?.last4) : formatCardNumber(draft.cardNumber)}
          />
          <FieldError>{errors.cardNumber}</FieldError>
        </Field>
        <div className={requireCvc ? 'grid grid-cols-2 gap-2' : undefined}>
          <Field data-invalid={errors.expiry ? true : undefined}>
            <FieldLabel>Срок</FieldLabel>
            <BillingInput
              aria-invalid={errors.expiry ? true : undefined}
              autoComplete="cc-exp"
              inputMode="numeric"
              onChange={(event) => update('expiry', normalizeExpiry(event.target.value))}
              placeholder="ММ/ГГ"
              readOnly={locked}
              value={draft.expiry}
            />
            <FieldError>{errors.expiry}</FieldError>
          </Field>
          {requireCvc ? (
            <Field data-invalid={errors.cvc ? true : undefined}>
              <FieldLabel>Код</FieldLabel>
              <BillingInput
                aria-invalid={errors.cvc ? true : undefined}
                autoComplete="cc-csc"
                inputMode="numeric"
                onChange={(event) => update('cvc', normalizeCvc(event.target.value))}
                placeholder="CVC"
                readOnly={locked}
                value={locked ? '' : draft.cvc}
              />
              <FieldError>{errors.cvc}</FieldError>
            </Field>
          ) : null}
        </div>
        <Field data-invalid={errors.holderName ? true : undefined}>
          <FieldLabel>Имя владельца</FieldLabel>
          <BillingInput
            aria-invalid={errors.holderName ? true : undefined}
            autoComplete="cc-name"
            onChange={(event) => update('holderName', event.target.value)}
            placeholder="IVAN IVANOV"
            readOnly={locked}
            value={draft.holderName}
          />
          <FieldError>{errors.holderName}</FieldError>
        </Field>
        <Field data-invalid={errors.receiptEmail ? true : undefined}>
          <FieldLabel>Почта для чека</FieldLabel>
          <BillingInput
            aria-invalid={errors.receiptEmail ? true : undefined}
            autoComplete="email"
            inputMode="email"
            onChange={(event) => update('receiptEmail', event.target.value)}
            placeholder={accountEmail}
            readOnly={locked}
            type="email"
            value={draft.receiptEmail}
          />
          <FieldError>{errors.receiptEmail}</FieldError>
        </Field>
      </div>
      <Separator />
      <div className="flex flex-wrap gap-2">
        {locked ? (
          <Button className={quietActionClass} onClick={() => setEditing(true)} type="button" variant="outline">
            Изменить
          </Button>
        ) : (
          <Button className={primaryActionClass} onClick={save} type="button">
            {action === 'pay' ? 'Оплатить' : 'Сохранить карту'}
          </Button>
        )}
      </div>
    </div>
  )
}
