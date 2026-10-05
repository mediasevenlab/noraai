import type { GenerationUsageLedger } from '@web-app-demo/contracts'

import { generationLedgerTokens, parseGenerationLedger } from '../domain/generation-spend'

const pending = new Map<string, GenerationUsageLedger[]>()

function sample(value: string | undefined) {
  if (!value) return '0'
  return `${value.length}:${value.slice(0, 24)}:${value.slice(-24)}`
}

export function generationRequestKey(input: {
  images?: Array<{ base64?: string }>
  imageBase64?: string
  note?: string
  audioBase64?: string
}) {
  const images = input.images?.filter((image) => image.base64).length
    ? input.images.filter((image) => image.base64).map((image) => sample(image.base64))
    : [sample(input.imageBase64)]
  return `${images.join('|')}|${(input.note ?? '').slice(0, 120)}|${sample(input.audioBase64)}`
}

export function rememberGenerationUsage(key: string, usage: GenerationUsageLedger | undefined) {
  const ledger = parseGenerationLedger(usage)
  if (generationLedgerTokens(ledger) === 0) return
  const queue = pending.get(key) ?? []
  queue.push(ledger)
  pending.set(key, queue)
}

export function takeGenerationUsage(key: string): GenerationUsageLedger {
  const queue = pending.get(key)
  if (!queue?.length) return {}
  const usage = queue.shift() ?? {}
  if (queue.length === 0) pending.delete(key)
  else pending.set(key, queue)
  return usage
}

export function resetGenerationUsageBridgeForTests() {
  pending.clear()
}
