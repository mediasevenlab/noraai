import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import {
  CircleCheckIcon,
  CircleXIcon,
  GraduationCapIcon,
  InfoIcon,
  Loader2Icon,
} from '@/components/icons'
import {
  registerRequestSchema,
  registrationMentorIdentifierSchema,
  type RegisterRequest,
  type RegistrationRole,
  type ReferralLookupResponse,
} from '@web-app-demo/contracts'
import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ApiRequestError } from '@/platform/api'
import { cn } from '@/lib/utils'
import { useAuth } from '../use-auth'
import { AuthFloatingInput } from './AuthFloatingInput'
import { AuthPasswordToggleButton } from './AuthPasswordToggleButton'
import {
  authFieldAdornmentClassName,
  authFieldIconClassName,
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

const registrationRoleOptions = [
  { value: 'user', label: 'Пользователь' },
  { value: 'mentor', label: 'Наставник' },
] as const

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
  const mentorIdentifierId = useId()
  const roleFieldId = useId()
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('user')
  const [mentorLookupState, setMentorLookupState] = useState<
    'idle' | 'checking' | 'found' | 'not_found' | 'error'
  >('idle')
  const [mentorIdentifier, setMentorIdentifier] = useState('')
  const [referralState, setReferralState] = useState<
    'idle' | 'checking' | 'found' | 'not_found'
  >(referralCode ? 'checking' : 'idle')
  const [referrer, setReferrer] = useState<ReferralLookupResponse['referrer']>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)

  useEffect(() => {
    onRoleChange?.(selectedRole)
  }, [onRoleChange, selectedRole])

  useEffect(() => {
    if (!referralCode) return
    let active = true
    setReferralState('checking')
    void auth.lookupReferrer(referralCode)
      .then((result) => {
        if (!active) return
        setReferrer(result.referrer)
        setReferralState(result.found ? 'found' : 'not_found')
      })
      .catch(() => {
        if (active) setReferralState('not_found')
      })
    return () => {
      active = false
    }
  }, [auth, referralCode])

  useEffect(() => {
    if (selectedRole !== 'user' || !referralCode) return
    if (referrer?.role === 'mentor' || referralState === 'not_found') {
      setMentorIdentifier(referralCode)
    }
  }, [referralCode, referralState, referrer?.role, selectedRole])

  useEffect(() => {
    const identifier = mentorIdentifier.trim()
    if (selectedRole !== 'user' || identifier === '') {
      setMentorLookupState('idle')
      return
    }
    if (!registrationMentorIdentifierSchema.safeParse(identifier).success) {
      setMentorLookupState('not_found')
      return
    }

    let active = true
    setMentorLookupState('checking')
    const timer = window.setTimeout(() => {
      void auth
        .lookupRegistrationMentor(identifier)
        .then((result) => {
          if (active) setMentorLookupState(result.found ? 'found' : 'not_found')
        })
        .catch(() => {
          if (active) setMentorLookupState('error')
        })
    }, 400)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [auth, mentorIdentifier, selectedRole])

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
        role: value.role,
        mentorIdentifier: value.role === 'user' && mentorIdentifier.trim()
          ? mentorIdentifier
          : undefined,
        referralCode:
          value.role === 'user' && referralState === 'found'
            ? referralCode
            : undefined,
      })
      const nextErrors = result.success ? {} : toRussianAuthFieldErrors(result.error.issues)
      if (value.password !== value.confirmPassword) {
        nextErrors.confirmPassword = [{ message: 'Пароли не совпадают.' }]
      }
      if (
        value.role === 'user'
        && mentorIdentifier.trim()
        && mentorLookupState !== 'found'
      ) {
        setFormError('Сначала укажите существующего наставника или оставьте поле пустым.')
        return
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

        <div className="flex flex-col gap-5">
          <form.Field
            name="role"
            children={(field) => (
              <Field className="gap-2">
                <RadioGroup
                  aria-label="Тип аккаунта"
                  className="grid grid-cols-2 gap-2"
                  onValueChange={(value) => {
                    if (value === 'user' || value === 'mentor') {
                      field.handleChange(value)
                      setSelectedRole(value)
                      setFormError(null)
                    }
                  }}
                  value={field.state.value}
                >
                  {registrationRoleOptions.map((option) => {
                    const id = `${roleFieldId}-${option.value}`
                    return (
                      <label
                        className={cn(
                          'relative box-border flex h-10 min-[768px]:h-[37px] cursor-pointer items-center justify-start gap-2 rounded-[var(--nora-radius-md)] bg-[var(--auth-field-bg,var(--nora-panel))] px-3 shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))]',
                          'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]',
                          'outline-none transition-[box-shadow,background-color] duration-[var(--nora-duration,0.15s)]',
                          'has-focus-visible:shadow-[inset_0_0_0_1px_var(--nora-tint)]',
                          'has-data-checked:bg-[var(--nora-tint-dimmed)] has-data-checked:text-[var(--nora-tint)] has-data-checked:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-tint)_35%,transparent)]',
                        )}
                        htmlFor={id}
                        key={option.value}
                      >
                        <RadioGroupItem
                          className="size-4 shrink-0 [&_[data-slot=radio-group-indicator]>span]:size-2"
                          id={id}
                          value={option.value}
                        />
                        <span className="min-w-0 truncate text-left">{option.label}</span>
                      </label>
                    )
                  })}
                </RadioGroup>
                <FieldDescription>Тип аккаунта</FieldDescription>
              </Field>
            )}
          />

          {selectedRole === 'user' && referralState === 'checking' && (
            <p className="text-[11px] leading-relaxed font-normal text-[var(--nora-text-tertiary)] dark:text-[var(--nora-text-secondary)]">
              Проверяем реферальную ссылку…
            </p>
          )}
          {selectedRole === 'user'
            && referralState === 'found'
            && referrer?.role === 'user' && (
            <div
              className="flex gap-2.5 rounded-[var(--nora-radius-lg)] bg-[var(--nora-tint-dimmed)] px-3 py-2.5"
              role="status"
            >
              <InfoIcon
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-[var(--nora-tint)]"
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--nora-tint)]">
                  Вас пригласил пользователь
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed font-normal text-[color-mix(in_srgb,var(--nora-tint)_72%,var(--nora-text))]">
                  {referrer.displayName ?? referrer.nickname ?? `ID ${referrer.publicId}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedRole === 'user' && (
          <Field className="gap-2" data-invalid={mentorLookupState === 'not_found' || mentorLookupState === 'error'}>
            <AuthFloatingInput
              aria-invalid={mentorLookupState === 'not_found' || mentorLookupState === 'error'}
              autoComplete="off"
              endAdornment={
                <span
                  aria-hidden={mentorLookupState === 'idle'}
                  aria-label={
                    mentorLookupState === 'found'
                      ? 'Наставник найден'
                      : mentorLookupState === 'not_found' && mentorIdentifier.trim()
                        ? 'Наставник не найден'
                        : mentorLookupState === 'error' && mentorIdentifier.trim()
                          ? 'Не удалось проверить наставника'
                          : mentorLookupState === 'checking'
                            ? 'Проверяем наставника'
                            : undefined
                  }
                  className={cn(
                    authFieldAdornmentClassName,
                    'pointer-events-none',
                    mentorLookupState === 'found' && 'text-[var(--nora-success)]',
                    mentorLookupState === 'not_found'
                      && mentorIdentifier.trim()
                      && 'text-[var(--nora-error)]',
                    mentorLookupState === 'error'
                      && mentorIdentifier.trim()
                      && 'text-[var(--nora-error)]',
                    mentorLookupState === 'checking' && 'text-[var(--nora-text-secondary)]',
                  )}
                >
                  {mentorLookupState === 'found' ? (
                    <CircleCheckIcon aria-hidden className={authFieldIconClassName} strokeWidth={1.75} />
                  ) : (mentorLookupState === 'not_found' || mentorLookupState === 'error') && mentorIdentifier.trim() ? (
                    <CircleXIcon aria-hidden className={authFieldIconClassName} strokeWidth={1.75} />
                  ) : mentorLookupState === 'checking' ? (
                    <Loader2Icon aria-hidden className={cn(authFieldIconClassName, 'animate-spin')} strokeWidth={1.75} />
                  ) : (
                    <GraduationCapIcon aria-hidden className={authFieldIconClassName} strokeWidth={1.75} />
                  )}
                </span>
              }
              hint="Необязательно"
              id={mentorIdentifierId}
              label="Никнейм или ID наставника"
              onChange={(event) => {
                setMentorIdentifier(event.target.value)
                setFormError(null)
              }}
              tone={
                mentorLookupState === 'found'
                  ? 'success'
                  : mentorLookupState === 'not_found' && mentorIdentifier.trim()
                    ? 'error'
                    : mentorLookupState === 'error' && mentorIdentifier.trim()
                      ? 'error'
                      : 'default'
              }
              value={mentorIdentifier}
            />
            {mentorLookupState === 'checking' && (
              <FieldDescription>Проверяем наставника…</FieldDescription>
            )}
            {mentorLookupState === 'idle' && (
              <FieldDescription>Можно выбрать позже</FieldDescription>
            )}
            {mentorLookupState === 'found' && (
              <FieldDescription className="text-[var(--nora-success)]">
                Наставник найден
              </FieldDescription>
            )}
            {mentorLookupState === 'not_found' && mentorIdentifier.trim() && (
              <FieldError>Такого пользователя не найдено.</FieldError>
            )}
            {mentorLookupState === 'error' && mentorIdentifier.trim() && (
              <FieldError>Не удалось проверить наставника. Попробуйте ещё раз.</FieldError>
            )}
          </Field>
        )}

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
