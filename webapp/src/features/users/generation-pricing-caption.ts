import type { GenerationPricing } from '@web-app-demo/contracts'

const usd = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const rateFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function generationModelLabel(model: string) {
  if (model === 'gemini-2.5-flash') return 'Gemini 2.5 Flash'
  return model
}

export function formatGenerationPricingCaption(pricing: GenerationPricing): string {
  const { usdPerMillion } = pricing
  const shared = `Текст ${usd.format(usdPerMillion.text)} · фото ${usd.format(usdPerMillion.image)} · ссылка ${usd.format(usdPerMillion.link)} USD за 1 млн`
  const separate = `Аудио ${usd.format(usdPerMillion.audio)} · ответ ${usd.format(usdPerMillion.output)} USD за 1 млн`
  const rate = pricing.usdRub == null ? null : `1 USD = ${rateFormat.format(pricing.usdRub)} RUB`
  const head = [generationModelLabel(pricing.model), rate].filter(Boolean).join(' · ')
  return `${head}\n${shared}\n${separate}`
}
