const NUMBER = /<(?:[\w]+:)?(?:purchaseNumber|registrationNumber)>(\d+)</
const DEADLINE = /<(?:[\w]+:)?(?:endDT|submissionCloseDateTime|applSubmisionEndDate)>([^<]+)</

export function readPackNotice(xml: string) {
  return {
    number: xml.match(NUMBER)?.[1] ?? '',
    deadline: xml.match(DEADLINE)?.[1]?.trim() ?? '',
  }
}

/** A notice without a readable deadline stays. A passed deadline is the closed one. */
export function keepOpen(deadline: string, now: Date) {
  if (!deadline) return true
  const stamp = Date.parse(deadline)
  if (!Number.isFinite(stamp)) return true
  return stamp >= now.getTime()
}
