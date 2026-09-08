import {
  emptyQuestionnaireAnswers,
  type QuestionnaireAnswers,
  type UserDto,
} from '@web-app-demo/contracts'
import { useEffect, useState } from 'react'

import { NoraButton } from '@/components/nora/primitives'
import { ClientProfileCard } from '@/features/users'

import {
  useMentorUserQuestionnaireQuery,
  usePutMentorUserQuestionnaireMutation,
} from './queries'

type FieldKey = keyof QuestionnaireAnswers

export function useMentorMenteeQuestionnaireEditor(
  userId: string,
  enabled = true,
) {
  const questionnaire = useMentorUserQuestionnaireQuery(userId, enabled)
  const saveMutation = usePutMentorUserQuestionnaireMutation(userId)
  const serverAnswers = questionnaire.data?.answers
  const [values, setValues] = useState<Record<FieldKey, string>>(
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
  )
  const [draft, setDraft] = useState<Record<FieldKey, string>>(
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
  )
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!serverAnswers || editing) return
    setValues(serverAnswers)
    setDraft(serverAnswers)
  }, [editing, serverAnswers])

  const startEdit = () => {
    setDraft(values)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(values)
    setEditing(false)
  }

  const saveEdit = async () => {
    try {
      const response = await saveMutation.mutateAsync({
        answers: draft as QuestionnaireAnswers,
      })
      if (response.answers) {
        setValues(response.answers)
        setDraft(response.answers)
      }
      setEditing(false)
    } catch {
      // Keep the editor open; saveError is shown from the mutation.
    }
  }

  const updateDraft = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const actions = editing ? (
    <>
      <NoraButton
        className="h-[var(--nora-control-h)]"
        disabled={saveMutation.isPending}
        onClick={cancelEdit}
        variant="ghost"
      >
        Отмена
      </NoraButton>
      <NoraButton
        className="h-[var(--nora-control-h)]"
        disabled={saveMutation.isPending}
        onClick={() => {
          void saveEdit()
        }}
        variant="primary"
      >
        {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
      </NoraButton>
    </>
  ) : (
    <NoraButton
      className="h-[var(--nora-control-h)]"
      disabled={questionnaire.isLoading || questionnaire.isError}
      onClick={startEdit}
      variant="default"
    >
      Редактировать
    </NoraButton>
  )

  return {
    actions,
    editing,
    isError: questionnaire.isError,
    isLoading: questionnaire.isLoading,
    onChange: updateDraft,
    saveError: saveMutation.isError,
    values: editing ? draft : values,
  }
}

const placeholderUser = (userId: string): UserDto => ({
  id: userId,
  publicId: 0,
  email: '',
  displayName: null,
  nickname: null,
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: new Date(0).toISOString(),
})

export function MentorMenteeQuestionnaireCards({
  userId,
  editing,
  onChange,
  values,
  isError,
  isLoading,
  saveError = false,
}: {
  userId: string
  editing: boolean
  onChange: (key: FieldKey, value: string) => void
  values: Record<FieldKey, string>
  isError: boolean
  isLoading: boolean
  saveError?: boolean
}) {
  if (isLoading) {
    return (
      <p className="text-[12px] text-[var(--nora-text-tertiary)]">Загрузка анкеты…</p>
    )
  }

  if (isError) {
    return (
      <p className="text-[12px] text-[var(--nora-error)]">
        Не удалось загрузить анкету пользователя.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <ClientProfileCard
        columns={3}
        editing={editing}
        onChange={onChange}
        user={placeholderUser(userId)}
        values={values}
      />
      {saveError ? (
        <p className="text-[12px] text-[var(--nora-error)]">
          Не удалось сохранить анкету. Попробуйте ещё раз.
        </p>
      ) : null}
    </div>
  )
}
