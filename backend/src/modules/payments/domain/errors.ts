export class PaymentsFailure extends Error {
  constructor(
    readonly kind: 'forbidden' | 'invalid' | 'not_found' | 'provider' | 'unavailable',
    message: string,
  ) {
    super(message)
  }
}
