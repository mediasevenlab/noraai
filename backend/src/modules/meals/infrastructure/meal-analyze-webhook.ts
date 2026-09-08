import type { MealsGeminiRequest, MealsGeminiResponse } from '@web-app-demo/contracts'

import { isHollowMealAnalysis } from '../domain/mapping'
import { markN8nFallback, reportN8nFallback } from './n8n-fallback'

type AnalyzeDirect = (input: MealsGeminiRequest) => Promise<MealsGeminiResponse>

export async function analyzeMealWithWebhook(
  webhookUrl: string | undefined,
  analyzeDirect: AnalyzeDirect,
  input: MealsGeminiRequest,
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
            return json as MealsGeminiResponse
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
    return markN8nFallback(await analyzeDirect(input))
  }
  return analyzeDirect(input)
}
