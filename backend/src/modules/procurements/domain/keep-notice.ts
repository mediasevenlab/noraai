const NUMBER = /<(?:[\w]+:)?(?:purchaseNumber|registrationNumber)>(\d+)</
const DEADLINE = /<(?:[\w]+:)?(?:endDT|submissionCloseDateTime|applSubmisionEndDate)>([^<]+)</

export function readPackNotice(xml: string) {
  return {
    number: xml.match(NUMBER)?.[1] ?? '',
    deadline: xml.match(DEADLINE)?.[1]?.trim() ?? '',
  }
}

/** Milliseconds of a deadline. Empty or unreadable values stay, so they come back as 0 and -1. */
export function deadlineMillis(deadline: string) {
  if (!deadline) return 0
  const stamp = Date.parse(deadline)
  return Number.isFinite(stamp) ? stamp : -1
}

/** A notice without a readable deadline stays. A passed deadline is the closed one. */
export function keepOpen(deadline: string, now: Date) {
  const stamp = deadlineMillis(deadline)
  if (stamp <= 0) return true
  return stamp >= now.getTime()
}
