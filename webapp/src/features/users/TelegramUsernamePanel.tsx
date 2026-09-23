import {
  formatTelegramPhoneDisplay,
  looksLikeTelegramPhone,
  telegramPhoneSchema,
  telegramUsernameSchema,
  type TelegramLinkResponse,
  type UserDto,
} from '@web-app-demo/contracts'
import { useId, useState, type FormEvent } from 'react'

import { NoraToast } from '@/components/nora'
import { SettingsEntry } from '@/components/settings-canvas'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/platform/api'
import { useStartTelegramLinkMutation, useUpdateProfileMutation } from './queries'

function displayTelegramContact(user: UserDto) {
  if (user.telegramUsername) return `@${user.telegramUsername}`
  if (user.telegramPhone) return formatTelegramPhoneDisplay(user.telegramPhone)
  return ''
}

function parseTelegramContactInput(raw: string): {
  success: boolean
  telegramUsername: string | null
  telegramPhone: string | null
  error?: string
} {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { success: true, telegramUsername: null, telegramPhone: null }
  }
  if (looksLikeTelegramPhone(trimmed)) {
    const phone = telegramPhoneSchema.safeParse(trimmed)
    if (!phone.success) {
      return {
        success: false,
        telegramUsername: null,
        telegramPhone: null,
        error: 'Введите телефон в формате +7 XXX XXX-XX-XX.',
      }
    }
    return { success: true, telegramUsername: null, telegramPhone: phone.data }
  }
  const username = telegramUsernameSchema.safeParse(trimmed)
  if (!username.success) {
    return {
      success: false,
      telegramUsername: null,
      telegramPhone: null,
      error: 'Введите @ник Telegram или телефон +7…',
    }
  }
  return { success: true, telegramUsername: username.data, telegramPhone: null }
}

export function TelegramUsernamePanel({
  user,
  variant = 'meals',
}: {
  user: UserDto
  variant?: 'meals' | 'notify'
}) {
  const errorId = useId()
  const [contact, setContact] = useState('')
  const [challenge, setChallenge] = useState<TelegramLinkResponse | null>(null)
  const linkMutation = useStartTelegramLinkMutation()
  const unlinkMutation = useUpdateProfileMutation()
  const bound = Boolean(user.telegramUsername || user.telegramPhone)
  const validation = parseTelegramContactInput(contact)

  const startLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validation.success || (!validation.telegramUsername && !validation.telegramPhone)) return
    linkMutation.mutate(
      {
        telegramUsername: validation.telegramUsername,
        telegramPhone: validation.telegramPhone,
      },
      {
        onSuccess: (response) => {
          setChallenge(response)
        },
      },
    )
  }

  const unlink = () => {
    unlinkMutation.mutate(
      {
        telegramUsername: null,
        telegramPhone: null,
      },
      {
        onSuccess: () => {
          setChallenge(null)
          setContact('')
        },
      },
    )
  }

  const linkError = linkMutation.error instanceof ApiRequestError
    && linkMutation.error.code === 'CONFLICT'
    ? 'Этот Telegram-контакт уже занят.'
    : linkMutation.error?.message
  const unlinkError = unlinkMutation.error?.message

  return (
    <SettingsEntry
      badge="Бот"
      description={
        variant === 'notify'
          ? 'Сообщение, когда подопечный добавит приём.'
          : 'Приёмы из Telegram через бота.'
      }
      title={variant === 'notify' ? 'Telegram-уведомления' : 'Telegram'}
    >
      {bound ? (
        <div className="grid gap-3.5">
          <Field>
            <FieldLabel className="font-normal text-[var(--nora-text-secondary)]">
              Подтверждённый контакт
            </FieldLabel>
            <Input
              className="font-normal"
              disabled
              readOnly
              value={displayTelegramContact(user)}
            />
            <FieldDescription className="font-normal">
              Сначала отвяжите текущий.
            </FieldDescription>
          </Field>
          {unlinkMutation.isError && (
            <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="error">
              {unlinkError ?? 'Не удалось отвязать Telegram'}
            </NoraToast>
          )}
          {unlinkMutation.isSuccess && (
            <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="success">
              Telegram отвязан
            </NoraToast>
          )}
          <div>
            <Button
              className="font-normal"
              disabled={unlinkMutation.isPending}
              onClick={unlink}
              type="button"
              variant="outline"
            >
              {unlinkMutation.isPending ? 'Отвязываем…' : 'Отвязать Telegram'}
            </Button>
          </div>
        </div>
      ) : (
        <form className="grid gap-3.5" noValidate onSubmit={startLink}>
          <Field data-invalid={!validation.success}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor={variant === 'notify' ? 'settings-telegram-notify-contact' : 'settings-telegram-contact'}
            >
              Ник или телефон
            </FieldLabel>
            <Input
              aria-describedby={!validation.success ? errorId : undefined}
              aria-invalid={!validation.success}
              autoComplete="tel"
              className="font-normal"
              disabled={linkMutation.isPending}
              id={variant === 'notify' ? 'settings-telegram-notify-contact' : 'settings-telegram-contact'}
              maxLength={40}
              onChange={(event) => {
                setContact(event.target.value)
                setChallenge(null)
                linkMutation.reset()
              }}
              placeholder="@username или +7…"
              spellCheck={false}
              value={contact}
            />
            <FieldDescription className="font-normal">
              {validation.telegramPhone
                ? 'Бот попросит отправить контакт.'
                : '@ник или телефон +7.'}
            </FieldDescription>
            {!validation.success && (
              <FieldError id={errorId}>
                {validation.error ?? 'Введите корректный ник или телефон Telegram.'}
              </FieldError>
            )}
          </Field>

          {challenge ? (
            <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="success">
              <span>
                Код {challenge.code}. Откройте бота
                {challenge.botUrl ? (
                  <>
                    {' '}
                    <a
                      className="underline underline-offset-2"
                      href={challenge.botUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      по ссылке
                    </a>
                  </>
                ) : null}
                {' '}и отправьте код. Действует до{' '}
                {new Date(challenge.expiresAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                .
              </span>
            </NoraToast>
          ) : null}

          {linkMutation.isError && (
            <NoraToast className="h-auto min-h-10 w-full justify-start py-2" variant="error">
              {linkError ?? 'Не удалось начать привязку Telegram'}
            </NoraToast>
          )}

          <div>
            <Button
              className="font-normal"
              disabled={
                linkMutation.isPending
                || !validation.success
                || (!validation.telegramUsername && !validation.telegramPhone)
              }
              type="submit"
            >
              {linkMutation.isPending ? 'Готовим код…' : 'Привязать через бота'}
            </Button>
          </div>
        </form>
      )}
    </SettingsEntry>
  )
}

