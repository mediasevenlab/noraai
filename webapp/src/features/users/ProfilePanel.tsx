import {
  isDefaultUserEmail,
  nicknameSchema,
  type UserDto,
} from '@web-app-demo/contracts'
import { AtSignIcon, MailIcon, UserRoundIcon } from '@/components/icons'
import { useId, useState, type FormEvent } from 'react'

import { NoraToast } from '@/components/nora'
import { SettingsEntry, SettingsFieldMark, SettingsReadRows, useSettingsDraft } from '@/components/settings-canvas'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/platform/api'
import { useUpdateProfileMutation } from './queries'

export function ProfilePanel({ className, user }: { className?: string, user: UserDto }) {
  const displayNameErrorId = useId()
  const nicknameErrorId = useId()
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [nickname, setNickname] = useState(user.nickname ?? '')
  const mutation = useUpdateProfileMutation()
  const isDefaultUser = isDefaultUserEmail(user.email)
  const displayNameInvalid = displayName.trim().length === 1
  const nicknameValue = nickname.trim().toLowerCase()
  const nicknameValidation = nicknameValue === ''
    ? { success: true as const, data: null }
    : nicknameSchema.safeParse(nicknameValue)
  const nicknameError = mutation.error instanceof ApiRequestError && mutation.error.code === 'CONFLICT'
    ? 'Этот никнейм уже занят.'
    : mutation.error?.message
  const mode = useSettingsDraft({
    id: 'profile-display-name',
    disabled: displayNameInvalid || !nicknameValidation.success,
    pending: mutation.isPending,
    save: async () => {
      if (displayName.trim().length === 1 || !nicknameValidation.success) return false
      const nextName = displayName.trim()
      const nextNickname = nickname.trim().toLowerCase()
      const nameChanged = nextName !== (user.displayName ?? '')
      const nicknameChanged = nextNickname !== (user.nickname ?? '')
      if (!nameChanged && !nicknameChanged) return true
      try {
        const response = await mutation.mutateAsync({
          ...(nameChanged ? { displayName: nextName === '' ? null : nextName } : {}),
          ...(nicknameChanged ? { nickname: nicknameValidation.data } : {}),
        })
        setDisplayName(response.user.displayName ?? '')
        setNickname(response.user.nickname ?? '')
        return true
      } catch {
        return false
      }
    },
    reset: () => {
      setDisplayName(user.displayName ?? '')
      setNickname(user.nickname ?? '')
      mutation.reset()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (displayNameInvalid || !nicknameValidation.success) return
    const nextName = displayName.trim()
    const nextNickname = nickname.trim().toLowerCase()
    mutation.mutate({
      ...(nextName !== (user.displayName ?? '')
        ? { displayName: nextName === '' ? null : nextName }
        : {}),
      ...(nextNickname !== (user.nickname ?? '')
        ? { nickname: nicknameValidation.data }
        : {}),
    }, {
      onSuccess: (response) => {
        setDisplayName(response.user.displayName ?? '')
        setNickname(response.user.nickname ?? '')
      },
    })
  }

  const showForm = !mode.managed || mode.editing

  return (
    <SettingsEntry
      className={className}
      description="Имя и никнейм."
      title="Данные профиля"
    >
      {showForm ? (
      <form className="grid gap-3.5" noValidate onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={displayNameInvalid}>
            <div className="mb-1.5 flex items-center gap-2.5">
              <SettingsFieldMark icon={UserRoundIcon} />
              <FieldLabel
                className="!mb-0 font-normal text-[var(--nora-text-secondary)]"
                htmlFor="profile-display-name"
              >
                Отображаемое имя
              </FieldLabel>
            </div>
            <Input
              aria-describedby={displayNameInvalid ? displayNameErrorId : undefined}
              aria-invalid={displayNameInvalid}
              autoComplete="name"
              className="font-normal"
              disabled={mutation.isPending}
              id="profile-display-name"
              maxLength={80}
              onChange={(event) => {
                setDisplayName(event.target.value)
                mutation.reset()
              }}
              placeholder="Ваше имя"
              value={displayName}
            />
            <FieldDescription className="font-normal">
              Пусто — покажем email.
            </FieldDescription>
            {displayNameInvalid && (
              <FieldError id={displayNameErrorId}>
                Имя должно содержать не меньше 2 символов.
              </FieldError>
            )}
          </Field>
          <Field>
            <div className="mb-1.5 flex items-center gap-2.5">
              <SettingsFieldMark icon={MailIcon} />
              <FieldLabel
                className="!mb-0 font-normal text-[var(--nora-text-secondary)]"
                htmlFor="profile-email"
              >
                Email
              </FieldLabel>
            </div>
            <Input
              className="font-normal"
              id="profile-email"
              readOnly
              value={user.email}
            />
            <FieldDescription className="font-normal">
              Пока нельзя сменить.
            </FieldDescription>
          </Field>
          <Field data-invalid={!nicknameValidation.success}>
            <div className="mb-1.5 flex items-center gap-2.5">
              <SettingsFieldMark icon={AtSignIcon} />
              <FieldLabel
                className="!mb-0 font-normal text-[var(--nora-text-secondary)]"
                htmlFor="profile-nickname"
              >
                Ваш никнейм
              </FieldLabel>
            </div>
            <Input
              aria-describedby={!nicknameValidation.success ? nicknameErrorId : undefined}
              aria-invalid={!nicknameValidation.success}
              autoComplete="username"
              className="font-normal"
              disabled={mutation.isPending || isDefaultUser}
              id="profile-nickname"
              maxLength={32}
              onChange={(event) => {
                setNickname(event.target.value.toLowerCase())
                mutation.reset()
              }}
              pattern="[a-z][a-z0-9_]{2,31}"
              placeholder="ваш никнейм"
              value={nickname}
            />
            <FieldDescription className="font-normal">
              {isDefaultUser
                ? 'Закреплён, изменить нельзя.'
                : 'Для ссылок и публичного профиля. 3–32 символа: латиница, цифры и _.'}
            </FieldDescription>
            {!nicknameValidation.success && (
              <FieldError id={nicknameErrorId}>
                Введите корректный никнейм на английском языке.
              </FieldError>
            )}
          </Field>
        </FieldGroup>

        {mode.managed ? null : (
          <div>
            <Button
              className="font-normal"
              disabled={mutation.isPending || displayNameInvalid || !nicknameValidation.success}
              type="submit"
            >
              {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        )}
      </form>
      ) : (
        <SettingsReadRows
          rows={[
            { icon: UserRoundIcon, label: 'Отображаемое имя', value: displayName.trim() || user.email },
            { icon: MailIcon, label: 'Email', value: user.email },
            { icon: AtSignIcon, label: 'Ваш никнейм', value: nickname || '—' },
          ]}
        />
      )}
      {mutation.isError && (
        <NoraToast className="mt-3 h-auto min-h-10 w-full justify-start py-2" variant="error">
          {nicknameError ?? 'Профиль не сохранён'}
        </NoraToast>
      )}
      {mutation.isSuccess && (
        <NoraToast className="mt-3 h-auto min-h-10 w-full justify-start py-2" variant="success">
          Профиль сохранён
        </NoraToast>
      )}
    </SettingsEntry>
  )
}
