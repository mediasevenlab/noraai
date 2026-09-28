import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { passwordResetRequestSchema } from '@web-app-demo/contracts'
import { useId, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { ApiRequestError } from '@/platform/api'
import { passwordResetAcceptedNotice } from '../password-reset-copy'
import { useAuth } from '../use-auth'
import { AuthFloatingInput } from './AuthFloatingInput'
import { authFormClassName, authSubmitClassName, authTitleClassName } from './auth-control-styles'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import {
  clearFieldError,
  errorId,
  hasErrors,
  toRussianAuthFieldErrors,
} from './form-validation'

export function ForgotPasswordForm() {
  const auth = useAuth()
  const emailId = useId()
  const emailErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<ReturnType<typeof passwordResetAcceptedNotice> | null>(
    null,
  )
  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const result = passwordResetRequestSchema.safeParse(value)
      if (!result.success) {
        setFieldErrors(toRussianAuthFieldErrors(result.error.issues))
        return
      }

      setFieldErrors({})
      try {
        const response = await auth.requestPasswordReset(result.data)
        setAccepted(passwordResetAcceptedNotice(response.delivery))
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError
            ? caughtError.message
            : 'Не удалось запросить сброс пароля.',
        )
      }
    },
  })

  return (
    <form
      className={authFormClassName}
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="mt-0 gap-5">
        <div className="mb-3 flex flex-col items-center gap-2 text-center">
          <h1 className={authTitleClassName}>
            Сброс пароля
          </h1>
          <p className="text-[13px] leading-relaxed font-normal text-[var(--nora-text-secondary)] text-balance">
            Введите email аккаунта
          </p>
        </div>

        <form.Field
          name="email"
          children={(field) => (
            <Field className="gap-2" data-invalid={hasErrors(fieldErrors.email)}>
              <AuthFloatingInput
                aria-describedby={errorId(fieldErrors.email, emailErrorId)}
                aria-invalid={hasErrors(fieldErrors.email)}
                autoComplete="email"
                hint="m@example.com"
                id={emailId}
                inputMode="email"
                label="Электронная почта"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('email', setFieldErrors)
                  setFormError(null)
                  setAccepted(null)
                }}
                type="email"
                value={field.state.value}
              />
              <FieldError id={emailErrorId} errors={fieldErrors.email} />
            </Field>
          )}
        />

        {accepted ? (
          <Alert>
            <AlertTitle>{accepted.title}</AlertTitle>
            <AlertDescription>{accepted.body}</AlertDescription>
          </Alert>
        ) : null}
        <FormAlert message={formError} title="Не удалось отправить запрос" />

        <Field>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button className={authSubmitClassName} disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Отправляем…' : 'Отправить инструкции'}
              </Button>
            )}
          />
        </Field>

        <FieldDescription className="text-center text-[13px] font-normal" data-auth-footer="">
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
