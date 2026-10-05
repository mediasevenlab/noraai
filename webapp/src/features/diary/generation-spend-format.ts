import type { GenerationSpend } from '@web-app-demo/contracts'

export function formatGenerationSpend(
  spend: GenerationSpend,
  currency: 'rub' | 'usd' = 'rub',
): string {
  const tokens = new Intl.NumberFormat('ru-RU').format(spend.tokens)
  const amount = currency === 'usd' ? spend.dollars : spend.rubles
  if (amount == null) return `${tokens} ток.`
  const digits = amount > 0 && amount < 0.01 ? 4 : 2
  const money = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
  const code = currency === 'usd' ? 'USD' : 'RUB'
  return `${tokens} · ${money} ${code}`
}

export function formatGenerationMoney(
  spend: GenerationSpend,
  currency: 'rub' | 'usd' = 'rub',
): string | null {
  const amount = currency === 'usd' ? spend.dollars : spend.rubles
  if (amount == null) return null
  const digits = amount > 0 && amount < 0.01 ? 4 : 2
  const money = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
  const code = currency === 'usd' ? 'USD' : 'RUB'
  return `${money} ${code}`
}

export function generationSpendVisible(
  enabled: boolean,
  spend: GenerationSpend | null | undefined,
): spend is GenerationSpend {
  return enabled && Boolean(spend && spend.tokens > 0)
}
