import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import {
  registerRequestSchema,
  type RegisterRequest,
  type RegistrationRole,
} from '@web-app-demo/contracts'
import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '../use-auth'
import { AuthFloatingInput } from './AuthFloatingInput'
import { AuthPasswordToggleButton } from './AuthPasswordToggleButton'
import {
  authFormClassName,
  authSubmitClassName,
  authTitleClassName,
} from './auth-control-styles'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import {
  clearFieldError,
  errorId,
  hasErrors,
  toRussianAuthFieldErrors,
} from './form-validation'

export function RegisterForm({
  referralCode,
  returnTo,
  onRoleChange,
}: {
  referralCode?: string
  returnTo?: string
  onRoleChange?: (role: RegistrationRole) => void
}) {
  const auth = useAuth()
  const displayNameId = useId()
  const displayNameErrorId = useId()
  const emailId = useId()
  const emailErrorId = useId()
  const passwordId = useId()
  const passwordDescriptionId = useId()
  const passwordErrorId = useId()
  const confirmPasswordId = useId()
  const confirmPasswordErrorId = useId()
  const [referralState, setReferralState] = useState<
    'idle' | 'checking' | 'found' | 'not_found'
  >(referralCode ? 'checking' : 'idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)

  useEffect(() => {
    onRoleChange?.('user')
  }, [onRoleChange])

  useEffect(() => {
    if (!referralCode) return
    let active = true
    setReferralState('checking')
    void auth.lookupReferrer(referralCode)
      .then((result) => {
        if (!active) return
        setReferralState(result.found ? 'found' : 'not_found')
      })
      .catch(() => {
        if (active) setReferralState('not_found')
      })
    return () => {
      active = false
    }
  }, [auth, referralCode])

  const form = useForm({
    defaultValues: {
      role: 'user' as RegistrationRole,
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const result = registerRequestSchema.safeParse({
        displayName: value.displayName,
        email: value.email,
        password: value.password,
        role: 'user',
        referralCode: referralState === 'found' ? referralCode : undefined,
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
        await auth.register(result.data as RegisterRequest)
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError && caughtError.code === 'CONFLICT'
            ? 'Пользователь с таким email уже существует.'
            : caughtError instanceof ApiRequestError && caughtError.code === 'AUTH_MENTOR_NOT_FOUND'
              ? 'Выбранный наставник больше недоступен.'
              : caughtError instanceof ApiRequestError && caughtError.code === 'AUTH_REFERRER_NOT_FOUND'
                ? 'Реферальная ссылка больше не действует.'
            : 'Не удалось создать аккаунт. Попробуйте ещё раз.',
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
            Создание аккаунта
          </h1>
          <p className="text-[13px] leading-relaxed font-light text-[var(--nora-text-secondary)] text-balance dark:font-normal">
            Заполните форму, чтобы зарегистрироваться
          </p>
        </div>

        <form.Field
          name="displayName"
          children={(field) => (
            <Field className="gap-2" data-invalid={hasErrors(fieldErrors.displayName)}>
              <AuthFloatingInput
                aria-describedby={errorId(fieldErrors.displayName, displayNameErrorId)}
                aria-invalid={hasErrors(fieldErrors.displayName)}
                autoComplete="name"
                hint="Иван Иванов"
                id={displayNameId}
                label="Имя"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('displayName', setFieldErrors)
                  setFormError(null)
                }}
                type="text"
                value={field.state.value}
              />
              <FieldError id={displayNameErrorId} errors={fieldErrors.displayName} />
            </Field>
          )}
        />

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
                aria-describedby={[
                  passwordDescriptionId,
                  errorId(fieldErrors.password, passwordErrorId),
                ].filter(Boolean).join(' ')}
                aria-invalid={hasErrors(fieldErrors.password)}
                autoComplete="new-password"
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
                  clearFieldError('confirmPassword', setFieldErrors)
                  setFormError(null)
                }}
                type={passwordVisible ? 'text' : 'password'}
                value={field.state.value}
              />
              <FieldDescription id={passwordDescriptionId}>
                Минимум 8 символов
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
                endAdornment={
                  <AuthPasswordToggleButton
                    onToggle={() => setConfirmPasswordVisible((current) => !current)}
                    visible={confirmPasswordVisible}
                  />
                }
                id={confirmPasswordId}
                label="Подтвердите пароль"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('confirmPassword', setFieldErrors)
                  setFormError(null)
                }}
                type={confirmPasswordVisible ? 'text' : 'password'}
                value={field.state.value}
              />
              <FieldDescription>Повторите пароль</FieldDescription>
              <FieldError id={confirmPasswordErrorId} errors={fieldErrors.confirmPassword} />
            </Field>
          )}
        />

        <FormAlert message={formError} />

        <Field>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button className={authSubmitClassName} disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
              </Button>
            )}
          />
        </Field>

        <FieldDescription className="text-center text-[13px] font-normal" data-auth-footer="">
          Уже есть аккаунт?{' '}
          <Link
            className="font-medium text-[var(--nora-text)] underline-offset-4 hover:underline"
            search={{ returnTo }}
            to="/login"
          >
            Войти
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
