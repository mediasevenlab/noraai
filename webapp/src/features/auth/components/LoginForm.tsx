import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { loginRequestSchema, type LoginRequest } from '@web-app-demo/contracts'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '../use-auth'
import { AuthFloatingInput } from './AuthFloatingInput'
import { AuthPasswordToggleButton } from './AuthPasswordToggleButton'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import { authFormClassName, authSubmitClassName, authTitleClassName } from './auth-control-styles'
import {
  clearFieldError,
  errorId,
  hasErrors,
  toRussianAuthFieldErrors,
} from './form-validation'

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const auth = useAuth()
  const emailId = useId()
  const emailErrorId = useId()
  const passwordId = useId()
  const passwordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const result = loginRequestSchema.safeParse(value)
      if (!result.success) {
        setFieldErrors(toRussianAuthFieldErrors(result.error.issues))
        return
      }

      setFieldErrors({})
      try {
        await auth.login(result.data as LoginRequest)
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError && caughtError.code === 'UNAUTHORIZED'
            ? 'Неверный email или пароль.'
            : 'Не удалось войти. Попробуйте ещё раз.',
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
            Вход в аккаунт
          </h1>
          <p className="text-[13px] leading-relaxed font-light text-[var(--nora-text-secondary)] text-balance">
            Введите email и пароль, чтобы продолжить
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
                }}
                type="email"
                value={field.state.value}
              />
              <FieldError id={emailErrorId} errors={fieldErrors.email} />
            </Field>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <Field className="gap-2" data-invalid={hasErrors(fieldErrors.password)}>
              <AuthFloatingInput
                aria-describedby={errorId(fieldErrors.password, passwordErrorId)}
                aria-invalid={hasErrors(fieldErrors.password)}
                autoComplete="current-password"
                endAdornment={
                  <AuthPasswordToggleButton
                    onToggle={() => setPasswordVisible((current) => !current)}
                    visible={passwordVisible}
                  />
                }
                id={passwordId}
                label="Пароль"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('password', setFieldErrors)
                  setFormError(null)
                }}
                type={passwordVisible ? 'text' : 'password'}
                value={field.state.value}
              />
              <div className="flex items-start justify-between gap-2">
                <FieldError id={passwordErrorId} errors={fieldErrors.password} />
              </div>
            </Field>
          )}
        />

        <FormAlert message={formError} />

        <Field>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button
                className={authSubmitClassName}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Входим…' : 'Войти'}
              </Button>
            )}
          />
        </Field>

        <FieldDescription className="text-center text-[13px] font-normal" data-auth-footer="">
          Нет аккаунта?{' '}
          <Link
            className="font-medium text-[var(--nora-text)] underline-offset-4 hover:underline"
            search={{ ref: undefined, returnTo }}
            to="/signup"
          >
            Зарегистрироваться
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
