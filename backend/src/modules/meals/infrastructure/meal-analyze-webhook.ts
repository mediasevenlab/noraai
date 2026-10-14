import type { MealsGeminiResponse } from '@web-app-demo/contracts'

import { isHollowMealAnalysis } from '../domain/mapping'
import { generationLedgerTokens, parseGenerationLedger } from '../domain/generation-spend'
import { markN8nFallback, reportN8nFallback } from './n8n-fallback'
import { generationRequestKey, takeGenerationUsage } from '../application/generation-usage-bridge'

type AnalyzeInput = {
  images?: Array<{ base64?: string }>
  imageBase64?: string
  note?: string
  audioBase64?: string
}

export async function analyzeMealWithWebhook<T extends AnalyzeInput>(
  webhookUrl: string | undefined,
  analyzeDirect: (input: T) => Promise<MealsGeminiResponse>,
  input: T,
): Promise<MealsGeminiResponse> {
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(300_000),
      })
      const text = await response.text()
      if (response.ok && text.trim()) {
        try {
          const json = JSON.parse(text) as MealsGeminiResponse & { ok?: boolean; meal?: unknown }
          if (json.ok === true && json.meal && !isHollowMealAnalysis(json.meal)) {
            const usage = parseGenerationLedger(json.usage)
            const recovered = generationLedgerTokens(usage) > 0
              ? usage
              : takeGenerationUsage(generationRequestKey(input))
            return {
              ...json,
              ...(generationLedgerTokens(recovered) > 0 ? { usage: recovered } : {}),
            } as MealsGeminiResponse
          }
          reportN8nFallback(
            'analyze',
            json.ok === true && json.meal ? 'hollow meal' : 'invalid payload',
          )
        } catch (cause) {
          reportN8nFallback('analyze', 'invalid json', cause)
        }
      } else if (!response.ok) {
        reportN8nFallback('analyze', `http ${response.status}`)
      } else {
        reportN8nFallback('analyze', 'empty body')
      }
    } catch (cause) {
      reportN8nFallback('analyze', 'request failed', cause)
    }
    takeGenerationUsage(generationRequestKey(input))
    return markN8nFallback(await analyzeDirect(input))
  }
  return analyzeDirect(input)
}
