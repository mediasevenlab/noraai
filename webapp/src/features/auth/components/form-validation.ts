import type { z } from 'zod'

import type { FieldErrors, FieldName, FormError } from './form-model'

export function toFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0]
    if (!isFieldName(field)) return errors

    errors[field] = [...(errors[field] ?? []), { message: issue.message }]
    return errors
  }, {})
}

export function toRussianAuthFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  const messages: Record<FieldName, string> = {
    confirmPassword: 'Пароли не совпадают.',
    displayName: 'Имя должно содержать от 2 до 80 символов.',
    email: 'Введите корректный адрес электронной почты.',
    password: 'Пароль должен содержать от 8 до 128 символов.',
  }

  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0]
    if (!isFieldName(field)) return errors

    errors[field] = [...(errors[field] ?? []), { message: messages[field] }]
    return errors
  }, {})
}

export function clearFieldError(
  field: FieldName,
  setFieldErrors: (updater: (errors: FieldErrors) => FieldErrors) => void,
) {
  setFieldErrors((currentErrors) => {
    if (!currentErrors[field]?.length) return currentErrors
    const nextErrors = { ...currentErrors }
    delete nextErrors[field]
    return nextErrors
  })
}

export function hasErrors(errors: FormError[] | undefined) {
  return Boolean(errors?.length)
}

export function errorId(errors: FormError[] | undefined, id: string) {
  return hasErrors(errors) ? id : undefined
}

function isFieldName(field: unknown): field is FieldName {
  return (
    field === 'confirmPassword' ||
    field === 'displayName' ||
    field === 'email' ||
    field === 'password'
  )
}
