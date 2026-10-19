import type { GenerationUsageLedger } from '@web-app-demo/contracts'

export type GenerationTokenBucket = GenerationUsageLedger[string]

/**
 * Paid-tier list prices, USD per 1M tokens.
 * Live numbers come from Google's Gemini pricing page (standard tier only).
 * Gemini 2.5 Flash fallback, checked 2026-10-14: $0.30 text/image/video input,
 * $1.00 audio input, $2.50 output including thinking.
 * Gemini 2.5 Flash-Lite, kept for already recorded voice: $0.10 text/image/video,
 * $0.30 audio, $0.40 output.
 * Gemini 3.5 Flash-Lite, kept for the day voice used it: $0.30 text/image/video/audio,
 * $2.50 output.
 * Gemini 3.5 Transcribe, current voice model, standard tier checked 2026-10-19:
 * $2.00 audio input, $12.00 text output.
 * A pasted link is ordinary prompt text. The URL-context tool is not enabled.
 * Unknown models are not priced. Batch, flex, and priority tiers are not used.
 */
export type UsdPerMillion = {
  text: number
  image: number
  link: number
  audio: number
  output: number
}

const FLASH_USD_PER_MILLION: UsdPerMillion = {
  text: 0.3,
  image: 0.3,
  link: 0.3,
  audio: 1,
  output: 2.5,
}

const FLASH_LITE_USD_PER_MILLION: UsdPerMillion = {
  text: 0.1,
  image: 0.1,
  link: 0.1,
  audio: 0.3,
  output: 0.4,
}

const FLASH_LITE_35_USD_PER_MILLION: UsdPerMillion = {
  text: 0.3,
  image: 0.3,
  link: 0.3,
  audio: 0.3,
  output: 2.5,
}

const TRANSCRIBE_35_USD_PER_MILLION: UsdPerMillion = {
  text: 2,
  image: 2,
  link: 2,
  audio: 2,
  output: 12,
}

const GEMINI_PRICING_URL = 'https://ai.google.dev/gemini-api/docs/pricing.md.txt'
const PRICE_TTL_MS = 6 * 60 * 60 * 1000
const PRICE_FAILURE_TTL_MS = 60 * 1000

type PriceCache = { model: string; prices: UsdPerMillion | null; at: number }

let activeModel = 'gemini-2.5-flash'
let priceCache: PriceCache | null = null

export function configureGenerationModel(model: string) {
  const next = normalizeGenerationModel(model)
  if (next && next !== 'unknown') activeModel = next
}

export function activeGenerationModel() {
  return activeModel
}

export function resetGenerationPriceCacheForTests() {
  priceCache = null
}

function fallbackPrices(model: string): UsdPerMillion | null {
  const normalized = normalizeGenerationModel(model)
  if (normalized === 'gemini-2.5-flash') return { ...FLASH_USD_PER_MILLION }
  if (normalized === 'gemini-2.5-flash-lite') return { ...FLASH_LITE_USD_PER_MILLION }
  if (normalized === 'gemini-3.5-flash-lite') return { ...FLASH_LITE_35_USD_PER_MILLION }
  if (normalized === 'gemini-3.5-transcribe') return { ...TRANSCRIBE_35_USD_PER_MILLION }
  return null
}

function pricesForModel(model: string): UsdPerMillion | null {
  const normalized = normalizeGenerationModel(model)
  if (priceCache?.model === normalized && priceCache.prices) return priceCache.prices
  return fallbackPrices(normalized)
}

export function generationModelPrices(model = activeGenerationModel()) {
  const normalized = normalizeGenerationModel(model)
  return {
    model: normalized,
    usdPerMillion: pricesForModel(normalized) ?? { ...FLASH_USD_PER_MILLION },
  }
}

function tablePaidCell(row: string): string | null {
  const cells = row.split('|').map((cell) => cell.trim()).filter(Boolean)
  return cells.length >= 3 ? cells[2] : cells.at(-1) ?? null
}

