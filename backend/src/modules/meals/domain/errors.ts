export type MealsFailureKind =
  | 'bad_request'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'misconfigured'
  | 'upstream'

export class MealsFailure extends Error {
  constructor(
    public readonly kind: MealsFailureKind,
    message: string,
  ) {
    super(message)
  }
}
