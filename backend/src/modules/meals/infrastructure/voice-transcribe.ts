import type { MealsTranscribeRequest, MealsTranscribeResponse } from '@web-app-demo/contracts'

import type { AppEnv } from '../../../env'
import { generationLedgerTokens, parseGenerationLedger } from '../domain/generation-spend'
import { generationRequestKey, takeGenerationUsage } from '../application/generation-usage-bridge'
import { markN8nFallback, reportN8nFallback } from './n8n-fallback'

type TranscribeDirect = (input: MealsTranscribeRequest) => Promise<MealsTranscribeResponse>

export async function transcribeMealVoice(
  env: Pick<AppEnv, 'N8N_TRANSCRIBE_WEBHOOK_URL'>,
  transcribeDirect: TranscribeDirect,
  input: MealsTranscribeRequest,
): Promise<MealsTranscribeResponse> {
  const webhook = env.N8N_TRANSCRIBE_WEBHOOK_URL
  if (input.thinking === false) return transcribeDirect(input)
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: input.audioBase64,
          audioMime: input.audioMime,
        }),
        signal: AbortSignal.timeout(120_000),
      })
      const text = await response.text()
      if (response.ok) {
        try {
          const json = JSON.parse(text) as MealsTranscribeResponse & { ok?: boolean; text?: string }
          if (json.ok === true && typeof json.text === 'string' && json.model) {
            const usage = parseGenerationLedger(json.usage)
            const recovered = generationLedgerTokens(usage) > 0
              ? usage
              : takeGenerationUsage(generationRequestKey({ audioBase64: input.audioBase64 }))
            return {
              ok: true as const,
              text: json.text,
              model: json.model,
              ...(generationLedgerTokens(recovered) > 0 ? { usage: recovered } : {}),
            }
          }
          reportN8nFallback('transcribe', 'invalid payload')
        } catch (cause) {
          reportN8nFallback('transcribe', 'invalid json', cause)
        }
      } else {
        reportN8nFallback('transcribe', `http ${response.status}`)
      }
    } catch (cause) {
      reportN8nFallback('transcribe', 'request failed', cause)
    }
    takeGenerationUsage(generationRequestKey({ audioBase64: input.audioBase64 }))
    return markN8nFallback(await transcribeDirect(input))
  }
  return transcribeDirect(input)
}
