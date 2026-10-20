export class NewsFailure extends Error {
  constructor(
    readonly kind: 'bad_request' | 'unauthorized' | 'not_found' | 'conflict' | 'upstream',
    message: string,
  ) {
    super(message)
  }
}
