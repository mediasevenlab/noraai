export class MeetingFailure extends Error {
  constructor(
    public readonly kind: 'bad_request' | 'not_found' | 'unavailable',
    message: string,
  ) {
    super(message)
  }
}
