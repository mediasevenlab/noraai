import type { UserDto } from '@web-app-demo/contracts'
import { useId, useState, type FormEvent } from 'react'

import { SettingsEntry } from '@/components/settings-canvas'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUpdateProfileMutation } from './queries'

export function ProfilePanel({ user }: { user: UserDto }) {
  const displayNameErrorId = useId()
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const mutation = useUpdateProfileMutation()
  const displayNameInvalid = displayName.trim().length === 1

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = displayName.trim()
    mutation.mutate({ displayName: normalized === '' ? null : normalized }, {
      onSuccess: (response) => setDisplayName(response.user.displayName ?? ''),
    })
  }

  return (
    <SettingsEntry
      badge="Аккаунт"
      description="Имя в приложении."
      title="Данные профиля"
    >
      <form className="grid gap-3.5" noValidate onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={displayNameInvalid}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="profile-display-name"
            >
              Отображаемое имя
            </FieldLabel>
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
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor="profile-email"
            >
              Email
            </FieldLabel>
            <Input
              aria-readonly="true"
              className="font-normal"
              id="profile-email"
              readOnly
              value={user.email}
            />
            <FieldDescription className="font-normal">
              Пока нельзя сменить.
            </FieldDescription>
          </Field>
        </FieldGroup>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertTitle>Профиль не сохранён</AlertTitle>
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        )}
        {mutation.isSuccess && (
          <Alert>
            <AlertTitle>Профиль сохранён</AlertTitle>
            <AlertDescription>Отображаемое имя обновлено.</AlertDescription>
          </Alert>
        )}

        <div>
          <Button
            className="font-normal"
            disabled={mutation.isPending || displayNameInvalid}
            type="submit"
          >
            {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </SettingsEntry>
  )
}
