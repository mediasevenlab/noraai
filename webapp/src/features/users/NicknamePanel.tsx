import {
  isDefaultUserEmail,
  nicknameSchema,
  type UserDto,
} from '@web-app-demo/contracts'
import { useId, useState, type FormEvent } from 'react'

import { NoraToast } from '@/components/nora'
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

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Никнейм
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Уникальное имя для будущих реферальных ссылок и публичных функций.
        </p>
      </div>

      <form className="grid gap-3.5 p-3.5" noValidate onSubmit={submit}>
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
              ? 'Этот никнейм закреплён за дефолтным пользователем и не может быть изменён.'
              : 'От 3 до 32 символов: латинские буквы, цифры и _. Первый символ — буква.'}
          </FieldDescription>
          {!validation.success && (
            <FieldError id={errorId}>
              Введите корректный никнейм на английском языке.
            </FieldError>
          )}
        </Field>

        {mutation.isError && (
          <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="error">
            {errorMessage ?? 'Никнейм не сохранён'}
          </NoraToast>
        )}
        {mutation.isSuccess && (
          <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="success">
            Никнейм сохранён
          </NoraToast>
        )}

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
            {mutation.isPending ? 'Сохраняем…' : 'Сохранить никнейм'}
          </Button>
        </div>
      </form>
    </div>
  )
}