function firstDollar(cell: string): number | null {
  const match = cell.match(/\$(\d+(?:\.\d+)?)/)
  if (!match?.[1]) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

function modalityPrices(cell: string): { text: number; image: number; audio: number } | null {
  const matches = cell.matchAll(/\$(\d+(?:\.\d+)?)(?:\s*\(([^)]*)\))?/g)
  let text: number | null = null
  let image: number | null = null
  let audio: number | null = null
  for (const match of matches) {
    const amount = Number(match[1])
    if (!Number.isFinite(amount) || amount <= 0) continue
    const label = (match[2] ?? '').toLowerCase()
    if (!label) {
      if (text == null) text = amount
      continue
    }
    if (/\btext\b/.test(label)) text = amount
    if (/\bimage\b/.test(label)) image = amount
    if (/\baudio\b/.test(label)) audio = amount
  }
  if (text == null || audio == null) return null
  return { text, image: image ?? text, audio }
}

/** Standard paid tier for one model. Ignores batch, flex, and priority tables. */
export function parseGeminiStandardPrices(markdown: string, model: string): UsdPerMillion | null {
  const normalized = normalizeGenerationModel(model)
  const needle = `[\`${normalized}\`]`
  const at = markdown.indexOf(needle)
  if (at < 0) return null
  const rest = markdown.slice(at)
  const nextModel = rest.slice(needle.length).search(/\n## /)
  const section = nextModel < 0 ? rest : rest.slice(0, needle.length + nextModel)
  const standardAt = section.search(/### Standard\s*\n/)
  if (standardAt < 0) return null
  const after = section.slice(standardAt)
  const nextBand = after.slice('### Standard'.length).search(/\n### /)
  const standard = nextBand < 0 ? after : after.slice(0, '### Standard'.length + nextBand)
  const inputRow = standard.split('\n').find((line) => line.startsWith('| Input price'))
  const outputRow = standard.split('\n').find((line) => line.startsWith('| Output price'))
  if (!inputRow || !outputRow) return null
  const inputCell = tablePaidCell(inputRow)
  const outputCell = tablePaidCell(outputRow)
  if (!inputCell || !outputCell) return null
  const input = modalityPrices(inputCell)
  const output = firstDollar(outputCell)
  if (!input || output == null) return null
  return {
    text: input.text,
    image: input.image,
    link: input.text,
    audio: input.audio,
    output,
  }
}

export async function ensureModelPrices(
  model = activeGenerationModel(),
  options?: { fetchImpl?: typeof fetch; now?: number },
): Promise<UsdPerMillion | null> {
  const now = options?.now ?? Date.now()
  const normalized = normalizeGenerationModel(model)
  if (priceCache?.model === normalized) {
    const ttl = priceCache.prices ? PRICE_TTL_MS : PRICE_FAILURE_TTL_MS
    if (now - priceCache.at < ttl) return priceCache.prices ?? fallbackPrices(normalized)
  }
  const fetchImpl = options?.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(GEMINI_PRICING_URL, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`gemini pricing ${response.status}`)
    const prices = parseGeminiStandardPrices(await response.text(), normalized)
    if (!prices) throw new Error('gemini pricing unparsed')
    priceCache = { model: normalized, prices, at: now }
    return prices
  } catch {
    const kept = priceCache?.model === normalized ? priceCache.prices : null
    priceCache = { model: normalized, prices: kept, at: now }
    return kept ?? fallbackPrices(normalized)
  }
}

const CBR_DAILY_URL = 'https://www.cbr.ru/scripts/XML_daily.asp'
const RATE_TTL_MS = 6 * 60 * 60 * 1000
const RATE_FAILURE_TTL_MS = 60 * 1000

type RateCache = { rate: number | null; at: number }

let rateCache: RateCache | null = null

export function resetGenerationRateCacheForTests() {
  rateCache = null
  priceCache = null
}

export function cachedUsdRub(): number | null {
  return rateCache?.rate ?? null
}

export function normalizeGenerationModel(model: string): string {
  const trimmed = model.trim().replace(/^models\//, '')
  return trimmed || 'unknown'
}

function nonNegativeInt(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.floor(number)
}

function emptyBucket(): GenerationTokenBucket {
  return { inputTokens: 0, audioInputTokens: 0, outputTokens: 0 }
}

export function parseGenerationLedger(value: unknown): GenerationUsageLedger {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const ledger: GenerationUsageLedger = {}
  for (const [model, bucket] of Object.entries(value)) {
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue
    const row = bucket as Record<string, unknown>
    const next = {
      inputTokens: nonNegativeInt(row.inputTokens),
      audioInputTokens: nonNegativeInt(row.audioInputTokens),
      outputTokens: nonNegativeInt(row.outputTokens),
    }
    if (next.inputTokens + next.audioInputTokens + next.outputTokens === 0) continue
    const key = normalizeGenerationModel(model)
    const current = ledger[key] ?? emptyBucket()
    ledger[key] = {
      inputTokens: current.inputTokens + next.inputTokens,
      audioInputTokens: current.audioInputTokens + next.audioInputTokens,
      outputTokens: current.outputTokens + next.outputTokens,
    }
  }
  return ledger
}

export function addGenerationUsage(
  current: GenerationUsageLedger,
  extra: GenerationUsageLedger,
): GenerationUsageLedger {
  const merged = parseGenerationLedger(current)
  for (const [model, bucket] of Object.entries(parseGenerationLedger(extra))) {
    const existing = merged[model] ?? emptyBucket()
    merged[model] = {
      inputTokens: existing.inputTokens + bucket.inputTokens,
      audioInputTokens: existing.audioInputTokens + bucket.audioInputTokens,
      outputTokens: existing.outputTokens + bucket.outputTokens,
    }
  }
  return merged
}

export function generationLedgerTokens(ledger: GenerationUsageLedger): number {
  return Object.values(ledger).reduce(
    (sum, bucket) => sum + bucket.inputTokens + bucket.audioInputTokens + bucket.outputTokens,
    0,
  )
}

type GeminiUsageMetadata = {
  promptTokenCount?: unknown
  candidatesTokenCount?: unknown
  thoughtsTokenCount?: unknown
  promptTokensDetails?: Array<{ modality?: unknown; tokenCount?: unknown }>
}

export function usageLedgerFromGemini(
  model: string,
  metadata: unknown,
  options?: { audio?: boolean },
): GenerationUsageLedger {
  if (!metadata || typeof metadata !== 'object') return {}
  const raw = metadata as GeminiUsageMetadata
  const prompt = nonNegativeInt(raw.promptTokenCount)
  const output = nonNegativeInt(raw.candidatesTokenCount) + nonNegativeInt(raw.thoughtsTokenCount)
  let audio = 0
  let input = prompt
  const details = Array.isArray(raw.promptTokensDetails) ? raw.promptTokensDetails : []
  if (details.length > 0) {
    let detailed = 0
    for (const row of details) {
      const count = nonNegativeInt(row?.tokenCount)
      detailed += count
      if (String(row?.modality ?? '').toUpperCase() === 'AUDIO') audio += count
    }
    input = Math.max(0, detailed - audio)
    if (prompt > detailed) input += prompt - detailed
  } else if (options?.audio) {
    audio = prompt
    input = 0
  }
  if (input + audio + output <= 0) return {}
  return {
    [normalizeGenerationModel(model)]: {
      inputTokens: input,
      audioInputTokens: audio,
      outputTokens: output,
    },
  }
}

function roundMoney(amount: number) {
  const digits = amount > 0 && amount < 0.01 ? 10_000 : 100
  return Math.round(amount * digits) / digits
}

function usdPerToken(model: string) {
  const perMillion = pricesForModel(model)
  if (!perMillion) return null
  return {
    input: perMillion.text / 1_000_000,
    audio: perMillion.audio / 1_000_000,
    output: perMillion.output / 1_000_000,
  }
}

function ledgerUsd(ledger: GenerationUsageLedger): number | null {
  let usd = 0
  for (const [model, bucket] of Object.entries(ledger)) {
    const price = usdPerToken(model)
    if (!price) return null
    usd +=
      bucket.inputTokens * price.input
      + bucket.audioInputTokens * price.audio
      + bucket.outputTokens * price.output
  }
  return usd
}

export function generationSpend(ledger: GenerationUsageLedger, usdRub: number | null) {
  const tokens = generationLedgerTokens(ledger)
  if (tokens <= 0) return { tokens: 0, dollars: null as number | null, rubles: null as number | null }
  const usd = ledgerUsd(ledger)
  if (usd == null) return { tokens, dollars: null as number | null, rubles: null as number | null }
  const dollars = roundMoney(usd)
  if (usdRub == null || !Number.isFinite(usdRub) || usdRub <= 0) {
    return { tokens, dollars, rubles: null as number | null }
  }
  return { tokens, dollars, rubles: roundMoney(usd * usdRub) }
}

const SETTLED_KEY = '_settled'

export type SettledMoney = { dollars: number; rubles: number | null }

export type GenerationAccount = {
  ledger: GenerationUsageLedger
  settled: SettledMoney | null
}

function storeMoney(amount: number) {
  return Math.round(amount * 1e8) / 1e8
}

function readSettled(value: unknown): SettledMoney | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = (value as Record<string, unknown>)[SETTLED_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const dollars = Number((raw as { dollars?: unknown }).dollars)
  if (!Number.isFinite(dollars) || dollars < 0) return null
  const rublesRaw = (raw as { rubles?: unknown }).rubles
  if (rublesRaw == null) return { dollars, rubles: null }
  const rubles = Number(rublesRaw)
  if (!Number.isFinite(rubles) || rubles < 0) return null
  return { dollars, rubles }
}

export function parseGenerationAccount(value: unknown): GenerationAccount {
  return { ledger: parseGenerationLedger(value), settled: readSettled(value) }
}

export function generationAccountToJson(account: GenerationAccount): Record<string, unknown> {
  const record: Record<string, unknown> = { ...account.ledger }
  if (account.settled) {
    record[SETTLED_KEY] = {
      dollars: account.settled.dollars,
      rubles: account.settled.rubles,
    }
  }
  return record
}

export function quoteGenerationLedger(
  ledger: GenerationUsageLedger,
  usdRub: number | null,
): SettledMoney | null {
  if (generationLedgerTokens(ledger) === 0) return { dollars: 0, rubles: 0 }
  const usd = ledgerUsd(ledger)
  if (usd == null) return null
  return {
    dollars: storeMoney(usd),
    rubles:
      usdRub == null || !Number.isFinite(usdRub) || usdRub <= 0 ? null : storeMoney(usd * usdRub),
  }
}

export function addSettledMoney(
  current: SettledMoney | null,
  extra: SettledMoney | null,
): SettledMoney | null {
  if (!extra) return current
  if (!current) return extra
  return {
    dollars: storeMoney(current.dollars + extra.dollars),
    rubles:
      current.rubles == null
        ? extra.rubles
        : extra.rubles == null
          ? current.rubles
          : storeMoney(current.rubles + extra.rubles),
  }
}

/**
 * Prices only the new tokens. An existing settled total is kept.
 * A ledger that has tokens but no settled total is frozen once at `usdRub`.
 */
export function applyGenerationCharge(
  current: unknown,
  extra: GenerationUsageLedger,
  usdRub: number | null,
  explicit?: SettledMoney | null,
): GenerationAccount {
  const account = parseGenerationAccount(current)
  let settled = account.settled
  if (!settled && generationLedgerTokens(account.ledger) > 0) {
    if (usdRub == null || !Number.isFinite(usdRub) || usdRub <= 0) {
      return { ledger: addGenerationUsage(account.ledger, extra), settled: null }
    }
    settled = quoteGenerationLedger(account.ledger, usdRub)
    if (!settled) return { ledger: addGenerationUsage(account.ledger, extra), settled: null }
  }
  const ledger = addGenerationUsage(account.ledger, extra)
  const delta =
    generationLedgerTokens(extra) === 0
      ? null
      : explicit ?? quoteGenerationLedger(extra, usdRub)
  if (!delta) return { ledger, settled }
  return { ledger, settled: addSettledMoney(settled, delta) }
}

export function generationSpendFromAccount(account: GenerationAccount) {
  const tokens = generationLedgerTokens(account.ledger)
  if (tokens <= 0 || !account.settled) {
    return { tokens, dollars: null as number | null, rubles: null as number | null }
  }
  return {
    tokens,
    dollars: roundMoney(account.settled.dollars),
    rubles: account.settled.rubles == null ? null : roundMoney(account.settled.rubles),
  }
}

export function sumSettledGenerationSpend(rows: readonly unknown[]) {
  let tokens = 0
  let dollars = 0
  let rubles = 0
  let haveDollars = false
  let haveRubles = false
  for (const row of rows) {
    const account = parseGenerationAccount(row)
    tokens += generationLedgerTokens(account.ledger)
    if (!account.settled) continue
    dollars += account.settled.dollars
    haveDollars = true
    if (account.settled.rubles == null) continue
    rubles += account.settled.rubles
    haveRubles = true
  }
  if (tokens <= 0) return { tokens: 0, dollars: null as number | null, rubles: null as number | null }
  return {
    tokens,
    dollars: haveDollars ? roundMoney(dollars) : null,
    rubles: haveRubles ? roundMoney(rubles) : null,
  }
}

/**
 * What a new model call adds. Voice tokens already sit on the user ledger;
 * they still join the meal total and must not be added to the ledger again.
 * Deleting the meal drops `meal` only.
 */
export function generationUsageToRecord(input: {
  call: GenerationUsageLedger
  pendingAlreadyLedgered?: GenerationUsageLedger
}) {
  const pending = input.pendingAlreadyLedgered ?? {}
  return {
    meal: addGenerationUsage(pending, input.call),
    ledger: parseGenerationLedger(input.call),
  }
}

export function parseCbrUsdRub(payload: unknown): number | null {
  if (typeof payload === 'string') {
    const match = payload.match(/<CharCode>USD<\/CharCode>[\s\S]*?<Value>([\d,]+)<\/Value>/)
    if (!match?.[1]) return null
    const rate = Number(match[1].replace(',', '.'))
    if (!Number.isFinite(rate) || rate <= 0) return null
    return rate
  }
  if (!payload || typeof payload !== 'object') return null
  const usd = (payload as { Valute?: { USD?: { Value?: unknown } } }).Valute?.USD?.Value
  const rate = typeof usd === 'number' ? usd : Number(usd)
  if (!Number.isFinite(rate) || rate <= 0) return null
  return rate
}

export async function ensureUsdRub(options?: {
  fetchImpl?: typeof fetch
  now?: number
}): Promise<number | null> {
  const now = options?.now ?? Date.now()
  if (rateCache) {
    const ttl = rateCache.rate == null ? RATE_FAILURE_TTL_MS : RATE_TTL_MS
    if (now - rateCache.at < ttl) return rateCache.rate
  }
  const fetchImpl = options?.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(CBR_DAILY_URL, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`cbr ${response.status}`)
    const rate = parseCbrUsdRub(await response.text())
    rateCache = { rate, at: now }
    return rate
  } catch {
    rateCache = { rate: rateCache?.rate ?? null, at: now }
    return rateCache.rate
  }
}
