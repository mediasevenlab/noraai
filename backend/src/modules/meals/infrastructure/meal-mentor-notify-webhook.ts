import type { MentorMealNotifyPayload } from '../domain/mentor-meal-notify'

export async function notifyMentorMealViaWebhook(
  webhookUrl: string | undefined,
  payload: MentorMealNotifyPayload,
): Promise<void> {
  if (!webhookUrl) return
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Mentor notify webhook failed (${response.status})`)
  }
  if (text.trim()) {
    const json = JSON.parse(text) as { ok?: boolean }
    if (json.ok === false) {
      throw new Error('Mentor notify webhook returned ok=false')
    }
  }
}
