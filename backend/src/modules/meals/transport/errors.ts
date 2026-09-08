import { AppError } from '../../../http/errors'
import { MealsFailure } from '../domain/errors'

export function toMealsAppError(error: unknown) {
  if (!(error instanceof MealsFailure)) return error

  if (error.kind === 'bad_request') {
    return new AppError(400, 'BAD_REQUEST', error.message)
  }
  if (error.kind === 'forbidden') {
    return new AppError(403, 'FORBIDDEN', error.message)
  }
  if (error.kind === 'not_found') {
    return new AppError(404, 'NOT_FOUND', error.message)
  }
  if (error.kind === 'misconfigured') {
    return new AppError(503, 'INTERNAL_ERROR', error.message)
  }
  if (error.kind === 'upstream') {
    return new AppError(502, 'INTERNAL_ERROR', error.message)
  }
  return new AppError(409, 'CONFLICT', error.message)
}

export async function executeMeals<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toMealsAppError(error)
  }
}
