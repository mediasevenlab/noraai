import { AppError } from '../../../http/errors'
import { NewsFailure } from '../domain/errors'

export function toNewsAppError(error: unknown) {
  if (!(error instanceof NewsFailure)) return error
  if (error.kind === 'bad_request') return new AppError(400, 'BAD_REQUEST', error.message)
  if (error.kind === 'unauthorized') return new AppError(401, 'UNAUTHORIZED', error.message)
  if (error.kind === 'not_found') return new AppError(404, 'NOT_FOUND', error.message)
  if (error.kind === 'upstream') return new AppError(502, 'INTERNAL_ERROR', error.message)
  return new AppError(409, 'CONFLICT', error.message)
}

export async function executeNews<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toNewsAppError(error)
  }
}
