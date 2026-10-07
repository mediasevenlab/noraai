import { AppError } from '../../../http/errors'
import { PaymentsFailure } from '../domain/errors'

export function toPaymentsAppError(error: unknown) {
  if (!(error instanceof PaymentsFailure)) return error
  if (error.kind === 'forbidden') return new AppError(403, 'FORBIDDEN', error.message)
  if (error.kind === 'invalid') return new AppError(400, 'VALIDATION_ERROR', error.message)
  if (error.kind === 'not_found') return new AppError(404, 'NOT_FOUND', error.message)
  if (error.kind === 'unavailable') return new AppError(503, 'INTERNAL_ERROR', error.message)
  return new AppError(502, 'INTERNAL_ERROR', error.message)
}

export async function executePayments<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toPaymentsAppError(error)
  }
}
