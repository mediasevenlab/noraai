export class KnowledgeFailure extends Error {
  constructor(
    public readonly kind: 'bad_request' | 'not_found',
    message: string,
  ) {
    super(message)
  }
}
