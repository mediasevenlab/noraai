import type { SubscriptionRecord, SubscriptionStore } from '../application/ports'

const DAY_MS = 24 * 60 * 60 * 1000

/** Process memory. YooKassa remains the record of each charge; this only remembers whether autopay stays on. */
export function createSubscriptionStore(): SubscriptionStore {
  const rows = new Map<string, SubscriptionRecord>()
  return {
    async read(userId) {
      return rows.get(userId) ?? null
    },
    async save(record) {
      rows.set(record.userId, { ...record })
    },
    async listDue(now) {
      return [...rows.values()].filter((row) => (
        row.autopayEnabled
        && row.paymentMethodId
        && row.paidUntil != null
        && row.paidUntil < now
        && (row.lastRenewalAt == null || row.lastRenewalAt.getTime() < now.getTime() - DAY_MS)
      ))
    },
  }
}
