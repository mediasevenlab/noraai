export class EisFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EisFailure'
  }
}
