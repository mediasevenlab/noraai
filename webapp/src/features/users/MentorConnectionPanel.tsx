import { registrationMentorIdentifierSchema } from '@web-app-demo/contracts'
import { CircleCheckIcon, CircleXIcon, UsersIcon } from '@/components/icons'
import { useEffect, useId, useState } from 'react'

import { SettingsEntry, SettingsFieldMark, SettingsReadRows, useSettingsMode } from '@/components/settings-canvas'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '@/features/auth'
import {
  useConnectCurrentUserToMentorMutation,
  useCurrentUserMentorQuery,
} from './queries'

type LookupState = 'idle' | 'checking' | 'found' | 'not_found' | 'error'

export function MentorConnectionPanel() {
  const auth = useAuth()
  const identifierId = useId()
  const [identifier, setIdentifier] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [mentorName, setMentorName] = useState<string | null>(null)
  const connect = useConnectCurrentUserToMentorMutation()
  const currentMentor = useCurrentUserMentorQuery()
  const normalized = identifier.trim()

  useEffect(() => {
    if (currentMentor.data?.mentor || normalized === '') {
      setLookupState('idle')
      setMentorName(null)
      return
    }
    if (!registrationMentorIdentifierSchema.safeParse(normalized).success) {
      setLookupState('not_found')
      setMentorName(null)
      return
    }

    let active = true
    setLookupState('checking')
    const timer = window.setTimeout(() => {
      void auth
        .lookupRegistrationMentor(normalized)
        .then((result) => {
          if (!active) return
          setLookupState(result.found ? 'found' : 'not_found')
          setMentorName(
            result.mentor
              ? (result.mentor.displayName ?? result.mentor.nickname ?? `ID ${result.mentor.publicId}`)
              : null,
          )
        })
        .catch(() => {
          if (!active) return
          setLookupState('error')
          setMentorName(null)
        })
    }, 400)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [auth, currentMentor.data?.mentor, normalized])

  const mode = useSettingsMode()
  const showForm = !mode.managed || mode.editing
  const connectionError = connect.error instanceof ApiRequestError && connect.error.code === 'CONFLICT'
    ? 'Вы уже подключены к наставнику.'
    : connect.isError
      ? 'Не удалось подключиться к наставнику. Попробуйте ещё раз.'
      : null

  return (
    <SettingsEntry
      description="Никнейм или ID наставника."
      hideTitleOnMobile
      title="Подключение к наставнику"
    >
      {showForm ? (
      <div className="grid gap-3.5">
        {currentMentor.data?.mentor ? (
          <Field>
            <div className="mb-1.5 flex items-center gap-2.5">
              <SettingsFieldMark icon={UsersIcon} />
              <FieldLabel
                className="!mb-0 font-normal text-[var(--nora-text-secondary)]"
                htmlFor={identifierId}
              >
                Никнейм или ID наставника
              </FieldLabel>
            </div>
            <div className="relative">
              <Input
                className="pr-10 font-normal"
                disabled
                id={identifierId}
                value={currentMentor.data.mentor.nickname ?? String(currentMentor.data.mentor.publicId)}
              />
              <CircleCheckIcon
                aria-label="Наставник найден"
                className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-green-600"
              />
            </div>
            <FieldDescription className="font-normal text-green-700">
              Подключены к {currentMentor.data.mentor.displayName
                ?? currentMentor.data.mentor.email}. Отключить может наставник.
            </FieldDescription>
          </Field>
        ) : (
          <Field data-invalid={lookupState === 'not_found' || lookupState === 'error'}>
            <div className="mb-1.5 flex items-center gap-2.5">
              <SettingsFieldMark icon={UsersIcon} />
              <FieldLabel
                className="!mb-0 font-normal text-[var(--nora-text-secondary)]"
                htmlFor={identifierId}
              >
                Никнейм или ID наставника
              </FieldLabel>
            </div>
            <div className="relative">
              <Input
                aria-invalid={lookupState === 'not_found' || lookupState === 'error'}
                autoComplete="off"
                className="pr-10 font-normal"
                id={identifierId}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  connect.reset()
                }}
                placeholder="Никнейм или ID"
                value={identifier}
              />
              {lookupState === 'found' && (
                <CircleCheckIcon
                  aria-label="Наставник найден"
                  className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-green-600"
                />
              )}
              {lookupState === 'not_found' && (
                <CircleXIcon
                  aria-label="Наставник не найден"
                  className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-destructive"
                />
              )}
              {lookupState === 'error' && (
                <CircleXIcon
                  aria-label="Не удалось проверить наставника"
                  className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-destructive"
                />
              )}
            </div>
            {lookupState === 'checking' && (
              <FieldDescription className="font-normal">Проверяем наставника…</FieldDescription>
            )}
            {lookupState === 'found' && mentorName && (
              <FieldDescription className="font-normal text-green-700">
                Наставник найден: {mentorName}
              </FieldDescription>
            )}
            {lookupState === 'not_found' && (
              <FieldDescription className="font-normal text-destructive">
                Такого наставника не найдено.
              </FieldDescription>
            )}
            {lookupState === 'error' && (
              <FieldDescription className="font-normal text-destructive">
                Не удалось проверить наставника. Попробуйте ещё раз.
              </FieldDescription>
            )}
          </Field>
        )}
        {!currentMentor.data?.mentor && (
          <div>
            <Button
              className="font-normal"
              disabled={lookupState !== 'found' || connect.isPending}
              onClick={() => connect.mutate(normalized)}
              type="button"
            >
              {connect.isPending ? 'Подключаем…' : 'Подключиться'}
            </Button>
          </div>
        )}
        {connect.isSuccess && (
          <Alert>
            <AlertTitle>Наставник подключён</AlertTitle>
            <AlertDescription>
              {connect.data.user.displayName ?? connect.data.user.email}
            </AlertDescription>
          </Alert>
        )}
        {connectionError && (
          <Alert variant="destructive">
            <AlertTitle>Не удалось подключиться</AlertTitle>
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}
      </div>
      ) : (
        <SettingsReadRows
          rows={[{
            icon: UsersIcon,
            label: 'Наставник',
            value: currentMentor.data?.mentor
              ? (currentMentor.data.mentor.displayName
                ?? currentMentor.data.mentor.nickname
                ?? currentMentor.data.mentor.email)
              : 'Не подключён',
          }]}
        />
      )}
    </SettingsEntry>
  )
}
