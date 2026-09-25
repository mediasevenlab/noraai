import type { UserDto } from '@web-app-demo/contracts'
import { MailIcon, UserRoundIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { SettingsEntry, SettingsFieldMark, SettingsReadRows, useSettingsDraft } from '@/components/settings-canvas'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUpdateProfileMutation } from './queries'

export function ProfilePanel({ className, user }: { className?: string, user: UserDto }) {
  const displayNameErrorId = useId()
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const mutation = useUpdateProfileMutation()
  const displayNameInvalid = displayName.trim().length === 1
  const mode = useSettingsDraft({
    id: 'profile-display-name',
    disabled: displayNameInvalid,
    pending: mutation.isPending,
    save: async () => {
      if (displayName.trim().length === 1) return false
      const normalized = displayName.trim()
      const current = user.displayName ?? ''
      if (normalized === current) return true
      try {
        const response = await mutation.mutateAsync({
          displayName: normalized === '' ? null : normalized,
        })
        setDisplayName(response.user.displayName ?? '')
        return true
      } catch {
        return false
      }
    },
    reset: () => {
      setDisplayName(user.displayName ?? '')
      mutation.reset()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = displayName.trim()
    mutation.mutate({ displayName: normalized === '' ? null : normalized }, {
      onSuccess: (response) => setDisplayName(response.user.displayName ?? ''),
    })
  }

  const showForm = !mode.managed || mode.editing

  return (
    <SettingsEntry
      badge="Аккаунт"
      className={className}
      description="Имя в приложении."
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
        </FieldGroup>

        {mode.managed ? null : (
          <div>
            <Button
              className="font-normal"
              disabled={mutation.isPending || displayNameInvalid}
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
          ]}
        />
      )}
      {mutation.isError && (
        <Alert className="mt-3" variant="destructive">
          <AlertTitle>Профиль не сохранён</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
      {mutation.isSuccess && (
        <Alert className="mt-3">
          <AlertTitle>Профиль сохранён</AlertTitle>
          <AlertDescription>Отображаемое имя обновлено.</AlertDescription>
        </Alert>
      )}
    </SettingsEntry>
  )
}
