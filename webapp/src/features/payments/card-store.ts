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

export function writeBillingLedger(
  userId: string,
  kind: 'charge' | 'payout',
  entries: readonly BillingLedgerEntry[],
  storage: Storage | null = memory(),
) {
  storage?.setItem(ledgerKey(userId, kind), JSON.stringify(entries))
}
