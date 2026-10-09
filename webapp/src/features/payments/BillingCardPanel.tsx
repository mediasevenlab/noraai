import { useState, type ComponentProps, type ReactNode } from 'react'

import { useAuth } from '@/features/auth'
import { ApiRequestError } from '@/platform/api'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { cancelSubscription, startSubscriptionPayment, setSubscriptionAutopay, type SubscriptionOverview } from './api'
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
  formatPayoutAmount,
  USER_SERVICE_PRICE_RUB,
  USER_SERVICE_YEAR_PRICE_RUB,
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

const fieldButtonClass =
  'w-full !h-10 !max-h-10 !min-h-10 min-[768px]:!h-[37px] min-[768px]:!max-h-[37px] min-[768px]:!min-h-[37px]'

/** Same fill as the tariff card, so on the gray well it reads as a plate, not a faint outline. */
const tariffButtonClass =
  '!bg-[var(--settings-field-bg,var(--nora-panel))] !text-[var(--nora-text)] !shadow-none hover:!bg-[color-mix(in_srgb,var(--nora-text)_4%,var(--settings-field-bg,var(--nora-panel)))] disabled:!opacity-45'

const TARIFF_POINTS = [
  'Дневник питания',
  'Планы на неделю',
  'Разбор приёмов по фото и голосу',
  'Лента',
  'Наставник',
]

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

export function useBillingCardForm({
  accountEmail,
  onSavedChange,
  requireCvc,
  userId,
}: {
  accountEmail: string
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

  return {
    accountEmail,
    brand,
    draft,
    editing,
    errors,
    locked,
    previewNumber,
    requireCvc,
    save,
    saved,
    setEditing,
    update,
  }
}

export function BillingCardPreview({
  compact = false,
  form,
}: {
  compact?: boolean
  form: ReturnType<typeof useBillingCardForm>
}) {
  return (
    <BankCard
      brand={form.brand}
      compact={compact}
      expiry={form.draft.expiry}
      holderName={form.draft.holderName}
      number={form.previewNumber}
    />
  )
}

export function BillingCardPanel({
  form,
}: {
  form: ReturnType<typeof useBillingCardForm>
}) {
  const {
    brand,
    draft,
    editing,
    errors,
    locked,
    requireCvc,
    save,
    saved,
    setEditing,
    update,
  } = form

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:hidden">
        <BillingCardPreview form={form} />
        <Separator />
      </div>
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
      </div>
      <Separator />
      <div className="grid gap-2">
        {locked ? (
          <Button className={quietActionClass} onClick={() => setEditing(true)} type="button" variant="outline">
            Изменить
          </Button>
        ) : (
          <Button
            className={cn(primaryActionClass, 'w-full !h-10 !max-h-10 !min-h-10 min-[768px]:!h-[37px] min-[768px]:!max-h-[37px] min-[768px]:!min-h-[37px]')}
            data-field-height=""
            onClick={save}
            type="button"
          >
            Сохранить карту
          </Button>
        )}
      </div>
    </div>
  )
}

