import {
  isDefaultUserEmail,
  nicknameSchema,
  type UserDto,
} from '@web-app-demo/contracts'
import { useId, useState, type FormEvent } from 'react'

import { NoraToast } from '@/components/nora'
import { SettingsEntry, SettingsReadRows, useSettingsDraft } from '@/components/settings-canvas'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/platform/api'
import { useUpdateProfileMutation } from './queries'

export function NicknamePanel({ user }: { user: UserDto }) {
  const errorId = useId()
  const [nickname, setNickname] = useState(user.nickname ?? '')
  const mutation = useUpdateProfileMutation()
  const isDefaultUser = isDefaultUserEmail(user.email)
  const normalized = nickname.trim().toLowerCase()
  const validation = normalized === ''
    ? { success: true as const, data: null }
    : nicknameSchema.safeParse(normalized)
  const isUnchanged = normalized === (user.nickname ?? '')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validation.success) return

    mutation.mutate(
      { nickname: validation.data },
      {
        onSuccess: (response) => {
          setNickname(response.user.nickname ?? '')
        },
      },
    )
  }

  const errorMessage = mutation.error instanceof ApiRequestError
    && mutation.error.code === 'CONFLICT'
    ? 'Этот никнейм уже занят.'
    : mutation.error?.message

  const mode = useSettingsDraft({
    id: 'settings-nickname',
    disabled: !validation.success,
    pending: mutation.isPending,
    save: async () => {
      const next = nickname.trim().toLowerCase()
      const parsed = next === ''
        ? { success: true as const, data: null }
        : nicknameSchema.safeParse(next)
      if (!parsed.success) return false
      if (next === (user.nickname ?? '')) return true
      try {
        const response = await mutation.mutateAsync({ nickname: parsed.data })
        setNickname(response.user.nickname ?? '')
        return true
      } catch {
        return false
      }
    },
    reset: () => {
      setNickname(user.nickname ?? '')
      mutation.reset()
    },
  })
  const showForm = !mode.managed || mode.editing

  return (
    <SettingsEntry
      badge="Публично"
      description="Для ссылок и публичного профиля."
      title="Никнейм"
    >
      {showForm ? (
      <form className="grid gap-3.5" noValidate onSubmit={submit}>
        <Field data-invalid={!validation.success}>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="settings-nickname"
          >
            Ваш никнейм
          </FieldLabel>
          <Input
            aria-describedby={!validation.success ? errorId : undefined}
            aria-invalid={!validation.success}
            autoComplete="username"
            className="font-normal"
            disabled={mutation.isPending || isDefaultUser}
            id="settings-nickname"
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
              : '3–32 символа: латиница, цифры и _.'}
          </FieldDescription>
          {!validation.success && (
            <FieldError id={errorId}>
              Введите корректный никнейм на английском языке.
            </FieldError>
          )}
        </Field>

        {mode.managed ? null : (
          <div>
            <Button
              className="font-normal"
              disabled={
                mutation.isPending
                || isDefaultUser
                || !validation.success
                || isUnchanged
              }
              type="submit"
            >
              {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        )}
      </form>
      ) : (
        <SettingsReadRows
          rows={[{ label: 'Ваш никнейм', value: nickname || '—' }]}
        />
      )}
      {mutation.isError && (
        <NoraToast className="mt-3 h-auto min-h-10 w-full justify-start py-2" variant="error">
          {errorMessage ?? 'Никнейм не сохранён'}
        </NoraToast>
      )}
      {mutation.isSuccess && (
        <NoraToast className="mt-3 h-auto min-h-10 w-full justify-start py-2" variant="success">
          Никнейм сохранён
        </NoraToast>
      )}
    </SettingsEntry>
  )
}
