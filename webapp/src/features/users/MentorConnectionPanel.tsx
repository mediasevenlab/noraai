import { registrationMentorIdentifierSchema } from '@web-app-demo/contracts'
import { CircleCheckIcon, CircleXIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

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

  const connectionError = connect.error instanceof ApiRequestError && connect.error.code === 'CONFLICT'
    ? 'Вы уже подключены к наставнику.'
    : connect.isError
      ? 'Не удалось подключиться к наставнику. Попробуйте ещё раз.'
      : null

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Подключение к наставнику
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Укажите никнейм или ID наставника, чтобы подключиться к нему.
        </p>
      </div>

      <div className="grid gap-3.5 p-3.5">
        {currentMentor.data?.mentor ? (
          <Field>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor={identifierId}
            >
              Никнейм или ID наставника
            </FieldLabel>
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
              Вы подключены к наставнику: {currentMentor.data.mentor.displayName
                ?? currentMentor.data.mentor.email}. Отключить вас может только наставник.
            </FieldDescription>
          </Field>
        ) : (
          <Field data-invalid={lookupState === 'not_found' || lookupState === 'error'}>
            <FieldLabel
              className="font-normal text-[var(--nora-text-secondary)]"
              htmlFor={identifierId}
            >
              Никнейм или ID наставника
            </FieldLabel>
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
    </div>
  )
}