export function SubscriptionPayPanel({
  error = null,
  onChanged,
  overview,
}: {
  error?: string | null
  onChanged: () => void
  overview: SubscriptionOverview | null
}) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [actionError, setActionError] = useState<string | null>(null)
  const failed = actionError ?? error
  const amount = period === 'year' ? USER_SERVICE_YEAR_PRICE_RUB : USER_SERVICE_PRICE_RUB
  const continuing = overview?.pendingAmountRub === amount
  const covered = Boolean(overview?.paidUntil)
  const notice = overview?.renewalNotice
  const price = formatPayoutAmount(amount)
  const showPay = !overview || continuing || notice === 'ending' || notice === 'failed' || notice === 'unpaid'
  const showCancel = Boolean(overview && (covered || overview.autopay))

  const pay = async () => {
    if (!auth.user || busy || !overview) return
    setBusy(true)
    setActionError(null)
    try {
      const payment = await startSubscriptionPayment(auth.transport, period)
      window.location.assign(payment.confirmationUrl)
    } catch (caught) {
      setActionError(caught instanceof ApiRequestError ? caught.message : 'Не удалось открыть оплату.')
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!auth.user || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await cancelSubscription(auth.transport)
      onChanged()
    } catch (caught) {
      setActionError(caught instanceof ApiRequestError ? caught.message : 'Не удалось отменить подписку.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 rounded-[12px] bg-[var(--settings-field-bg,var(--nora-panel))] px-3.5 py-3.5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-heading text-[18px] leading-tight font-bold tracking-[-0.02em] text-foreground">Подписка</p>
          <p className="shrink-0 whitespace-nowrap font-[family-name:var(--nora-font)] text-[18px] font-normal leading-tight tracking-[-0.02em] text-[var(--nora-text)] tabular-nums">
            {price} {period === 'year' ? 'в год' : 'в месяц'}
            {period === 'year' ? (
              <span className="ml-2 text-[12px] font-[250] text-[var(--nora-text-tertiary)]">скидка 20%</span>
            ) : null}
          </p>
        </div>
        <div
          aria-label="Срок оплаты"
          className="flex h-9 w-full items-stretch overflow-hidden rounded-[10px] bg-[var(--period-track)] p-0.5"
          data-period-track=""
          role="group"
        >
          <PeriodChoice active={period === 'month'} label="Месяц" onClick={() => setPeriod('month')} />
          <PeriodChoice active={period === 'year'} label="Год" onClick={() => setPeriod('year')} />
        </div>
        <ul className="grid gap-1.5 pl-4">
          {TARIFF_POINTS.map((point) => (
            <li
              className="list-disc font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]"
              key={point}
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
      {showPay || showCancel ? (
        <div className="grid gap-3">
          {showPay ? (
            <Button
              className={cn(primaryActionClass, fieldButtonClass)}
              data-field-height=""
              disabled={busy || !overview}
              onClick={() => void pay()}
              type="button"
            >
              {busy ? 'Переходим к оплате' : continuing ? 'Продолжить оплату' : 'Оплатить'}
            </Button>
          ) : null}
          {showCancel ? (
            <Button
              className={cn(fieldButtonClass, tariffButtonClass)}
              data-field-height=""
              disabled={busy}
              onClick={() => void cancel()}
              type="button"
            >
              Отменить подписку
            </Button>
          ) : null}
        </div>
      ) : null}
      {failed ? (
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-error)]">
          {failed}
        </p>
      ) : null}
    </div>
  )
}

function PeriodChoice({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'm-0 h-auto min-h-0 min-w-0 flex-1 self-stretch rounded-[8px] border-0 p-0 font-[family-name:var(--nora-font)] text-[13px] font-normal outline-none',
        active
          ? 'bg-[var(--settings-field-bg,var(--nora-panel))] text-[var(--nora-text)] shadow-[var(--nora-shadow-button)]'
          : 'bg-transparent text-[var(--nora-text-secondary)] shadow-none',
      )}
      data-active={active ? '' : undefined}
      data-field-height=""
      data-period-choice=""
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export function SubscriptionAutopayControl({
  onChanged,
  overview,
}: {
  onChanged: () => void
  overview: SubscriptionOverview
}) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!overview.autopay && !overview.canAutopay) return null
  const enabled = overview.autopay

  const toggle = async () => {
    if (!auth.user || busy) return
    setBusy(true)
    setError(null)
    try {
      await setSubscriptionAutopay(auth.transport, !enabled)
      onChanged()
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Не удалось изменить автосписание.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid justify-items-start gap-1">
      <button
        className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[color-mix(in_srgb,var(--nora-text-secondary)_45%,var(--nora-text-tertiary))] underline-offset-2 hover:underline disabled:opacity-45"
        data-text-button=""
        disabled={busy}
        onClick={() => void toggle()}
        type="button"
      >
        {enabled ? 'Отключить автосписание' : 'Включить автосписание'}
      </button>
      {error ? (
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-error)]">{error}</p>
      ) : null}
    </div>
  )
}

export function SubscriptionStatusLine({ overview }: { overview: SubscriptionOverview }) {
  const status = subscriptionStatus(overview)
  if (!status) return null
  return (
    <p className="font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 text-[var(--nora-text-secondary)]">
      {status}
    </p>
  )
}

function subscriptionStatus(overview: SubscriptionOverview) {
  if (overview.paidUntil) {
    return `Оплачено до ${formatSubscriptionDay(overview.paidUntil)}.`
  }
  if (overview.renewalNotice === 'failed') {
    const card = overview.cardLast4 ? ` с карты •••• ${overview.cardLast4}` : ''
    return `Не удалось списать${card}.`
  }
  if (overview.autopay && overview.nextChargeAt) return 'Списание с сохранённой карты запускается само.'
  const latest = overview.charges[0]
  if (latest?.status === 'canceled') return 'Прошлая оплата не прошла.'
  return null
}

function formatSubscriptionDay(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s*г\.$/, '')
}
