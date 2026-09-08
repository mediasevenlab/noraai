export type UsersFailureKind =
  | 'delete_conflict'
  | 'forbidden'
  | 'invalid'
  | 'nickname_locked'
  | 'nickname_taken'
  | 'telegram_username_taken'
  | 'telegram_phone_taken'
  | 'mentor_conflict'
  | 'not_found'
  | 'role_conflict'

export class UsersFailure extends Error {
  constructor(
    public readonly kind: UsersFailureKind,
    message: string,
  ) {
    super(message)
  }
}
