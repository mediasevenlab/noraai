import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { passwordResetConfirmRequestSchema } from '@web-app-demo/contracts'
import { useId, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '../use-auth'
import { AuthFloatingInput } from './AuthFloatingInput'
import { authSubmitClassName } from './auth-control-styles'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import {
  clearFieldError,
  errorId,
  hasErrors,
  toRussianAuthFieldErrors,
} from './form-validation'

const invalidResetLinkMessage = 'Ссылка для сброса пароля недействительна или неполная.'

export function ResetPasswordForm({ token }: { token: string }) {
  const auth = useAuth()
  const tokenIsValid = passwordResetConfirmRequestSchema.shape.token.safeParse(token).success
  const passwordId = useId()
  const passwordDescriptionId = useId()
  const passwordErrorId = useId()
  const confirmPasswordId = useId()
  const confirmPasswordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(
    tokenIsValid ? null : invalidResetLinkMessage,
  )
  const [completed, setCompleted] = useState(false)
  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      if (!tokenIsValid) return
      setFormError(null)
      const result = passwordResetConfirmRequestSchema.safeParse({
        token,
        password: value.password,
      })
      const nextErrors = result.success ? {} : toRussianAuthFieldErrors(result.error.issues)
      if (value.password !== value.confirmPassword) {
        nextErrors.confirmPassword = [{ message: 'Пароли не совпадают.' }]
      }
      if (!result.success || hasErrors(nextErrors.confirmPassword)) {
        setFieldErrors(nextErrors)
        return
      }

      setFieldErrors({})
      try {
        await auth.confirmPasswordReset(result.data)
        setCompleted(true)
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError
            ? caughtError.message
            : 'Не удалось сбросить пароль.',
        )
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-8 font-[family-name:var(--nora-font)]"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="mt-0 gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-heading text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-[var(--nora-text)] text-balance">
            Новый пароль
          </h1>
          <p className="text-[13px] leading-relaxed font-normal text-[var(--nora-text-secondary)] text-balance">
            Новый пароль завершит все активные сессии
          </p>
        </div>

        {completed ? (
          <Alert>
            <AlertTitle>Пароль обновлён</AlertTitle>
            <AlertDescription>Теперь можно войти с новым паролем.</AlertDescription>
          </Alert>
        ) : (
          <>
            <form.Field
              name="password"
              children={(field) => (
                <Field className="gap-2" data-invalid={hasErrors(fieldErrors.password)}>
                  <AuthFloatingInput
                    aria-describedby={[
                      passwordDescriptionId,
                      errorId(fieldErrors.password, passwordErrorId),
                    ].filter(Boolean).join(' ')}
                    aria-invalid={hasErrors(fieldErrors.password)}
                    autoComplete="new-password"
                    id={passwordId}
                    label="Новый пароль"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                      clearFieldError('password', setFieldErrors)
                      clearFieldError('confirmPassword', setFieldErrors)
                      setFormError(tokenIsValid ? null : invalidResetLinkMessage)
                    }}
                    type="password"
                    value={field.state.value}
                  />
                  <FieldDescription id={passwordDescriptionId}>
                    Минимум 8 символов.
                  </FieldDescription>
                  <FieldError id={passwordErrorId} errors={fieldErrors.password} />
                </Field>
              )}
            />

            <form.Field
              name="confirmPassword"
              children={(field) => (
                <Field className="gap-2" data-invalid={hasErrors(fieldErrors.confirmPassword)}>
                  <AuthFloatingInput
                    aria-describedby={errorId(fieldErrors.confirmPassword, confirmPasswordErrorId)}
                    aria-invalid={hasErrors(fieldErrors.confirmPassword)}
                    autoComplete="new-password"
                    id={confirmPasswordId}
                    label="Подтвердите пароль"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                      clearFieldError('confirmPassword', setFieldErrors)
                      setFormError(tokenIsValid ? null : invalidResetLinkMessage)
                    }}
                    type="password"
                    value={field.state.value}
                  />
                  <FieldError id={confirmPasswordErrorId} errors={fieldErrors.confirmPassword} />
                </Field>
              )}
            />

            <FormAlert message={formError} title="Не удалось сбросить пароль" />

            <Field>
              <form.Subscribe
                selector={(state) => state.isSubmitting}
                children={(isSubmitting) => (
                  <Button
                    className={authSubmitClassName}
                    disabled={isSubmitting || !tokenIsValid}
                    type="submit"
                  >
                    {isSubmitting ? 'Сохраняем…' : 'Сохранить пароль'}
                  </Button>
                )}
              />
            </Field>
          </>
        )}

        <FieldDescription className="text-center text-xs font-normal">
          <Link
            className="font-medium text-[var(--nora-text)] underline-offset-4 hover:underline"
            search={{ returnTo: undefined }}
            to="/login"
          >
            Вернуться ко входу
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
