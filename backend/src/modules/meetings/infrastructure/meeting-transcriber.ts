import { MeetingFailure } from '../domain/errors'
import { parseMeetingJob, parseMeetingJobId, type MeetingJob } from '../domain/transcript'

function apiKeyHeader(apiKey: string | undefined): HeadersInit {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return {}
  }
}

function submitTimeoutMs(bytes: number) {
  // A long recording is copied to the speech server before the job starts.
  // Budget a slow link, and keep a short recording from waiting the full cap.
  const seconds = Math.ceil(bytes / (256 * 1024))
  return Math.min(20 * 60_000, Math.max(180_000, seconds * 1000))
}

export function createMeetingTranscriber(options: { baseUrl: string; apiKey?: string }) {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  return {
    async submit(file: { name: string; mime: string; bytes: Buffer }, speakers: number | null): Promise<string> {
      const body = new FormData()
      body.set('file', new File([new Uint8Array(file.bytes)], file.name, { type: file.mime || 'application/octet-stream' }))
      if (speakers != null) body.set('speakers', String(speakers))
      let response: Response
      try {
        response = await fetch(`${baseUrl}/v1/meetings`, {
          method: 'POST',
          headers: apiKeyHeader(options.apiKey),
          body,
          signal: AbortSignal.timeout(submitTimeoutMs(file.bytes.length)),
        })
      } catch {
        throw new MeetingFailure('unavailable', 'Сервис расшифровки не ответил')
      }
      const payload = await readJson(response)
      if (response.status === 401 || response.status === 403) {
        throw new MeetingFailure('unavailable', 'Сервис расшифровки не принял ключ')
      }
      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Сервис расшифровки не принял файл'
        throw new MeetingFailure('unavailable', message)
      }
      const jobId = parseMeetingJobId(payload)
      if (!jobId) throw new MeetingFailure('unavailable', 'Сервис расшифровки не вернул номер задачи')
      return jobId
    },
    async status(jobId: string): Promise<MeetingJob> {
      const response = await fetch(`${baseUrl}/v1/meetings/${encodeURIComponent(jobId)}`, {
        headers: apiKeyHeader(options.apiKey),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new MeetingFailure('unavailable', 'Сервис расшифровки не ответил')
      return parseMeetingJob(await readJson(response))
    },
    async cancel(jobId: string) {
      const response = await fetch(`${baseUrl}/v1/meetings/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        headers: apiKeyHeader(options.apiKey),
        signal: AbortSignal.timeout(15_000),
      })
      if (response.status === 404) return
      if (!response.ok) throw new MeetingFailure('unavailable', 'Сервис расшифровки не остановился')
    },
  }
}
