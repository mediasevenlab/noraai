import { createHmac, timingSafeEqual } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 60 * 60

export function createMealImageUrlBuilder(
  secret: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  now: () => number = Date.now,
) {
  return {
    build(mealId: string) {
      const nowSec = Math.floor(now() / 1000)
      const exp = (Math.floor(nowSec / ttlSeconds) + 1) * ttlSeconds
      const sig = sign(`${mealId}.${exp}`, secret)
      return `/api/meals/${mealId}/image?exp=${exp}&sig=${encodeURIComponent(sig)}`
    },
    buildExtra(mealId: string, index: number) {
      const nowSec = Math.floor(now() / 1000)
      const exp = (Math.floor(nowSec / ttlSeconds) + 1) * ttlSeconds
      const sig = sign(`${mealId}.extra.${index}.${exp}`, secret)
      return `/api/meals/${mealId}/extras/${index}?exp=${exp}&sig=${encodeURIComponent(sig)}`
    },
  }
}

export function verifyMealImageSignature(
  mealId: string,
  expRaw: string | undefined,
  sig: string | undefined,
  secret: string,
) {
  if (!expRaw || !sig) return false
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = sign(`${mealId}.${exp}`, secret)
  const left = Buffer.from(expected)
  const right = Buffer.from(sig)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function verifyMealExtraImageSignature(
  mealId: string,
  index: number,
  expRaw: string | undefined,
  sig: string | undefined,
  secret: string,
) {
  if (!Number.isInteger(index) || index < 0) return false
  if (!expRaw || !sig) return false
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = sign(`${mealId}.extra.${index}.${exp}`, secret)
  const left = Buffer.from(expected)
  const right = Buffer.from(sig)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}
