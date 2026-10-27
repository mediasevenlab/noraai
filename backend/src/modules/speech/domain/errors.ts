export class SpeechFailure extends Error {
  constructor(
    readonly kind: 'bad_request' | 'unavailable',
    message: string,
  ) {
    super(message)
  }
}
