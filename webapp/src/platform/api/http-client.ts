import { apiErrorSchema } from '@web-app-demo/contracts'
import type { z } from 'zod'

/**
 * Production with an empty or omitted VITE_API_URL calls same-origin `/api/*`.
 * Dev and unit tests keep an absolute localhost default when the variable is unset,
 * so mocked fetch URLs stay absolute. An explicit empty value still means same-origin.
 */
const configuredApiUrl = import.meta.env?.VITE_API_URL
const defaultApiBaseUrl = (
  import.meta.env.PROD
    ? configuredApiUrl || ''
    : configuredApiUrl === undefined
      ? 'http://localhost:3000'
      : configuredApiUrl
).replace(/\/$/, '')

export type HttpRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  credentials?: RequestCredentials
  signal?: AbortSignal
  onUploadProgress?: (event: { loaded: number; total: number }) => void
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl = defaultApiBaseUrl) {
    this.baseUrl = baseUrl
  }

  async request<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    options: HttpRequestOptions = {},
  ): Promise<z.infer<TSchema>> {
    const response = await this.raw(path, options)
    return schema.parse(await response.json())
  }

  async raw(path: string, options: HttpRequestOptions = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    const form = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (options.body !== undefined && !form) {
      headers.set('Content-Type', 'application/json')
    }

    const url = `${this.baseUrl}${path}`
    const response = options.onUploadProgress
      ? await sendWithProgress(url, options, headers)
      : await fetch(url, {
        method: options.method ?? 'GET',
        credentials: options.credentials ?? 'include',
        headers,
        signal: options.signal,
        body: requestBody(options.body),
      })

    if (!response.ok) {
      throw await toApiError(response)
    }

    return response
  }
}

function sendWithProgress(url: string, options: HttpRequestOptions, headers: Headers): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(options.method ?? 'GET', url)
    xhr.withCredentials = (options.credentials ?? 'include') !== 'omit'
    const form = typeof FormData !== 'undefined' && options.body instanceof FormData
    headers.forEach((value, key) => {
      if (form && key.toLowerCase() === 'content-type') return
      xhr.setRequestHeader(key, value)
    })
    xhr.upload.onprogress = (event) => {
      options.onUploadProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : 0,
      })
    }
    const fail = (error: Error) => {
      options.signal?.removeEventListener('abort', abort)
      reject(error)
    }
    const abort = () => xhr.abort()
    xhr.onload = () => {
      options.signal?.removeEventListener('abort', abort)
      if (xhr.status === 0) {
        fail(new TypeError('Failed to fetch'))
        return
      }
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders(xhr.getAllResponseHeaders()),
      }))
    }
    xhr.onerror = () => fail(new TypeError('Failed to fetch'))
    xhr.onabort = () => fail(new DOMException('The operation was aborted.', 'AbortError'))
    if (options.signal?.aborted) {
      fail(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }
    options.signal?.addEventListener('abort', abort)
    xhr.send(uploadBody(options.body))
  })
}

function uploadBody(body: unknown): XMLHttpRequestBodyInit | null {
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body
  if (typeof body === 'string') return body
  if (body === undefined || body === null) return null
  return JSON.stringify(body)
}

function responseHeaders(raw: string): Headers {
  const headers = new Headers()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
  }
  return headers
}

function requestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body
  return JSON.stringify(body)
}

async function toApiError(response: Response) {
  const fallbackMessage = `Request failed with status ${response.status}`

  try {
    const parsed = apiErrorSchema.parse(await response.json())
    return new ApiRequestError(response.status, parsed.error.code, parsed.error.message)
  } catch {
    return new ApiRequestError(response.status, 'INTERNAL_ERROR', fallbackMessage)
  }
}
