import { CARD_BRANDS, isReceiptEmail, type SavedBillingCard } from './model'

const PREFIX = 'nutrition.billing-card.'

export function billingCardStorageKey(userId: string) {
  return `${PREFIX}${userId}`
}

function memory(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function readBillingCard(userId: string, storage: Storage | null = memory()): SavedBillingCard | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(billingCardStorageKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if ('cardNumber' in parsed || 'cvc' in parsed) return null
    const card = parsed as Partial<SavedBillingCard>
    const last4 = card.last4
    const brand = card.brand
    if (
      typeof card.holderName !== 'string'
      || typeof last4 !== 'string'
      || !/^\d{4}$/.test(last4)
      || typeof card.expiry !== 'string'
      || !brand
      || !CARD_BRANDS.includes(brand)
    ) {
      return null
    }
    return {
      holderName: card.holderName,
      last4,
      expiry: card.expiry,
      brand,
      ...(typeof card.receiptEmail === 'string' && isReceiptEmail(card.receiptEmail)
        ? { receiptEmail: card.receiptEmail.trim() }
        : {}),
    }
  } catch {
    return null
  }
}

export type MentorPayoutProfile = {
  fullName: string
  inn: string
  phone: string
  accepted: true
}

export type PayoutProfileKind = 'mentor' | 'referral'

function payoutProfileKey(kind: PayoutProfileKind, userId: string) {
  return `nutrition.${kind}-payout.${userId}`
}

export function readMentorPayoutProfile(
  userId: string,
  storage: Storage | null = memory(),
  kind: PayoutProfileKind = 'mentor',
): MentorPayoutProfile | null {
  if (!storage) return null
  try {
    const parsed: unknown = JSON.parse(storage.getItem(payoutProfileKey(kind, userId)) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const profile = parsed as Partial<MentorPayoutProfile>
    if (
      typeof profile.fullName !== 'string'
      || typeof profile.inn !== 'string'
      || !/^\d{12}$/.test(profile.inn)
      || typeof profile.phone !== 'string'
      || !/^7\d{10}$/.test(profile.phone)
      || profile.accepted !== true
    ) {
      return null
    }
    return {
      fullName: profile.fullName.trim(),
      inn: profile.inn,
      phone: profile.phone,
      accepted: true,
    }
  } catch {
    return null
  }
}

export type ReferralPayoutRecord = {
  at: string
  grossRub: number
}

export type ReferralPayoutLedger = {
  settledRub: number
  payouts: ReferralPayoutRecord[]
}

const emptyLedger = (): ReferralPayoutLedger => ({ settledRub: 0, payouts: [] })

function referralLedgerKey(userId: string) {
  return `nutrition.referral-payout-ledger.${userId}`
}

export function readReferralPayoutLedger(
  userId: string,
  storage: Storage | null = memory(),
): ReferralPayoutLedger {
  if (!storage) return emptyLedger()
  try {
    const parsed: unknown = JSON.parse(storage.getItem(referralLedgerKey(userId)) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return emptyLedger()
    const ledger = parsed as Partial<ReferralPayoutLedger>
    const payouts = Array.isArray(ledger.payouts)
      ? ledger.payouts.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const row = item as Partial<ReferralPayoutRecord>
        if (typeof row.at !== 'string' || typeof row.grossRub !== 'number' || row.grossRub <= 0) return []
        return [{ at: row.at, grossRub: row.grossRub }]
      })
      : []
    const settledRub = typeof ledger.settledRub === 'number' && ledger.settledRub > 0 ? ledger.settledRub : 0
    return { settledRub, payouts }
  } catch {
    return emptyLedger()
  }
}

/** Drops the local test ledger so a payout can be requested again. */
export function clearReferralPayoutLedger(
  userId: string,
  storage: Storage | null = memory(),
): ReferralPayoutLedger {
  storage?.removeItem(referralLedgerKey(userId))
  return emptyLedger()
}

/** Pays everything accrued so far. Later payments stay unpaid. */
export function settleReferralPayout(
  userId: string,
  input: { accruedRub: number, at?: string },
  storage: Storage | null = memory(),
): ReferralPayoutLedger {
  const current = readReferralPayoutLedger(userId, storage)
  const unpaid = Math.max(0, input.accruedRub - current.settledRub)
  if (unpaid <= 0) return current
  const next: ReferralPayoutLedger = {
    settledRub: input.accruedRub,
    payouts: [{ at: input.at ?? new Date().toISOString(), grossRub: unpaid }, ...current.payouts],
  }
  storage?.setItem(referralLedgerKey(userId), JSON.stringify(next))
  return next
}

export function writeMentorPayoutProfile(
  userId: string,
  profile: MentorPayoutProfile,
  storage: Storage | null = memory(),
  kind: PayoutProfileKind = 'mentor',
) {
  storage?.setItem(payoutProfileKey(kind, userId), JSON.stringify({
    fullName: profile.fullName.trim(),
    inn: profile.inn,
    phone: profile.phone,
    accepted: true,
  }))
}

export function writeBillingCard(
  userId: string,
  card: SavedBillingCard,
  storage: Storage | null = memory(),
) {
  storage?.setItem(billingCardStorageKey(userId), JSON.stringify({
    holderName: card.holderName,
    last4: card.last4,
    expiry: card.expiry,
    brand: card.brand,
    ...(card.receiptEmail ? { receiptEmail: card.receiptEmail } : {}),
  }))
}

export type BillingLedgerStatus = 'succeeded' | 'failed' | 'processing'

export type BillingLedgerEntry = {
  id: string
  monthKey: string
  amount: number
  status: BillingLedgerStatus
  at: string
  title: string
}

const LEDGER_PREFIX = 'nutrition.billing-ledger.'

function ledgerKey(userId: string, kind: 'charge' | 'payout') {
  return `${LEDGER_PREFIX}${kind}.${userId}`
}

export function readBillingLedger(
  userId: string,
  kind: 'charge' | 'payout',
  storage: Storage | null = memory(),
): BillingLedgerEntry[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(ledgerKey(userId, kind)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is BillingLedgerEntry => {
      if (!item || typeof item !== 'object') return false
      const entry = item as Partial<BillingLedgerEntry>
      return typeof entry.id === 'string'
        && typeof entry.monthKey === 'string'
        && typeof entry.amount === 'number'
        && (entry.status === 'succeeded' || entry.status === 'failed' || entry.status === 'processing')
        && typeof entry.at === 'string'
        && typeof entry.title === 'string'
    })
  } catch {
    return []
  }
}

const PENDING_PREFIX = 'nutrition.billing-pending-payment.'

function sessionMemory(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

export function readPendingPayment(userId: string, storage: Storage | null = sessionMemory()) {
  return storage?.getItem(`${PENDING_PREFIX}${userId}`) ?? null
}

export function writePendingPayment(
  userId: string,
  paymentId: string,
  storage: Storage | null = sessionMemory(),
) {
  storage?.setItem(`${PENDING_PREFIX}${userId}`, paymentId)
}

export function clearPendingPayment(userId: string, storage: Storage | null = sessionMemory()) {
  storage?.removeItem(`${PENDING_PREFIX}${userId}`)
}

export function writeBillingLedger(
  userId: string,
  kind: 'charge' | 'payout',
  entries: readonly BillingLedgerEntry[],
  storage: Storage | null = memory(),
) {
  storage?.setItem(ledgerKey(userId, kind), JSON.stringify(entries))
}
